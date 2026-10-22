import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createApp} from '../app.mjs';

async function fixture(t){
  const app=createApp();app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(async()=>{app.server.closeAllConnections();await app.close();});
  const base=`http://127.0.0.1:${app.server.address().port}/api/v1`;let cookie='';
  const api=async(method,path,body)=>{
    const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json','X-Requested-With':'OpenQuiz',Cookie:cookie},...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];
    return {status:response.status,...await response.json()};
  };
  const user=(await api('POST','/auth/register',{name:'Learner',email:'study@example.test',password:'long study password'})).data;
  const set=(await api('POST','/sets',{title:'Behavior fixture',words:[{term:'hire',definition:'thuê, mướn; nhân viên',synonyms:'employ; recruit',example:'We hire new staff.',part_of_speech:'verb'},{term:'apply',definition:'nộp đơn; áp dụng',synonyms:'request; use',example:''}]})).data;
  const words=(await api('GET',`/sets/${set.id}`)).data.words;
  return {api,app,user,set,words};
}
test('learning direction, synonyms and starred/unmastered filters affect actual questions',async t=>{
  const {api,set,words}=await fixture(t);
  await api('PATCH',`/words/${words[0].id}/progress`,{starred:true,status:'mastered'});
  const none=await api('POST','/study/sessions',{set_id:set.id,mode:'learn',settings:{starred_only:true,unmastered_only:true}});assert.equal(none.status,409);
  const filtered=(await api('POST','/study/sessions',{set_id:set.id,mode:'learn',settings:{unmastered_only:true,direction:'definition_to_term'}})).data;
  assert.equal(filtered.total,1);assert.equal(filtered.question.prompt,words[1].definition);assert.equal(filtered.question.expected,undefined);
  assert.equal((await api('POST',`/study/sessions/${filtered.id}/answers`,{question_id:filtered.question.id,answer:'apply'})).data.correct,true);
  const synonym=(await api('POST','/study/sessions',{set_id:set.id,mode:'learn',settings:{starred_only:true,answer_mode:'synonyms'}})).data;
  assert.equal(synonym.question.prompt,'hire');
  assert.equal((await api('POST',`/study/sessions/${synonym.id}/answers`,{question_id:synonym.question.id,answer:'recruit'})).data.correct,true);
  const both=(await api('POST','/study/sessions',{set_id:set.id,mode:'learn',settings:{direction:'both',limit:1}})).data;
  assert.equal(both.total,2);assert.equal(both.question.direction,'term_to_definition');
});
test('partial meanings, audited self-correction, idempotent rewards and bounded adaptive resume',async t=>{
  const {api,app,user,set,words}=await fixture(t);
  const session=(await api('POST','/study/sessions',{set_id:set.id,mode:'learn',settings:{word_ids:[words[0].id],max_attempts:3}})).data;
  const answerBody={question_id:session.question.id,answer:'thuê'};
  const graded=(await api('POST',`/study/sessions/${session.id}/answers`,answerBody)).data;
  assert.equal(graded.correct,true);assert.equal(graded.session.status,'completed');
  await api('PATCH',`/words/${words[0].id}/progress`,{starred:true});
  assert.equal(app.db.prepare('SELECT SUM(points) n FROM activity WHERE user_id=?').get(user.id).n,10);
  const correction=(await api('POST',`/study/sessions/${session.id}/answers/${session.question.id}/correction`,{})).data;
  assert.equal(correction.correct,false);assert.equal(correction.session.status,'active');assert.equal(correction.session.total,2);
  assert.equal(app.db.prepare('SELECT repetitions FROM word_progress WHERE user_id=? AND word_id=?').get(user.id,words[0].id).repetitions,0);
  assert.equal(app.db.prepare('SELECT starred FROM word_progress WHERE user_id=? AND word_id=?').get(user.id,words[0].id).starred,1);
  assert.equal(app.db.prepare('SELECT SUM(points) n FROM activity WHERE user_id=?').get(user.id).n,0);
  assert.equal((await api('POST',`/study/sessions/${session.id}/answers/${session.question.id}/correction`,{})).data.replayed,true);
  assert.equal((await api('POST',`/study/sessions/${session.id}/answers`,answerBody)).data.correct,false);
  let resumed=(await api('GET',`/study/sessions/${session.id}`)).data;
  while(resumed.question){resumed=(await api('POST',`/study/sessions/${session.id}/answers`,{question_id:resumed.question.id,answer:'wrong'})).data.session;}
  assert.equal(resumed.total,3);assert.equal(resumed.completed,3);assert.equal(resumed.retry_limit_reached,true);assert.equal(resumed.completed_words,0);
  assert.equal(app.db.prepare("SELECT COUNT(*) n FROM activity WHERE user_id=? AND kind='answer_self_correction'").get(user.id).n,1);
});
test('sentence dictation plays and grades the real example, refusing unavailable sentences',async t=>{
  const {api,set,words}=await fixture(t);
  const missing=await api('POST','/study/sessions',{set_id:set.id,mode:'dictation',settings:{dictation_content:'example'}});
  assert.equal(missing.status,409);assert.equal(missing.error.code,'EXAMPLES_REQUIRED');assert.deepEqual(missing.error.details.word_ids,[words[1].id]);
  const session=(await api('POST','/study/sessions',{set_id:set.id,mode:'dictation',settings:{dictation_content:'example',word_ids:[words[0].id]}})).data;
  assert.equal(session.question.prompt,null);assert.equal(session.question.speech_text,'We hire new staff.');assert.equal(session.question.expected,undefined);
  const wordOnly=(await api('POST',`/study/sessions/${session.id}/answers`,{question_id:session.question.id,answer:'hire'})).data;
  assert.equal(wordOnly.correct,false);assert.equal(wordOnly.expected,'We hire new staff.');
  const second=(await api('POST','/study/sessions',{set_id:set.id,mode:'dictation',settings:{dictation_content:'example',word_ids:[words[0].id]}})).data;
  assert.equal((await api('POST',`/study/sessions/${second.id}/answers`,{question_id:second.question.id,answer:'we hire new staff'})).data.correct,true);
});
test('self-correction rejects another account, old answers and later reviews',async t=>{
  const {api,set}=await fixture(t);
  const s=(await api('POST','/study/sessions',{set_id:set.id,mode:'learn',settings:{adaptive:false}})).data;
  const first=(await api('POST',`/study/sessions/${s.id}/answers`,{question_id:s.question.id,answer:'thuê'})).data;
  await api('POST',`/study/sessions/${s.id}/answers`,{question_id:first.session.question.id,answer:'nộp đơn'});
  assert.equal((await api('POST',`/study/sessions/${s.id}/answers/${s.question.id}/correction`,{})).status,409);
  await api('POST','/auth/register',{name:'Other',email:'other-study@example.test',password:'another long password'});
  assert.equal((await api('POST',`/study/sessions/${s.id}/answers/${s.question.id}/correction`,{})).status,404);
});
test('learn question types alternate deterministically; quiz retries retain type and synonym choices',async t=>{
  const {api,set,words}=await fixture(t);
  const mixed=(await api('POST','/study/sessions',{set_id:set.id,mode:'learn',settings:{question_types:['write','quiz']}})).data;
  assert.equal(mixed.question.type,'write');
  const afterFirst=(await api('POST',`/study/sessions/${mixed.id}/answers`,{question_id:mixed.question.id,answer:'thuê'})).data.session;
  assert.equal(afterFirst.question.type,'quiz');assert.ok(afterFirst.question.options.length>=2);
  const wrongOption=afterFirst.question.options.find(option=>option.text===words[0].definition);
  const afterWrong=(await api('POST',`/study/sessions/${mixed.id}/answers`,{question_id:afterFirst.question.id,answer:wrongOption.text,option_id:wrongOption.id})).data.session;
  assert.equal(afterWrong.question.type,'quiz');assert.equal(afterWrong.total,3);
  const synonym=(await api('POST','/study/sessions',{set_id:set.id,mode:'learn',settings:{answer_mode:'synonyms',question_types:['quiz']}})).data;
  assert.deepEqual(new Set(synonym.question.options.map(option=>option.text)),new Set(words.map(word=>word.synonyms)));
  assert.equal((await api('POST','/study/sessions',{set_id:set.id,mode:'learn',settings:{question_types:[]}})).status,400);
});
test('accept synonyms is independent, auto advance is persisted and progress reset requires confirmation',async t=>{
  const {api,app,user,set,words}=await fixture(t);
  const start=async(accept_synonyms)=> (await api('POST','/study/sessions',{set_id:set.id,mode:'learn',settings:{direction:'definition_to_term',accept_synonyms,auto_advance_on_correct:true,adaptive:false,limit:1}})).data;
  const strict=await start(false);
  assert.equal((await api('POST',`/study/sessions/${strict.id}/answers`,{question_id:strict.question.id,answer:'recruit'})).data.correct,false);
  const tolerant=await start(true);assert.equal(tolerant.settings.auto_advance_on_correct,true);
  assert.equal((await api('POST',`/study/sessions/${tolerant.id}/answers`,{question_id:tolerant.question.id,answer:'recruit'})).data.correct,true);
  await api('PATCH',`/words/${words[0].id}/progress`,{starred:true});
  assert.equal((await api('POST',`/sets/${set.id}/progress/reset`,{})).status,400);
  assert.equal((await api('POST',`/sets/${set.id}/progress/reset`,{confirm:true})).status,200);
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM word_progress WHERE user_id=? AND word_id IN(?,?)').get(user.id,...words.map(word=>word.id)).n,0);
  assert.ok(app.db.prepare('SELECT COUNT(*) n FROM study_sessions WHERE user_id=?').get(user.id).n>=2);
});
