import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {createApp} from '../app.mjs';
import {seedPersonalCurriculum} from '../content/personal-curriculum.mjs';

async function fixture(t,ai){
  const calls={examples:0,translations:0};
  const gateway=createServer(async(req,res)=>{
    let raw='';for await(const chunk of req)raw+=chunk;const {task,input}=JSON.parse(raw);
    if(task==='translation'){calls.translations++;await new Promise(r=>setTimeout(r,20));}
    if(task==='word_examples')calls.examples++;
    const result=task==='word_examples'?{examples:input.words.map(w=>({word_id:w.word_id,example:w.example||'My mother is at home.',translation:'Mẹ tôi đang ở nhà.',synonyms:'mom; mum'}))}:task==='translation'?{translation:'Bạn dùng hồ sơ thế nào ở chỗ làm?'}:{reply:'How do you use your profile at work?'};
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));
  });
  gateway.listen(0,'127.0.0.1');await once(gateway,'listening');
  const app=createApp({ai:ai||{url:`http://127.0.0.1:${gateway.address().port}`}});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(async()=>{app.server.closeAllConnections();await app.close();gateway.closeAllConnections();await new Promise(r=>gateway.close(r));});
  function client(){let cookie='';return async(method,path,body)=>{
    const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/v1`+path,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};
  };}
  const api=client();await api('POST','/auth/register',{email:'audit@test.invalid',name:'Audit',password:'a private audit test password'});
  return {app,api,client,calls};
}

test('cached flashcard details stay usable beyond AI request limits; duplicate translations call AI once and delete cleanly',async t=>{
  const {app,api,calls}=await fixture(t);
  const set=(await api('POST','/sets',{title:'My family',words:[{term:'mother',definition:'mẹ'}]})).data;
  const word=(await api('GET','/sets/'+set.id)).data.words[0];
  for(let i=0;i<30;i++)assert.equal((await api('POST','/words/'+word.id+'/learning-details',{})).status,200);
  assert.equal(calls.examples,1,'saved cards must not spend one AI slot on every revisit');
  const thread=(await api('POST','/conversations',{set_id:set.id})).data;
  const opening=(await api('POST','/conversations/'+thread.id+'/start',{})).data;
  const path=`/conversations/${thread.id}/messages/${opening.messages[0].id}/translation`;
  const responses=await Promise.all([api('POST',path,{}),api('POST',path,{})]);assert.ok(responses.every(r=>r.status===200));assert.equal(calls.translations,1);
  for(let i=0;i<25;i++)assert.equal((await api('POST',path,{})).status,200);
  assert.equal(calls.translations,1);
  assert.equal((await api('DELETE','/conversations/'+thread.id,{})).status,200);
  assert.equal(app.db.prepare("SELECT COUNT(*) n FROM generated_content WHERE kind='conversation_translation'").get().n,0);
  assert.equal((await api('POST',path,{})).status,404);
});

test('saving only a key inherits the configured model instead of silently switching to an old default',async t=>{
  const {api}=await fixture(t,{provider:'gemini',model:'gemini-3.5-flash',geminiKey:'test-environment-key'});
  assert.equal((await api('GET','/settings/ai')).data.configuration_source,'environment');
  assert.equal((await api('PUT','/settings/ai',{provider:'gemini',api_key:'test-account-key'})).data.model,'gemini-3.5-flash');
  const settings=(await api('GET','/settings/ai')).data;assert.equal(settings.model,'gemini-3.5-flash');assert.equal(settings.configuration_source,'account');
  assert.ok(!JSON.stringify(settings).includes('test-account-key'));
});

test('course activities use actual lesson/topic IDs; repair mismatched A1 topic links without overwriting lesson content or progress',async t=>{
  const {app,api,client}=await fixture(t);
  const catalog=(await api('GET','/courses')).data.items;
  const a1=catalog.find(c=>c.competence==='A1'),course=(await api('GET','/courses/'+a1.id)).data;
  const lessons=course.parts.flatMap(p=>p.lessons);
  const name=lessons[1],numbers=lessons[3],family=lessons[15];
  assert.match((await api('GET',`/course-lessons/${name.id}/activities`)).data.linked_set.title,/Chào hỏi/);
  assert.match((await api('GET',`/course-lessons/${numbers.id}/activities`)).data.linked_set.title,/Số đếm/);
  assert.match((await api('GET',`/course-lessons/${family.id}/activities`)).data.linked_set.title,/Gia đình/);
  const before=JSON.parse(app.db.prepare('SELECT content FROM course_lessons WHERE id=?').get(name.id).content);
  const legacySet=app.db.prepare("SELECT id FROM study_sets WHERE title LIKE '[A1 Level] Gia đình%'").get();
  app.db.prepare('UPDATE course_lessons SET content=? WHERE id=?').run(JSON.stringify({...before,set_id:legacySet.id,linked_set_scope:undefined}),name.id);
  const userId=app.db.prepare('SELECT id FROM users WHERE email=?').get('audit@test.invalid').id;
  app.db.prepare('INSERT INTO course_progress VALUES(?,?,?,?,?,?)').run(userId,name.id,2,4,'[]','2026-10-21T01:00:00Z');
  seedPersonalCurriculum(app.db);
  const repaired=(await api('GET','/course-lessons/'+name.id)).data;
  assert.deepEqual(repaired.content.phrases,before.phrases);assert.equal(repaired.content.instruction,before.instruction);
  const actions=(await api('GET',`/course-lessons/${name.id}/activities`)).data;
  assert.match(actions.linked_set.title,/Chào hỏi/);assert.equal(actions.progress.score,2);
  assert.equal(actions.completion_rule,'submit_course_lesson');assert.ok(actions.activities.every(a=>a.route&&!a.route.includes('/study-set/163')));
  assert.ok(actions.activities.filter(a=>a.scope==='lesson').every(a=>a.route.includes('/lesson/'+name.id)));
  const own=(await api('POST','/courses',{title:'Private own material',language:'en',competence:'A1'})).data;
  const part=(await api('POST','/courses/'+own.id+'/parts',{title:'Private part'})).data;
  const lesson=(await api('POST',`/courses/${own.id}/parts/${part.id}/lessons`,{title:'Private lesson',questions:[{type:'write',prompt:'Xin chào',answer:'hello'}]})).data;
  const bob=client();await bob('POST','/auth/register',{email:'other-audit@test.invalid',name:'Other',password:'another private audit password'});
  assert.equal((await bob('GET',`/course-lessons/${lesson.id}/activities`)).status,404);
  assert.equal((await api('GET',`/course-lessons/${lesson.id}/activities`)).data.linked_set,null);
});

test('retrieval mastery distinguishes answering once from learning a word and survives retry, correction and resume',async t=>{
  const {api}=await fixture(t);
  const set=(await api('POST','/sets',{title:'Retrieval',words:[{term:'mother',definition:'mẹ'}]})).data;
  const options=(await api('GET',`/study/options?mode=learn&set_id=${set.id}`)).data;
  assert.equal(options.defaults.required_correct,2);assert.equal(options.counts.unmastered,1);assert.equal(options.counts.starred,0);
  const start=async(extra={})=>(await api('POST','/study/sessions',{set_id:set.id,mode:'learn',settings:{required_correct:2,max_attempts:3,...extra}})).data;
  const submit=async(s,answer)=>(await api('POST',`/study/sessions/${s.id}/answers`,{question_id:s.question.id,answer})).data;
  let session=await start();const first=await submit(session,'mẹ');
  assert.equal(first.correct,true);assert.equal(first.session.completed_words,0);assert.equal(first.session.status,'active');assert.equal(first.session.total,2);
  assert.equal((await submit(session,'mẹ')).replayed,true);
  session=(await api('GET','/study/sessions/'+session.id)).data;assert.equal(session.question.id,first.session.question.id);
  const second=await submit(session,'mẹ');assert.equal(second.session.completed_words,1);assert.equal(second.session.status,'completed');
  assert.equal(second.session.word_mastery[0].correct_streak,2);
  let both=await start({direction:'both'});
  for(let i=0;i<4;i++){
    const result=await submit(both,both.question.direction==='term_to_definition'?'mẹ':'mother');both=result.session;
    assert.equal(both.completed_words,i===3?1:0);
  }
  assert.equal(both.status,'completed');assert.equal(both.word_mastery.length,2);
  let capped=await start();capped=(await submit(capped,'mẹ')).session;capped=(await submit(capped,'wrong')).session;capped=(await submit(capped,'mẹ')).session;
  assert.equal(capped.completed_words,0);assert.equal(capped.retry_limit_reached,true);assert.equal(capped.total,3);
  assert.equal((await api('POST','/study/sessions',{set_id:set.id,mode:'learn',settings:{required_correct:3,max_attempts:2}})).status,400);
});

test('course learning persists real steps, speech feedback and quiz drafts; only final grading completes a lesson',async t=>{
  const {app,api,client}=await fixture(t);
  const course=(await api('GET','/courses')).data.items.find(c=>c.competence==='A1');
  const lesson=(await api('GET','/courses/'+course.id)).data.parts[0].lessons[0];
  const raw=JSON.parse(app.db.prepare('SELECT content FROM course_lessons WHERE id=?').get(lesson.id).content);
  const startPath=`/course-lessons/${lesson.id}/sessions`;
  let s=(await api('POST',startPath,{})).data;const base='/course-learning-sessions/'+s.id;
  assert.equal(s.total,raw.phrases.length*2+1);assert.equal(s.steps[0].english,raw.phrases[0].text);
  assert.ok(s.steps.at(-1).questions.every(q=>!Object.hasOwn(q,'answer')&&!Object.hasOwn(q,'correct_option_id')));
  assert.equal((await api('POST',startPath,{})).data.id,s.id);
  assert.equal((await api('POST',base+'/steps/quiz/complete',{answers:[]})).status,409);
  assert.equal((await api('POST',base+'/steps/__proto__/complete',{})).status,409);
  assert.equal((await api('POST',base+'/steps/'+s.current.id+'/complete',{})).status,400);
  const first=s.current.id;s=(await api('POST',base+'/steps/'+first+'/complete',{acknowledged:true})).data;
  const replay=(await api('POST',base+'/steps/'+first+'/complete',{acknowledged:true})).data;
  assert.equal(replay.replayed,true);assert.equal(replay.index,1);
  const mismatch=(await api('POST',base+'/steps/'+s.current.id+'/complete',{transcript:'unrelated words'})).data;
  assert.equal(mismatch.index,1);assert.equal(mismatch.feedback.matched,false);
  s=(await api('GET',base)).data;assert.equal(s.current.result.matched,false);
  while(s.current.type!=='quiz'){
    const body=s.current.type==='speaking'?{transcript:s.current.english}:{acknowledged:true};
    s=(await api('POST',base+'/steps/'+s.current.id+'/complete',body)).data;
  }
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM course_progress WHERE lesson_id=?').get(lesson.id).n,0);
  const answers=raw.questions.map(q=>q.type==='choice'?{question_id:q.id,option_id:q.correct_option_id}:{question_id:q.id,answer:q.answer});
  assert.equal((await api('PUT',base+'/draft',{answers:answers.slice(0,1)})).status,200);
  assert.equal((await api('GET',base)).data.quiz_draft.length,1);
  assert.equal((await api('POST',base+'/steps/quiz/complete',{answers:[answers[0],answers[0]]})).status,400);
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM course_progress WHERE lesson_id=?').get(lesson.id).n,0);
  s=(await api('POST',base+'/steps/quiz/complete',{answers})).data;
  assert.equal(s.status,'completed');assert.equal(s.grade.score,raw.questions.length);
  assert.equal((await api('POST',base+'/steps/quiz/complete',{answers:[]})).data.replayed,true);
  const bob=client();await bob('POST','/auth/register',{email:'course-other@test.invalid',name:'Other',password:'another private audit password'});
  assert.equal((await bob('GET',base)).status,404);
  assert.ok((await api('GET','/course-learning-sessions?lesson_id='+lesson.id)).data.items.some(r=>r.id===s.id));
  const fresh=(await api('POST',startPath,{resume:false})).data;
  app.db.prepare('UPDATE course_lessons SET content=? WHERE id=?').run(JSON.stringify({...raw,instruction:'Changed material'}),lesson.id);
  assert.equal((await api('GET','/course-learning-sessions/'+fresh.id)).status,409);
});

test('question-only course lessons have no invented phrases and invalid choices cannot overwrite progress',async t=>{
  const {app,api}=await fixture(t);
  const c=(await api('POST','/courses',{title:'Own course',language:'en',competence:'A1'})).data;
  const p=(await api('POST',`/courses/${c.id}/parts`,{title:'Own part'})).data;
  const l=(await api('POST',`/courses/${c.id}/parts/${p.id}/lessons`,{title:'Own lesson',questions:[{type:'choice',prompt:'Choose hello',options:['hello','bye'],correct_option_index:0}]})).data;
  const s=(await api('POST',`/course-lessons/${l.id}/sessions`,{})).data;
  assert.equal(s.total,1);assert.equal(s.current.type,'quiz');assert.equal(s.instruction,'');
  const base='/course-learning-sessions/'+s.id;
  assert.equal((await api('POST',base+'/steps/quiz/complete',{answers:[{question_id:'1',option_id:'invalid'}]})).status,400);
  assert.equal((await api('GET',base)).data.status,'active');
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM course_progress WHERE lesson_id=?').get(l.id).n,0);
  const completed=(await api('POST',base+'/steps/quiz/complete',{answers:[{question_id:'1',option_id:'1'}]})).data;
  assert.equal(completed.grade.score,1);
});
