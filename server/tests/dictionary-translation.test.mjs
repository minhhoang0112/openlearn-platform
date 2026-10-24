import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createApp} from '../app.mjs';

async function fixture(t,fetchImpl){
  let calls=0;const urls=[];
  const app=createApp({dictionary:{fetchImpl:async(url,options)=>{calls++;urls.push(new URL(url));return fetchImpl(url,options);}}});
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(async()=>{app.server.closeAllConnections();await app.close();});
  function client(){let cookie='';return async(method,path,body)=>{const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/v1${path}`,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};};}
  const api=client();await api('POST','/auth/register',{email:'translation@test.invalid',name:'Learner',password:'test private password'});
  return {api,client,urls,calls:()=>calls};
}
const root='/dictionary/translate';
const ok=value=>Response.json({responseStatus:200,responseData:{translatedText:value}});

test('tail never becomes detail: missing exact words and sentences use online EN/VI translation, not substring matches',async t=>{
  const f=await fixture(t,url=>ok(new URL(url).searchParams.get('q')==='tail'?'đuôi':'tìm kiếm'));
  await f.api('POST','/sets',{title:'Wrong substring',words:[{term:'detail',definition:'chi tiết'}]});
  const tail=await f.api('POST',root,{q:'tail'});assert.equal(tail.status,200);assert.equal(tail.data.term,'tail');assert.equal(tail.data.senses[0].meaning,'đuôi');assert.equal(tail.data.source,'mymemory');assert.equal(tail.data.phonetic,'');assert.equal(tail.data.senses[0].pos,'');
  assert.equal(f.urls[0].hostname,'api.mymemory.translated.net');assert.equal(f.urls[0].searchParams.get('langpair'),'en|vi');
  assert.equal((await f.api('POST',root,{q:'seek'})).data.term,'seek');
  await f.api('POST',root,{q:'xin chào',source_lang:'vi',target_lang:'en'});assert.equal(f.urls.at(-1).searchParams.get('langpair'),'vi|en');
});

test('exact local entries work offline; same-language and cached queries do not spend online requests',async t=>{
  const f=await fixture(t,()=>ok('đuôi'));
  const local=await f.api('POST',root,{q:'submit'});assert.equal(local.data.source,'local_exact');assert.equal(f.calls(),0);
  const identity=await f.api('POST',root,{q:'tail',source_lang:'en',target_lang:'en'});assert.equal(identity.data.fullTranslation,'tail');assert.equal(f.calls(),0);
  const pair=await Promise.all([f.api('POST',root,{q:'tail'}),f.api('POST',root,{q:'tail'})]);assert.ok(pair.every(r=>r.status===200));assert.equal(f.calls(),1);
  const cached=await f.api('POST',root,{q:'tail'});assert.equal(cached.data.cached,true);assert.equal(cached.data.external_request,false);assert.equal(f.calls(),1);
});

test('cache stays private by account and never exposes an inaccessible local word definition',async t=>{
  const f=await fixture(t,()=>ok('bản dịch công khai'));
  await f.api('POST','/sets',{title:'Private',words:[{term:'secretlex',definition:'private definition'}]});assert.equal((await f.api('POST',root,{q:'secretlex'})).data.source,'local_exact');
  const bob=f.client();await bob('POST','/auth/register',{email:'translation-bob@test.invalid',name:'Bob',password:'other private password'});
  assert.equal((await bob('POST',root,{q:'secretlex'})).data.senses[0].meaning,'bản dịch công khai');
  await f.api('POST',root,{q:'tail'});await bob('POST',root,{q:'tail'});assert.equal(f.calls(),3);
});

test('network/quota/invalid responses are honest errors and are not cached as translations',async t=>{
  let mode='network';const f=await fixture(t,()=>{if(mode==='network')throw Error('offline');if(mode==='quota')return Response.json({responseStatus:429,quotaFinished:true});if(mode==='bad')return Response.json({responseStatus:200,responseData:{}});return ok('Tom &amp; Jerry');});
  assert.equal((await f.api('POST',root,{q:'tail'})).error.code,'TRANSLATION_UNAVAILABLE');
  mode='quota';assert.equal((await f.api('POST',root,{q:'tail'})).status,429);
  mode='bad';assert.equal((await f.api('POST',root,{q:'tail'})).status,502);
  mode='ok';assert.equal((await f.api('POST',root,{q:'tail'})).data.senses[0].meaning,'Tom & Jerry');assert.equal(f.calls(),4);
});

test('input bounds and explicit language directions are validated before outbound requests',async t=>{
  const f=await fixture(t,()=>ok('hello'));
  for(const body of [{q:''},{q:'x'.repeat(501)},{q:'á'.repeat(251)},{q:'tail',source_lang:'fr'}])assert.equal((await f.api('POST',root,body)).status,400);
  assert.equal(f.calls(),0);
  const guessed=await f.api('POST',root,{q:'xin chào',source_lang:'auto',target_lang:'auto'});assert.equal(guessed.data.sourceLang,'vi');assert.equal(guessed.data.targetLang,'en');
  assert.equal((await f.client()('POST',root,{q:'tail'})).status,401);
});
