import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {createApp} from '../app.mjs';

async function fixture(t){
  const calls={translation:0};
  const gateway=createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const {task}=JSON.parse(raw);if(task==='translation')calls.translation++;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(task==='translation'?{translation:'Một thương hiệu tốt giúp công ty phát triển.'}:task==='reading'?{passage:'A brand is important. We hire a specialist.',questions:[{q:'What is important?',options:['A brand','A car'],correct:0,explanation:'The passage mentions a brand.'}]}:{feedback:'Your message is clear.'}));});
  gateway.listen(0,'127.0.0.1');await once(gateway,'listening');
  const app=createApp({ai:{url:`http://127.0.0.1:${gateway.address().port}`}});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(async()=>{app.server.closeAllConnections();await app.close();gateway.closeAllConnections();await new Promise(r=>gateway.close(r));});
  function client(){let cookie='';return async(method,path,body)=>{const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/v1${path}`,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};};}
  const api=client();await api('POST','/auth/register',{email:'consistency@test.invalid',name:'Learner',password:'test private password'});return {api,app,client,calls};
}

test('comprehensive lessons expose actual word/step counts and reuse matching sessions until deliberate restart',async t=>{
  const {api}=await fixture(t),set=(await api('POST','/sets',{title:'Six terms',words:['brand','chain','demand','diversify','enterprise','market'].map(term=>({term,definition:'nghĩa '+term}))})).data;
  const root=`/sets/${set.id}/lessons`,plan=(await api('GET',root)).data;assert.equal(plan.total_words,6);assert.equal(plan.lessons[0].word_count,5);assert.equal(plan.lessons[1].word_count,1);assert.equal(plan.lessons[0].reviewed_words,0);
  const l=(await api('GET',root+'/1')).data;assert.deepEqual(l.steps.map(s=>s.requires_ai),[false,false,false,true,true]);
  const start=(await api('POST',root+'/1/steps/1/start',{})).data;assert.equal(start.session.total_words,5);
  assert.equal((await api('POST',root+'/1/steps/1/start',{})).data.session.id,start.session.id);
  const answered=await api('POST',`/study/sessions/${start.session.id}/answers`,{question_id:start.session.question.id,answer:'',known:true});assert.equal(answered.status,200,JSON.stringify(answered));
  assert.equal((await api('POST',root+'/1/steps/1/start',{})).data.session.completed,1);
  assert.notEqual((await api('POST',root+'/1/steps/1/start',{resume:false})).data.session.id,start.session.id);
  assert.equal((await api('POST',root+'/1/steps/1/start',{resume:'true'})).status,400);
  const progress=(await api('GET',`/sets/${set.id}`)).data.progress;assert.equal(progress.state,'in_progress');assert.equal(progress.reviewed_words,1);assert.equal(progress.mastered_words,0);
});

test('comprehensive speaking completion requires whole target terms, not a matching substring',async t=>{
  const {api}=await fixture(t),set=(await api('POST','/sets',{title:'Brand',words:[{term:'brand',definition:'thương hiệu'}]})).data;
  const fake=(await api('POST','/ai/generate',{set_id:set.id,kind:'speaking_feedback',transcript:'I brandish a sword.'})).data;
  const path=`/sets/${set.id}/lessons/1/steps/4/complete`;
  assert.equal((await api('POST',path,{feedback_ids:[fake.id]})).error.code,'TARGET_WORDS_MISSING');
  const real=(await api('POST','/ai/generate',{set_id:set.id,kind:'speaking_feedback',transcript:'I like this brand.'})).data;
  assert.equal((await api('POST',path,{feedback_ids:[real.id]})).data.completed_steps,1);
  const overview=(await api('GET',`/sets/${set.id}/lessons`)).data.lessons[0];assert.equal(overview.completed_steps,1);assert.equal(overview.state,'in_progress');
});

test('set cards in paths report real progress consistently, never infer studying from first position',async t=>{
  const {api}=await fixture(t);
  const a=(await api('POST','/sets',{title:'First untouched',words:[{term:'hello',definition:'xin chào'}]})).data;
  const b=(await api('POST','/sets',{title:'Second studied',words:[{term:'world',definition:'thế giới'}]})).data;
  const word=(await api('GET',`/sets/${b.id}`)).data.words[0];await api('PATCH',`/words/${word.id}/progress`,{quality:4});
  const path=(await api('POST','/paths',{title:'Ordered',set_ids:[a.id,b.id]})).data;
  const cards=(await api('GET',`/paths/${path.id}`)).data.sets;assert.equal(cards[0].progress.state,'not_started');assert.equal(cards[1].progress.state,'in_progress');assert.equal(cards[1].progress.reviewed_words,1);assert.equal(cards[0].progress.total_words,1);
});

test('reading translation is explicit, private, cached across replay and never clears graded answers',async t=>{
  const {api,app,client,calls}=await fixture(t);
  const set=(await api('POST','/sets',{title:'Reading',words:[{term:'brand',definition:'thương hiệu'}]})).data;
  const attempt=(await api('POST','/exercise-attempts',{set_id:set.id,kind:'reading'})).data,path=`/exercise-attempts/${attempt.id}`;
  assert.equal((await api('POST',path+'/translation',{})).data.status,'missing');assert.equal(calls.translation,0);
  const question=(await api('GET',path+'/questions')).data.questions[0];await api('PUT',path+'/drafts',{answers:[{question_id:question.id,answer:question.options[0].id}]});
  const pair=await Promise.all([api('POST',path+'/translation',{allow_ai:true}),api('POST',path+'/translation',{allow_ai:true})]);assert.ok(pair.every(r=>r.status===200));assert.equal(calls.translation,1);
  assert.equal((await api('GET',path+'/questions')).data.questions[0].draft,question.options[0].id);
  const q=(await api('GET',path+'/questions')).data.questions;await api('POST',path+'/submit',{answers:q.map(x=>({question_id:x.id,skip:true}))});
  const before=app.db.prepare('SELECT state,completed_at FROM exercise_attempts WHERE id=?').get(attempt.id);
  assert.equal((await api('POST',path+'/translation',{allow_ai:false})).data.cached,true);assert.equal(calls.translation,1);assert.deepEqual(app.db.prepare('SELECT state,completed_at FROM exercise_attempts WHERE id=?').get(attempt.id),before);
  const bob=client();await bob('POST','/auth/register',{email:'consistency-bob@test.invalid',name:'Other',password:'other private password'});assert.equal((await bob('POST',path+'/translation',{allow_ai:true})).status,404);
});

test('synonym entry lookup returns exact prepared details without AI and never leaks another account private entries',async t=>{
  const {api,client,calls}=await fixture(t);
  const submit=(await api('GET','/dictionary/entry?q=submit')).data;assert.equal(submit.found,true);assert.equal(submit.speech_text,'submit');assert.ok(submit.entries.some(e=>e.source==='prepared_dictionary'&&e.example_translation));assert.equal(submit.ai_required,false);
  assert.equal((await api('GET','/dictionary/entry?q=submit%2C%20register')).data.found,false);
  await api('POST','/sets',{title:'Private dictionary',words:[{term:'secretlex',definition:'private meaning'}]});assert.equal((await api('GET','/dictionary/entry?q=secretlex')).data.found,true);
  const bob=client();await bob('POST','/auth/register',{email:'dictionary-bob@test.invalid',name:'Other',password:'other private password'});assert.equal((await bob('GET','/dictionary/entry?q=secretlex')).data.found,false);assert.equal(calls.translation,0);
});
