import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createApp} from '../app.mjs';
import {scheduleReview} from '../study.mjs';

test('SRS due policy separates repeated practice, due retrieval and lapses without rewriting history',()=>{
  const at=new Date('2026-10-25T12:00:00Z'),first=scheduleReview(null,4,at);
  assert.equal(first.repetitions,1);assert.equal(first.retention_updated,true);
  let p=first;
  for(let i=1;i<=3;i++)p=scheduleReview(p,4,new Date(+at+i*1000));
  assert.equal(p.repetitions,1);assert.equal(p.due_at,first.due_at);assert.equal(p.interval_days,1);assert.equal(p.ease,first.ease);assert.equal(p.retention_updated,false);
  const second=scheduleReview(p,4,new Date(p.due_at));assert.equal(second.repetitions,2);assert.equal(second.interval_days,6);
  const third=scheduleReview(second,4,new Date(second.due_at));assert.equal(third.repetitions,3);assert.equal(third.status,'mastered');
  const failed=scheduleReview(third,1,new Date(+new Date(second.due_at)+1000));assert.equal(failed.repetitions,0);assert.equal(failed.status,'learning');
  const immediate=scheduleReview(failed,4,new Date(+new Date(failed.last_reviewed_at)+1000));assert.equal(immediate.repetitions,0);assert.equal(immediate.due_at,failed.due_at);
  const againWrong=scheduleReview(immediate,1,new Date(+new Date(immediate.last_reviewed_at)+1000));assert.equal(againWrong.ease,failed.ease);assert.equal(againWrong.due_at,failed.due_at);
  const recovered=scheduleReview(againWrong,4,new Date(failed.due_at));assert.equal(recovered.repetitions,1);
});

