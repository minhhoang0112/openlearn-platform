import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../app.mjs';
import {GUIDED_ENGINE} from '../guided-courses.mjs';
import {guidedCourseService} from '../guided-courses.mjs';
import {courseService} from '../courses.mjs';

async function setup(t){
 const app=createApp({dictionary:{databasePath:null}});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>app.close());
 const base='http://127.0.0.1:'+app.server.address().port+'/api/v1';let cookie='';
 const call=async(method,path,body)=>{const r=await fetch(base+path,{method,headers:{cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body?{body:JSON.stringify(body)}:{})});const sc=r.headers.get('set-cookie');if(sc)cookie=sc.split(';')[0];return {status:r.status,...await r.json()};};
 const user=(await call('POST','/auth/register',{email:'guided@test.invalid',name:'Learner',password:'guided test password long'})).data;
 const course=(await call('GET','/courses')).data.items.find(c=>c.competence==='A1');
 return {app,call,user,course,base};
}
function internal(app,s){return JSON.parse(app.db.prepare('SELECT state FROM course_learning_sessions WHERE id=?').get(s.id).state).steps[s.index];}
function correctBody(task){return task.type==='choice'?{option_id:task.correct_option_id}:task.type==='arrange'?{token_ids:task.expected}:{answer:task.expected};}

test('guided A1 enforces sequence, retains feedback, reviews mistakes and unlocks only after mastery',async t=>{
 const {app,call,user,course}=await setup(t),map=(await call('GET',`/courses/${course.id}/guided-map`)).data;
 assert.equal(map.total_lessons,30);assert.equal(map.lessons[0].status,'available');assert.equal(map.lessons[1].status,'locked');
 const lesson=map.lessons[0],next=map.lessons[1];
 assert.equal((await call('POST',`/course-lessons/${next.id}/guided-session`,{})).status,409);
 let s=(await call('POST',`/course-lessons/${lesson.id}/guided-session`,{})).data;
 assert.equal(s.activities.length,7);assert.equal(s.engine,GUIDED_ENGINE);
 const endpoint='/guided-course-sessions/'+s.id;
 assert.equal((await call('POST',`/course-lessons/${lesson.id}/sessions`,{})).data.current.type,'vocab','Legacy sessions remain separately resumable');
 // A direct legacy result made after enrollment cannot bypass guided prerequisites.
 app.db.prepare('INSERT INTO course_progress VALUES(?,?,?,?,?,?)').run(user.id,next.id,4,4,'[]',new Date(Date.now()+1000).toISOString());
 assert.equal((await call('GET',`/courses/${course.id}/guided-map`)).data.lessons[1].status,'locked');
 let intentionallyWrong=false,retries=0,seenListen=false,seenArrange=false;
 for(let guard=0;guard<100&&s.status!=='completed';guard++){
  const task=internal(app,s);
  assert.equal(s.current.expected,undefined);assert.equal(s.current.correct_option_id,undefined);assert.equal(s.current.explanation,undefined);
  if(task.type==='listen'){seenListen=true;assert.equal(s.current.english,undefined);assert.equal((await call('POST',endpoint+'/listen',{})).data.text,task.english);}
  if(task.type==='arrange'){seenArrange=true;assert.equal(s.current.english,undefined);}
  if(task.retry_of)retries++;
  if(['intro','card'].includes(task.type)){s=(await call('POST',endpoint+'/answer',{revision:s.revision,action:'continue'})).data;continue;}
  assert.equal((await call('POST',endpoint+'/answer',{revision:s.revision,action:'continue'})).status,409);
  const wrong=!intentionallyWrong&&task.activity===7;let body=correctBody(task);
  if(wrong){intentionallyWrong=true;body=task.type==='choice'?{option_id:task.options.find(o=>o.id!==task.correct_option_id).id}:{answer:'incorrect'};}
  const revision=s.revision;
  s=(await call('POST',endpoint+'/answer',{revision,...body})).data;
  assert.equal(s.feedback.correct,!wrong);
  assert.equal((await call('POST',endpoint+'/answer',{revision,...body})).status,409,'Duplicate stale answer cannot count again');
  const restored=(await call('GET',endpoint)).data;assert.deepEqual(restored.feedback,s.feedback);
  assert.equal((await call('POST',`/course-lessons/${lesson.id}/guided-session`,{})).data.id,s.id);
  if(wrong){assert.equal(app.db.prepare('SELECT 1 FROM course_progress WHERE user_id=? AND lesson_id=?').get(user.id,lesson.id),undefined);assert.equal((await call('GET',`/courses/${course.id}/guided-map`)).data.lessons[1].status,'locked');}
  s=(await call('POST',endpoint+'/answer',{revision:s.revision,action:'continue'})).data;
 }
 assert.equal(s.status,'completed');assert.ok(seenListen&&seenArrange);assert.ok(retries>0);assert.equal(s.mistakes_remaining,0);assert.equal(s.activities.every(a=>a.completed),true);
 assert.equal(s.first_correct,s.graded_tasks-1);
 const after=(await call('GET',`/courses/${course.id}/guided-map`)).data;assert.equal(after.lessons[0].status,'completed');assert.equal(after.lessons[1].status,'available');
 assert.equal((await call('POST',endpoint+'/answer',{revision:0})).data.replayed,true);
 const second=(await call('POST',`/course-lessons/${next.id}/guided-session`,{})).data;
 const saved=JSON.parse(app.db.prepare('SELECT state FROM course_learning_sessions WHERE id=?').get(second.id).state);
 assert.ok(saved.steps.some(t=>t.prompt.startsWith('Ôn bài trước:')));
});

