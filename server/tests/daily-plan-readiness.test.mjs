import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {createApp} from '../app.mjs';

async function fixture(t){
  let instant=new Date('2026-10-20T18:00:00Z');const app=createApp({learningClock:()=>instant});
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(async()=>{app.server.closeAllConnections();await app.close();});
  const client=()=>{let cookie='';return async(method,path,body)=>{
    const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/v1${path}`,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};
  };};
  const api=client(),user=(await api('POST','/auth/register',{email:'planner@test.invalid',name:'Learner',password:'private planning password'})).data;
  await api('PUT','/learning/profile',{time_budget_minutes:15});
  const advance=async(session,count=1)=>{
    let s=session;
    for(let n=0;n<count&&s.current;n++){
      const q=s.current,l=JSON.parse(app.db.prepare('SELECT content FROM learning_lesson_versions WHERE lesson_id=? AND version=?').get(s.lesson_id,s.content_version).content),step=l.steps.find(i=>i.id===q.id);
      const response=q.response_schema==='choice'?{option_id:step.answer}:q.response_schema==='text'?{text:'I am a student. I study every day.',self_reviewed:true}:{acknowledged:true};
      const submitted=await api('POST',`/learning/sessions/${s.id}/submit`,{step_id:q.id,revision:s.revision,submission_id:randomUUID(),response});assert.equal(submitted.status,200,JSON.stringify(submitted));
      const moved=await api('POST',`/learning/sessions/${s.id}/advance`,{step_id:q.id,revision:submitted.data.session.revision});assert.equal(moved.status,200);s=moved.data;
    }return s;
  };
  const start=async plan=>{const item=plan.items.find(i=>i.kind==='lesson'&&i.status!=='completed');return api('POST',`/learning/today/items/${encodeURIComponent(item.id)}/start`,{plan_id:plan.plan_id,revision:plan.plan_revision});};
  return {api,app,client,user,advance,start,setTime:value=>{instant=new Date(value);}};
}

test('15 minute plan splits a 20 minute lesson and completes only the daily goal, preserving the remaining lesson',async t=>{
  const {api,advance,start}=await fixture(t),p=(await api('GET','/learning/today')).data,item=p.items.find(i=>i.kind==='lesson');
  assert.equal(item.workload.full_lesson_estimated_minutes,20);assert.equal(item.estimated_minutes,15);assert.equal(item.workload.planned_steps,5);assert.equal(p.plan_revision,0);
  assert.ok(p.items.reduce((n,i)=>n+i.estimated_minutes,0)<=15);
  let started=await start(p);assert.equal(started.status,201);const s=started.data.session;
  assert.equal((await start(p)).data.session.id,s.id,'repeated start resumes the same work');
  await advance(s,item.workload.planned_steps);
  const after=(await api('GET','/learning/today')).data;
  assert.equal(after.status,'completed');assert.equal(after.items[0].lesson_completed,false);assert.equal(after.items[0].completed_planned_steps,5);assert.equal(after.estimated_remaining_minutes,0);
  assert.equal((await api('GET',`/learning/sessions/${s.id}`)).data.cursor,5);
  assert.equal((await start(p)).status,409);
  assert.equal((await api('GET','/learning/programs/english-foundation')).data.units[0].lessons[0].completed_at,null,'daily goal completion does not invent full-lesson completion');
});

test('explicit adjustment keeps drafts, completed goals, profile and session; stale requests and foreign plans cannot overwrite it',async t=>{
  const {api,client,advance,start,setTime}=await fixture(t);let p=(await api('GET','/learning/today')).data;
  const s=(await start(p)).data.session,draft={option_id:'a'};
  assert.equal((await api('PUT',`/learning/sessions/${s.id}/draft`,{step_id:s.current.id,revision:s.revision,response:draft})).status,200);
  const body={plan_id:p.plan_id,revision:p.plan_revision,remaining_minutes:5};
  const adjusted=await api('POST','/learning/today/adjust',body);assert.equal(adjusted.status,200);p=adjusted.data;
  assert.equal(p.plan_revision,1);assert.equal(p.budget_minutes,5);assert.equal(p.items[0].workload.planned_steps,1);
  assert.deepEqual((await api('GET',`/learning/sessions/${s.id}`)).data.current.draft,draft);
  assert.equal((await api('GET','/learning/profile')).data.time_budget_minutes,15);
  assert.equal((await api('POST','/learning/today/adjust',body)).status,409);
  assert.equal((await start(p)).data.session.id,s.id);
  await advance((await api('GET',`/learning/sessions/${s.id}`)).data);
  const next=await api('POST','/learning/today/adjust',{plan_id:p.plan_id,revision:p.plan_revision,remaining_minutes:10});assert.equal(next.status,200);p=next.data;
  assert.equal(p.items.filter(i=>i.status==='completed').length,1);assert.equal(p.items.find(i=>i.status!=='completed').workload.start_cursor,1);assert.equal(new Set(p.items.map(i=>i.id)).size,p.items.length);
  const other=client();await other('POST','/auth/register',{email:'planner-other@test.invalid',name:'Other',password:'other private password'});
  assert.equal((await other('POST','/learning/today/adjust',{plan_id:p.plan_id,revision:p.plan_revision,remaining_minutes:10})).status,409);
  for(const remaining_minutes of [0,4,91,'bad'])assert.equal((await api('POST','/learning/today/adjust',{plan_id:p.plan_id,revision:p.plan_revision,remaining_minutes})).status,400);
  setTime('2026-10-21T18:00:00Z');assert.equal((await api('POST','/learning/today/adjust',{plan_id:p.plan_id,revision:p.plan_revision,remaining_minutes:10})).status,409);
});

test('daily start pins the selected content version and a later retake does not reopen a completed goal',async t=>{
  const {api,app,advance,start}=await fixture(t);const plan=(await api('GET','/learning/today')).data;
  const row=app.db.prepare('SELECT * FROM learning_lesson_versions WHERE lesson_id=? AND version=1').get('foundation-introductions-01');
  app.db.prepare('INSERT INTO learning_lesson_versions VALUES(?,?,?,?,?,?,1)').run(row.lesson_id,2,row.program_id,'New revision',row.position,row.content);
  const s=(await start(plan)).data.session;assert.equal(s.content_version,1);
  await advance(s,5);
  const retake=(await api('POST','/learning/sessions',{lesson_id:s.lesson_id,resume:false})).data;assert.equal(retake.content_version,2);
  const after=(await api('GET','/learning/today')).data;assert.equal(after.items[0].status,'completed');assert.equal(after.items[0].session_id,s.id);
});

test('due word and mistake reviews fit within budget; reducing remaining time defers tasks instead of exceeding the goal',async t=>{
  const {api,app,user}=await fixture(t);
  const s=(await api('POST','/learning/sessions',{lesson_id:'foundation-introductions-01'})).data;
  assert.equal((await api('POST',`/learning/sessions/${s.id}/submit`,{step_id:s.current.id,revision:s.revision,submission_id:randomUUID(),response:{option_id:'b'}})).status,200);
  const word=app.db.prepare('SELECT id FROM words LIMIT 1').get();app.db.prepare('INSERT INTO word_progress(user_id,word_id,due_at) VALUES(?,?,?)').run(user.id,word.id,'2026-10-20T00:00:00Z');
  let p=(await api('GET','/learning/today')).data;assert.ok(p.items.some(i=>i.kind==='review'));assert.ok(p.items.some(i=>i.kind==='mistake_review'));assert.ok(p.items.some(i=>i.kind==='lesson'));assert.ok(p.items.reduce((n,i)=>n+i.estimated_minutes,0)<=15);
  p=(await api('POST','/learning/today/adjust',{plan_id:p.plan_id,revision:p.plan_revision,remaining_minutes:5})).data;
  assert.equal(p.items.length,1);assert.equal(p.items[0].kind,'review');assert.equal(p.deferred.length,2);assert.equal(p.estimated_remaining_minutes,5);
});

test('readiness is exact, personal, does not call AI and tells missing content apart from optional AI',async t=>{
  const {api,client}=await fixture(t);
  const set=(await api('POST','/sets',{title:'Readiness',words:[{term:'appraise',definition:'đánh giá'},{term:'hello',definition:'xin chào'}]})).data;
  const words=(await api('GET',`/sets/${set.id}`)).data.words;
  let r=(await api('GET',`/sets/${set.id}/readiness`)).data;
  assert.equal(r.modes.find(m=>m.id==='comprehensive_core').ready,true);assert.equal(r.modes.find(m=>m.id==='grammar_order').ready,false);assert.equal(r.modes.find(m=>m.id==='speaking').blocked_reason,'AI_NOT_CONFIGURED');assert.ok(r.missing_example_ids.includes(words[0].id));
  await api('PUT',`/words/${words[0].id}/notes`,{example:'We appraise the project.',translation:'Chúng tôi đánh giá dự án.'});
  r=(await api('GET',`/sets/${set.id}/readiness?word_ids=${words[0].id}`)).data;assert.equal(r.total_words,1);assert.equal(r.modes.find(m=>m.id==='grammar_translate').ready,true);
  assert.equal((await api('GET',`/sets/${set.id}/readiness?word_ids=9999999`)).status,400);
  assert.equal((await client()('GET',`/sets/${set.id}/readiness`)).status,401);
  const bob=client();await bob('POST','/auth/register',{email:'readiness-other@test.invalid',name:'Other',password:'other private password'});assert.equal((await bob('GET',`/sets/${set.id}/readiness`)).status,404);
  await api('PATCH',`/sets/${set.id}`,{visibility:'public'});
  const bobView=(await bob('GET',`/sets/${set.id}/readiness?word_ids=${words[0].id}`)).data;
  assert.equal(bobView.examples_available,0,'a shared public set must not expose another learner personal example');
  assert.equal((await api('GET',`/sets/${set.id}/readiness?word_ids=${words[0].id}`)).data.examples_available,1);
  const empty=(await api('POST','/sets',{title:'Empty'})).data;assert.ok((await api('GET',`/sets/${empty.id}/readiness`)).data.modes.every(m=>!m.ready&&m.blocked_reason==='EMPTY_SET'));
});

test('three actual core steps complete comprehensive learning without AI; extension stays optional and uncompleted',async t=>{
  const {api}=await fixture(t);
  const set=(await api('POST','/sets',{title:'Core',words:[{term:'appraise',definition:'đánh giá'}]})).data;
  const root=`/sets/${set.id}/lessons/1`;
  for(let step=1;step<=3;step++){
    let s=(await api('POST',`${root}/steps/${step}/start`,{})).data.session;
    while(s.question){const q=s.question;const r=await api('POST',`/study/sessions/${s.id}/answers`,{question_id:q.id,answer:step===3?'appraise':'đánh giá',...(step===1?{known:true}:{})});assert.equal(r.status,200);s=r.data.session;}
    assert.equal((await api('POST',`${root}/steps/${step}/complete`,{session_id:s.id})).status,200);
  }
  const result=(await api('GET',root)).data;assert.equal(result.completed,true);assert.equal(result.core_completed,true);assert.equal(result.all_steps_completed,false);assert.equal(result.completed_core_steps,3);assert.equal(result.completed_steps,3);
  assert.deepEqual(result.steps.map(s=>s.required),[true,true,true,false,false]);assert.equal(result.steps[3].available,false);assert.equal(result.steps[3].completed,false);
  assert.equal((await api('POST',root+'/steps/4/start',{})).status,503);
  const summary=(await api('GET',`/sets/${set.id}/lessons`)).data.lessons[0];assert.equal(summary.state,'completed');assert.equal(summary.total_core_steps,3);
});
