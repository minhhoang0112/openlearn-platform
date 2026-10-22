import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {createApp} from '../app.mjs';

async function fixture(t){
  const app=createApp({learningClock:()=>new Date('2026-10-21T20:00:00Z')});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(async()=>{app.server.closeAllConnections();await app.close();});
  function client(){let cookie='';return async(method,path,body)=>{
    const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/v1${path}`,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};
  };}
  const api=client();await api('POST','/auth/register',{email:'progress@test.invalid',name:'Learner',password:'private progress password'});
  async function run(wrong=false){
    let s=(await api('POST','/learning/sessions',{lesson_id:'foundation-introductions-01',resume:false})).data;
    while(s.current){
      const q=s.current,body={step_id:q.id,revision:s.revision,submission_id:randomUUID(),response:q.response_schema==='choice'?{option_id:q.id==='grammar'?'am':wrong?'b':'a'}:q.response_schema==='text'?{text:'I am a student. I live in Hanoi.',self_reviewed:true}:{acknowledged:true},assistance_used:wrong&&q.id==='listen-main'?['transcript']:[]};
      const path='/learning/sessions/'+s.id;
      const submitted=await api('POST',path+'/submit',body);assert.equal(submitted.status,200);
      assert.equal((await api('POST',path+'/submit',body)).data.replayed,true);
      s=(await api('POST',path+'/advance',{step_id:q.id,revision:submitted.data.session.revision})).data;
    }return s;
  }
  return {api,app,client,run};
}

test('empty progress is honest and protected, with null accuracies and no inferred level',async t=>{
  const {api,client}=await fixture(t);
  assert.equal((await client()('GET','/learning/progress')).status,401);
  const p=(await api('GET','/learning/progress?days=7')).data;
  assert.equal(p.scope,'learning_v2');assert.equal(p.daily_activity.length,7);assert.equal(p.window.to_local_date,'2026-10-22');
  assert.equal(p.window_activity.active_days,0);assert.equal(p.lifetime.sessions_started,0);
  assert.ok(p.skills.every(s=>s.accuracy_percent===null&&s.evidence_status==='not_assessed'));
  assert.equal(p.programs.find(p=>p.id==='english-foundation').published_lessons,18);
  assert.equal(p.cefr,undefined);assert.equal(p.study_minutes,undefined);
  for(const days of ['0','91','bad'])assert.equal((await api('GET','/learning/progress?days='+days)).status,400);
});

test('progress distinguishes retakes, real grades, support, self-review and local-day mistake reviews',async t=>{
  const {api,app,run,client}=await fixture(t);await run(true);await run(false);
  app.db.prepare('UPDATE learning_step_attempts SET created_at=?').run('2026-10-20T17:30:00Z');
  const mistake=(await api('GET','/learning/mistakes')).data.items[0];
  await api('POST',`/learning/mistakes/${mistake.id}/reviews`,{submission_id:randomUUID(),response:{option_id:'a'}});
  let p=(await api('GET','/learning/progress?days=2')).data;
  assert.equal(p.lifetime.completed_sessions,2);assert.equal(p.lifetime.unique_lessons_completed,1);
  const listening=p.skills.find(s=>s.key==='listening'),writing=p.skills.find(s=>s.key==='writing');
  assert.equal(listening.submitted_tasks,2);assert.equal(listening.distinct_tasks,1);assert.equal(listening.accuracy_percent,50);
  assert.equal(listening.unassisted_accuracy_percent,100);assert.equal(listening.assisted_graded,1);
  assert.equal(writing.self_review_tasks,2);assert.equal(writing.evidence_status,'self_review_only');assert.equal(writing.accuracy_percent,null);
  assert.equal(p.skills.find(s=>s.key==='reading').evidence_status,'not_assessed');
  assert.equal(p.window_activity.lesson_submissions,14);assert.equal(p.window_activity.mistake_reviews,1);assert.equal(p.window_activity.active_days,2);
  assert.equal(p.daily_activity[0].date,'2026-10-21');assert.equal(p.daily_activity[0].lesson_submissions,14);assert.equal(p.daily_activity[1].mistake_reviews,1);
  assert.equal(p.programs.find(p=>p.id==='english-foundation').completed_lessons,1);
  const narrow=(await api('GET','/learning/progress?days=1')).data;assert.equal(narrow.window_activity.lesson_submissions,0);assert.equal(narrow.lifetime.completed_sessions,2);
  const old=app.db.prepare("SELECT session_id,submission_id,feedback FROM learning_step_attempts WHERE step_id='grammar' LIMIT 1").get(),feedback=JSON.parse(old.feedback);delete feedback.assistance_used;
  app.db.prepare('UPDATE learning_step_attempts SET feedback=? WHERE session_id=? AND submission_id=?').run(JSON.stringify(feedback),old.session_id,old.submission_id);
  p=(await api('GET','/learning/progress?days=2')).data;assert.equal(p.skills.find(s=>s.key==='grammar').unknown_support,1);
  const bob=client();await bob('POST','/auth/register',{email:'progress-other@test.invalid',name:'Other',password:'another private password'});
  assert.equal((await bob('GET','/learning/progress')).data.lifetime.sessions_started,0);
});

test('history and submitted work survive reload without leaking other accounts or future question keys',async t=>{
  const {api,app,client,run}=await fixture(t);const completed=await run();
  const active=(await api('POST','/learning/sessions',{lesson_id:'foundation-time-01',resume:false})).data;
  assert.equal((await api('GET',`/learning/sessions/${active.id}/evidence`)).data.items.length,0);
  const h=(await api('GET','/learning/history?status=completed&limit=1')).data;
  assert.equal(h.total,1);assert.equal(h.items[0].id,completed.id);assert.equal(h.items[0].completed_steps,7);assert.equal(h.items[0].submitted_steps,7);
  const evidence=(await api('GET',`/learning/sessions/${completed.id}/evidence`)).data;
  assert.equal(evidence.items.length,7);assert.equal(evidence.items.find(i=>i.type==='writing_task').response.text,'I am a student. I live in Hanoi.');
  assert.ok(evidence.items.every(i=>!Object.hasOwn(i,'answer')));
  assert.equal((await api('GET','/learning/history?status=active')).data.items[0].id,active.id);
  assert.equal((await api('GET','/learning/history?program_id=english-it-system')).data.total,0);
  assert.equal((await api('GET','/learning/history?program_id=unknown')).status,404);
  assert.equal((await api('GET','/learning/history?status=bad')).status,400);
  const bob=client();await bob('POST','/auth/register',{email:'evidence-other@test.invalid',name:'Other',password:'another private password'});
  assert.equal((await bob('GET',`/learning/sessions/${completed.id}/evidence`)).status,404);assert.equal((await bob('GET','/learning/history')).data.total,0);
  const version=app.db.prepare('SELECT * FROM learning_lesson_versions WHERE lesson_id=? AND version=1').get(completed.lesson_id);
  app.db.prepare('INSERT INTO learning_lesson_versions VALUES(?,?,?,?,?,?,1)').run(version.lesson_id,2,version.program_id,version.title,version.position,version.content);
  const p=(await api('GET','/learning/progress')).data;
  assert.equal(p.lifetime.unique_lessons_completed,1);assert.equal(p.programs.find(p=>p.id==='english-foundation').completed_lessons,0,'old version must not complete a new version silently');
});
