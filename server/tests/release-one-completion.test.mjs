import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {createApp} from '../app.mjs';
import {starterLessons} from '../content/learning-v2/curriculum.mjs';

test('first curriculum release has 24 regular lessons and 3 reviews with valid prerequisite paths',()=>{
  assert.equal(starterLessons.filter(l=>l.lesson_kind!=='checkpoint').length,24);
  assert.equal(starterLessons.filter(l=>l.lesson_kind==='checkpoint').length,3);
  const lessons=new Map(starterLessons.map(l=>[l.id,l]));assert.equal(lessons.size,27);
  const visited=new Set(),active=new Set();
  function visit(id){
    assert.ok(lessons.has(id),`Unknown prerequisite ${id}`);assert.ok(!active.has(id),`Prerequisite cycle at ${id}`);
    if(visited.has(id))return;active.add(id);
    for(const previous of lessons.get(id).recommended_prerequisites)visit(previous);
    active.delete(id);visited.add(id);
  }
  for(const id of lessons.keys())visit(id);
});

test('final seven authored items run end to end, preserve evidence and grade the optional specialist review honestly',async t=>{
  const app=createApp();app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(async()=>{app.server.closeAllConnections();await app.close();});let cookie='';
  const api=async(method,path,body)=>{
    const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/v1${path}`,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const v=await r.json();assert.ok(r.ok,JSON.stringify(v));return v.data;
  };
  await api('POST','/auth/register',{email:'release-one@test.invalid',name:'Learner',password:'private release password'});
  const foundation=await api('GET','/learning/programs/english-foundation'),system=await api('GET','/learning/programs/english-it-system');
  assert.equal(foundation.lesson_count,18);assert.equal(system.lesson_count,9);
  const ids=['foundation-directions-01','foundation-arrangements-01','system-hardware-01','system-check-results-01','system-incident-questions-01','system-handoff-email-01','system-checkpoint-03'];
  assert.ok(foundation.units.flatMap(u=>u.lessons).every(l=>!l.id.startsWith('system-')));
  const original='The service responded, but one client is waiting. Lan is going to check it. The cause is not confirmed.';
  async function complete(id,{wrong=[],assisted=false}={}){
    const source=starterLessons.find(l=>l.id===id);let s=await api('POST','/learning/sessions',{lesson_id:id,resume:false});
    assert.ok(s.media.duration_ms>10000);
    while(s.current){
      const q=s.current,key=source.steps.find(x=>x.id===q.id);assert.equal(q.answer,undefined);
      const response=q.response_schema==='choice'?{option_id:wrong.includes(q.id)?q.options.find(o=>o.id!==key.answer).id:key.answer}:q.response_schema==='text'?{text:original,self_reviewed:true}:{acknowledged:true};
      const r=await api('POST',`/learning/sessions/${s.id}/submit`,{step_id:q.id,revision:s.revision,submission_id:randomUUID(),response,assistance_used:assisted&&q.response_schema==='choice'?['model']:[]});
      s=await api('POST',`/learning/sessions/${s.id}/advance`,{step_id:q.id,revision:r.session.revision});
    }return s;
  }
  let passed;
  for(const id of ids){
    const s=await complete(id);assert.equal(s.status,'completed');assert.equal(s.summary.mastered,false);
    if(id==='system-checkpoint-03'){
      passed=s;assert.equal(s.total_steps,9);assert.equal(s.summary.checkpoint.passed,true);
      assert.equal(s.summary.checkpoint.unassisted_correct,6);assert.equal(s.summary.checkpoint.proficiency_estimate,null);
    }else{assert.equal(s.total_steps,8);assert.equal(s.summary.graded_correct,3);}
    const evidence=await api('GET',`/learning/sessions/${s.id}/evidence`);assert.equal(evidence.items.find(i=>i.type==='writing_task').response.text,original);
    const track=await api('GET',`/learning/listening/${id}`);assert.equal(track.sentences.length,6);
    assert.ok(track.sentences.every(s=>s.duration_ms>100));assert.equal(track.sentences.map(s=>s.text).join(' '),track.transcript);
  }
  const assisted=await complete('system-checkpoint-03',{assisted:true});
  assert.equal(assisted.summary.graded_correct,6);assert.equal(assisted.summary.checkpoint.passed,false);
  const failed=await complete('system-checkpoint-03',{wrong:['listen-state','grammar-question','read-comparison']});
  assert.equal(failed.summary.checkpoint.passed,false);
  assert.deepEqual(failed.summary.checkpoint.recommended_lesson_ids,['system-check-results-01','system-incident-questions-01','system-hardware-01']);
  assert.equal((await api('GET','/learning/mistakes')).total,3);
  assert.equal((await api('GET',`/learning/sessions/${passed.id}`)).summary.checkpoint.passed,true);
  assert.equal((await api('GET','/learning/profile')).focus,'general');
});