async function fixture(t){
  let activityTime;
  const app=createApp({learningClock:()=>activityTime?new Date(activityTime):new Date()});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(async()=>{app.server.closeAllConnections();await app.close();});
  const client=()=>{let cookie='';return async(method,path,body)=>{
    const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/v1${path}`,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};
  };};
  const api=client();const user=(await api('POST','/auth/register',{email:'refinement@test.invalid',name:'Learner',password:'private refinement password'})).data;
  const set=(await api('POST','/sets',{title:'Refinement set',words:[{term:'hello',definition:'xin chào'}]})).data;
  const words=(await api('GET',`/sets/${set.id}`)).data.words;
  const answer=async()=>{const s=(await api('POST','/study/sessions',{set_id:set.id,mode:'write'})).data;const body={question_id:s.question.id,answer:'xin chào'};const result=await api('POST',`/study/sessions/${s.id}/answers`,body);assert.equal(result.status,200);return {s,body,result:result.data};};
  return {app,api,client,user,set,words,answer,setActivityTime:value=>{activityTime=value;}};
}

test('study, flashcard ratings, retry and correction share the protected scheduler',async t=>{
  const {api,app,user,words,answer}=await fixture(t);
  const a=await answer();await answer();const b=await answer();assert.equal(b.result.progress.repetitions,1);assert.equal(b.result.progress.retention_updated,false);
  assert.equal((await api('POST',`/study/sessions/${b.s.id}/answers`,b.body)).data.replayed,true);
  const before=app.db.prepare('SELECT * FROM word_progress WHERE user_id=? AND word_id=?').get(user.id,words[0].id);
  const body={quality:4,expected_last_reviewed_at:before.last_reviewed_at};const rated=await api('PATCH',`/words/${words[0].id}/progress`,body);assert.equal(rated.status,200);assert.equal(rated.data.repetitions,1);
  assert.equal((await api('PATCH',`/words/${words[0].id}/progress`,body)).status,409);
  const activity=(await api('GET','/learning/activity')).data;assert.equal(activity.summary.by_kind.vocabulary,3);assert.equal(activity.summary.by_kind.srs_rating,1);
  // Use the latest answer in another word session to exercise correction normally.
  const last=await answer();const corrected=await api('POST',`/study/sessions/${last.s.id}/answers/${last.s.question.id}/correction`,{});assert.equal(corrected.status,200);assert.equal(corrected.data.progress.repetitions,0);
  assert.equal((await api('POST',`/study/sessions/${last.s.id}/answers/${last.s.question.id}/correction`,{})).data.replayed,true);
  assert.equal(a.result.progress.review_policy,'due_v1');
});

test('cross-engine activity counts persisted work, local days and distinct words, without inventing skill grades',async t=>{
  const {api,app,answer,setActivityTime}=await fixture(t);const a=await answer();const b=await answer();
  let activity=(await api('GET','/learning/activity?days=7&limit=1')).data;
  assert.equal(activity.scope,'cross_engine_activity');assert.equal(activity.total,2);assert.equal(activity.items.length,1);assert.equal(activity.summary.active_days,1);assert.equal(activity.summary.distinct_words_practised,1);
  assert.equal(activity.skills,undefined);assert.equal(activity.study_minutes,undefined);assert.equal(activity.items[0].user_id,undefined);
  const second=(await api('GET','/learning/activity?days=7&limit=1&offset=1')).data;assert.notEqual(second.items[0].id,activity.items[0].id);
  assert.equal((await api('GET','/learning/progress')).data.lifetime.sessions_started,0,'preserve V2 scope');
  const lesson=(await api('POST','/learning/sessions',{lesson_id:'foundation-introductions-01'})).data;
  await api('POST',`/learning/sessions/${lesson.id}/submit`,{step_id:lesson.current.id,revision:lesson.revision,submission_id:crypto.randomUUID(),response:{option_id:'a'}});
  activity=(await api('GET','/learning/activity')).data;assert.equal(activity.summary.by_kind.lesson,1);assert.equal(activity.total,3);
  await api('PUT','/learning/profile',{timezone:'Asia/Ho_Chi_Minh'});
  app.db.prepare('UPDATE study_answers SET created_at=? WHERE session_id=?').run('2026-10-24T18:00:00Z',a.s.id);
  app.db.prepare('UPDATE study_answers SET created_at=? WHERE session_id=?').run('2026-10-24T16:00:00Z',b.s.id);
  app.db.prepare('UPDATE learning_step_attempts SET created_at=? WHERE session_id=?').run('2026-10-24T18:00:00Z',lesson.id);
  setActivityTime('2026-10-25T20:00:00Z');
  const local=(await api('GET','/learning/activity?days=2')).data;assert.equal(local.window.to_local_date,'2026-10-26');assert.equal(local.total,2);assert.equal(local.daily_activity[0].date,'2026-10-25');assert.equal(local.daily_activity[0].activity_count,2);assert.equal(local.summary.active_days,1);
  await api('PUT','/learning/profile',{timezone:'UTC'});
  const utc=(await api('GET','/learning/activity?days=2')).data;assert.equal(utc.window.to_local_date,'2026-10-25');assert.equal(utc.total,3);assert.equal(utc.daily_activity[0].activity_count,3);
  assert.equal((await api('GET','/learning/activity?days=0')).status,400);assert.equal((await api('GET','/learning/activity?days=91')).status,400);assert.equal((await api('GET','/learning/activity?limit=1000')).status,400);
});

test('activity protects accounts and an empty account has no fabricated activity',async t=>{
  const {api,client,answer}=await fixture(t);await answer();assert.equal((await client()('GET','/learning/activity')).status,401);
  const other=client();await other('POST','/auth/register',{email:'other-refinement@test.invalid',name:'Other',password:'private other password'});
  const activity=(await other('GET','/learning/activity')).data;assert.equal(activity.total,0);assert.equal(activity.summary.active_days,0);assert.equal(activity.summary.distinct_words_practised,0);assert.deepEqual(activity.items,[]);
  assert.equal((await api('GET','/learning/activity')).data.total,1);
});

test('activity excludes skipped listening and AI content previews while including actual listening and speaking feedback',async t=>{
  const {api,app,user,set}=await fixture(t);
  let s=(await api('POST','/learning/listening/sessions',{lesson_id:'foundation-introductions-01'})).data;
  const path=`/learning/listening/sessions/${s.id}/sentences/`;
  let r=await api('POST',path+s.current.id+'/complete',{revision:s.revision,submission_id:crypto.randomUUID(),skip:true});assert.equal(r.status,200);s=r.data.session;
  assert.equal((await api('GET','/learning/activity')).data.total,0);
  const body={revision:s.revision,submission_id:crypto.randomUUID(),repetitions:2,self_reviewed:true};
  r=await api('POST',path+s.current.id+'/complete',body);assert.equal(r.status,200);
  assert.equal((await api('POST',path+s.current.id+'/complete',body)).data.replayed,true);
  for(const kind of ['speaking_question','speaking_hint','speaking_feedback','pronunciation'])app.db.prepare('INSERT INTO generated_content VALUES(?,?,?,?,?,?)').run(crypto.randomUUID(),user.id,set.id,kind,JSON.stringify({feedback:'private fixture'}),new Date().toISOString());
  const activity=(await api('GET','/learning/activity')).data;assert.equal(activity.summary.by_kind.listening,1);assert.equal(activity.summary.by_kind.speaking_feedback,2);assert.equal(activity.total,3);
  assert.ok(activity.items.every(item=>!JSON.stringify(item).includes('private fixture')));
});
