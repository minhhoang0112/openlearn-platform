import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../app.mjs';
import {openDatabase} from '../database.mjs';
import {starterLessons} from '../content/learning-v2/curriculum.mjs';

async function fixture(t,options={}){
  const app=createApp(options);app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(async()=>{app.server.closeAllConnections();await app.close();});
  function client(){let cookie='';return async(method,path,body)=>{
    const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/v1${path}`,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};
  };}
  const api=client();await api('POST','/auth/register',{email:'phrases@test.invalid',name:'Learner',password:'private phrase password'});
  async function start(id='foundation-introductions-01',reach=true){
    let s=(await api('POST','/learning/sessions',{lesson_id:id,resume:false})).data;
    if(reach){const q=s.current,key=starterLessons.find(l=>l.id===id).steps.find(step=>step.id===q.id);
      const r=(await api('POST',`/learning/sessions/${s.id}/submit`,{step_id:q.id,revision:s.revision,submission_id:randomUUID(),response:{option_id:key.answer}})).data;
      s=(await api('POST',`/learning/sessions/${s.id}/advance`,{step_id:q.id,revision:r.session.revision})).data;
    }return s;
  }
  return {app,api,client,start};
}
const path=s=>`/learning/sessions/${s.id}/steps/phrases/phrases`;

test('explicit saving creates private cards due in existing SRS, replay never duplicates or changes real learning progress',async t=>{
  const f=await fixture(t),s=await f.start();
  assert.equal((await f.api('GET','/learning/phrase-library')).data.set_id,null);
  const preview=(await f.api('GET',path(s))).data;assert.ok(preview.items.every(i=>!i.saved));
  assert.equal(f.app.db.prepare('SELECT COUNT(*) n FROM learning_phrase_collections').get().n,0);
  const results=await Promise.all([f.api('POST',path(s),{phrase_indexes:[0,1]}),f.api('POST',path(s),{phrase_indexes:[0,1]})]);
  assert.ok(results.every(r=>r.status===200));assert.equal(results.reduce((n,r)=>n+r.data.added_count,0),2);
  const lib=(await f.api('GET','/learning/phrase-library')).data;assert.equal(lib.word_count,2);assert.equal(lib.due_count,2);
  const set=(await f.api('GET','/sets/'+lib.set_id)).data;assert.equal(set.visibility,'private');
  assert.ok(set.words.every(w=>w.status==='new'));
  const word=set.words[0],queue=(await f.api('GET','/srs/queue')).data.items;
  assert.ok(queue.some(w=>w.id===word.id));
  let study=(await f.api('POST','/study/sessions',{set_id:lib.set_id,mode:'write'})).data;
  const expected=set.words.find(w=>w.id===study.question.word_id).definition;
  const graded=await f.api('POST',`/study/sessions/${study.id}/answers`,{question_id:study.question.id,answer:expected});
  assert.equal(graded.status,200);assert.equal(graded.data.correct,true);
  const before=f.app.db.prepare('SELECT * FROM word_progress WHERE word_id=?').get(study.question.word_id);
  assert.ok(before.repetitions>0);assert.notEqual(before.status,'mastered');
  await f.api('POST',path(s),{phrase_indexes:[0,1]});
  assert.deepEqual(f.app.db.prepare('SELECT * FROM word_progress WHERE word_id=?').get(study.question.word_id),before);
  assert.equal(JSON.stringify((await f.api('GET',`/learning/sessions/${s.id}`)).data),JSON.stringify(s));
});

test('invalid selection is atomic, future steps and other users cannot save, public collection changes do not leak private imports',async t=>{
  const f=await fixture(t),future=await f.start('foundation-introductions-01',false);
  assert.equal((await f.api('POST',path(future),{phrase_indexes:[0]})).error.code,'STEP_NOT_REACHED');
  const s=await f.start();
  for(const body of [{phrase_indexes:[]},{phrase_indexes:[0,0]},{phrase_indexes:[0,999]},{phrase_indexes:[0],term:'override'}])assert.equal((await f.api('POST',path(s),body)).status,400);
  assert.equal(f.app.db.prepare('SELECT COUNT(*) n FROM learning_phrase_collections').get().n,0);
  const saved=(await f.api('POST',path(s),{phrase_indexes:[0]})).data;
  const bob=f.client();await bob('POST','/auth/register',{email:'other-phrases@test.invalid',name:'Other',password:'private other password'});
  assert.equal((await bob('GET',path(s))).status,404);assert.equal((await bob('POST',path(s),{phrase_indexes:[0]})).status,404);
  assert.equal((await bob('GET','/sets/'+saved.library.set_id)).status,404);
  await f.api('PATCH','/sets/'+saved.library.set_id,{visibility:'public'});
  assert.equal((await f.api('POST',path(s),{phrase_indexes:[1]})).error.code,'PHRASE_COLLECTION_CHANGED');
  assert.equal(f.app.db.prepare('SELECT COUNT(*) n FROM words WHERE set_id=?').get(saved.library.set_id).n,1);
});

test('identical phrases across lessons reuse cards, manual edits remain, deleting a collection permits a deliberate fresh import',async t=>{
  const f=await fixture(t),general=await f.start(),system=await f.start('system-introductions-01');
  const first=(await f.api('POST',path(general),{phrase_indexes:[0]})).data;
  const second=(await f.api('POST',path(system),{phrase_indexes:[0]})).data;
  assert.equal(second.added_count,0);assert.equal(second.reused_count,1);assert.equal(second.linked_count,1);assert.equal(second.library.word_count,1);assert.equal(second.library.source_links,2);
  const wordId=first.items[0].word_id,setId=first.library.set_id;
  await f.api('PATCH',`/sets/${setId}/words/${wordId}`,{definition:'Ghi chú riêng của tôi'});
  await f.api('POST',path(general),{phrase_indexes:[0]});
  assert.equal((await f.api('GET','/sets/'+setId)).data.words[0].definition,'Ghi chú riêng của tôi');
  assert.equal((await f.api('DELETE','/sets/'+setId)).status,200);
  assert.equal((await f.api('GET','/learning/phrase-library')).data.set_id,null);
  assert.equal((await f.api('GET',path(general))).data.items[0].saved,false);
  const fresh=(await f.api('POST',path(general),{phrase_indexes:[0]})).data;
  assert.equal(fresh.added_count,1);assert.equal(fresh.library.source_links,1);
});

test('source stays pinned, DB reopening preserves cards, and deleting the lesson session does not delete saved vocabulary',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'oq-phrases-')),file=join(dir,'test.sqlite');
  const f=await fixture(t,{database:file});t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const s=await f.start(),old=f.app.db.prepare('SELECT * FROM learning_lesson_versions WHERE lesson_id=? AND version=1').get(s.lesson_id),next=JSON.parse(old.content);
  next.steps.find(q=>q.id==='phrases').phrases[0].text='Different in version two';next.version=2;
  f.app.db.prepare('INSERT INTO learning_lesson_versions VALUES(?,?,?,?,?,?,1)').run(old.lesson_id,2,old.program_id,old.title,old.position,JSON.stringify(next));
  const result=(await f.api('POST',path(s),{phrase_indexes:[0]})).data;assert.equal(result.items[0].text,'university student');
  const db=openDatabase(file);try{assert.equal(db.prepare('PRAGMA user_version').get().user_version,14);assert.equal(db.prepare('SELECT term FROM words WHERE id=?').get(result.items[0].word_id).term,'university student');}finally{db.close();}
  f.app.db.prepare('DELETE FROM learning_sessions WHERE id=?').run(s.id);
  assert.equal((await f.api('GET','/learning/phrase-library')).data.word_count,1);
});
