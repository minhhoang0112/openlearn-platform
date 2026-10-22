import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../app.mjs';
import {openDatabase} from '../database.mjs';

function wav(size=32000){
  const bytes=Buffer.alloc(44+size);bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(16000,24);bytes.writeUInt32LE(32000,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(size,40);return bytes;
}
const input=(bytes=wav(),extra={})=>({submission_id:randomUUID(),title:'My listening practice',transcript:'Hello. Where is the library?',translation:'Xin chào. Thư viện ở đâu?',source_note:'Personal supplied sample',audio:{mime_type:'audio/wav',data:bytes.toString('base64')},...extra});
async function fixture(t,options={}){
  const app=createApp(options);app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(async()=>{app.server.closeAllConnections();await app.close();});
  function client(){let cookie='';return async(method,path,body,binary=false,range)=>{
    const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/v1${path}`,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz',...(range?{Range:range}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return binary?{status:r.status,bytes:Buffer.from(await r.arrayBuffer()),type:r.headers.get('content-type')}:{status:r.status,...await r.json()};
  };}
  const api=client();await api('POST','/auth/register',{email:'materials@test.invalid',name:'Learner',password:'private material password'});return {api,app,client};
}
const root='/learning/materials';

test('personal material import accepts a real WAV above1MB, remains private and outside the curriculum, and streams exact Range bytes',async t=>{
  const {api,app,client}=await fixture(t),bytes=wav(1200000),body=input(bytes,{duration_ms:999999});
  const r=await api('POST',root,body);assert.equal(r.status,201,JSON.stringify(r));const m=r.data;
  assert.equal(m.duration_source,'wav_header');assert.equal(m.duration_ms,37500);assert.equal(m.audio_bytes,bytes.length);
  assert.equal(m.audio,undefined);assert.equal(m.audio_data,undefined);assert.equal(m.assessment,'not_assessed');
  const full=await api('GET',`${root}/${m.id}/audio`,undefined,true);assert.equal(full.type,'audio/wav');assert.deepEqual(full.bytes,bytes);
  const part=await api('GET',`${root}/${m.id}/audio`,undefined,true,'bytes=0-43');assert.equal(part.status,206);assert.deepEqual(part.bytes,bytes.subarray(0,44));
  const suffix=await api('GET',`${root}/${m.id}/audio`,undefined,true,'bytes=-16');assert.deepEqual(suffix.bytes,bytes.subarray(-16));
  assert.equal((await api('GET',`${root}/${m.id}/audio`,undefined,true,'bytes=999999999-')).status,416);
  assert.equal((await client()('GET',`${root}/${m.id}`)).status,401);
  const bob=client();await bob('POST','/auth/register',{email:'other-material@test.invalid',name:'Other',password:'private other password'});
  for(const [method,path,data] of [['GET',`${root}/${m.id}`],['GET',`${root}/${m.id}/audio`],['PATCH',`${root}/${m.id}`,{revision:0,title:'Override'}],['PUT',`${root}/${m.id}/playback`,{revision:0,position_ms:10}],['DELETE',`${root}/${m.id}`]])assert.equal((await bob(method,path,data)).status,404);
  assert.equal((await bob('GET',root)).data.total,0);assert.equal((await api('GET',root+'?q=listening')).data.total,1);
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM learning_lesson_versions').get().n,27);
  assert.equal((await api('GET','/learning/progress')).data.lifetime.sessions_started,0);
});

test('import UUID retry, separate metadata/playback revisions and concurrent saves preserve exact text and player state',async t=>{
  const {api}=await fixture(t),body=input(wav(64000)),m=(await api('POST',root,body)).data;
  assert.equal((await api('POST',root,body)).data.id,m.id);assert.equal((await api('POST',root,body)).data.replayed,true);
  assert.equal((await api('POST',root,{...body,title:'Different'})).error.code,'IDEMPOTENCY_CONFLICT');
  const playback=(await api('PUT',`${root}/${m.id}/playback`,{revision:0,position_ms:900,rate:0.8,loop_start_ms:300,loop_end_ms:800,loop_enabled:true,show_transcript:false})).data;
  assert.equal(playback.revision,1);assert.equal(playback.position_ms,900);
  const edited=await api('PATCH',`${root}/${m.id}`,{revision:0,title:'Edited title',transcript:'First line.\nSecond line.'});
  assert.equal(edited.status,200);assert.equal(edited.data.revision,1);assert.deepEqual(edited.data.playback,playback);
  assert.equal((await api('PATCH',`${root}/${m.id}`,{revision:0,title:'Stale'})).error.code,'REVISION_CONFLICT');
  assert.equal((await api('PUT',`${root}/${m.id}/playback`,{revision:0,position_ms:0})).error.code,'REVISION_CONFLICT');
  const competing=await Promise.all([api('PUT',`${root}/${m.id}/playback`,{revision:1,position_ms:1000}),api('PUT',`${root}/${m.id}/playback`,{revision:1,position_ms:1100})]);
  assert.equal(competing.filter(r=>r.status===200).length,1);assert.equal(competing.filter(r=>r.status===409).length,1);
  const restored=(await api('GET',`${root}/${m.id}`)).data;assert.equal(restored.transcript,'First line.\nSecond line.');assert.equal(restored.playback.revision,2);
  for(const patch of [{position_ms:999999},{rate:'0.9'},{rate:0},{show_transcript:'true'},{loop_start_ms:700,loop_end_ms:600},{loop_start_ms:null},{loop_enabled:true,loop_start_ms:null,loop_end_ms:null}])assert.equal((await api('PUT',`${root}/${m.id}/playback`,{revision:2,...patch})).status,400);
  assert.deepEqual((await api('GET',`${root}/${m.id}`)).data.playback,restored.playback);
});

test('limits remain route-specific, malformed files are rejected, and compressed audio duration stays explicitly browser-supplied',async t=>{
  const {api}=await fixture(t),caps=(await api('GET',root+'/capabilities')).data;assert.equal(caps.max_audio_bytes,8*1024*1024);
  const base=input();
  for(const value of [{...base,audio:undefined},{...base,audio:{mime_type:'audio/wav',data:Buffer.alloc(80).toString('base64')}},{...base,audio:{mime_type:'text/html',data:base.audio.data}},{...base,audio_url:'https://example.invalid/file.mp3'}])assert.equal((await api('POST',root,value)).status,400);
  assert.equal((await api('POST',root,input(wav(8*1024*1024)))).status,413);
  assert.equal((await api('PUT','/learning/profile',{padding:'x'.repeat(1100000)})).status,413);
  const mp3=Buffer.alloc(100);mp3.write('ID3');
  const compressed=input(mp3,{audio:{mime_type:'audio/mp3',data:mp3.toString('base64')}});
  assert.equal((await api('POST',root,compressed)).status,400,'compressed formats require declared duration');
  const imported=await api('POST',root,{...compressed,duration_ms:23000});assert.equal(imported.status,201);
  assert.equal(imported.data.duration_source,'browser_metadata');assert.equal(imported.data.mime_type,'audio/mpeg');
  assert.equal((await api('PATCH',`${root}/${imported.data.id}`,{revision:0,duration_ms:500})).status,400);
});

test('private audio and A-B state survive DB reopen and delete cascades only the imported material',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'oq-material-')),file=join(dir,'test.sqlite'),f=await fixture(t,{database:file});t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const bytes=wav(64000),m=(await f.api('POST',root,input(bytes))).data;
  await f.api('PUT',`${root}/${m.id}/playback`,{revision:0,position_ms:800,loop_start_ms:100,loop_end_ms:1000,loop_enabled:true});
  const db=openDatabase(file);try{assert.equal(db.prepare('PRAGMA user_version').get().user_version,14);assert.deepEqual(Buffer.from(db.prepare('SELECT audio FROM learning_materials WHERE id=?').get(m.id).audio),bytes);assert.equal(JSON.parse(db.prepare('SELECT state FROM learning_material_playback WHERE material_id=?').get(m.id).state).position_ms,800);}finally{db.close();}
  assert.equal((await f.api('DELETE',`${root}/${m.id}`)).status,200);assert.equal((await f.api('GET',`${root}/${m.id}`)).status,404);
  assert.equal(f.app.db.prepare('SELECT COUNT(*) n FROM learning_material_playback').get().n,0);
  assert.equal(f.app.db.prepare('SELECT COUNT(*) n FROM learning_lesson_versions').get().n,27);
});
