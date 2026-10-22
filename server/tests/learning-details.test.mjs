import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {createApp} from '../app.mjs';

test('flashcard details: preserve existing examples, cache translations, deduplicate requests and isolate personal notes',async t=>{
  let calls=0;
  const gateway=createServer(async(req,res)=>{
    let raw='';for await(const chunk of req)raw+=chunk;
    const {input}=JSON.parse(raw);calls++;
    await new Promise(r=>setTimeout(r,30));
    res.setHeader('Content-Type','application/json');
    res.end(JSON.stringify({examples:input.words.map(w=>({word_id:w.word_id,example:w.example||'My mother is in the kitchen.',translation:'Mẹ tôi đang ở trong bếp.',synonyms:'mom; mum; mommy'}))}));
  });
  gateway.listen(0,'127.0.0.1');await once(gateway,'listening');
  const app=createApp({ai:{url:`http://127.0.0.1:${gateway.address().port}`}});
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(async()=>{app.server.closeAllConnections();await app.close();gateway.closeAllConnections();await new Promise(r=>gateway.close(r));});
  const base=`http://127.0.0.1:${app.server.address().port}/api/v1`;
  function client(){let cookie='';return async(method,path,body)=>{
    const r=await fetch(base+path,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];
    return {status:r.status,...await r.json()};
  };}
  const alice=client(),bob=client(),guest=client();
  for(const [api,name]of [[alice,'alice'],[bob,'bob']])await api('POST','/auth/register',{email:name+'@details.test',password:'a private learning password',name});
  const created=(await alice('POST','/sets',{title:'My family',visibility:'public',words:[{term:'mother',definition:'mẹ',example:'My mother is in the kitchen.'},{term:'father',definition:'bố'}]})).data;
  const words=(await alice('GET','/sets/'+created.id)).data.words;
  const endpoint='/words/'+words[0].id+'/learning-details';
  assert.equal((await guest('POST',endpoint,{})).status,401);
  const [first,second]=await Promise.all([alice('POST',endpoint,{}),alice('POST',endpoint,{})]);
  assert.equal(first.status,200);assert.equal(second.status,200);assert.equal(calls,1);
  assert.equal(first.data.example,words[0].example);assert.equal(first.data.example_translation,'Mẹ tôi đang ở trong bếp.');
  assert.equal(first.data.synonyms,'mom; mum; mommy');
  await alice('POST',endpoint,{});assert.equal(calls,1);
  assert.equal((await bob('GET','/sets/'+created.id)).data.words[0].example_translation,'');
  assert.equal((await alice('GET','/sets/'+created.id)).data.words[0].example_translation,'Mẹ tôi đang ở trong bếp.');
  const privateSet=(await alice('POST','/sets',{title:'Private',words:[{term:'friend',definition:'bạn'}]})).data;
  const privateWord=(await alice('GET','/sets/'+privateSet.id)).data.words[0];
  assert.equal((await bob('POST','/words/'+privateWord.id+'/learning-details',{})).status,404);
  const blank=await alice('POST','/words/'+words[1].id+'/learning-details',{});
  assert.equal(blank.status,200);assert.ok(blank.data.example);assert.ok(blank.data.example_translation);
});
