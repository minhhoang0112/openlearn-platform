// Explicit smoke test against the configured provider. Never prints the API key.
import {existsSync,writeFileSync,readFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createApp} from '../server/app.mjs';
import {once} from 'node:events';
if(existsSync('.env'))process.loadEnvFile('.env');
if(!process.env.GEMINI_API_KEY)throw new Error('No Gemini key configured');
const app=createApp({ai:{provider:'gemini',geminiKey:process.env.GEMINI_API_KEY,model:process.env.GEMINI_MODEL}});
app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
const base=`http://127.0.0.1:${app.server.address().port}/api/v1`;let cookie='';
const requested=process.argv.slice(2);
const report=requested.length&&existsSync('docs/live-ai-validation.json')?JSON.parse(readFileSync('docs/live-ai-validation.json','utf8')):{model:process.env.GEMINI_MODEL,checks:[],failures:[]};
if(requested.length){report.checks=report.checks.filter(c=>!requested.includes(c.kind));report.failures=report.failures.filter(c=>!requested.includes(c.kind));}
async function api(method,path,body){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json','X-Requested-With':'OpenQuiz',Cookie:cookie},...(body===undefined?{}:{body:JSON.stringify(body)})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const value=await r.json();if(!r.ok)throw new Error(value.error?.code+': '+value.error?.message);return value.data;}
try{
  await api('POST','/auth/register',{email:'live-check@example.test',password:'temporary live check account',name:'Live Check'});
  const word=(await api('GET','/sets/163')).words[0];
  for(const kind of (requested.length?requested:['speaking_question','speaking_feedback','word_examples','grammar','reading']).filter(k=>k!=='pronunciation')){
    try{const r=await api('POST','/ai/generate',{set_id:163,kind,word_ids:[word.id],transcript:'I applied for a new job yesterday.',instruction:'Create a short English learning exercise. For reading or grammar, include two multiple-choice questions.'});report.checks.push({kind,stored:!!r.id,valid:true});console.log(JSON.stringify({kind,success:true}));}
    catch(e){report.failures.push({kind,message:e.message});console.log(JSON.stringify({kind,success:false,message:e.message}));}
  }
  mkdirSync('research/captures',{recursive:true});
  const fixture='research/captures/pronunciation-fixture.wav';
  const command="Add-Type -AssemblyName System.Speech; $quizVoice = New-Object System.Speech.Synthesis.SpeechSynthesizer; $quizVoice.SetOutputToWaveFile([System.IO.Path]::GetFullPath('research/captures/pronunciation-fixture.wav')); $quizVoice.Speak('I want to apply for the job.'); $quizVoice.Dispose()";
  const synthesized=!requested.length||requested.includes('pronunciation')?spawnSync('powershell',['-NoProfile','-Command',command],{encoding:'utf8',windowsHide:true}):null;
  if(synthesized?.status===0&&existsSync(fixture)){
    try{const r=await api('POST','/ai/generate',{set_id:163,kind:'pronunciation',word_ids:[word.id],instruction:'Target word: apply. This is synthetic test speech, not a real learner. Verify audio recognition and provide qualitative feedback.',audio:{mime_type:'audio/wav',data:readFileSync(fixture).toString('base64')}});report.checks.push({kind:'pronunciation',synthetic_fixture:true,valid:typeof r.result.feedback==='string'});console.log(JSON.stringify({kind:'pronunciation',success:true,synthetic_fixture:true}));}
    catch(e){report.failures.push({kind:'pronunciation',message:e.message});console.log(JSON.stringify({kind:'pronunciation',success:false,message:e.message}));}
  }else if(synthesized)report.failures.push({kind:'pronunciation',message:'Synthetic audio fixture unavailable; microphone input not tested.'});
}finally{
  writeFileSync('docs/live-ai-validation.json',JSON.stringify(report,null,2)+'\n');app.server.closeAllConnections();await app.close();
}
if(report.failures.length)process.exitCode=1;
