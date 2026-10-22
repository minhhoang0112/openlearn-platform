import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../app.mjs';
import {openDatabase} from '../database.mjs';
import {seedLearning} from '../learning.mjs';

async function fixture(t){
  let instant=new Date('2026-10-21T03:00:00Z');const app=createApp({learningClock:()=>instant});
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(async()=>{app.server.closeAllConnections();await app.close();});
  function client(){let cookie='';return async(method,path,body)=>{
    const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/v1${path}`,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};
  };}
  const api=client();await api('POST','/auth/register',{email:'mistake@test.invalid',name:'Learner',password:'private test password'});
  async function makeWrong(){
    const s=(await api('POST','/learning/sessions',{lesson_id:'foundation-introductions-01',resume:false})).data;
    const body={step_id:s.current.id,revision:s.revision,submission_id:randomUUID(),response:{option_id:'b'}};
    const path='/learning/sessions/'+s.id+'/submit';assert.equal((await api('POST',path,body)).status,200);
    return {s,path,body};
  }
  return {app,api,client,makeWrong,setTime:value=>{instant=new Date(value);}};
}
const review=(api,id,option_id='a',extra={})=>api('POST',`/learning/mistakes/${id}/reviews`,{submission_id:randomUUID(),response:{option_id},...extra});

test('real wrong answers are captured once, private, pinned and paginated; self-review is not an error',async t=>{
  const {app,api,client,makeWrong}=await fixture(t);
  assert.equal((await client()('GET','/learning/mistakes')).status,401);
  assert.equal((await api('GET','/learning/mistakes')).data.summary.total,0);
  const {s,path,body}=await makeWrong();assert.equal((await api('POST',path,body)).data.replayed,true);
  let list=(await api('GET','/learning/mistakes?limit=1&offset=0')).data;
  assert.equal(list.total,1);assert.equal(list.items[0].wrong_count,1);assert.equal(list.summary.due_count,1);
  const id=list.items[0].id,detail=(await api('GET','/learning/mistakes/'+id)).data;
  assert.equal((await api('POST',path,body)).data.feedback.mistake_id,id);
  assert.equal(detail.question.answer,undefined);assert.equal(detail.question.explanation,undefined);assert.equal(detail.content_version,1);assert.ok(detail.media.url.includes('/learning/media/'));
  const bob=client();await bob('POST','/auth/register',{email:'mistake-other@test.invalid',name:'Other',password:'another private password'});
  assert.equal((await bob('GET','/learning/mistakes/'+id)).status,404);assert.equal((await review(bob,id)).status,404);assert.equal((await bob('GET','/learning/mistakes')).data.total,0);
  assert.equal((await bob('GET','/learning/mistakes/'+id+'/reviews')).status,404);
  const after=(await api('POST','/learning/sessions/'+s.id+'/advance',{step_id:s.current.id,revision:1})).data;
  await api('POST','/learning/sessions/'+s.id+'/submit',{step_id:after.current.id,revision:after.revision,submission_id:randomUUID(),response:{acknowledged:true}});
  assert.equal((await api('GET','/learning/mistakes')).data.total,1,'acknowledgement/self-review must not be recorded as a language error');
  await makeWrong();list=(await api('GET','/learning/mistakes')).data;
  assert.equal(list.total,1);assert.equal(list.items[0].wrong_count,2);
  assert.equal((await api('GET','/learning/mistakes?offset=1')).data.items.length,0);
  assert.equal((await api('GET','/learning/mistakes?status=bad')).status,400);
  assert.equal((await api('GET','/learning/mistakes?due_only=maybe')).status,400);
  assert.equal((await api('GET','/learning/today')).data.mistake_summary.due_count,1);
  const row=app.db.prepare('SELECT content FROM learning_lesson_versions WHERE lesson_id=? AND version=1').get(detail.lesson_id);
  const newer={...JSON.parse(row.content),version:2};newer.steps[0].answer='b';
  app.db.prepare('INSERT INTO learning_lesson_versions VALUES(?,?,?,?,?,?,1)').run(detail.lesson_id,2,'english-foundation','Changed version',0,JSON.stringify(newer));
  assert.equal((await review(api,id,'a')).data.feedback.correct,true,'review must use the pinned original key');
});

test('spaced reviews require two due unassisted recalls, replay is safe and new source mistakes reopen resolved items',async t=>{
  const {api,makeWrong,setTime,app}=await fixture(t);await makeWrong();
  const id=(await api('GET','/learning/mistakes')).data.items[0].id;
  assert.equal((await review(api,id,'invalid')).status,400);
  assert.equal((await api('GET','/learning/mistakes/'+id)).data.review_count,0);
  const body={submission_id:randomUUID(),response:{option_id:'a'}};
  const first=(await api('POST',`/learning/mistakes/${id}/reviews`,body)).data;
  assert.equal(first.feedback.correct,true);assert.equal(first.feedback.resolved,false);assert.equal(first.mistake.correct_streak,1);
  assert.equal((await api('POST',`/learning/mistakes/${id}/reviews`,body)).data.replayed,true);
  assert.equal((await api('POST',`/learning/mistakes/${id}/reviews`,{...body,response:{option_id:'b'}})).status,409);
  assert.equal((await review(api,id)).error.code,'REVIEW_NOT_DUE');
  assert.equal((await api('GET','/learning/mistakes?due_only=true')).data.items.length,0);
  setTime('2026-10-22T03:00:00Z');
  const resolved=(await review(api,id)).data;assert.equal(resolved.feedback.resolved,true);assert.equal(resolved.mistake.status,'resolved');assert.equal(resolved.mistake.due_at,null);
  assert.equal((await api('GET','/learning/mistakes')).data.total,0);assert.equal((await api('GET','/learning/mistakes?status=resolved')).data.total,1);
  assert.equal((await review(api,id)).error.code,'MISTAKE_RESOLVED');
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM learning_mistake_reviews WHERE mistake_id=?').get(id).n,2);
  const history=(await api('GET','/learning/mistakes/'+id+'/reviews?limit=1')).data;
  assert.equal(history.total,2);assert.equal(history.items.length,1);assert.equal(history.items[0].feedback.expected_option_id,'a');
  await makeWrong();const reopened=(await api('GET','/learning/mistakes/'+id)).data;
  assert.equal(reopened.status,'active');assert.equal(reopened.correct_streak,0);assert.equal(reopened.wrong_count,2);assert.equal(reopened.review_count,2);
});

test('assisted correctness does not resolve a mistake and wrong review schedules a bounded retry',async t=>{
  const {api,makeWrong,setTime}=await fixture(t);await makeWrong();
  const id=(await api('GET','/learning/mistakes')).data.items[0].id;
  let result=(await review(api,id,'a',{assistance_used:['transcript']})).data;
  assert.equal(result.feedback.correct,true);assert.equal(result.feedback.counts_toward_resolution,false);assert.equal(result.mistake.correct_streak,0);
  setTime('2026-10-22T03:00:00Z');result=(await review(api,id,'b')).data;
  assert.equal(result.feedback.correct,false);assert.equal(result.mistake.wrong_count,2);assert.equal(result.mistake.due_at,'2026-10-22T03:10:00.000Z');
  assert.equal((await review(api,id)).status,409);
  setTime('2026-10-22T03:10:00Z');result=(await review(api,id)).data;assert.equal(result.mistake.correct_streak,1);assert.equal(result.mistake.review_count,3);
});

test('schema 8 backfills historical graded errors once without inventing errors from open tasks',()=>{
  const dir=mkdtempSync(join(tmpdir(),'oq-mistakes-')),file=join(dir,'migration.sqlite');let db;
  try{
    db=openDatabase(file);seedLearning(db);
    db.prepare('INSERT INTO users(id,email,password_hash,name,created_at) VALUES(1,?,?,?,?)').run('migration@test.invalid','fixture','Learner','2026-10-21T00:00:00Z');
    db.prepare('INSERT INTO learning_sessions VALUES(?,?,?,?,0,?,?,?,NULL)').run('s',1,'foundation-introductions-01',1,'{}','2026-10-21T00:00:00Z','2026-10-21T00:00:00Z');
    const insert=db.prepare('INSERT INTO learning_step_attempts VALUES(?,?,?,?,?,?,?)');
    insert.run('s','a','hash','listen-main','{}',JSON.stringify({assessment_status:'graded',correct:false}),'2026-10-21T00:00:00Z');
    insert.run('s','b','hash','speaking','{}',JSON.stringify({assessment_status:'self_review',correct:null}),'2026-10-21T00:00:00Z');
    db.exec('DROP TABLE learning_material_dictations; DROP TABLE learning_material_cues; DROP TABLE learning_material_playback; DROP TABLE learning_materials; DROP TABLE learning_phrase_links; DROP TABLE learning_phrase_collections; DROP TABLE learning_audio_review_requests; DROP TABLE learning_audio_reviews; DROP TABLE listening_practice_events; DROP TABLE listening_practice_sessions; DROP TABLE learning_ai_feedback; DROP TABLE learning_mistake_reviews; DROP TABLE learning_mistakes; PRAGMA user_version=7;');db.close();
    db=openDatabase(file);assert.equal(db.prepare('PRAGMA user_version').get().user_version,14);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM learning_mistakes').get().n,1);assert.equal(db.prepare('SELECT wrong_count FROM learning_mistakes').get().wrong_count,1);
    db.close();db=openDatabase(file);assert.equal(db.prepare('SELECT COUNT(*) n FROM learning_mistakes').get().n,1);
  }finally{db?.close();rmSync(dir,{recursive:true,force:true});}
});
