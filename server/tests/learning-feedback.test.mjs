import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {createApp} from '../app.mjs';

async function fixture(t){
  const state={calls:0,fail:false,invalid:false,delay:15,inputs:[]};
  const gateway=createServer(async(req,res)=>{
    let raw='';for await(const part of req)raw+=part;const request=JSON.parse(raw);state.calls++;state.inputs.push(request);
    await new Promise(r=>setTimeout(r,state.delay));
    if(state.fail){res.writeHead(503);res.end('{}');return;}
    const original=state.invalid?'An invented sentence.':'I am student.';
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify({summary:'Ý của bạn rõ; cần thêm mạo từ.',strengths:['Có câu giới thiệu.'],corrections:[{original,corrected:'I am a student.',explanation:'Student số ít cần a trong câu này.'},{original:'I am student.',corrected:'I am student.',explanation:'No change.'}],suggested_response:'I am a student. I study information technology.',next_practice:['Viết thêm một câu giới thiệu vai trò.'],task_relevance:'on_topic',score:99}));
  });gateway.listen(0,'127.0.0.1');await once(gateway,'listening');
  const app=createApp({ai:{url:`http://127.0.0.1:${gateway.address().port}`}});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(async()=>{app.server.closeAllConnections();await app.close();gateway.closeAllConnections();await new Promise(r=>gateway.close(r));});
  function client(){let cookie='';return async(method,path,body)=>{
    const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/v1${path}`,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};
  };}
  const api=client();await api('POST','/auth/register',{email:'feedback@test.invalid',name:'Learner',password:'private feedback password'});
  async function prepare(type='writing_task',submit=true){
    let s=(await api('POST','/learning/sessions',{lesson_id:'foundation-introductions-01',resume:false})).data;
    while(s.current.type!==type){const q=s.current;
      const response=q.response_schema==='choice'?{option_id:q.id==='grammar'?'am':'a'}:q.response_schema==='text'?{text:'I am student.',self_reviewed:true}:{acknowledged:true};
      const r=await api('POST',`/learning/sessions/${s.id}/submit`,{step_id:q.id,revision:s.revision,submission_id:randomUUID(),response});
      s=(await api('POST',`/learning/sessions/${s.id}/advance`,{step_id:q.id,revision:r.data.session.revision})).data;
    }
    if(submit)s=(await api('POST',`/learning/sessions/${s.id}/submit`,{step_id:s.current.id,revision:s.revision,submission_id:randomUUID(),response:{text:'I am student.',self_reviewed:true}})).data.session;
    return {s,path:`/learning/sessions/${s.id}/steps/${s.current.id}/ai-feedback`};
  }
  return {app,api,client,state,prepare};
}

test('learning AI uses stored work, deduplicates requests and caches without AI limits; preserves original grades and history',async t=>{
  const {api,app,state,prepare}=await fixture(t);const {s,path}=await prepare();
  assert.equal(state.calls,0,'opening and submitting the lesson must not auto-call AI');
  const before=app.db.prepare('SELECT state FROM learning_sessions WHERE id=?').get(s.id).state;
  assert.equal((await api('POST',path,{text:'replace the original'})).status,400);
  const both=await Promise.all([api('POST',path,{}),api('POST',path,{})]);assert.ok(both.every(r=>r.status===200));assert.equal(state.calls,1);assert.equal(both[0].data.id,both[1].data.id);
  assert.equal(state.inputs[0].task,'learning_feedback');assert.equal(state.inputs[0].input.learner_text,'I am student.');
  assert.equal(both[0].data.feedback.score,undefined);assert.equal(both[0].data.pronunciation_assessed,false);assert.equal(both[0].data.modality,'writing_text');
  assert.equal(both[0].data.feedback.corrections.length,1,'unchanged sentences must not be presented as mistakes or reject the whole valid response');
  for(let i=0;i<25;i++)assert.equal((await api('POST',path,{})).data.cached,true);
  assert.equal(state.calls,1);assert.equal((await api('GET',`/learning/sessions/${s.id}/ai-feedback`)).data.items.length,1);
  assert.equal(app.db.prepare('SELECT state FROM learning_sessions WHERE id=?').get(s.id).state,before);
  const evidence=(await api('GET',`/learning/sessions/${s.id}/evidence`)).data.items.find(i=>i.type==='writing_task');
  assert.equal(evidence.response.text,'I am student.');assert.equal(evidence.feedback.assessment_status,'self_review');assert.equal(evidence.ai_feedback.id,both[0].data.id);
  const p=(await api('GET','/learning/progress')).data;assert.equal(p.ai_feedback.writing,1);assert.equal(p.skills.find(s=>s.key==='writing').accuracy_percent,null);
});

test('feedback enforces ownership and submission; transcript feedback is not pronunciation',async t=>{
  const {api,app,client,state,prepare}=await fixture(t);const {s,path}=await prepare('speaking_task',false);
  assert.equal((await api('POST',path,{})).error.code,'SUBMISSION_REQUIRED');assert.equal(state.calls,0);
  assert.equal((await api('POST',`/learning/sessions/${s.id}/steps/pronunciation/ai-feedback`,{})).status,400);
  const bob=client();await bob('POST','/auth/register',{email:'feedback-other@test.invalid',name:'Other',password:'another private feedback password'});
  assert.equal((await bob('POST',path,{})).status,404);assert.equal((await bob('GET',`/learning/sessions/${s.id}/ai-feedback`)).status,404);
  const ready=await prepare('speaking_task');
  await api('PUT','/settings/ai',{provider:'gemini',model:'gemini-3.5-flash',api_key:''});
  for(let i=0;i<25;i++)assert.equal((await api('POST',ready.path,{})).error.code,'AI_NOT_CONFIGURED','unconfigured attempts must not exhaust model request slots');
  assert.equal(state.calls,0);app.db.prepare('DELETE FROM user_ai_settings').run();
  const r=await api('POST',ready.path,{});
  assert.equal(r.data.modality,'speaking_transcript');assert.equal(r.data.pronunciation_assessed,false);
});

test('invalid or failed AI output is not cached and retries preserve submitted work',async t=>{
  const {api,app,state,prepare}=await fixture(t);const {s,path}=await prepare();
  const before=app.db.prepare('SELECT response FROM learning_step_attempts WHERE session_id=? AND step_id=?').get(s.id,'writing').response;
  state.invalid=true;assert.equal((await api('POST',path,{})).error.code,'AI_INVALID_RESPONSE');
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM learning_ai_feedback').get().n,0);
  state.invalid=false;state.fail=true;assert.equal((await api('POST',path,{})).status,502);
  state.fail=false;assert.equal((await api('POST',path,{})).status,200);assert.equal(state.calls,3);
  assert.equal(app.db.prepare('SELECT response FROM learning_step_attempts WHERE session_id=? AND step_id=?').get(s.id,'writing').response,before);
});

test('deleting a session while AI runs does not recreate private feedback',async t=>{
  const {api,app,state,prepare}=await fixture(t);const {s,path}=await prepare();state.delay=100;
  const request=api('POST',path,{});
  for(let i=0;i<40&&state.calls===0;i++)await new Promise(r=>setTimeout(r,5));assert.equal(state.calls,1);
  app.db.prepare('DELETE FROM learning_sessions WHERE id=?').run(s.id);
  assert.equal((await request).status,404);assert.equal(app.db.prepare('SELECT COUNT(*) n FROM learning_ai_feedback').get().n,0);
});
