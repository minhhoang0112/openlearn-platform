import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {createApp} from '../app.mjs';

test('private grammar/reading: stable repeated tokens, hidden keys, drafts, server grading, retry, completion and history',async t=>{
  let calls=0;
  const gateway=createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const {task,input}=JSON.parse(raw);calls++;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(task==='word_examples'?{examples:input.words.map(w=>({word_id:w.word_id,example:'The book is on the book shelf.',translation:'Cuốn sách ở trên giá sách.',synonyms:''}))}:{passage:'The book is on the book shelf. Anna reads it every day.',questions:[{q:'Where is the book?',options:['On the shelf','Under a chair'],correct:0,explanation:'Bài đọc nói cuốn sách ở trên giá.'}]}));});
  gateway.listen(0,'127.0.0.1');await once(gateway,'listening');
  const app=createApp({seed:false,ai:{url:`http://127.0.0.1:${gateway.address().port}`}});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(async()=>{app.server.closeAllConnections();await app.close();gateway.closeAllConnections();await new Promise(r=>gateway.close(r));});
  const base=`http://127.0.0.1:${app.server.address().port}/api/v1`;
  function client(){let cookie='';return async(method,path,body)=>{const response=await fetch(base+path,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];return {status:response.status,...await response.json()};};}
  const a=client(),b=client();await a('POST','/auth/register',{email:'exercise-a@test.invalid',password:'exercise password',name:'Alice'});await b('POST','/auth/register',{email:'exercise-b@test.invalid',password:'exercise password',name:'Bob'});
  const set=(await a('POST','/sets',{title:'Sentence practice',words:[{term:'book',definition:'sách'}]})).data;
  let started=await a('POST','/exercise-attempts',{set_id:set.id,kind:'grammar_order',original_order:true});assert.equal(started.status,201);
  const id=started.data.id,question=started.data.question,root=`/exercise-attempts/${id}`;
  assert.equal(question.type,'order');assert.equal(question.tokens.filter(t=>t.text==='book').length,2);assert.equal(new Set(question.tokens.map(t=>t.id)).size,question.tokens.length);
  assert.ok(!('expected' in question));assert.ok(!('sentence' in question));assert.equal(started.data.feedback,null);
  assert.equal((await b('GET',root)).status,404);assert.equal((await b('PUT',root,{saved:true})).status,404);assert.equal((await b('POST',root+'/answers',{question_id:question.id,answer:[]})).status,404);
  assert.equal((await a('GET','/ai/history/'+started.data.content_id)).status,404);assert.ok(!(await a('GET','/ai/history')).data.items.some(v=>v.id===started.data.content_id));
  const first=question.tokens[0].id;
  assert.equal((await a('PUT',root,{question_id:question.id,draft:[first],saved:true})).status,200);
  assert.deepEqual((await a('GET',root)).data.draft,[first]);assert.equal((await a('GET',root)).data.saved,true);
  const resumed=await a('POST','/exercise-attempts',{set_id:set.id,kind:'grammar_order'});assert.equal(resumed.data.id,id);assert.equal(calls,1);
  assert.equal((await a('POST',root+'/next',{question_id:question.id})).status,409);
  assert.equal((await a('POST',root+'/answers',{question_id:question.id,answer:[first,first]})).status,400);
  assert.equal((await a('POST',root+'/answers',{question_id:question.id,answer:[]})).status,400);
  // Only the trusted test inspects the private DB; opaque token IDs reveal no original order.
  const expectedTokens=JSON.parse(app.db.prepare('SELECT content FROM generated_content WHERE id=?').get(started.data.content_id).content).questions[0].expected;
  const result=await a('POST',root+'/answers',{question_id:question.id,answer:expectedTokens});assert.equal(result.data.feedback.correct,true);assert.equal(result.data.feedback.expected,'The book is on the book shelf.');
  const replay=await a('POST',root+'/answers',{question_id:question.id,answer:[]});assert.equal(replay.data.replayed,true);assert.equal(replay.data.correct,1);
  const completed=await a('POST',root+'/next',{question_id:question.id});assert.equal(completed.data.completed,true);assert.equal((await a('POST',root+'/next',{question_id:question.id})).data.index,1);
  assert.equal((await a('GET','/exercise-attempts')).data.items[0].completed,true);assert.equal((await b('GET','/exercise-attempts')).data.items.length,0);
  const easy=(await a('POST','/exercise-attempts',{set_id:set.id,kind:'grammar_order',resume:false,difficulty:'easy'})).data;assert.ok(easy.question.tokens.length<question.tokens.length);assert.ok(easy.question.tokens.some(t=>t.text.includes(' ')));assert.equal(easy.difficulty,'easy');
  const hard=(await a('POST','/exercise-attempts',{set_id:set.id,kind:'grammar_order',resume:false,difficulty:'hard'})).data;assert.equal(hard.question.tokens.length,question.tokens.length+2);assert.equal(hard.question.required_token_count,question.tokens.length);assert.ok(!('expected' in hard.question));
  const hardPrivate=JSON.parse(app.db.prepare('SELECT content FROM generated_content WHERE id=?').get(hard.content_id).content).questions[0];assert.equal(hardPrivate.expected.length,hard.question.required_token_count);const actualWords=new Set(hardPrivate.sentence.toLowerCase().replace(/[^a-z ]/g,'').split(' '));const distractors=hard.question.tokens.filter(t=>!hardPrivate.expected.includes(t.id));assert.equal(distractors.length,2);assert.ok(distractors.every(t=>!actualWords.has(t.text.toLowerCase())));
  assert.equal((await a('POST',`/exercise-attempts/${hard.id}/answers`,{question_id:hard.question.id,answer:hard.question.tokens.map(t=>t.id)})).status,400);
  const hardGraded=await a('POST',`/exercise-attempts/${hard.id}/answers`,{question_id:hard.question.id,answer:hardPrivate.expected});assert.equal(hardGraded.data.feedback.correct,true);assert.equal(hardGraded.data.correct,1);
  for(const type of ['fill','translate']){const fresh=await a('POST','/exercise-attempts',{set_id:set.id,kind:'grammar_order',resume:false,question_types:[type]});assert.equal(fresh.data.question.type,type);assert.ok(!JSON.stringify(fresh.data.question).includes('expected'));const q=fresh.data.question;const answer=type==='fill'?'book':'The book is on the book shelf.';const graded=await a('POST',`/exercise-attempts/${fresh.data.id}/answers`,{question_id:q.id,answer});assert.equal(graded.data.feedback.correct,true);}
  const reading=await a('POST','/exercise-attempts',{set_id:set.id,kind:'reading'});assert.equal(reading.status,201);assert.equal(reading.data.question.type,'cloze');assert.ok(reading.data.passage.includes('__[1]__'));
  const rr=`/exercise-attempts/${reading.data.id}`,gap=reading.data.question;
  const gapResult=await a('POST',rr+'/answers',{question_id:gap.id,answer:gap.options.find(o=>o.text==='book').id});assert.equal(gapResult.data.feedback.correct,true);assert.ok(!gapResult.data.passage.includes('__[1]__'));
  const comprehension=(await a('POST',rr+'/next',{question_id:gap.id})).data;assert.equal(comprehension.question.type,'choice');assert.ok(!('expected' in comprehension.question));
  const incorrect=await a('POST',rr+'/answers',{question_id:comprehension.question.id,answer:'1'});assert.equal(incorrect.data.feedback.correct,false);assert.equal(incorrect.data.feedback.expected,'On the shelf');assert.ok(incorrect.data.feedback.explanation);
  await a('POST',rr+'/next',{question_id:comprehension.question.id});assert.equal((await a('GET',rr)).data.completed,true);
  const batch=(await a('POST','/exercise-attempts',{set_id:set.id,kind:'reading',resume:false})).data,br=`/exercise-attempts/${batch.id}`;
  const safe=(await a('GET',br+'/questions')).data;assert.equal(safe.questions.length,batch.total);assert.ok(safe.questions[0].gap_number);assert.ok(safe.questions.every(q=>!('expected'in q)&&!('correct'in q)&&q.feedback===null));
  assert.equal((await b('GET',br+'/questions')).status,404);assert.equal((await b('PUT',br+'/drafts',{answers:[]})).status,404);assert.equal((await b('POST',br+'/submit',{answers:[]})).status,404);assert.equal((await a('GET',root+'/questions')).status,400);
  const batchPrivate=JSON.parse(app.db.prepare('SELECT content FROM generated_content WHERE id=?').get(batch.content_id).content),allAnswers=batchPrivate.questions.map(q=>({question_id:q.id,answer:q.expected}));
  assert.equal((await a('PUT',br+'/drafts',{answers:allAnswers})).status,200);assert.equal((await a('GET',br+'/questions')).data.questions[1].draft,allAnswers[1].answer);
  await a('PUT',br+'/drafts',{answers:[{question_id:allAnswers[0].question_id,answer:null}]});assert.equal((await a('GET',br+'/questions')).data.questions[0].draft,null);assert.equal((await a('GET',br+'/questions')).data.questions[1].draft,allAnswers[1].answer);
  const storedBefore=app.db.prepare('SELECT state,updated_at,completed_at FROM exercise_attempts WHERE id=?').get(batch.id);
  for(const answers of [allAnswers.slice(1),[allAnswers[0],allAnswers[0]],allAnswers.map((x,i)=>i===1?{...x,question_id:'wrong-question'}:x),allAnswers.map((x,i)=>i===1?{...x,answer:'not-an-option'}:x)]){assert.equal((await a('POST',br+'/submit',{answers})).status,400);assert.deepEqual(app.db.prepare('SELECT state,updated_at,completed_at FROM exercise_attempts WHERE id=?').get(batch.id),storedBefore);}
  assert.equal((await a('PUT',br+'/drafts',{answers:[allAnswers[0],{...allAnswers[1],answer:'not-an-option'}]})).status,400);assert.deepEqual(app.db.prepare('SELECT state,updated_at,completed_at FROM exercise_attempts WHERE id=?').get(batch.id),storedBefore);
  // A step already graded remains immutable when the remaining answers arrive as a batch.
  await a('POST',br+'/answers',{question_id:allAnswers[0].question_id,skip:true});
  const batchResult=await a('POST',br+'/submit',{answers:allAnswers});assert.equal(batchResult.status,200);assert.equal(batchResult.data.completed,true);assert.equal(batchResult.data.results.length,batch.total);assert.equal(batchResult.data.correct,batch.total-1);assert.equal(batchResult.data.results[0].skipped,true);
  const completedRow=app.db.prepare('SELECT state,updated_at,completed_at FROM exercise_attempts WHERE id=?').get(batch.id);assert.ok(completedRow.completed_at);
  const batchReplay=await a('POST',br+'/submit',{answers:allAnswers.map((x,i)=>({...x,answer:batchPrivate.questions[i].options.at(-1).id}))});assert.equal(batchReplay.data.replayed,true);assert.deepEqual(batchReplay.data.results,batchResult.data.results);assert.deepEqual(app.db.prepare('SELECT state,updated_at,completed_at FROM exercise_attempts WHERE id=?').get(batch.id),completedRow);
  const gradedQuestions=(await a('GET',br+'/questions')).data;assert.equal(gradedQuestions.completed,true);assert.ok(gradedQuestions.questions.every(q=>q.feedback&&typeof q.feedback.expected==='string'));assert.equal((await a('GET','/ai/history/'+batch.content_id)).status,404);
  // The current full-page reader renders questions directly from submit/replay.
  assert.deepEqual(batchResult.data.questions,gradedQuestions.questions);
  assert.deepEqual(batchReplay.data.questions,gradedQuestions.questions);
  assert.equal(batchResult.data.passage,gradedQuestions.passage);
  const resumedCompleted=await a('POST','/exercise-attempts',{set_id:set.id,kind:'reading',resume:true});
  assert.equal(resumedCompleted.data.id,batch.id);assert.equal(resumedCompleted.data.completed,true);
  assert.equal((await a('POST','/exercise-attempts',{set_id:set.id,kind:'grammar_order',resume:false,question_types:[]})).status,400);
  assert.equal((await a('POST','/exercise-attempts',{set_id:set.id,kind:'grammar_order',resume:false,starred_only:true})).status,400);
});
