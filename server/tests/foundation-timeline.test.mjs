import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {createApp} from '../app.mjs';
import {starterLessons} from '../content/learning-v2/curriculum.mjs';

test('ongoing action lesson and second checkpoint grade real tasks, separate assisted passes and recommend the actual timeline lessons',async t=>{
  const app=createApp();app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(async()=>{app.server.closeAllConnections();await app.close();});let cookie='';
  const api=async(method,path,body)=>{
    const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/v1${path}`,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const v=await r.json();assert.ok(r.ok,JSON.stringify(v));return v.data;
  };
  await api('POST','/auth/register',{email:'timeline@test.invalid',name:'Learner',password:'private timeline password'});
  async function complete(id,{wrong=[],assisted=false}={}){
    const source=starterLessons.find(l=>l.id===id);let s=await api('POST','/learning/sessions',{lesson_id:id,resume:false});
    assert.ok(s.media.duration_ms>10000);
    while(s.current){
      const q=s.current,key=source.steps.find(x=>x.id===q.id);assert.equal(q.answer,undefined);
      const response=q.response_schema==='choice'?{option_id:wrong.includes(q.id)?q.options.find(o=>o.id!==key.answer).id:key.answer}:q.response_schema==='text'?{text:'Yesterday, I studied at home. I am reading now. Tomorrow, I am going to visit my family.',self_reviewed:true}:{acknowledged:true};
      const r=await api('POST',`/learning/sessions/${s.id}/submit`,{step_id:q.id,revision:s.revision,submission_id:randomUUID(),response,assistance_used:assisted&&q.response_schema==='choice'?['model']:[]});
      s=await api('POST',`/learning/sessions/${s.id}/advance`,{step_id:q.id,revision:r.session.revision});
    }return s;
  }
  const ongoing=await complete('foundation-now-01');assert.equal(ongoing.total_steps,8);assert.equal(ongoing.summary.graded_correct,3);
  const id='foundation-checkpoint-02',passed=await complete(id);
  assert.equal(passed.total_steps,9);assert.equal(passed.summary.checkpoint.passed,true);
  assert.equal(passed.summary.checkpoint.graded_total,6);assert.equal(passed.summary.checkpoint.unassisted_correct,6);
  assert.equal(passed.summary.mastered,false);assert.equal(passed.summary.checkpoint.proficiency_estimate,null);
  const assisted=await complete(id,{assisted:true});assert.equal(assisted.summary.graded_correct,6);
  assert.equal(assisted.summary.checkpoint.passed,false);assert.equal(assisted.summary.checkpoint.unassisted_correct,0);
  const needed=await complete(id,{wrong:['listen-yesterday','grammar-past','grammar-now']});
  assert.equal(needed.status,'completed');assert.equal(needed.summary.checkpoint.passed,false);
  assert.deepEqual(needed.summary.checkpoint.recommended_lesson_ids,['foundation-yesterday-01','foundation-past-questions-01','foundation-now-01']);
  assert.equal((await api('GET','/learning/mistakes')).total,3);
  assert.equal((await api('GET',`/learning/sessions/${passed.id}`)).summary.checkpoint.passed,true);
  const evidence=await api('GET',`/learning/sessions/${needed.id}/evidence`);
  assert.equal(evidence.items.find(i=>i.type==='writing_task').response.text,'Yesterday, I studied at home. I am reading now. Tomorrow, I am going to visit my family.');
  for(const lessonId of ['foundation-now-01',id]){
    const track=await api('GET',`/learning/listening/${lessonId}`);assert.equal(track.sentences.length,6);
    assert.ok(track.sentences.every(x=>x.duration_ms>100));
    assert.equal(track.sentences.map(s=>s.text).join(' '),track.transcript);
  }
});
