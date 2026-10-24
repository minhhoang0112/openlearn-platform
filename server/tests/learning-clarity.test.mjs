import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createApp} from '../app.mjs';

async function fixture(t){
  const app=createApp();app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(async()=>{app.server.closeAllConnections();await app.close();});
  function client(){let cookie='';return async(method,path,body)=>{const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/v1${path}`,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};};}
  const api=client();await api('POST','/auth/register',{email:'clarity@test.invalid',name:'Learner',password:'test private password'});return {api,app,client};
}

test('prepared bilingual examples work without AI, respect exact senses and preserve private edits and existing sentences',async t=>{
  const {api,app}=await fixture(t);
  const set=(await api('POST','/sets',{title:'Prepared',words:[{term:'mother',definition:'mẹ'},{term:'book',definition:'đặt chỗ'},{term:'mother',definition:'mẹ',example:'An existing sentence.'},{term:'unknownterm',definition:'một nghĩa'}]})).data;
  let words=(await api('GET',`/sets/${set.id}`)).data.words;
  assert.equal(words[0].example_source,'prepared');assert.equal(words[0].example,'My mother is in the kitchen.');assert.ok(words[0].example_translation);
  assert.equal(words[1].example,'');assert.equal(words[2].example,'An existing sentence.');
  app.db.prepare("INSERT INTO word_notes VALUES(?,?,?,?,?,'ai',?)").run(app.db.prepare("SELECT id FROM users WHERE email='clarity@test.invalid'").get().id,words[0].id,'My mother is in the kitchen.','','',new Date().toISOString());
  assert.equal((await api('GET',`/sets/${set.id}`)).data.words[0].translation_source,'prepared');
  const before=app.db.prepare('SELECT COUNT(*) n FROM word_notes').get().n;
  for(const word of words){const r=await api('POST',`/words/${word.id}/learning-details`,{allow_ai:false});assert.equal(r.status,200);assert.equal(r.data.id,word.id);}
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM word_notes').get().n,before);
  await api('PUT',`/words/${words[0].id}/notes`,{example:'My private sentence.',translation:'Câu của tôi.',synonyms:'mom'});
  words=(await api('GET',`/sets/${set.id}`)).data.words;assert.equal(words[0].example,'My private sentence.');assert.equal(words[0].example_source,'manual');
  assert.equal((await api('POST',`/words/${words[0].id}/learning-details`,{allow_ai:'false'})).status,400);
});

test('SRS practice has an honest empty state, groups due words without dropping mastered-due items, and the queue includes personal details',async t=>{
  const {api,app,client}=await fixture(t);
  assert.equal((await api('GET','/srs/practice')).data.total_words,0);
  const set=(await api('POST','/sets',{title:'Private review',words:[{term:'mother',definition:'mẹ'},{term:'father',definition:'bố'}]})).data,words=(await api('GET',`/sets/${set.id}`)).data.words;
  const user=app.db.prepare("SELECT id FROM users WHERE email='clarity@test.invalid'").get();
  for(const word of words)await api('PATCH',`/words/${word.id}/progress`,{quality:4});
  app.db.prepare("UPDATE word_progress SET status='mastered',due_at='2026-01-01T00:00:00Z' WHERE user_id=? AND word_id=?").run(user.id,words[0].id);
  app.db.prepare("UPDATE word_progress SET due_at='2099-01-01T00:00:00Z' WHERE user_id=? AND word_id=?").run(user.id,words[1].id);
  await api('PUT',`/words/${words[0].id}/notes`,{example:'My mother works here.',translation:'Mẹ tôi làm việc ở đây.',synonyms:'mom; mum'});
  await api('PATCH',`/words/${words[0].id}/progress`,{starred:true});
  const p=(await api('GET','/srs/practice')).data;assert.equal(p.total_words,1);assert.deepEqual(p.items[0].word_ids,[words[0].id]);assert.equal(p.items[0].set_id,set.id);assert.ok(p.modes.some(v=>v.id==='conversation'&&v.srs_effect==='none'));
  const q=(await api('GET','/srs/queue')).data;assert.equal(q.total,1);assert.equal(q.items[0].starred,true);assert.equal(q.items[0].example_translation,'Mẹ tôi làm việc ở đây.');assert.equal(q.items[0].example_source,'manual');
  assert.equal((await api('GET','/srs/practice?scope=all')).data.total_words,2);assert.equal((await api('GET','/srs/practice?scope=mastered')).data.total_words,1);
  const bob=client();await bob('POST','/auth/register',{email:'clarity-bob@test.invalid',name:'Bob',password:'other private password'});assert.equal((await bob('GET','/srs/practice')).data.total_words,0);
  assert.equal((await api('GET','/srs/practice?scope=invalid')).status,400);
  const before=app.db.prepare('SELECT * FROM word_progress WHERE user_id=? AND word_id=?').get(user.id,words[0].id);await api('GET','/srs/practice');assert.deepEqual(app.db.prepare('SELECT * FROM word_progress WHERE user_id=? AND word_id=?').get(user.id,words[0].id),before);
  const rating={quality:4,expected_last_reviewed_at:q.items[0].last_reviewed_at};
  const rated=await api('PATCH',`/words/${words[0].id}/progress`,rating);assert.equal(rated.status,200);
  assert.equal((await api('PATCH',`/words/${words[0].id}/progress`,rating)).error.code,'REVIEW_CHANGED');
  assert.equal(app.db.prepare('SELECT repetitions FROM word_progress WHERE user_id=? AND word_id=?').get(user.id,words[0].id).repetitions,rated.data.repetitions);
});

test('conversation honors explicit SRS word IDs and grammar can refuse implicit AI while using saved examples',async t=>{
  const {api,app}=await fixture(t);
  const set=(await api('POST','/sets',{title:'Scoped',words:[{term:'mother',definition:'mẹ'},{term:'unknownterm',definition:'một nghĩa'}]})).data,words=(await api('GET',`/sets/${set.id}`)).data.words;
  const convo=await api('POST','/conversations',{set_id:set.id,settings:{word_ids:[words[0].id],ordered:true}});assert.equal(convo.status,201);assert.deepEqual(convo.data.settings.word_ids,[words[0].id]);
  for(const ids of [[],[words[0].id,words[0].id],[99999999]])assert.equal((await api('POST','/conversations',{set_id:set.id,settings:{word_ids:ids}})).status,400);
  const grammar=await api('POST','/exercise-attempts',{set_id:set.id,kind:'grammar_order',word_ids:[words[0].id],allow_ai:false,resume:false});assert.equal(grammar.status,201);assert.ok(grammar.data.question.tokens.length);
  const missing=await api('POST','/exercise-attempts',{set_id:set.id,kind:'grammar_order',word_ids:[words[1].id],allow_ai:false,resume:false});assert.equal(missing.error.code,'EXAMPLES_REQUIRED');
  assert.equal(app.db.prepare("SELECT COUNT(*) n FROM word_notes WHERE origin='ai'").get().n,0);
});
