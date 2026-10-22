import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {createApp} from '../app.mjs';
import {starterLessons} from '../content/learning-v2/curriculum.mjs';

test('past and future lessons grade distinct listening/reading/grammar, persist original work and expose prepared sentence media without AI',async t=>{
  let aiCalls=0;
  const app=createApp({ai:{adapter:async()=>{aiCalls++;throw new Error('These lessons must not need AI.');}}});
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(async()=>{app.server.closeAllConnections();await app.close();});let cookie='';
  const api=async(method,path,body)=>{
    const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/v1${path}`,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const v=await r.json();assert.ok(r.ok,JSON.stringify(v));return v.data;
  };
  await api('POST','/auth/register',{email:'next-foundation@test.invalid',name:'Learner',password:'private curriculum password'});
  const catalog=await api('GET','/learning/programs/english-foundation');
  const ordered=catalog.units.flatMap(u=>u.lessons).map(l=>l.id);
  const ids=['foundation-yesterday-01','foundation-past-questions-01','foundation-plans-01'];
  assert.ok(ordered.indexOf(ids[0])>ordered.indexOf('foundation-checkpoint-01'));
  assert.deepEqual(ordered.filter(id=>ids.includes(id)),ids);
  let firstId;
  for(const id of ids){
    const source=starterLessons.find(l=>l.id===id);
    let s=await api('POST','/learning/sessions',{lesson_id:id,resume:false});firstId??=s.id;
    assert.equal(s.total_steps,8);assert.ok(s.media.duration_ms>10000);
    let graded=0;
    while(s.current){
      const q=s.current,key=source.steps.find(x=>x.id===q.id);
      assert.equal(q.answer,undefined);assert.equal(q.explanation,undefined);
      const wrong=id===ids[0]&&q.type==='grammar_practice';
      const response=q.response_schema==='choice'?{option_id:wrong?q.options.find(o=>o.id!==key.answer).id:key.answer}:q.response_schema==='text'?{text:'Yesterday, I studied at home. Tomorrow, I am going to study in the library.',self_reviewed:true}:{acknowledged:true};
      if(q.type==='writing_task'){
        s=await api('PUT',`/learning/sessions/${s.id}/draft`,{step_id:q.id,revision:s.revision,response});
        s=await api('GET',`/learning/sessions/${s.id}`);assert.deepEqual(s.current.draft,response);
      }
      const result=await api('POST',`/learning/sessions/${s.id}/submit`,{step_id:q.id,revision:s.revision,submission_id:randomUUID(),response});
      if(q.response_schema==='choice'){graded++;assert.equal(result.session.current.feedback.correct,!wrong);}
      s=await api('POST',`/learning/sessions/${s.id}/advance`,{step_id:q.id,revision:result.session.revision});
    }
    assert.equal(graded,3);assert.equal(s.summary.graded_total,3);assert.equal(s.summary.graded_correct,id===ids[0]?2:3);
    assert.equal(s.summary.mastered,false);assert.equal(s.status,'completed');
    const evidence=await api('GET',`/learning/sessions/${s.id}/evidence`);
    assert.equal(evidence.items.find(i=>i.type==='writing_task').response.text,'Yesterday, I studied at home. Tomorrow, I am going to study in the library.');
    const track=await api('GET',`/learning/listening/${id}`);assert.equal(track.sentences.length,6);
    assert.equal(track.sentences.map(x=>x.text).join(' '),source.transcript);
    assert.ok(track.sentences.every(x=>x.duration_ms>100));
    const practice=await api('POST','/learning/listening/sessions',{lesson_id:id});assert.equal(practice.current.id,'s01');
  }
  const mistakes=await api('GET','/learning/mistakes');assert.equal(mistakes.total,1);
  assert.equal((await api('GET',`/learning/sessions/${firstId}`)).summary.graded_correct,2);
  const progress=await api('GET','/learning/progress');
  assert.equal(progress.lifetime.unique_lessons_completed,3);
  assert.equal(progress.skills.find(s=>s.key==='reading').accuracy_percent,100);
  assert.equal(aiCalls,0);
});
