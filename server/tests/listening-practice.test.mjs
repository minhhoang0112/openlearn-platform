import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../app.mjs';
import {openDatabase} from '../database.mjs';

async function fixture(t,options={}){
  const app=createApp(options);app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(async()=>{app.server.closeAllConnections();await app.close();});
  function client(){let cookie='';return async(method,path,body,binary=false,range)=>{
    const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/v1${path}`,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz',...(range?{Range:range}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return binary?{status:r.status,bytes:Buffer.from(await r.arrayBuffer()),type:r.headers.get('content-type')}:{status:r.status,...await r.json()};
  };}
  const api=client();await api('POST','/auth/register',{email:'listening@test.invalid',name:'Learner',password:'private listening password'});
  return {api,app,client};
}
const start=async(api,extra={})=>(await api('POST','/learning/listening/sessions',{lesson_id:'foundation-introductions-01',...extra})).data;
const complete=(api,s,body)=>api('POST',`/learning/listening/sessions/${s.id}/sentences/${s.current.id}/complete`,{revision:s.revision,submission_id:randomUUID(),repetitions:2,self_reviewed:true,...body});

test('listening library exposes 158 real sentence clips with correct source labels, audio bytes and range support',async t=>{
  const {api,client}=await fixture(t);
  assert.equal((await client()('GET','/learning/listening')).status,401);
  const library=(await api('GET','/learning/listening')).data.items;assert.equal(library.length,27);assert.equal(library.reduce((n,t)=>n+t.sentence_count,0),158);
  for(const entry of library){const r=await api('GET','/learning/listening/'+entry.lesson_id);assert.equal(r.status,200);
    const track=r.data;assert.equal(track.aligned_to_full_audio,false);assert.equal(track.sentence_source,'separately_synthesized_sentence');
    assert.equal(track.sentences.map(s=>s.text).join(' '),track.transcript);
    assert.ok(track.sentences.every(s=>s.duration_ms>100&&s.translation===null&&!Object.hasOwn(s,'start_ms')));
  }
  const track=(await api('GET','/learning/listening/'+library[0].lesson_id)).data,url=track.sentences[0].audio_url.replace('/api/v1','');
  const full=await api('GET',url,undefined,true);assert.equal(full.type,'audio/wav');assert.equal(full.bytes.toString('ascii',0,4),'RIFF');
  const part=await api('GET',url,undefined,true,'bytes=0-43');assert.equal(part.status,206);assert.deepEqual(part.bytes,full.bytes.subarray(0,44));
  assert.equal((await api('GET',url,undefined,true,'bytes=999999999-')).status,416);
  assert.equal((await api('GET',url.replace(/s\d+$/,'unknown'))).status,404);
});

test('listening sessions persist exact cursor, avoid repeated completions and distinguish skipped from practised',async t=>{
  const {api,app}=await fixture(t);let s=await start(api);assert.equal((await start(api)).id,s.id);
  assert.equal((await complete(api,s,{repetitions:1})).error.code,'INSUFFICIENT_REPETITIONS');
  const body={revision:s.revision,submission_id:randomUUID(),repetitions:2,self_reviewed:true,reflection:'Try again slowly.'};
  const path=`/learning/listening/sessions/${s.id}/sentences/${s.current.id}/complete`;
  const first=(await api('POST',path,body)).data;s=first.session;assert.equal(s.cursor,1);
  assert.equal((await api('POST',path,body)).data.replayed,true);
  assert.equal((await api('POST',path,{...body,repetitions:3})).error.code,'IDEMPOTENCY_CONFLICT');
  assert.equal((await complete(api,s,{revision:0})).error.code,'REVISION_CONFLICT');
  s=(await api('GET','/learning/listening/sessions/'+s.id)).data;assert.equal(s.cursor,1);
  s=(await complete(api,s,{skip:true})).data.session;
  while(s.current)s=(await complete(api,s,{skip:true})).data.session;
  assert.equal(s.status,'completed');assert.equal(s.summary.practised_sentences,1);assert.equal(s.summary.skipped_sentences,s.total_sentences-1);
  assert.equal(s.summary.mastered,false);assert.equal(s.summary.pronunciation_assessed,false);assert.equal(s.summary.repetitions_self_reported,2);
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM listening_practice_events WHERE session_id=?').get(s.id).n,s.total_sentences);
  const progress=(await api('GET','/learning/progress')).data;
  assert.equal(progress.listening_practice.completed_sessions,1);assert.equal(progress.skills.find(s=>s.key==='listening').accuracy_percent,null);assert.equal(progress.lifetime.unique_lessons_completed,0);
});

test('settings, history, ownership and competing completion requests preserve independent sessions',async t=>{
  const {api,client}=await fixture(t,{learningClock:()=>new Date('2026-10-21T00:00:00Z')});
  let s=await start(api);const other=await start(api,{settings:{mode:'shadowing',rate:0.75,target_repetitions:3}});assert.notEqual(other.id,s.id);
  const fresh=await start(api,{resume:false});assert.equal((await start(api)).id,fresh.id,'newest matching session must resume even with equal timestamps');
  for(const settings of [{rate:0},{rate:'0.9'},{mode:'fake'},{target_repetitions:0}])assert.equal((await api('POST','/learning/listening/sessions',{lesson_id:s.lesson_id,settings})).status,400);
  const bob=client();await bob('POST','/auth/register',{email:'listening-other@test.invalid',name:'Other',password:'other private listening password'});
  assert.equal((await bob('GET','/learning/listening/sessions/'+s.id)).status,404);assert.equal((await complete(bob,s)).status,404);
  assert.equal((await bob('GET','/learning/listening/sessions')).data.total,0);
  const body={revision:0,submission_id:randomUUID(),repetitions:2,self_reviewed:true},path=`/learning/listening/sessions/${s.id}/sentences/${s.current.id}/complete`;
  const responses=await Promise.all([api('POST',path,body),api('POST',path,body)]);assert.ok(responses.every(r=>r.status===200));assert.equal(responses.filter(r=>r.data.replayed).length,1);
  const history=(await api('GET','/learning/listening/sessions?limit=1')).data;assert.equal(history.total,3);assert.equal(history.items.length,1);
  const all=(await api('GET','/learning/listening/sessions')).data;
  const practiced=all.items.find(item=>item.id===s.id);
  assert.deepEqual(practiced.settings,{mode:'listen_repeat',rate:0.9,target_repetitions:2});
  assert.equal(practiced.cursor,1);assert.equal(practiced.summary.practised_sentences,1);
  assert.equal(practiced.summary.repetitions_self_reported,2);
  assert.equal(practiced.summary.pronunciation_assessed,false);
  const shadowing=all.items.find(item=>item.id===other.id);
  assert.equal(shadowing.settings.mode,'shadowing');assert.equal(shadowing.summary.practised_sentences,0);
  assert.equal(Object.hasOwn(shadowing,'state'),false,'history must project fields instead of leaking raw state');
});

test('last practice timestamp comes from a practised event, not a later skip or session creation',async t=>{
  let at=new Date('2026-10-21T01:00:00Z');
  const {api}=await fixture(t,{learningClock:()=>at});
  let s=await start(api);s=(await complete(api,s,{skip:true})).data.session;
  assert.equal((await api('GET','/learning/progress')).data.listening_practice.last_practised_at,null);
  at=new Date('2026-10-21T02:00:00Z');s=(await complete(api,s)).data.session;
  at=new Date('2026-10-21T03:00:00Z');s=(await complete(api,s,{skip:true})).data.session;
  at=new Date('2026-10-21T04:00:00Z');await start(api,{resume:false});
  const p=(await api('GET','/learning/progress')).data.listening_practice;
  assert.equal(p.last_practised_at,'2026-10-21T02:00:00.000Z');
  assert.equal(p.practised_sentences,1);assert.equal(p.skipped_sentences,2);
});

test('practice resumes from persisted DB and old version while a newer unprepared version stays unavailable',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'oq-listening-')),file=join(dir,'listening.sqlite');
  const {api,app}=await fixture(t,{database:file});t.after(()=>rmSync(dir,{recursive:true,force:true}));
  let s=await start(api);s=(await complete(api,s)).data.session;
  const db=openDatabase(file);try{const row=db.prepare('SELECT state FROM listening_practice_sessions WHERE id=?').get(s.id);assert.equal(JSON.parse(row.state).cursor,1);assert.equal(db.prepare('PRAGMA user_version').get().user_version,14);}finally{db.close();}
  const old=app.db.prepare('SELECT * FROM learning_lesson_versions WHERE lesson_id=? AND version=1').get(s.lesson_id);
  app.db.prepare('INSERT INTO learning_lesson_versions VALUES(?,?,?,?,?,?,1)').run(old.lesson_id,2,old.program_id,old.title,old.position,old.content);
  assert.equal((await api('POST','/learning/listening/sessions',{lesson_id:s.lesson_id})).error.code,'SENTENCE_AUDIO_NOT_READY');
  assert.equal((await api('GET','/learning/listening')).data.items.find(i=>i.lesson_id===s.lesson_id).sentence_practice_available,false);
  const resumed=(await api('GET','/learning/listening/sessions/'+s.id)).data;assert.equal(resumed.content_version,1);assert.equal(resumed.cursor,1);
});
