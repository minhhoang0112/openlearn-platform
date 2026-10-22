import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,resolve,sep,basename } from 'node:path';
import { createApp } from '../app.mjs';
import { openDatabase } from '../database.mjs';

async function fixture(t,options={}) {
  const app=createApp(options);app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(async()=>{app.server.closeAllConnections();await app.close();});
  const base=`http://127.0.0.1:${app.server.address().port}/api/v1`;let cookie='';
  async function api(method,path,body) {
    const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json','X-Requested-With':'OpenQuiz',Cookie:cookie},...(body===undefined?{}:{body:JSON.stringify(body)})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};
  }
  await api('POST','/auth/register',{email:'tester@example.test',name:'Tester',password:'a sufficiently long password'});
  return {api,app};
}
test('exam: no answer-key leak, atomic validation, submit and retry once',async t=>{
  const {api,app}=await fixture(t);const session=(await api('POST','/study/sessions',{set_id:163,mode:'exam',settings:{limit:4}})).data;
  const exam=(await api('GET',`/study/sessions/${session.id}/questions`)).data;
  assert.equal(exam.questions.length,4);assert.equal(exam.questions[0].expected,undefined);assert.equal(exam.questions[1].expected_option_id,undefined);
  const words=(await api('GET','/sets/163')).data.words;
  const answers=exam.questions.map(q=>{const term=words.find(w=>w.id===q.word_id).term;return {question_id:q.id,answer:term,...(q.options?{option_id:q.options.find(o=>o.text===term).id}:{})};});
  assert.equal((await api('POST',`/study/sessions/${session.id}/submit`,{answers:answers.slice(1)})).status,400);
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM study_answers WHERE session_id=?').get(session.id).n,0);
  const graded=await api('POST',`/study/sessions/${session.id}/submit`,{answers});assert.equal(graded.data.session.correct,4);assert.equal(graded.data.session.status,'completed');
  const replay=await api('POST',`/study/sessions/${session.id}/submit`,{answers});assert.equal(replay.data.replayed,true);
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM study_answers WHERE session_id=?').get(session.id).n,4);
});
test('matching accepts arbitrary pair order and is idempotent',async t=>{
  const {api}=await fixture(t);const s=(await api('POST','/study/sessions',{set_id:163,mode:'match',settings:{limit:3}})).data;
  const pairs=(await api('GET',`/study/sessions/${s.id}/match`)).data;
  for(const term of pairs.terms.reverse()){
    const definition=pairs.definitions.find(d=>d.id===term.id);const r=await api('POST',`/study/sessions/${s.id}/answers`,{question_id:term.id,answer:definition.text});assert.equal(r.status,200);assert.equal(r.data.correct,true);
  }
  assert.equal((await api('GET',`/study/sessions/${s.id}`)).data.status,'completed');
});
test('personal comprehensive steps are freely selectable and completion requires actual evidence',async t=>{
  const {api}=await fixture(t);const plan=(await api('GET','/sets/163/lessons')).data;
  assert.deepEqual(plan.lessons.map(l=>l.word_ids.length),[5,5,2]);assert.equal(plan.step_names.length,5);
  assert.equal((await api('POST','/sets/163/lessons/1/steps/2/start',{})).status,200);
  const session=(await api('POST','/sets/163/lessons/1/steps/1/start',{})).data.session;
  assert.equal(session.total,5);
  assert.equal((await api('POST','/sets/163/lessons/1/steps/1/complete',{session_id:session.id})).status,409);
  let active=session;
  while(active.question){active=(await api('POST',`/study/sessions/${active.id}/answers`,{question_id:active.question.id,answer:'',known:true})).data.session;}
  const completed=(await api('POST','/sets/163/lessons/1/steps/1/complete',{session_id:session.id})).data;assert.equal(completed.steps[0].completed,true);
  assert.equal((await api('POST','/sets/163/lessons/1/steps/2/start',{})).status,200);
  assert.equal((await api('POST','/sets/163/lessons/2/steps/1/complete',{session_id:session.id})).status,409);
});
test('personal courses have authored content immediately; grading hides keys',async t=>{
  const {api}=await fixture(t);const catalog=(await api('GET','/courses')).data;const observed=(await api('GET',`/courses/${catalog.items[0].id}`)).data;
  assert.equal(observed.parts.length,6);assert.equal(observed.parts[0].lessons.length,5);
  const builtIn=await api('GET',`/course-lessons/${observed.parts[0].lessons[0].id}`);
  assert.equal(builtIn.status,200);assert.equal(builtIn.data.content.origin,'local_authored');assert.ok(builtIn.data.content.questions.length>=4);assert.equal(builtIn.data.content.questions[0].correct_option_id,undefined);
  const course=(await api('POST','/courses',{title:'Own course',language:'en',competence:'A1'})).data;
  const part=(await api('POST',`/courses/${course.id}/parts`,{title:'Part one'})).data;
  const lesson=(await api('POST',`/courses/${course.id}/parts/${part.id}/lessons`,{title:'Greetings',questions:[{type:'write',prompt:'Xin chào',answer:'hello'},{type:'choice',prompt:'Cảm ơn',options:['hello','thank you'],correct_option_index:1}]})).data;
  const detail=(await api('GET',`/course-lessons/${lesson.id}`)).data;assert.equal(detail.content.questions[0].answer,undefined);assert.equal(detail.content.questions[1].correct_option_id,undefined);
  const r=await api('POST',`/course-lessons/${lesson.id}/submit`,{answers:[{question_id:'1',answer:'Hello'},{question_id:'2',option_id:'2'}]});assert.equal(r.data.score,2);
  assert.equal((await api('POST',`/course-lessons/${lesson.id}/submit`,{answers:[]})).data.replayed,true);
  const retried=await api('POST',`/course-lessons/${lesson.id}/submit`,{retry:true,answers:[{question_id:'1',answer:'wrong'},{question_id:'2',option_id:'1'}]});
  assert.equal(retried.status,200);assert.equal(retried.data.score,0);
  assert.equal((await api('POST',`/course-lessons/${lesson.id}/submit`,{answers:[]})).data.score,0);
});
test('configured gateway: real requests, private histories, and conversation persistence',async t=>{
  const provider=createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;const request=JSON.parse(body);res.setHeader('Content-Type','application/json');res.end(JSON.stringify(request.task==='conversation'?{reply:'Which role would you like to apply for?'}:request.task==='speaking_question'?{question:'Tell me about a job application.'}:{feedback:'Your use of apply is clear.'}));});
  provider.listen(0,'127.0.0.1');await once(provider,'listening');t.after(()=>new Promise(resolve=>{provider.closeAllConnections();provider.close(resolve);}));
  const {api}=await fixture(t,{ai:{url:`http://127.0.0.1:${provider.address().port}`}});
  const generated=await api('POST','/ai/generate',{set_id:163,kind:'speaking_feedback',transcript:'I want to apply for this role.'});assert.equal(generated.status,201);assert.equal(generated.data.result._submission_transcript,'I want to apply for this role.');
  assert.equal((await api('GET','/ai/history')).data.items.length,1);
  const c=(await api('POST','/conversations',{set_id:163})).data;
  assert.equal((await api('POST',`/conversations/${c.id}/messages`,{message:'I want to apply for a role.'})).data.reply,'Which role would you like to apply for?');
  assert.equal((await api('GET',`/conversations/${c.id}`)).data.messages.length,2);
  assert.equal((await api('POST','/ai/generate',{set_id:163,kind:'pronunciation'})).status,400);
});
test('SQLite records survive reopening and schema migrations are idempotent',()=>{
  const directory=mkdtempSync(join(tmpdir(),'openquiz-be-test-'));const path=join(directory,'test.sqlite');
  let db;
  try{db=openDatabase(path);db.prepare('INSERT INTO users(email,password_hash,name,created_at) VALUES(?,?,?,?)').run('persist@example.test','test-only','Persisted',new Date().toISOString());assert.equal(db.prepare('PRAGMA user_version').get().user_version,14);db.close();db=null;db=openDatabase(path);assert.equal(db.prepare('SELECT name FROM users').get().name,'Persisted');}
  finally{db?.close();assert.ok(resolve(directory).startsWith(resolve(tmpdir())+sep)&&basename(directory).startsWith('openquiz-be-test-'));rmSync(directory,{recursive:true,force:true});}
});
