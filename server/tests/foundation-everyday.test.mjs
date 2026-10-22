import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {createApp} from '../app.mjs';
import {starterLessons} from '../content/learning-v2/curriculum.mjs';

test('quantities, frequency and clarification lessons preserve independent reading tasks, original writing and real error evidence',async t=>{
  const app=createApp();app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(async()=>{app.server.closeAllConnections();await app.close();});let cookie='';
  const api=async(method,path,body)=>{
    const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/v1${path}`,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const v=await r.json();assert.ok(r.ok,JSON.stringify(v));return v.data;
  };
  await api('POST','/auth/register',{email:'everyday@test.invalid',name:'Learner',password:'private everyday password'});
  const ids=['foundation-quantities-01','foundation-frequency-01','foundation-clarification-01'];
  const catalog=await api('GET','/learning/programs/english-foundation');
  assert.deepEqual(catalog.units.flatMap(u=>u.lessons).filter(l=>ids.includes(l.id)).map(l=>l.id),ids);
  for(const id of ids){
    const source=starterLessons.find(l=>l.id===id);let s=await api('POST','/learning/sessions',{lesson_id:id,resume:false});
    assert.equal(s.total_steps,8);assert.ok(s.media.duration_ms>10000);
    const original=id===ids[0]?'There is a notebook. There are two pens.':id===ids[1]?'I study twice a week. My friend studies every day.':'Could you say it again, please? I do not understand this word.';
    while(s.current){
      const q=s.current,key=source.steps.find(x=>x.id===q.id);assert.equal(q.answer,undefined);
      const wrong=id===ids[0]&&q.type==='grammar_practice';
      const response=q.response_schema==='choice'?{option_id:wrong?q.options.find(o=>o.id!==key.answer).id:key.answer}:q.response_schema==='text'?{text:original,self_reviewed:true}:{acknowledged:true};
      if(q.type==='writing_task'){
        s=await api('PUT',`/learning/sessions/${s.id}/draft`,{step_id:q.id,revision:s.revision,response});
        assert.equal((await api('GET',`/learning/sessions/${s.id}`)).current.draft.text,original);
      }
      const r=await api('POST',`/learning/sessions/${s.id}/submit`,{step_id:q.id,revision:s.revision,submission_id:randomUUID(),response});
      if(wrong)assert.ok(r.session.current.feedback.mistake_id);
      s=await api('POST',`/learning/sessions/${s.id}/advance`,{step_id:q.id,revision:r.session.revision});
    }
    assert.equal(s.summary.graded_total,3);assert.equal(s.summary.graded_correct,id===ids[0]?2:3);assert.equal(s.summary.mastered,false);
    const evidence=await api('GET',`/learning/sessions/${s.id}/evidence`);
    assert.equal(evidence.items.find(i=>i.type==='writing_task').response.text,original);
    const track=await api('GET',`/learning/listening/${id}`);assert.equal(track.sentences.length,6);
    assert.equal(track.sentences.map(s=>s.text).join(' '),source.transcript);assert.ok(track.sentences.every(s=>s.duration_ms>100));
  }
  assert.equal((await api('GET','/learning/mistakes')).total,1);
  const progress=await api('GET','/learning/progress');assert.equal(progress.lifetime.unique_lessons_completed,3);
  assert.equal(progress.skills.find(s=>s.key==='reading').accuracy_percent,100);
});
