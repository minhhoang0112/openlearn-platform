import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {createApp} from '../app.mjs';

test('conversation: real opening, persistent vocabulary filters, private cached translation, atomic retries and history',async t=>{
  const calls=[];let rejectNext=false;
  const gateway=createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;const value=JSON.parse(body);calls.push(value);res.setHeader('Content-Type','application/json');if(rejectNext){rejectNext=false;res.statusCode=503;res.end('{}');return;}res.end(JSON.stringify(value.task==='translation'?{translation:'Bạn có muốn ứng tuyển công việc này không?'}:value.task==='conversation_hint'?{hint:'Hãy nói về kinh nghiệm làm việc.',example:'I would like to apply for this job.'}:{reply:value.input.action==='start'?'Would you like to apply for this job?':'Tell me more about your experience.'}));});
  gateway.listen(0,'127.0.0.1');await once(gateway,'listening');const app=createApp({ai:{url:`http://127.0.0.1:${gateway.address().port}`}});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(async()=>{app.server.closeAllConnections();await app.close();gateway.closeAllConnections();await new Promise(r=>gateway.close(r));});
  const base=`http://127.0.0.1:${app.server.address().port}/api/v1`;
  function client(){let cookie='';return async(method,path,body)=>{const r=await fetch(base+path,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};};}
  const alice=client(),bob=client();await alice('POST','/auth/register',{email:'convo-a@test.invalid',password:'long password for test',name:'Alice'});await bob('POST','/auth/register',{email:'convo-b@test.invalid',password:'long password for test',name:'Bob'});
  assert.equal((await alice('POST','/conversations',{set_id:163,settings:{starred_only:true}})).status,400);
  const words=(await alice('GET','/sets/163')).data.words;await alice('PATCH',`/words/${words[0].id}/progress`,{starred:true});
  const created=await alice('POST','/conversations',{set_id:163,settings:{language:'en',exam:'toeic',topic:'Job interview',starred_only:true,unmastered_only:true,ordered:true,no_vocab_hints:true}});assert.equal(created.status,201);assert.deepEqual(created.data.settings.word_ids,[words[0].id]);const id=created.data.id;
  assert.equal((await alice('POST','/conversations',{set_id:163,settings:{language:'fr'}})).status,400);
  assert.equal((await bob('GET',`/conversations/${id}`)).status,404);
  const started=await alice('POST',`/conversations/${id}/start`,{});assert.equal(started.status,200);assert.equal(started.data.messages.length,1);assert.equal(started.data.messages[0].role,'assistant');assert.equal(calls.at(-1).input.action,'start');assert.equal(calls.at(-1).input.topic,'Job interview');assert.equal(calls.at(-1).input.exam,'toeic');assert.equal(calls.at(-1).input.settings.no_vocab_hints,true);assert.deepEqual(calls.at(-1).input.words.map(w=>w.word_id),[words[0].id]);
  const callCount=calls.length;assert.equal((await alice('POST',`/conversations/${id}/start`,{})).data.replayed,true);assert.equal(calls.length,callCount);
  rejectNext=true;assert.equal((await alice('POST',`/conversations/${id}/messages`,{message:'I want to apply.'})).status,502);assert.equal((await alice('GET',`/conversations/${id}`)).data.messages.length,1);
  const sent=await alice('POST',`/conversations/${id}/messages`,{message:'I want to apply.'});assert.equal(sent.data.messages.length,3);assert.equal(calls.at(-1).input.history.length,1);
  const messageId=started.data.messages[0].id,translationPath=`/conversations/${id}/messages/${messageId}/translation`;
  assert.equal((await alice('POST',translationPath,{})).status,200);const afterTranslation=calls.length;assert.equal((await alice('POST',translationPath,{})).status,200);assert.equal(calls.length,afterTranslation);assert.equal((await bob('POST',translationPath,{})).status,404);
  assert.equal((await alice('POST',`/conversations/${id}/hint`,{})).data.example,'I would like to apply for this job.');assert.equal((await alice('GET',`/conversations/${id}`)).data.messages.length,3);
  assert.equal((await bob('DELETE',`/conversations/${id}`,{})).status,404);assert.equal((await alice('DELETE',`/conversations/${id}`,{})).status,200);assert.equal((await alice('GET',`/conversations/${id}`)).status,404);
});
