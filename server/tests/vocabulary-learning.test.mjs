import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createApp} from '../app.mjs';

async function setup(t,count=12){
 const app=createApp({seed:false});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(async()=>{app.server.closeAllConnections();await app.close();});
 const base=`http://127.0.0.1:${app.server.address().port}/api/v1`;let cookie='';
 const call=async(method,path,body)=>{const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json','X-Requested-With':'OpenQuiz',Cookie:cookie},...(body?{body:JSON.stringify(body)}:{})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const e=await r.json();assert.ok(r.ok,JSON.stringify(e));return e.data;};
 await call('POST','/auth/register',{name:'Learner',email:'segments@test.invalid',password:'long test password'});
 const set=await call('POST','/sets',{title:'Segment fixture',words:Array.from({length:count},(_,i)=>({term:'term '+i,definition:'nghĩa '+i,example:'This is example '+i+'.'}))});
 const words=(await call('GET','/sets/'+set.id)).words;
 const start=settings=>call('POST','/study/sessions',{set_id:set.id,mode:'learn',settings:{learning_engine:'segmented_v2',shuffle:false,direction:'definition_to_term',question_types:['write'],...settings}});
 const answer=(s,value)=>call('POST',`/study/sessions/${s.id}/answers`,{question_id:s.question.id,answer:value??words.find(w=>w.id===s.question.word_id).term});
 return {app,call,set,words,start,answer};
}
test('segmented practice: 12 words start as 20 planned questions; two correct answers remove each new word and persist mastery without inflating SRS',async t=>{
 const f=await setup(t);let s=await f.start();assert.equal(s.total,20);assert.equal(s.total_words,12);
 const seen=new Map();let steps=0;
 while(s.question&&steps++<50){const q=s.question;seen.set(q.word_id,(seen.get(q.word_id)||0)+1);const r=await f.answer(s);assert.equal(r.correct,true);
  if(steps===1){assert.equal(r.session.completed_words,0);assert.equal(r.progress.status,'learning');const before=r.session;const replay=await f.answer(s);assert.equal(replay.replayed,true);assert.deepEqual(replay.session,before);}
  if(steps===7){assert.equal(r.session.completed_words,0);assert.equal(r.session.question.word_id,f.words[0].id);}
  const resumed=await f.call('GET','/study/sessions/'+s.id);assert.equal(resumed.question?.id,r.session.question?.id);s=r.session;
 }
 assert.equal(s.status,'completed');assert.equal(s.completed_words,12);assert.equal(steps,24);assert.ok([...seen.values()].every(n=>n===2));
 const progress=await f.call('GET',`/sets/${f.set.id}/progress`);assert.equal(progress.mastered,12);assert.ok(f.app.db.prepare('SELECT repetitions,interval_days FROM word_progress').all().every(w=>w.repetitions===1&&w.interval_days===1));
});
test('a wrong word returns, self-correction reopens practice, and repeated submission does not generate retries twice',async t=>{
 const f=await setup(t,3);let s=await f.start(),first=s.question.word_id;const wrong=await f.answer(s,'incorrect');assert.equal(wrong.correct,false);s=wrong.session;
 let lastQuestion,steps=0;while(s.question&&steps++<30){lastQuestion=s.question.id;const r=await f.answer(s);s=r.session;}
 assert.equal(s.status,'completed');assert.equal(s.completed_words,3);
 const exportAnswers=f.app.db.prepare('SELECT a.* FROM study_answers a WHERE session_id=?').all(s.id);assert.equal(exportAnswers.filter(a=>a.word_id===first).length,3);
 const correction=await f.call('POST',`/study/sessions/${s.id}/answers/${lastQuestion}/correction`,{});assert.equal(correction.session.status,'active');assert.equal(correction.session.completed_words,2);
 const again=await f.call('POST',`/study/sessions/${s.id}/answers/${lastQuestion}/correction`,{});assert.equal(again.replayed,true);assert.equal(again.session.total,correction.session.total);
 const progress=await f.call('GET',`/sets/${f.set.id}/progress`);assert.equal(progress.mastered,2);
});
test('existing learning/mastered vocabulary needs one successful retrieval in practice, while a lapse returns to learning',async t=>{
 const f=await setup(t,2);await f.call('PATCH',`/words/${f.words[0].id}/progress`,{status:'learning'});await f.call('PATCH',`/words/${f.words[1].id}/progress`,{status:'mastered'});
 let s=await f.start();const first=await f.answer(s);assert.equal(first.session.completed_words,1);s=first.session;
 const missed=await f.answer(s,'wrong');assert.equal(missed.progress.status,'learning');assert.equal(missed.session.completed_words,1);
 s=(await f.answer(missed.session)).session;assert.equal(s.status,'completed');assert.equal(s.completed_words,2);
});
test('fresh shuffled sessions vary order; one-word mixed practice safely falls back to typing',async t=>{
 const f=await setup(t);const orders=new Set();for(let i=0;i<5;i++){const s=await f.start({shuffle:true,question_types:['write','quiz']});const state=JSON.parse(f.app.db.prepare('SELECT state FROM study_sessions WHERE id=?').get(s.id).state);orders.add(state.questions.slice(0,7).map(q=>q.word_id).join(','));assert.ok(state.questions.every(q=>['write','quiz'].includes(q.type)));}assert.ok(orders.size>1);
 const one=await f.start({word_ids:[f.words[0].id],question_types:['quiz']});assert.equal(one.question.type,'write');
 const single=await setup(t,1),small=await single.start({question_types:['quiz']});assert.equal(small.question.type,'write');
});
