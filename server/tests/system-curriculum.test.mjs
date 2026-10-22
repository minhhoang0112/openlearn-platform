import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {createApp} from '../app.mjs';
import {starterLessons} from '../content/learning-v2/curriculum.mjs';

test('optional IT/System lessons have real eight-step practice and do not enter the general foundation catalog or default daily plan',async t=>{
  const app=createApp({learningClock:()=>new Date('2026-10-21T03:00:00Z')});
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(async()=>{app.server.closeAllConnections();await app.close();});let cookie='';
  const api=async(method,path,body)=>{
    const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/v1${path}`,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const v=await r.json();assert.ok(r.ok,JSON.stringify(v));return v.data;
  };
  await api('POST','/auth/register',{email:'system-track@test.invalid',name:'Learner',password:'private specialist password'});
  assert.equal((await api('GET','/learning/profile')).focus,'general');
  const ids=['system-files-01','system-service-status-01','system-incident-handoff-01'];
  const foundation=await api('GET','/learning/programs/english-foundation');
  assert.ok(foundation.units.flatMap(u=>u.lessons).every(l=>!ids.includes(l.id)));
  const specialist=await api('GET','/learning/programs/english-it-system');assert.equal(specialist.lesson_count,9);
  assert.deepEqual(specialist.units.flatMap(u=>u.lessons).filter(l=>ids.includes(l.id)).map(l=>l.id),ids);
  const today=await api('GET','/learning/today');
  assert.ok(today.items.some(i=>i.kind==='lesson'));
  assert.ok(today.items.filter(i=>i.kind==='lesson').every(i=>i.lesson_id.startsWith('foundation-')));
  for(const id of ids){
    const source=starterLessons.find(l=>l.id===id);let s=await api('POST','/learning/sessions',{lesson_id:id,resume:false});
    assert.equal(s.program_id,'english-it-system');assert.equal(s.total_steps,8);assert.ok(s.media.duration_ms>10000);
    while(s.current){
      const q=s.current,key=source.steps.find(x=>x.id===q.id);assert.equal(q.answer,undefined);
      const response=q.response_schema==='choice'?{option_id:key.answer}:q.response_schema==='text'?{text:'The test service is running. One client is waiting. Please check the response.',self_reviewed:true}:{acknowledged:true};
      const r=await api('POST',`/learning/sessions/${s.id}/submit`,{step_id:q.id,revision:s.revision,submission_id:randomUUID(),response});
      s=await api('POST',`/learning/sessions/${s.id}/advance`,{step_id:q.id,revision:r.session.revision});
    }
    assert.equal(s.summary.graded_correct,3);assert.equal(s.summary.graded_total,3);assert.equal(s.summary.mastered,false);
    const evidence=await api('GET',`/learning/sessions/${s.id}/evidence`);
    assert.equal(evidence.items.find(i=>i.type==='writing_task').response.text,'The test service is running. One client is waiting. Please check the response.');
    const track=await api('GET',`/learning/listening/${id}`);assert.equal(track.program_id,'english-it-system');
    assert.equal(track.sentences.length,6);assert.ok(track.sentences.every(s=>s.duration_ms>100));
    assert.equal(track.sentences.map(s=>s.text).join(' '),source.transcript);
  }
  assert.equal((await api('GET','/learning/profile')).focus,'general','manually selecting specialist lessons must not rewrite preferences');
  const progress=await api('GET','/learning/progress');
  assert.equal(progress.lifetime.unique_lessons_completed,3);
  assert.equal(progress.programs.find(p=>p.id==='english-it-system').published_lessons,9);
  assert.equal((await api('GET','/learning/mistakes')).total,0);
});
