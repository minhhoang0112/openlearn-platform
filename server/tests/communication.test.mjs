import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {WebSocket,WebSocketServer} from 'ws';
import {createApp} from '../app.mjs';
import {ApiError} from '../validation.mjs';
import {openDatabase} from '../database.mjs';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const until=async fn=>{for(let i=0;i<150;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}assert.fail('Timed out');};
async function fixture(t,{generate,database=':memory:'}={}){
  const inputs=[],upstreams=[],frames=[];
  const upstream=new WebSocketServer({host:'127.0.0.1',port:0});await once(upstream,'listening');
  upstream.on('connection',ws=>{upstreams.push(ws);ws.on('message',raw=>{const msg=JSON.parse(raw);frames.push(msg);if(msg.setup)ws.send(JSON.stringify({setupComplete:{}}));});});
  const app=createApp({database,seed:false,origins:['http://learning.test'],ai:{provider:'gemini',geminiKey:'private-main',secondaryKey:'private-small',model:'main',fastModel:'small',providerFactory:()=>({generate:async(task,input)=>{inputs.push({task,input});if(generate)return generate(task,input);if(task==='communication_summary')return {summary:'Bạn đã luyện giới thiệu.',phrases:[{text:'My name is Linh.',translation:'Tên mình là Linh.'}],next_practice:'Thử nói nơi ở.'};if(task==='translation')return {translation:'Bạn sống ở đâu?'};return {reply:'Nice to meet you. Where do you live?',translation:'Rất vui được gặp bạn. Bạn sống ở đâu?',feedback:'',hint:'I live in Hanoi.',hint_translation:'Mình sống ở Hà Nội.'};}})},live:{key:'private-live',connect:()=>new WebSocket(`ws://127.0.0.1:${upstream.address().port}`)}});
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base=`http://127.0.0.1:${app.server.address().port}/api/v1`;
  const clients=[];t.after(async()=>{for(const ws of clients)ws.terminate();app.server.closeAllConnections();await app.close();for(const ws of upstream.clients)ws.terminate();await new Promise(r=>upstream.close(r));});
  function client(){let cookie='';const api=async(method,path,body)=>{const r=await fetch(base+path,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};};api.cookie=()=>cookie;return api;}
  const a=client(),b=client();for(const [c,name]of [[a,'alice'],[b,'bob']])assert.equal((await c('POST','/auth/register',{email:name+'@test.invalid',password:'private test password',name})).status,201);
  const create=(api=a,extra={})=>api('POST','/communication/sessions',{submission_id:randomUUID(),...extra});
  const socket=(id,c=a,origin='http://learning.test')=>{const ws=new WebSocket(base.replace('http','ws')+'/communication/live?session_id='+id,{headers:{Origin:origin,Cookie:c?.cookie()||''}});ws.events=[];ws.on('message',raw=>ws.events.push(JSON.parse(raw)));ws.on('error',()=>{});clients.push(ws);return ws;};
  return {app,a,b,create,socket,inputs,upstreams,frames};
}
test('private standalone sessions are idempotent, searchable and paginated; final messages replay without extra AI',async t=>{
  const {a,b,create,inputs}=await fixture(t),submission_id=randomUUID(),s=(await create(a,{submission_id})).data;
  assert.equal(s.turns[0].source,'prepared');assert.equal((await create(a,{submission_id})).data.id,s.id);
  assert.equal((await create(a,{submission_id,level:'B1'})).status,409);
  assert.equal((await b('GET','/communication/sessions/'+s.id)).status,404);
  const path='/communication/sessions/'+s.id,body={submission_id:'my-message',text:'My name is Linh.'};
  const r=await a('POST',path+'/messages',body);assert.equal(r.status,200);assert.equal(r.data.session.turns.length,3);assert.equal(inputs.length,1);
  assert.equal((await a('POST',path+'/messages',body)).data.replayed,true);assert.equal(inputs.length,1);
  assert.equal((await a('POST',path+'/messages',{...body,text:'Other content'})).status,409);
  assert.equal((await a('GET','/communication/sessions?q=Linh')).data.total,1);assert.equal((await b('GET','/communication/sessions?q=Linh')).data.total,0);
  await create();const page=(await a('GET','/communication/sessions?limit=1&offset=1')).data;assert.equal(page.total,2);assert.equal(page.items.length,1);
  const older=(await a('GET',path+'/turns?before='+r.data.session.turns.at(-1).id+'&limit=1')).data;assert.equal(older.items.length,1);assert.equal(older.items[0].role,'user');
  assert.equal((await a('GET',path+'/export')).data.turns.length,3);
});
test('AI errors preserve the learner text; retry is deduplicated and a busy session rejects competing actions',async t=>{
  let release,fail=true;const gate=new Promise(r=>release=r);
  const f=await fixture(t,{generate:async()=>{await gate;if(fail)throw new ApiError(429,'AI_RATE_LIMITED','wait',{retry_after_seconds:1});return {reply:'Hello!',translation:'Xin chào!',feedback:'',hint:'Hi!',hint_translation:'Chào!'};}});
  const s=(await f.create()).data,path='/communication/sessions/'+s.id,body={submission_id:'retry',text:'Hello'};
  const promise=f.a('POST',path+'/messages',body);await until(()=>f.inputs.length===1);
  assert.equal((await f.a('DELETE',path,{})).status,409);assert.equal((await f.a('POST',path+'/messages',{submission_id:'second',text:'test'})).status,409);
  release();assert.equal((await promise).status,429);assert.equal((await f.a('GET',path)).data.turns.filter(x=>x.role==='user').length,1);
  fail=false;await new Promise(r=>setTimeout(r,1050));assert.equal((await f.a('POST',path+'/messages',body)).status,200);
  assert.equal((await f.a('GET',path)).data.turns.length,3);
});
test('explicit memories have owned sources; opt-out ignores earlier memory and cascade deletion removes future context',async t=>{
  const {a,b,create,inputs}=await fixture(t),s=(await create()).data,path='/communication/sessions/'+s.id;
  const m=(await a('POST','/communication/memories',{content:'I want to practise interviews.',source_session_id:s.id})).data;
  assert.equal((await b('PATCH','/communication/memories/'+m.id,{content:'stolen'})).status,404);
  const send=(id,submission_id)=>a('POST','/communication/sessions/'+id+'/messages',{submission_id,text:'Hello'});
  await send(s.id,'one');assert.equal(inputs.at(-1).input.memories[0].content,'I want to practise interviews.');
  await a('POST',path+'/finish',{review:true});assert.equal((await a('GET',path)).data.summary.assessment,'qualitative_ai');
  const next=(await create()).data;await send(next.id,'two');assert.equal(inputs.at(-1).input.previous_sessions.length,1);
  const privateSession=(await create(a,{use_memory:false})).data;await send(privateSession.id,'three');assert.deepEqual(inputs.at(-1).input.memories,[]);assert.deepEqual(inputs.at(-1).input.previous_sessions,[]);
  assert.equal((await a('POST','/communication/memories',{content:'not allowed',source_session_id:privateSession.id})).status,409);
  assert.equal((await a('DELETE',path,{})).status,200);assert.equal((await a('GET','/communication/memories')).data.items.length,0);
  await send(next.id,'four');assert.equal(inputs.at(-1).input.previous_sessions.length,0);assert.equal(inputs.at(-1).input.memories.length,0);
});
test('finish survives failed optional review; resume invalidates old review only after a new turn',async t=>{
  let bad=true;const {a,create}=await fixture(t,{generate:async task=>{if(task==='communication_summary'){if(bad)throw new ApiError(502,'AI_PROVIDER_ERROR','provider down');return {summary:'Reviewed',phrases:[],next_practice:'Practice again'};}return {reply:'Hello!',translation:'Chào!',feedback:'',hint:'Hi',hint_translation:'Chào'};}});
  const s=(await create()).data,p='/communication/sessions/'+s.id;await a('POST',p+'/messages',{submission_id:'one',text:'Hi'});
  assert.equal((await a('POST',p+'/finish',{review:true})).status,502);assert.equal((await a('GET',p)).data.status,'finished');
  assert.equal((await a('POST',p+'/messages',{submission_id:'two',text:'Hi'})).status,409);
  bad=false;assert.equal((await a('POST',p+'/finish',{review:true})).data.summary.summary,'Reviewed');await a('POST',p+'/resume',{});
  assert.equal((await a('GET',p)).data.summary.summary,'Reviewed');await a('POST',p+'/messages',{submission_id:'two',text:'Hi'});assert.equal((await a('GET',p)).data.summary,null);
});
test('live upgrades enforce auth/origin/ownership and one call per account',async t=>{
  const {a,b,create,socket,frames}=await fixture(t),s=(await create()).data,other=(await create()).data;
  async function denied(ws,status){const [,response]=await once(ws,'unexpected-response');response.resume();ws.terminate();assert.equal(response.statusCode,status);}
  await denied(socket(s.id,null),401);await denied(socket(s.id,b),404);await denied(socket(s.id,a,'http://evil.test'),403);
  const ws=socket(s.id);await until(()=>ws.events.some(e=>e.type==='ready'));await denied(socket(other.id),409);
  assert.equal((await a('POST','/communication/sessions/'+s.id+'/messages',{submission_id:'blocked',text:'Hi'})).status,409);
  assert.equal((await a('POST','/communication/memories',{content:'blocked'})).status,409);
  assert.ok(frames[0].setup.systemInstruction.parts[0].text.includes('Level preference: beginner'));assert.ok(!JSON.stringify(ws.events).includes('private-live'));
  ws.close();await once(ws,'close');
});
test('live audio chunks do not repeatedly write unchanged learner input; changed and final turns remain durable',async t=>{
  const f=await fixture(t),s=(await f.create(f.a,{mode:'free',level:'beginner'})).data,ws=f.socket(s.id);
  assert.ok(s.turns[0].content.includes('tiếng Việt'));
  await until(()=>ws.events.some(e=>e.type==='ready'));const up=f.upstreams[0];
  up.send(JSON.stringify({serverContent:{inputTranscription:{text:'Mình muốn học.',finished:true}}}));
  await until(()=>ws.events.some(e=>e.turn?.content==='Mình muốn học.'));
  const changes=f.app.db.prepare('SELECT total_changes() n').get().n;
  const part={inlineData:{mimeType:'audio/pcm;rate=24000',data:Buffer.alloc(20).toString('base64')}};
  for(let i=0;i<100;i++)up.send(JSON.stringify({serverContent:{modelTurn:{parts:[part]}}}));
  up.send(JSON.stringify({serverContent:{outputTranscription:{text:'Mình sẽ giúp bạn từng câu nhé.'}}}));
  await until(()=>ws.events.some(e=>e.content?.outputTranscription?.text));
  assert.equal(f.app.db.prepare('SELECT total_changes() n').get().n,changes);
  assert.equal(ws.events.filter(e=>e.turn?.role==='user').length,1);
  up.send(JSON.stringify({serverContent:{inputTranscription:{text:' Giải thích tiếng Việt nhé.',finished:true}}}));
  await until(()=>ws.events.some(e=>e.turn?.content==='Mình muốn học. Giải thích tiếng Việt nhé.'));
  up.send(JSON.stringify({serverContent:{turnComplete:true}}));
  await until(()=>ws.events.some(e=>e.turn?.role==='assistant'));
  const stored=(await f.a('GET','/communication/sessions/'+s.id)).data.turns;
  assert.equal(stored.filter(x=>x.role==='user').length,1);
  assert.equal(stored.find(x=>x.role==='user').content,'Mình muốn học. Giải thích tiếng Việt nhé.');
  assert.equal(stored.at(-1).content,'Mình sẽ giúp bạn từng câu nhé.');assert.equal(stored.at(-1).status,'final');
});
test('live PCM and interrupted transcripts persist; typed events deduplicate; reconnect has retained context',async t=>{
  const f=await fixture(t),s=(await f.create()).data,ws=f.socket(s.id);await until(()=>ws.events.some(e=>e.type==='ready'));
  const up=f.upstreams[0];ws.send(JSON.stringify({type:'audio',data:Buffer.alloc(1024).toString('base64')}));await until(()=>f.frames.some(x=>x.realtimeInput?.audio));
  up.send(JSON.stringify({serverContent:{inputTranscription:{text:'My name is ',finished:false}}}));
  up.send(JSON.stringify({serverContent:{inputTranscription:{text:'Linh.',finished:true},outputTranscription:{text:'Nice to meet you.'},modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm;rate=24000',data:Buffer.alloc(20).toString('base64')}}]}}}));
  up.send(JSON.stringify({serverContent:{interrupted:true}}));await until(()=>ws.events.some(e=>e.turn?.status==='interrupted'));
  ws.send(JSON.stringify({type:'text',id:'typed',text:'Could you repeat?'}));ws.send(JSON.stringify({type:'text',id:'typed',text:'Could you repeat?'}));
  await until(()=>f.frames.filter(x=>x.realtimeInput?.text==='Could you repeat?').length===1);
  up.send(JSON.stringify({serverContent:{outputTranscription:{text:'Sure!'},turnComplete:true}}));await until(()=>ws.events.some(e=>e.turn?.content==='Sure!'));
  ws.close();await once(ws,'close');await until(()=>!f.app.db.prepare('SELECT 1').get().missing);
  const history=(await f.a('GET','/communication/sessions/'+s.id)).data.turns;
  assert.equal(history.filter(x=>x.role==='user'&&x.content==='My name is Linh.').length,1);assert.equal(history.filter(x=>x.event_id==='live-text:typed').length,1);assert.equal(history.find(x=>x.content==='Nice to meet you.').status,'interrupted');
  assert.equal(history.find(x=>x.content==='My name is Linh.').status,'final');
  await new Promise(r=>setTimeout(r,20));const again=f.socket(s.id);await until(()=>again.events.some(e=>e.type==='ready'));assert.ok(JSON.stringify(f.frames.at(-2)).includes('Could you repeat?'));again.close();
});
test('quota closes the live connection without changing keys; saved partial input remains accessible',async t=>{
  const f=await fixture(t),s=(await f.create()).data,ws=f.socket(s.id);await until(()=>ws.events.some(e=>e.type==='ready'));
  f.upstreams[0].send(JSON.stringify({serverContent:{inputTranscription:{text:'I need help'}}}));f.upstreams[0].send(JSON.stringify({error:{code:429}}));await once(ws,'close');
  const h=(await f.a('GET','/communication/sessions/'+s.id)).data;assert.equal(h.turns.at(-1).content,'I need help');assert.equal(h.turns.at(-1).status,'partial');
  assert.equal((await f.a('GET','/communication/capabilities')).data.voice.cooldown_seconds>0,true);assert.equal(f.upstreams.length,1);
});
test('schema 14 migration preserves existing data and new communication history survives reopening',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'openlearn-communication-')),file=join(dir,'test.sqlite');
  let db=openDatabase(file);db.exec('DROP TABLE communication_memories; DROP TABLE communication_turns; DROP TABLE communication_sessions; PRAGMA user_version=14;');db.close();db=openDatabase(file);assert.equal(db.prepare('PRAGMA user_version').get().user_version,15);db.close();
  const f=await fixture(t,{database:file});t.after(()=>{assert.ok(dir.startsWith(join(tmpdir(),'openlearn-communication-')));rmSync(dir,{recursive:true,force:true});});const s=(await f.create()).data;assert.equal((await f.a('POST','/communication/sessions/'+s.id+'/messages',{submission_id:'persist',text:'Hi'})).status,200);
  const reopened=openDatabase(file);assert.equal(reopened.prepare('SELECT COUNT(*) n FROM communication_turns WHERE session_id=?').get(s.id).n,3);reopened.close();
});

test('translation stays available during a live call, deduplicates and isolates other accounts',async t=>{
  const f=await fixture(t),s=(await f.create(f.a,{level:'B1'})).data,ws=f.socket(s.id);await until(()=>ws.events.some(e=>e.type==='ready'));
  f.upstreams[0].send(JSON.stringify({serverContent:{outputTranscription:{text:'What would you like to learn?'},turnComplete:true}}));await until(()=>ws.events.some(e=>e.turn?.content==='What would you like to learn?'));
  const target=ws.events.find(e=>e.turn?.content==='What would you like to learn?').turn;
  const path=`/communication/sessions/${s.id}/turns/${target.id}/translation`;
  const replies=await Promise.all([f.a('POST',path,{}),f.a('POST',path,{})]);assert.ok(replies.every(r=>r.status===200));assert.equal(f.inputs.filter(x=>x.task==='translation').length,1);
  assert.equal((await f.a('POST',path,{})).data.cached,true);assert.equal((await f.b('POST',path,{})).status,404);assert.equal(ws.readyState,WebSocket.OPEN);
});
test('saved Live audio replays from bounded RAM without another provider call; missing audio generates once even during live',async t=>{
  const f=await fixture(t),s=(await f.create(f.a,{level:'B1'})).data,ws=f.socket(s.id);await until(()=>ws.events.some(e=>e.type==='ready'));
  const pcm=Buffer.alloc(200,3);f.upstreams[0].send(JSON.stringify({serverContent:{outputTranscription:{text:'Hello there.'},modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm;rate=24000',data:pcm.toString('base64')}}]},turnComplete:true}}));
  await until(()=>ws.events.some(e=>e.turn?.content==='Hello there.'));const turn=ws.events.find(e=>e.turn?.content==='Hello there.').turn;
  const path=`/communication/sessions/${s.id}/turns/${turn.id}/audio`,cached=await f.a('POST',path,{});assert.equal(cached.status,200);assert.equal(cached.data.cached,true);const wav=Buffer.from(cached.data.data,'base64');assert.equal(wav.toString('ascii',0,4),'RIFF');assert.deepEqual(wav.subarray(44),pcm);assert.equal(f.upstreams.length,1);
  assert.equal((await f.b('POST',path,{})).status,404);
  const missing=`/communication/sessions/${s.id}/turns/${s.turns[0].id}/audio`,a=f.a('POST',missing,{}),b=f.a('POST',missing,{});
  await until(()=>f.upstreams.length===2&&f.frames.some(x=>x.clientContent?.turns?.[0]?.parts?.[0]?.text.includes(s.turns[0].content)));
  f.upstreams[1].send(JSON.stringify({serverContent:{modelTurn:{parts:[{inlineData:{mimeType:'audio/pcm;rate=24000',data:pcm.toString('base64')}}]},turnComplete:true}}));
  assert.equal((await a).status,200);assert.equal((await b).status,200);assert.equal((await f.a('POST',missing,{})).data.cached,true);assert.equal(f.upstreams.length,2);
  ws.close();await once(ws,'close');await new Promise(r=>setTimeout(r,20));await f.a('DELETE','/communication/sessions/'+s.id,{});assert.equal((await f.a('POST',path,{})).status,404);
});
test('bilingual help is a distinct learner request, can target a saved sentence and replays idempotently',async t=>{
  const f=await fixture(t),s=(await f.create()).data,p='/communication/sessions/'+s.id;
  assert.ok(s.turns[0].content.includes('tiếng Việt'));const body={submission_id:'explain-once',kind:'help',action:'explain',turn_id:s.turns[0].id};
  const first=await f.a('POST',p+'/messages',body);assert.equal(first.status,200);assert.equal(first.data.session.turns[1].source,'help');assert.ok(f.inputs[0].input.learner_message.includes('giải thích bằng tiếng Việt'));
  assert.equal((await f.a('POST',p+'/messages',body)).data.replayed,true);assert.equal(f.inputs.length,1);
  const implicit={submission_id:'latest-once',kind:'help',action:'suggest'};assert.equal((await f.a('POST',p+'/messages',implicit)).status,200);assert.equal((await f.a('POST',p+'/messages',implicit)).data.replayed,true);
  assert.equal((await f.a('POST',p+'/messages',{...implicit,action:'easier'})).status,409);
  const ws=f.socket(s.id);await until(()=>ws.events.some(e=>e.type==='ready'));ws.send(JSON.stringify({type:'help',id:'voice-help',action:'suggest',turn_id:s.turns[0].id}));
  await until(()=>ws.events.some(e=>e.turn?.event_id==='live-text:voice-help'));const saved=ws.events.find(e=>e.turn?.event_id==='live-text:voice-help').turn;assert.equal(saved.source,'help');assert.ok(saved.content.includes('hai cách trả lời'));assert.ok(f.frames.some(x=>x.realtimeInput?.text?.includes('hai cách trả lời')));
});
