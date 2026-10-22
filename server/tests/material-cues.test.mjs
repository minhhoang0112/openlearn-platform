import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createApp} from '../app.mjs';
import {openDatabase} from '../database.mjs';

function wav(){const b=Buffer.alloc(320044);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);return b;}
async function setup(t,options={}){
  const app=createApp(options);app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(async()=>{app.server.closeAllConnections();await app.close();});
  function client(){let cookie='';return async(method,path,body)=>{const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/v1${path}`,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};};}
  const api=client();await api('POST','/auth/register',{email:'cues@test.invalid',name:'Learner',password:'private test password'});
  const material=(await api('POST','/learning/materials',{submission_id:randomUUID(),title:'My dialogue',audio:{mime_type:'audio/wav',data:wav().toString('base64')}})).data;
  const path=`/learning/materials/${material.id}`,cue={id:randomUUID(),start_ms:100,end_ms:1800,text:"I’m a system administrator.",translation:'Tôi là quản trị viên hệ thống.'};
  return {api,app,client,material,path,cue};
}
const attempt=(cue,extra={})=>({submission_id:randomUUID(),cues_revision:1,cue_id:cue.id,answer:"I'm a system administrator",...extra});

test('manual cue timing validation is atomic, revisioned and independent of metadata and playback',async t=>{
  const {api,path,cue}=await setup(t);
  assert.equal((await api('GET',path+'/cues')).data.revision,0);
  const cues=[cue,{id:randomUUID(),start_ms:2000,end_ms:3500,text:'The server is online.'}];
  const saved=await api('PUT',path+'/cues',{revision:0,cues});assert.equal(saved.status,200);assert.equal(saved.data.revision,1);assert.equal(saved.data.limits.alignment,'manual');
  for(const invalid of [[{...cue,end_ms:150}], [{...cue,end_ms:11000}], [cue,{...cue,id:randomUUID(),start_ms:1000,end_ms:3000}], [cue,{...cue,start_ms:2000,end_ms:3000}], [{...cue,text:'!?'}], [{...cue,text:'x'.repeat(2001)}]]){
    assert.equal((await api('PUT',path+'/cues',{revision:1,cues:invalid})).status,400);
    assert.deepEqual((await api('GET',path+'/cues')).data,saved.data);
  }
  assert.equal((await api('PUT',path+'/cues',{revision:0,cues:[]})).status,409);
  const changes=await Promise.all([api('PUT',path+'/cues',{revision:1,cues}),api('PUT',path+'/cues',{revision:1,cues:[]})]);assert.deepEqual(changes.map(v=>v.status).sort(),[200,409]);
  await api('PATCH',path,{revision:0,title:'Changed transcript',transcript:'Independent source text.'});
  const m=(await api('GET',path)).data;assert.equal(m.revision,1);assert.equal(m.playback.revision,0);assert.equal((await api('GET',path+'/cues')).data.revision,2);
});

test('dictation compares ordered whole words, preserves contractions and flags assisted/give-up without AI or invented mastery',async t=>{
  const {api,app,path,cue}=await setup(t);await api('PUT',path+'/cues',{revision:0,cues:[cue]});
  const correct=await api('POST',path+'/dictation-attempts',attempt(cue,{answer:"  I'M, A System ADMINISTRATOR! "}));
  assert.equal(correct.status,201);assert.equal(correct.data.correct,true);assert.equal(correct.data.independent_correct,true);assert.equal(correct.data.assessment,'exact_text_comparison');
  const wrong=await api('POST',path+'/dictation-attempts',attempt(cue,{answer:'Im an administrator system'}));assert.equal(wrong.data.correct,false);assert.ok(wrong.data.expected_tokens.some(v=>!v.matched));assert.ok(wrong.data.answer_tokens.some(v=>!v.matched));
  const helped=await api('POST',path+'/dictation-attempts',attempt(cue,{revealed:true}));assert.equal(helped.data.correct,true);assert.equal(helped.data.independent_correct,false);
  const skip=await api('POST',path+'/dictation-attempts',attempt(cue,{give_up:true,answer:''}));assert.equal(skip.data.correct,false);assert.equal(skip.data.gave_up,true);assert.equal(skip.data.cue.text,cue.text);
  const history=(await api('GET',path+'/dictation-attempts?limit=2&offset=1')).data;assert.equal(history.total,4);assert.equal(history.items.length,2);assert.equal(history.summary.independent_correct,1);assert.equal(history.summary.assisted,1);assert.equal(history.summary.gave_up,1);assert.equal(history.mastery_assessed,false);
  assert.equal((await api('GET','/learning/progress')).data.lifetime.sessions_started,0);assert.equal(app.db.prepare('SELECT COUNT(*) n FROM learning_lesson_versions').get().n,27);
});

test('UUID retries retain the original result after cue replacement, conflict on changed input and serialize concurrent submissions',async t=>{
  const {api,path,cue}=await setup(t);await api('PUT',path+'/cues',{revision:0,cues:[cue]});const input=attempt(cue);
  const first=await api('POST',path+'/dictation-attempts',input);assert.equal(first.data.replayed,false);
  const race=await Promise.all([api('POST',path+'/dictation-attempts',input),api('POST',path+'/dictation-attempts',input)]);assert.ok(race.every(v=>v.data.replayed));
  await api('PUT',path+'/cues',{revision:1,cues:[{...cue,text:'The target changed.'}]});
  const replay=await api('POST',path+'/dictation-attempts',input);assert.equal(replay.status,200);assert.equal(replay.data.replayed,true);assert.equal(replay.data.cue.text,cue.text);
  assert.equal((await api('POST',path+'/dictation-attempts',{...input,answer:'different'})).error.code,'IDEMPOTENCY_CONFLICT');
  assert.equal((await api('POST',path+'/dictation-attempts',attempt(cue))).error.code,'REVISION_CONFLICT');
  assert.equal((await api('POST',path+'/dictation-attempts',attempt({...cue,id:randomUUID()},{cues_revision:2}))).error.code,'CUE_NOT_FOUND');
  assert.equal((await api('GET',path+'/dictation-attempts')).data.total,1);
  await api('PUT',path+'/cues',{revision:2,cues:[]});assert.equal((await api('GET',path+'/dictation-attempts')).data.items[0].cue.text,cue.text);
});

test('cue and answer endpoints enforce private ownership and reject malformed submissions without saving attempts',async t=>{
  const {api,client,path,cue}=await setup(t);await api('PUT',path+'/cues',{revision:0,cues:[cue]});
  const bob=client();await bob('POST','/auth/register',{email:'bob-cues@test.invalid',name:'Bob',password:'other private password'});
  for(const [method,suffix,body] of [['GET','/cues'],['PUT','/cues',{revision:1,cues:[]}],['GET','/dictation-attempts'],['POST','/dictation-attempts',attempt(cue)]]){
    assert.equal((await bob(method,path+suffix,body)).status,404);assert.equal((await client()(method,path+suffix,body)).status,401);
  }
  for(const extra of [{answer:''},{submission_id:'not-uuid'},{revealed:'true'},{give_up:1},{answer:'x'.repeat(2001)},{answer:'a '.repeat(501)},{grade:100},{cues_revision:-1}])assert.equal((await api('POST',path+'/dictation-attempts',attempt(cue,extra))).status,400);
  assert.equal((await api('PUT',path+'/cues',{revision:1,cues:[{...cue,text:'a '.repeat(501)}]})).status,400);
  assert.equal((await api('GET',path+'/dictation-attempts')).data.total,0);
});

test('schema13 upgrade preserves personal audio; cue history survives reopen and cascades with material deletion',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'oq-cues-')),file=join(dir,'test.sqlite');
  const initial=openDatabase(file);initial.exec('DROP TABLE learning_material_dictations; DROP TABLE learning_material_cues; PRAGMA user_version=13;');initial.close();
  const {api,app,path,cue,material}=await setup(t,{database:file});t.after(()=>rmSync(dir,{recursive:true,force:true}));await api('PUT',path+'/cues',{revision:0,cues:[cue]});await api('POST',path+'/dictation-attempts',attempt(cue));
  const reopened=openDatabase(file);try{assert.equal(reopened.prepare('PRAGMA user_version').get().user_version,14);assert.equal(JSON.parse(reopened.prepare('SELECT cues FROM learning_material_cues WHERE material_id=?').get(material.id).cues)[0].id,cue.id);assert.equal(reopened.prepare('SELECT COUNT(*) n FROM learning_material_dictations').get().n,1);assert.equal(reopened.prepare('SELECT length(audio) n FROM learning_materials WHERE id=?').get(material.id).n,wav().length);}finally{reopened.close();}
  await api('DELETE',path);assert.equal((await api('GET',path+'/cues')).status,404);assert.equal((await api('GET',path+'/dictation-attempts')).status,404);
  for(const table of ['learning_material_cues','learning_material_dictations'])assert.equal(app.db.prepare('SELECT COUNT(*) n FROM '+table).get().n,0);
});
