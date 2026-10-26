import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../app.mjs';
import {seedLearning} from '../learning.mjs';
import {openDatabase} from '../database.mjs';

async function fixture(t,options={}){
  const app=createApp(options);app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(async()=>{app.server.closeAllConnections();await app.close();});
  function client(){let cookie='';return async(method,path,body,{binary=false,range}={})=>{
    const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/v1${path}`,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz',...(range?{Range:range}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];
    return binary?{status:r.status,bytes:Buffer.from(await r.arrayBuffer()),type:r.headers.get('content-type'),range:r.headers.get('content-range')}:{status:r.status,...await r.json()};
  };}
  const api=client();await api('POST','/auth/register',{email:'v2@test.invalid',name:'Learner',password:'private test password v2'});
  return {app,api,client};
}
const start=async(api,id='foundation-introductions-01')=>(await api('POST','/learning/sessions',{lesson_id:id})).data;
const response=s=>s.current.response_schema==='choice'?{option_id:s.current.options[0].id}:s.current.response_schema==='text'?{text:'I am a student. I live in Hanoi.',self_reviewed:true}:{acknowledged:true,reflection:'I want to practise student.'};
async function complete(api,s){
  while(s.current){const step=s.current.id;
    const submitted=await api('POST',`/learning/sessions/${s.id}/submit`,{step_id:step,revision:s.revision,submission_id:randomUUID(),response:response(s)});assert.equal(submitted.status,200,JSON.stringify(submitted));
    const advanced=await api('POST',`/learning/sessions/${s.id}/advance`,{step_id:step,revision:submitted.data.session.revision});assert.equal(advanced.status,200);s=advanced.data;
  }return s;
}

test('pilot catalog has distinct tracks, actual saved WAV audio, range support and no private answer keys',async t=>{
  const {api,client}=await fixture(t);
  assert.equal((await client()('GET','/learning/programs')).status,401);
  const programs=(await api('GET','/learning/programs')).data.items;
  assert.equal(programs.length,2);assert.ok(programs.every(p=>p.status==='pilot'));
  assert.equal(programs.find(p=>p.id==='english-foundation').lesson_count,18);assert.equal(programs.find(p=>p.id==='english-it-system').lesson_count,9);
  const general=(await api('GET','/learning/programs/english-foundation')).data;
  assert.equal(general.units[0].lessons[0].id,'foundation-introductions-01');
  const s=await start(api);assert.equal(s.total_steps,7);assert.equal(s.provenance.audio_source,'windows_tts');
  assert.equal(s.current.answer,undefined);assert.equal(s.current.explanation,undefined);assert.ok(s.steps.every(step=>!Object.hasOwn(step,'answer')));
  const media=await api('GET',s.media.url.replace('/api/v1',''),undefined,{binary:true});
  assert.equal(media.status,200);assert.equal(media.type,'audio/wav');assert.equal(media.bytes.toString('ascii',0,4),'RIFF');assert.ok(s.media.duration_ms>5000);
  const part=await api('GET','/learning/media/'+s.media.id,undefined,{binary:true,range:'bytes=0-43'});
  assert.equal(part.status,206);assert.equal(part.bytes.length,44);assert.deepEqual(part.bytes,media.bytes.subarray(0,44));
  assert.equal((await api('GET','/learning/media/'+s.media.id,undefined,{binary:true,range:'bytes=999999999-'})).status,416);
  assert.equal((await api('GET','/learning/media/not-a-file')).status,404);
});

test('V2 session enforces ownership, revision, draft validation, idempotent grading and feedback-before-advance',async t=>{
  const {api,client,app}=await fixture(t);let s=await start(api),base='/learning/sessions/'+s.id;
  assert.equal((await start(api)).id,s.id);
  const bob=client();await bob('POST','/auth/register',{email:'v2-other@test.invalid',name:'Other',password:'another private password'});
  assert.equal((await bob('GET',base)).status,404);
  assert.equal((await api('POST',base+'/advance',{step_id:s.current.id,revision:s.revision})).status,409);
  assert.equal((await api('PUT',base+'/draft',{step_id:s.current.id,revision:s.revision,response:{option_id:'not-an-option'}})).status,400);
  assert.equal((await api('GET',base)).data.revision,0);
  const oldRevision=s.revision;
  s=(await api('PUT',base+'/draft',{step_id:s.current.id,revision:s.revision,response:{option_id:'b'}})).data;
  assert.equal((await api('PUT',base+'/draft',{step_id:s.current.id,revision:oldRevision,response:{option_id:'a'}})).status,409);
  assert.equal((await api('GET',base)).data.current.draft.option_id,'b');
  const body={step_id:s.current.id,revision:s.revision,submission_id:randomUUID(),response:{option_id:'b'},assistance_used:['transcript']};
  const submitted=(await api('POST',base+'/submit',body)).data;
  assert.equal(submitted.feedback.correct,false);assert.equal(submitted.session.cursor,0);assert.equal(submitted.session.current.state,'feedback');
  assert.equal((await api('POST',base+'/submit',body)).data.replayed,true);
  assert.equal((await api('POST',base+'/submit',{...body,response:{option_id:'a'}})).status,409);
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM learning_step_attempts WHERE session_id=?').get(s.id).n,1);
  s=(await api('POST',base+'/advance',{step_id:s.current.id,revision:submitted.session.revision})).data;
  assert.equal(s.cursor,1);assert.equal((await api('GET',base)).data.cursor,1);
  s=await complete(api,s);assert.equal(s.status,'completed');assert.equal(s.summary.mastered,false);assert.equal(s.summary.graded_correct,1);assert.equal(s.summary.graded_total,2);
  assert.equal(s.results.speaking.assessment_status,'self_review');assert.equal(s.results.speaking.correct,null);
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM learning_step_attempts WHERE session_id=?').get(s.id).n,7);
  assert.equal((await api('GET','/learning/programs/english-foundation')).data.units[0].lessons[0].completed_at,s.completed_at);
});

test('today plan is stable across reload/profile changes, respects local dates and never assigns system to general users',async t=>{
  let instant=new Date('2026-10-20T18:00:00Z');const {api,app}=await fixture(t,{learningClock:()=>instant});
  const first=(await api('GET','/learning/today')).data;
  assert.equal(first.local_date,'2026-10-21');assert.equal(first.items[0].lesson_id,'foundation-introductions-01');
  assert.equal((await api('GET','/learning/today')).data.plan_id,first.plan_id);
  await api('PUT','/learning/profile',{focus:'system',time_budget_minutes:15});
  assert.equal((await api('GET','/learning/today')).data.budget_minutes,30);
  const s=await start(api);assert.equal((await api('GET','/learning/today')).data.resume_session_id,s.id);
  await complete(api,s);
  assert.equal((await api('GET','/learning/today')).data.status,'completed');
  for(const l of (await api('GET','/learning/programs/english-foundation')).data.units.flatMap(u=>u.lessons).filter(l=>l.id!=='foundation-introductions-01'))await complete(api,await start(api,l.id));
  instant=new Date('2026-10-21T18:00:00Z');
  const second=(await api('GET','/learning/today')).data;
  assert.notEqual(second.plan_id,first.plan_id);assert.equal(second.budget_minutes,15);assert.equal(second.items.find(i=>i.kind==='lesson').lesson_id,'system-introductions-01');
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM daily_learning_plans').get().n,2);
  await complete(api,await start(api,'system-introductions-01'));
  for(const l of (await api('GET','/learning/programs/english-it-system')).data.units.flatMap(u=>u.lessons).filter(l=>l.id!=='system-introductions-01'))await complete(api,await start(api,l.id));
  instant=new Date('2026-10-22T18:00:00Z');
  const finished=(await api('GET','/learning/today')).data;
  assert.equal(finished.items.some(i=>i.kind==='lesson'),false,'no new lesson after both catalogs are complete');
  assert.ok(finished.items.every(i=>['review','mistake_review'].includes(i.kind)),'real due reviews can remain after curriculum completion');
});

test('weekly schedule is frozen per day, rest days keep real reviews/resume and manual study remains open',async t=>{
  let instant=new Date('2026-10-24T03:00:00Z');
  const {api,app}=await fixture(t,{learningClock:()=>instant});
  let today=(await api('GET','/learning/today')).data;
  assert.equal(today.local_date,'2026-10-24');assert.equal(today.scheduled_day,false);assert.equal(today.status,'rest_day');assert.equal(today.items.length,0);
  await api('PUT','/learning/profile',{preferred_days:[6,7]});
  assert.equal((await api('GET','/learning/today')).data.scheduled_day,false,'changing profile must not silently replan today');
  assert.deepEqual((await api('GET','/learning/today')).data.preferred_days,[1,2,3,4,5]);
  const s=await start(api);assert.equal(s.status,'active','rest day must not lock manual study');
  const manual=(await api('GET','/learning/today')).data;
  assert.equal(manual.resume_session_id,s.id);assert.equal(manual.resume_route,'/lesson-run/'+s.id);assert.equal(manual.items.length,0,'resume link must not rewrite the frozen day plan');
  await api('PUT','/learning/profile',{preferred_days:[1]});
  const word=app.db.prepare('SELECT id FROM words LIMIT 1').get();
  const user=app.db.prepare('SELECT id FROM users WHERE email=?').get('v2@test.invalid');
  app.db.prepare('INSERT INTO word_progress(user_id,word_id,due_at) VALUES(?,?,?)').run(user.id,word.id,'2026-10-20T00:00:00Z');
  instant=new Date('2026-10-25T03:00:00Z');today=(await api('GET','/learning/today')).data;
  assert.equal(today.scheduled_day,false);assert.equal(today.resume_session_id,s.id);assert.equal(today.items.find(i=>i.kind==='review').due_count,1);
  const items=JSON.parse(app.db.prepare('SELECT items FROM daily_learning_plans WHERE id=?').get(today.plan_id).items).items;
  app.db.prepare('UPDATE daily_learning_plans SET items=? WHERE id=?').run(JSON.stringify(items),today.plan_id);
  const legacy=(await api('GET','/learning/today')).data;assert.equal(legacy.schedule_policy,'legacy_unrestricted');assert.equal(legacy.scheduled_day,null);assert.equal(legacy.resume_session_id,s.id);
});

test('new foundation lessons contain distinct real audio and gradable tasks and can complete without AI',async t=>{
  const {api}=await fixture(t);
  for(const id of ['foundation-time-01','foundation-help-01','foundation-routine-01']){
    let s=await start(api,id);assert.ok(s.media.duration_ms>5000);
    const bytes=(await api('GET','/learning/media/'+id,undefined,{binary:true})).bytes;assert.equal(bytes.toString('ascii',0,4),'RIFF');
    s=await complete(api,s);assert.equal(s.summary.graded_correct,id==='foundation-routine-01'?3:2);assert.equal(s.status,'completed');
  }
});

test('content versions and drafts survive DB reopening; seed does not overwrite existing lesson versions or progress',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'oq-learning-v2-'));
  const db=openDatabase(join(dir,'learning.sqlite'));t.after(()=>db.close());
  seedLearning(db);
  const l=db.prepare('SELECT * FROM learning_lesson_versions WHERE lesson_id=?').get('foundation-introductions-01');
  const custom={...JSON.parse(l.content),title:'Existing immutable version'};
  db.prepare('UPDATE learning_lesson_versions SET content=? WHERE lesson_id=?').run(JSON.stringify(custom),l.lesson_id);
  seedLearning(db);assert.equal(JSON.parse(db.prepare('SELECT content FROM learning_lesson_versions WHERE lesson_id=?').get(l.lesson_id).content).title,custom.title);
  const {api,app}=await fixture(t,{database:join(dir,'active.sqlite')});t.after(()=>rmSync(dir,{recursive:true,force:true}));let s=await start(api);
  s=(await api('PUT',`/learning/sessions/${s.id}/draft`,{step_id:s.current.id,revision:0,response:{option_id:'b'}})).data;
  const other=openDatabase(join(dir,'active.sqlite'));try{const persisted=other.prepare('SELECT state FROM learning_sessions WHERE id=?').get(s.id);assert.equal(JSON.parse(persisted.state).draft.option_id,'b');}finally{other.close();}
  const newer={...JSON.parse(l.content),version:2,title:'Second version'};
  app.db.prepare('INSERT INTO learning_lesson_versions VALUES(?,?,?,?,?,?,1)').run(l.lesson_id,2,l.program_id,newer.title,0,JSON.stringify(newer));
  assert.equal((await api('GET','/learning/sessions/'+s.id)).data.content_version,1);
  assert.equal((await start(api)).content_version,2);
});
