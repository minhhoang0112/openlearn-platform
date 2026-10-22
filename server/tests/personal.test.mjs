import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {createApp} from '../app.mjs';

test('personal app: no subscription gates, private notes, AI settings and generated examples',async t=>{
  const gateway=createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;const value=JSON.parse(body);res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value.task==='word_examples'?{examples:value.input.words.map(w=>({word_id:w.word_id,example:'I want to '+w.term+' for the job.',translation:'Tôi muốn ứng tuyển công việc.',synonyms:''}))}:{reply:'Hello from the test provider.'}));});
  gateway.listen(0,'127.0.0.1');await once(gateway,'listening');
  const app=createApp({ai:{url:`http://127.0.0.1:${gateway.address().port}`}});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(async()=>{app.server.closeAllConnections();await app.close();gateway.closeAllConnections();await new Promise(r=>gateway.close(r));});
  const base=`http://127.0.0.1:${app.server.address().port}/api/v1`;
  function client(){let cookie='';return async(method,path,body)=>{const r=await fetch(base+path,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};};}
  const alice=client(),bob=client();
  await alice('POST','/auth/register',{email:'personal-a@test.invalid',password:'personal learning password',name:'Alice'});
  await bob('POST','/auth/register',{email:'personal-b@test.invalid',password:'personal learning password',name:'Bob'});
  const caps=(await alice('GET','/capabilities')).data;assert.equal(caps.personal_use,true);assert.equal(caps.subscription_required,false);assert.equal(caps.payments,false);
  const english=(await alice('GET','/courses?language=en')).data.items;
  assert.equal(english.length,3);
  let lessonCount=0;
  for(const course of english){const detail=(await alice('GET','/courses/'+course.id)).data;for(const part of detail.parts)for(const summary of part.lessons){const lesson=await alice('GET','/course-lessons/'+summary.id);assert.equal(lesson.status,200);assert.equal(lesson.data.content.origin,'local_authored');assert.ok(lesson.data.content.questions.length>=4);lessonCount++;}}
  assert.equal(lessonCount,60);
  const word=(await alice('GET','/sets/163')).data.words[0];
  const note=await alice('PUT','/words/'+word.id+'/notes',{example:'I will apply for a new job tomorrow.',translation:'Tôi sẽ ứng tuyển một công việc mới vào ngày mai.'});assert.equal(note.status,200);
  assert.equal((await alice('GET','/sets/163')).data.words[0].example_source,'manual');
  assert.notEqual((await bob('GET','/sets/163')).data.words[0].example,note.data.example);
  const generated=await bob('POST','/ai/generate',{set_id:163,kind:'word_examples',word_ids:[word.id]});assert.equal(generated.status,201);
  assert.equal((await bob('GET','/sets/163')).data.words[0].example_source,'ai');
  assert.equal((await alice('GET','/sets/163')).data.words[0].example,note.data.example);
  assert.equal((await bob('POST','/ai/generate',{set_id:163,kind:'word_examples',word_ids:[99999999]})).status,400);
  const secret='test-secret-do-not-return';
  const settings=await alice('PUT','/settings/ai',{provider:'gemini',model:'gemini-3.8-flash',api_key:secret});assert.equal(settings.status,200);
  assert.ok(!JSON.stringify(settings).includes(secret));
  assert.ok(!JSON.stringify(await alice('GET','/settings/ai')).includes(secret));
  assert.equal((await bob('GET','/settings/ai')).data.key_configured,false);
  assert.equal((await alice('GET','/capabilities')).data.ai.pronunciation_audio,true);
  assert.equal((await alice('POST','/ai/generate',{set_id:163,kind:'pronunciation'})).status,400);
  assert.equal((await bob('POST','/settings/ai/test',{})).data.connected,true);
});
