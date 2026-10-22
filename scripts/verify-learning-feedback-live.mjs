// One explicit live feedback request on a disposable DB. Never prints credentials.
import {existsSync,writeFileSync} from 'node:fs';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {createApp} from '../server/app.mjs';
if(!process.argv.includes('--live'))throw new Error('Pass --live only when intentionally verifying the configured provider.');
if(existsSync('.env'))process.loadEnvFile('.env');
const app=createApp({ai:{provider:process.env.AI_PROVIDER,geminiKey:process.env.GEMINI_API_KEY,model:process.env.GEMINI_MODEL,url:process.env.AI_SERVICE_URL,key:process.env.AI_SERVICE_KEY,timeoutMs:20000}});
app.server.listen(0,'127.0.0.1');await once(app.server,'listening');let cookie='';
const report={date:'2026-10-21',database:'isolated_in_memory',logical_live_feedback_requests:0,passed:false};
const api=async(method,path,body)=>{
  const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/v1${path}`,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};
};
try{
  await api('POST','/auth/register',{email:'live-feedback@test.invalid',name:'Live QA',password:'disposable private live test password'});
  const original='I am student. I study information technology. I want work with computer systems.';
  let s=(await api('POST','/learning/sessions',{lesson_id:'system-introductions-01'})).data;
  while(s.current){
    const q=s.current,response=q.response_schema==='choice'?{option_id:q.options[0].id}:q.response_schema==='text'?{text:original,self_reviewed:true}:{acknowledged:true};
    const saved=await api('POST',`/learning/sessions/${s.id}/submit`,{step_id:q.id,revision:s.revision,submission_id:randomUUID(),response});
    if(saved.status!==200)throw new Error('SETUP_SUBMISSION_FAILED');
    s=saved.data.session;if(q.type==='writing_task')break;
    s=(await api('POST',`/learning/sessions/${s.id}/advance`,{step_id:q.id,revision:s.revision})).data;
  }
  report.logical_live_feedback_requests=1;
  const result=await api('POST',`/learning/sessions/${s.id}/steps/writing/ai-feedback`,{});
  report.status=result.status;
  if(result.data){
    report.provider=result.data.provider;report.model=result.data.model;report.corrections=result.data.feedback.corrections.length;
    report.source_preserved=result.data.source_text===original;report.pronunciation_assessed=result.data.pronunciation_assessed;
    const cached=await api('POST',`/learning/sessions/${s.id}/steps/writing/ai-feedback`,{});
    report.cached_without_regeneration=cached.data?.cached===true&&cached.data?.id===result.data.id;
    report.passed=result.status===200&&report.source_preserved&&report.cached_without_regeneration;
  }else{report.error_code=result.error?.code;report.retry_after_seconds=result.error?.details?.retry_after_seconds??null;}
}catch(e){report.error_code=e.message;}
finally{
  writeFileSync('docs/learning-feedback-live-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  app.server.closeAllConnections();await app.close();if(!report.passed)process.exitCode=1;
}
