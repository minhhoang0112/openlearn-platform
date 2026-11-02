import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {gradeWrittenVocabulary as grade} from '../vocabulary-grading.mjs';
import {createApp} from '../app.mjs';

const question={type:'write',direction:'term_to_definition',answer_mode:'meaning',expected:'nộp đơn, áp dụng',accepted:['nộp đơn, áp dụng','nộp đơn','áp dụng']};
test('meaning alternatives may be reordered or supplied individually; extra wrong meanings, negation and fragments are not accepted',()=>{
 for(const a of ['áp dụng, nộp đơn','ÁP DỤNG; NỘP ĐƠN.','  nộp đơn  ','nộp đơn, áp dụng, nộp đơn'])assert.equal(grade(question,a).correct,true,a);
 for(const a of ['áp dụng, quả táo','không nộp đơn','áp','đơn','; ,',''])assert.equal(grade(question,a).correct,false,a);
 assert.equal(grade(question,'áp dụng; nộp đơn').verdict,'equivalent');
});
test('missing Vietnamese accents are accepted with a yellow notice; changing an existing tone is not silently accepted',()=>{
 for(const a of ['nop don','áp dung','ap dung, nop don','nộp đon']){const r=grade(question,a);assert.equal(r.correct,true,a);assert.equal(r.verdict,'close');assert.equal(r.reason,'missing_vietnamese_marks');}
 const tone={...question,expected:'nghĩ',accepted:['nghĩ']};assert.equal(grade(tone,'nghi').correct,true);assert.equal(grade(tone,'nghỉ').correct,false);assert.equal(grade(tone,'nghì').correct,false);
});
test('English typing mistakes may be flagged close but never certified correct; dictation remains exact',()=>{
 const q={...question,direction:'definition_to_term',expected:'apply',accepted:['apply']};assert.equal(grade(q,'aply').correct,false);assert.equal(grade(q,'aply').verdict,'close');assert.equal(grade(q,'apply').correct,true);assert.equal(grade(q,'supply').correct,false);
 const d={...q,type:'dictation'};assert.equal(grade(d,'aply').verdict,'incorrect');
 const sentence={...d,dictation_content:'example',expected:'Please apply today.',accepted:['please apply today']};assert.equal(grade(sentence,'PLEASE apply today!').correct,true);assert.equal(grade(sentence,'apply').correct,false);
});

async function fixture(t){
 const app=createApp({seed:false});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(async()=>{app.server.closeAllConnections();await app.close();});let cookie='';
 const call=async(method,path,body)=>{const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/v1`+path,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body?{body:JSON.stringify(body)}:{})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const e=await r.json();assert.ok(r.ok,JSON.stringify(e));return e.data;};
 await call('POST','/auth/register',{email:'grading@test.invalid',name:'Learner',password:'long test password'});
 const set=await call('POST','/sets',{title:'Grading fixture',words:[{term:'apply',definition:'nộp đơn, áp dụng'}]});
 const start=(mode='learn',extra={})=>call('POST','/study/sessions',{set_id:set.id,mode,settings:{direction:'term_to_definition',question_types:['write'],...(mode==='learn'?{learning_engine:'segmented_v2'}:{}),...extra}});
 return {app,call,start};
}
test('accepted accent omission advances practice once, replays the same warning, and self-correction repairs mastery and reward',async t=>{
 const f=await fixture(t),s=await f.start(),url=`/study/sessions/${s.id}/answers`,body={question_id:s.question.id,answer:'nop don'};
 const r=await f.call('POST',url,body);assert.equal(r.correct,true);assert.equal(r.verdict,'close');assert.equal(r.progress.status,'learning');assert.equal(r.session.completed_words,0);
 const replay=await f.call('POST',url,body);assert.equal(replay.replayed,true);assert.equal(replay.verdict,r.verdict);assert.equal(replay.message,r.message);assert.equal(f.app.db.prepare('SELECT COUNT(*) n FROM study_answers').get().n,1);
 const fixed=await f.call('POST',url+'/'+s.question.id+'/correction',{});assert.equal(fixed.correct,false);
 const repaired=await f.call('POST',url,body);assert.equal(repaired.correct,false);assert.equal(repaired.verdict,'incorrect');assert.equal(f.app.db.prepare('SELECT COALESCE(SUM(points),0) n FROM activity').get().n,0);
});
test('English near miss stays in the practice queue and exam replay retains the original grading classification',async t=>{
 const f=await fixture(t),s=await f.start('learn',{direction:'definition_to_term'}),r=await f.call('POST',`/study/sessions/${s.id}/answers`,{question_id:s.question.id,answer:'aply'});assert.equal(r.correct,false);assert.equal(r.verdict,'close');assert.equal(r.session.status,'active');assert.equal(r.session.completed_words,0);assert.equal(r.points,0);
 const exam=await f.start('exam'),body={answers:[{question_id:exam.question.id,answer:'ap dung, nop don'}]},first=await f.call('POST',`/study/sessions/${exam.id}/submit`,body),again=await f.call('POST',`/study/sessions/${exam.id}/submit`,body);assert.equal(first.results[0].correct,true);assert.equal(first.results[0].verdict,'close');assert.deepEqual(again.results,first.results);
});
