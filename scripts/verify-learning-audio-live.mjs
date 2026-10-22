// One logical live request on an isolated DB. No credentials or audio are printed.
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {createApp} from '../server/app.mjs';
import {starterLessons} from '../server/content/learning-v2/curriculum.mjs';
if(!process.argv.includes('--live'))throw Error('Pass --live to intentionally verify the configured audio provider.');
if(existsSync('.env'))process.loadEnvFile('.env');
const app=createApp({ai:{provider:process.env.AI_PROVIDER,geminiKey:process.env.GEMINI_API_KEY,model:process.env.GEMINI_MODEL,url:process.env.AI_SERVICE_URL,key:process.env.AI_SERVICE_KEY,timeoutMs:20000}});
app.server.listen(0,'127.0.0.1');await once(app.server,'listening');let cookie='';
const report={date:'2026-10-21',database:'isolated_in_memory',input:'saved Windows TTS sentence, not a human recording',logical_live_audio_requests:0,passed:false};
const api=async(method,path,body)=>{
  const r=await fetch(`http://127.0.0.1:${app.server.address().port}/api/v1${path}`,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-Requested-With':'OpenQuiz'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,...await r.json()};
};
try{
  await api('POST','/auth/register',{email:'live-audio@test.invalid',name:'Audio QA',password:'disposable live audio password'});
  let s=(await api('POST','/learning/sessions',{lesson_id:'foundation-introductions-01'})).data;
  const source=starterLessons.find(l=>l.id===s.lesson_id);
  while(s.current.type!=='pronunciation_practice'){
    const q=s.current,key=source.steps.find(x=>x.id===q.id),response=q.response_schema==='choice'?{option_id:key.answer}:{acknowledged:true};
    const r=await api('POST',`/learning/sessions/${s.id}/submit`,{step_id:q.id,revision:s.revision,submission_id:randomUUID(),response});
    if(r.status!==200)throw Error('SETUP_FAILED');
    s=(await api('POST',`/learning/sessions/${s.id}/advance`,{step_id:q.id,revision:r.data.session.revision})).data;
  }
  const body={submission_id:randomUUID(),audio:{mime_type:'audio/wav',data:readFileSync('server/content/learning-v2/media/sentences/foundation-introductions-01-v1-s02.wav').toString('base64')}};
  const path=`/learning/sessions/${s.id}/steps/${s.current.id}/audio-reviews`;
  report.logical_live_audio_requests=1;
  const r=await api('POST',path,body);report.http=r.status;
  if(r.data){
    report.provider=r.data.provider;report.model=r.data.model;report.transcript_nonempty=!!r.data.transcript.trim();report.feedback_nonempty=!!r.data.feedback.trim();report.audio_stored=r.data.audio_stored;report.pronunciation_score=r.data.pronunciation_score;
    const cached=await api('POST',path,body);report.cached_without_regeneration=cached.data?.id===r.data.id&&cached.data?.cached===true;
    report.session_unchanged=JSON.stringify((await api('GET',`/learning/sessions/${s.id}`)).data)===JSON.stringify(s);
    report.passed=r.status===200&&report.feedback_nonempty&&report.cached_without_regeneration&&report.session_unchanged&&!report.audio_stored&&report.pronunciation_score===null;
  }else{report.error_code=r.error?.code;report.retry_after_seconds=r.error?.details?.retry_after_seconds??null;}
}catch(e){report.error_code=e.code??'LIVE_TEST_FAILED';}
finally{
  writeFileSync('docs/learning-audio-live-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  app.server.closeAllConnections();await app.close();if(!report.passed)process.exitCode=1;
}
