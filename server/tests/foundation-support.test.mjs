import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync,rmdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createApp} from '../app.mjs';

const credentials={email:'support@test.invalid',name:'Learner',password:'private support password'};
function client(app){let cookie='';return async(method,path,body)=>{
  const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/v1${path}`,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};
};}
async function fixture(t,options={}){
  const app=createApp(options);let closed=false;app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  const close=async()=>{if(!closed){closed=true;app.server.closeAllConnections();await app.close();}};t.after(close);
  const api=client(app),user=(await api('POST','/auth/register',credentials)).data;
  const start=async(id='foundation-introductions-01')=>(await api('POST','/learning/sessions',{lesson_id:id,resume:false})).data;
  return {app,api,user,start,close};
}
const submit=(api,s)=>api('POST',`/learning/sessions/${s.id}/submit`,{step_id:s.current.id,revision:s.revision,submission_id:randomUUID(),response:{option_id:s.current.options[0].id},assistance_used:[]});

test('four authored support packs contain bilingual learning material without changing pinned lessons, grades or activity',async t=>{
  const {api,app,start}=await fixture(t);let terms=0;
  for(const id of ['foundation-introductions-01','foundation-time-01','foundation-help-01','foundation-routine-01']){
    const before=app.db.prepare('SELECT content FROM learning_lesson_versions WHERE lesson_id=? AND version=1').get(id).content,s=await start(id);
    assert.equal(s.learning_support.available,true);const r=await api('POST',`/learning/sessions/${s.id}/support/open`,{step_id:s.current.id});assert.equal(r.status,200);
    const p=r.data.support;assert.equal(p.lesson_id,id);assert.equal(p.content_version,1);assert.equal(p.support_version,1);terms+=p.vocabulary.length;
    assert.ok(p.vocabulary.every(w=>w.term&&w.word_type&&w.meaning&&w.example&&w.translation));assert.ok(p.grammar.every(g=>g.explanation&&g.pattern&&g.examples.every(e=>e.en&&e.vi)));assert.equal(p.practice.length,2);
    assert.equal(r.data.session.cursor,0);assert.equal(r.data.session.revision,s.revision);assert.equal(r.data.session.current.answer,undefined);assert.equal(r.data.session.current.explanation,undefined);
    assert.equal(app.db.prepare('SELECT content FROM learning_lesson_versions WHERE lesson_id=? AND version=1').get(id).content,before);
  }
  assert.equal(terms,25);assert.equal(app.db.prepare('SELECT COUNT(*) n FROM generated_content').get().n,0);assert.equal(app.db.prepare('SELECT COUNT(*) n FROM learning_step_attempts').get().n,0);assert.equal((await api('GET','/learning/activity')).data.total,0);
});

test('support preserves drafts and revisions, and assistance survives reload and a client claiming no help',async t=>{
  const {api,start}=await fixture(t);let s=await start();
  const draft=await api('PUT',`/learning/sessions/${s.id}/draft`,{step_id:s.current.id,revision:s.revision,response:{option_id:'a'}});s=draft.data;
  const path=`/learning/sessions/${s.id}/support/open`,body={step_id:s.current.id};
  const opened=(await api('POST',path,body)).data;assert.deepEqual(opened.session.current.draft,{option_id:'a'});assert.equal(opened.session.revision,s.revision);assert.equal(opened.recorded_as_assistance,true);
  const again=(await api('POST',path,body)).data;assert.equal(again.session.revision,s.revision);
  s=(await api('GET',`/learning/sessions/${s.id}`)).data;assert.equal(s.learning_support.used_before_submission,true);
  const submission={step_id:s.current.id,revision:s.revision,submission_id:randomUUID(),response:{option_id:'a'},assistance_used:[]};
  const graded=await api('POST',`/learning/sessions/${s.id}/submit`,submission);assert.equal(graded.data.feedback.correct,true);assert.deepEqual(graded.data.feedback.assistance_used,['learning_support']);
  assert.equal((await api('POST',`/learning/sessions/${s.id}/submit`,submission)).data.replayed,true);
  const progress=(await api('GET','/learning/progress')).data.skills.find(s=>s.key==='listening');assert.equal(progress.assisted_graded,1);assert.equal(progress.unassisted_graded,0);
});

test('viewing support after grading does not rewrite earlier evidence or mark a later step automatically',async t=>{
  const {api,start}=await fixture(t),s=await start();const graded=(await submit(api,s)).data;
  assert.deepEqual(graded.feedback.assistance_used,[]);
  const result=(await api('POST',`/learning/sessions/${s.id}/support/open`,{step_id:s.current.id})).data;assert.equal(result.recorded_as_assistance,false);assert.deepEqual(result.session.current.feedback.assistance_used,[]);
  const advanced=(await api('POST',`/learning/sessions/${s.id}/advance`,{step_id:s.current.id,revision:graded.session.revision})).data;
  assert.equal(advanced.learning_support.used_before_submission,false);
  assert.equal((await api('POST',`/learning/sessions/${s.id}/support/open`,{step_id:s.current.id})).status,409,'old/future steps cannot be opened through a stale request');
});

test('support enforces ownership and exact content version/fingerprint, without borrowing notes for another lesson',async t=>{
  const {api,app,start}=await fixture(t),s=await start();
  assert.equal((await client(app)('POST',`/learning/sessions/${s.id}/support/open`,{step_id:s.current.id})).status,401);
  const other=client(app);await other('POST','/auth/register',{...credentials,email:'other-support@test.invalid'});assert.equal((await other('POST',`/learning/sessions/${s.id}/support/open`,{step_id:s.current.id})).status,404);
  assert.equal((await api('POST',`/learning/sessions/${s.id}/support/open`,{step_id:'grammar'})).status,409);
  const outside=await start('system-introductions-01');assert.equal(outside.learning_support.available,false);assert.equal((await api('POST',`/learning/sessions/${outside.id}/support/open`,{step_id:outside.current.id})).status,404);
  const row=app.db.prepare('SELECT * FROM learning_lesson_versions WHERE lesson_id=? AND version=1').get(s.lesson_id);
  app.db.prepare('INSERT INTO learning_lesson_versions VALUES(?,?,?,?,?,?,1)').run(row.lesson_id,2,row.program_id,row.title,row.position,row.content);
  const newer=await start();assert.equal(newer.content_version,2);assert.equal(newer.learning_support.available,false);assert.equal((await api('GET',`/learning/sessions/${s.id}`)).data.learning_support.available,true);
  const altered=JSON.parse(row.content);altered.translation='Custom saved lesson';app.db.prepare('UPDATE learning_lesson_versions SET content=? WHERE lesson_id=? AND version=1').run(JSON.stringify(altered),s.lesson_id);
  assert.equal((await api('GET',`/learning/sessions/${s.id}`)).data.learning_support.available,false);
});

test('opened support evidence survives DB reopening without generating content or overwriting the saved draft',async t=>{
  const folder=mkdtempSync(join(tmpdir(),'openlearn-support-')),file=join(folder,'test.sqlite');
  const {api,start,close}=await fixture(t,{database:file});const s=await start();
  await api('PUT',`/learning/sessions/${s.id}/draft`,{step_id:s.current.id,revision:s.revision,response:{option_id:'a'}});
  await api('POST',`/learning/sessions/${s.id}/support/open`,{step_id:s.current.id});await close();
  const reopened=createApp({database:file});reopened.server.listen(0,'127.0.0.1');await once(reopened.server,'listening');
  t.after(async()=>{reopened.server.closeAllConnections();await reopened.close();for(const suffix of ['', '-wal', '-shm'])rmSync(file+suffix,{force:true});rmdirSync(folder);});
  const restored=client(reopened);await restored('POST','/auth/login',{email:credentials.email,password:credentials.password});
  const current=(await restored('GET',`/learning/sessions/${s.id}`)).data;assert.equal(current.learning_support.used_before_submission,true);assert.deepEqual(current.current.draft,{option_id:'a'});assert.equal(current.cursor,0);assert.equal(current.revision,1);
  assert.deepEqual((await submit(restored,current)).data.feedback.assistance_used,['learning_support']);
});
