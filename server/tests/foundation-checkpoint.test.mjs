import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {createApp} from '../app.mjs';
import {starterLessons} from '../content/learning-v2/curriculum.mjs';

test('new lessons have real audio; checkpoint grades six questions, separates support and recommends actual review lessons',async t=>{
  const app=createApp();app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(async()=>{app.server.closeAllConnections();await app.close();});let cookie='';
  const api=async(method,path,body)=>{
    const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/v1${path}`,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const v=await r.json();assert.ok(r.ok,JSON.stringify(v));return v.data;
  };
  await api('POST','/auth/register',{email:'checkpoint@test.invalid',name:'Learner',password:'private checkpoint password'});
  const catalog=await api('GET','/learning/programs/english-foundation');assert.equal(catalog.lesson_count,18);
  assert.equal(catalog.units[0].lessons.find(l=>l.id==='foundation-checkpoint-01').lesson_kind,'checkpoint');
  async function complete(id,{assisted=false,wrong=false}={}){
    const source=starterLessons.find(l=>l.id===id);let s=await api('POST','/learning/sessions',{lesson_id:id,resume:false});assert.ok(s.media.duration_ms>5000);
    assert.equal(s.current.answer,undefined);assert.equal(s.summary,null);
    while(s.current){
      const q=s.current,key=source.steps.find(x=>x.id===q.id);
      const response=q.response_schema==='choice'?{option_id:wrong?q.options.find(o=>o.id!==key.answer).id:key.answer}:q.response_schema==='text'?{text:'I am a student. I study after class.',self_reviewed:true}:{acknowledged:true};
      const body={step_id:q.id,revision:s.revision,submission_id:randomUUID(),response,assistance_used:assisted&&q.response_schema==='choice'?['model']:[]};
      const submitted=await api('POST',`/learning/sessions/${s.id}/submit`,body);
      assert.equal((await api('POST',`/learning/sessions/${s.id}/submit`,body)).replayed,true);
      s=await api('POST',`/learning/sessions/${s.id}/advance`,{step_id:q.id,revision:submitted.session.revision});
    }return s;
  }
  for(const id of ['foundation-people-things-01','foundation-places-01','foundation-questions-01']){
    const s=await complete(id);assert.equal(s.summary.graded_correct,2);assert.equal(s.status,'completed');
  }
  const passed=await complete('foundation-checkpoint-01');assert.equal(passed.total_steps,9);assert.equal(passed.summary.graded_total,6);
  assert.equal(passed.summary.checkpoint.passed,true);assert.equal(passed.summary.checkpoint.unassisted_correct,6);assert.deepEqual(passed.summary.checkpoint.recommended_lesson_ids,[]);
  assert.equal(passed.summary.mastered,false);assert.equal(passed.summary.checkpoint.proficiency_estimate,null);
  const assisted=await complete('foundation-checkpoint-01',{assisted:true});
  assert.equal(assisted.summary.checkpoint.correct,6);assert.equal(assisted.summary.checkpoint.passed,false);assert.equal(assisted.summary.checkpoint.unassisted_correct,0);
  assert.ok(assisted.summary.checkpoint.recommended_lesson_ids.every(id=>starterLessons.some(l=>l.id===id)));
  const failed=await complete('foundation-checkpoint-01',{wrong:true});assert.equal(failed.status,'completed');assert.equal(failed.summary.checkpoint.status,'review_needed');
  const mistakes=await api('GET','/learning/mistakes');assert.equal(mistakes.total,6);
  const stored=await api('GET','/learning/sessions/'+passed.id);assert.equal(stored.summary.checkpoint.passed,true,'later attempts must not rewrite old result');
});