test('guided content covers 30 A1 lessons and rejects foreign sessions and invalid answers',async t=>{
 const {app,call,user,course,base}=await setup(t),map=(await call('GET',`/courses/${course.id}/guided-map`)).data;
 for(const [i,lesson] of map.lessons.entries()){
  if(i>0)app.db.prepare('INSERT OR REPLACE INTO course_progress VALUES(?,?,?,?,?,?)').run(user.id,map.lessons[i-1].id,4,4,'[]','2020-01-01T00:00:00.000Z');
  const r=await call('POST',`/course-lessons/${lesson.id}/guided-session`,{});assert.equal(r.status,201,lesson.title);
  const s=r.data,state=JSON.parse(app.db.prepare('SELECT state FROM course_learning_sessions WHERE id=?').get(s.id).state);
  assert.deepEqual([...new Set(state.steps.map(t=>t.activity))],[1,2,3,4,5,6,7]);
  assert.equal(state.steps.filter(t=>t.type==='card').length,4);assert.ok(state.steps.every(t=>t.prompt));
 }
 const first=(await call('POST',`/course-lessons/${map.lessons[0].id}/guided-session`,{})).data;
 assert.equal((await fetch(base+'/guided-course-sessions/'+first.id)).status,401);
 const bob=await fetch(base+'/auth/register',{method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},body:JSON.stringify({email:'guided-bob@test.invalid',name:'Bob',password:'another long test password'})});
 assert.equal((await fetch(base+'/guided-course-sessions/'+first.id,{headers:{cookie:bob.headers.get('set-cookie').split(';')[0]}})).status,404);
 let s=first;while(['intro','card'].includes(s.current.type))s=(await call('POST',`/guided-course-sessions/${s.id}/answer`,{revision:s.revision,action:'continue'})).data;
 assert.equal((await call('POST',`/guided-course-sessions/${s.id}/answer`,{revision:s.revision,option_id:'invalid'})).status,400);
 assert.equal((await call('GET',`/guided-course-sessions/${s.id}`)).data.revision,s.revision);
});

test('guided pronunciation uses supplied audio, deduplicates and caches privately without changing mastery',async t=>{
 const {app,call,user,course}=await setup(t),map=(await call('GET',`/courses/${course.id}/guided-map`)).data;
 let s=(await call('POST',`/course-lessons/${map.lessons[0].id}/guided-session`,{})).data;
 while(s.current.type!=='speak'){
  const task=internal(app,s);
  if(!['intro','card'].includes(task.type))s=(await call('POST',`/guided-course-sessions/${s.id}/answer`,{revision:s.revision,...correctBody(task)})).data;
  s=(await call('POST',`/guided-course-sessions/${s.id}/answer`,{revision:s.revision,action:'continue'})).data;
 }
 let calls=0;const audio={mime_type:'audio/wav',data:Buffer.alloc(32,1).toString('base64')};
 const provider={hasAudio:()=>true,generate:async(task,input,actor)=>{
  calls++;assert.equal(task,'pronunciation');assert.equal(actor.id,user.id);assert.deepEqual(input.audio,audio);
  await new Promise(r=>setTimeout(r,10));return {transcript:'Hello, Anna.',feedback:'Hãy nói rõ âm đầu.',improvements:['Đọc chậm từng từ.']};
 }};
 const routes=[];guidedCourseService(app.db,courseService(app.db,{seed:false}),provider).registerRoutes((method,path,handler)=>routes.push({method,path,handler}));
 const review=routes.find(r=>r.path.endsWith('/pronunciation')).handler;
 const ctx={params:{id:s.id},user,body:{revision:s.revision,audio},limited:()=>{}};
 const [a,b]=await Promise.all([review(ctx),review(ctx)]);assert.equal(calls,1);assert.deepEqual(a,b);assert.ok(a.pronunciation_review.feedback);
 assert.equal(a.completed_tasks,s.completed_tasks);assert.equal(a.attempts,s.attempts);
 const cached=await review({...ctx,body:{revision:a.revision,audio}});assert.equal(calls,1);assert.deepEqual(cached.pronunciation_review,a.pronunciation_review);
 const saved=app.db.prepare('SELECT state FROM course_learning_sessions WHERE id=?').get(s.id).state;
 assert.ok(!saved.includes(audio.data),'Raw audio is never persisted');
 await assert.rejects(review({...ctx,body:{revision:a.revision,audio:{...audio,data:'not base64'}}}),e=>e.status===400);
});
