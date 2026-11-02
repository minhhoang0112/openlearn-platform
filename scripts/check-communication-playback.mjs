// Fixed synthetic sentence only. No learner content or credentials in this report.
import {existsSync,writeFileSync} from 'node:fs';
import {communicationAudio} from '../server/communication-audio.mjs';
import {geminiProvider} from '../server/providers.mjs';
import {routingEnvironment} from '../server/ai-routing.mjs';
if(existsSync('.env'))process.loadEnvFile();
const config=routingEnvironment(process.env),key=String(process.env.GEMINI_API_KEY||'').split(',')[0].trim(),model=process.env.GEMINI_LIVE_MODEL||'gemini-3.8-live';
const report={checked_at:new Date().toISOString(),synthetic_only:true,checks:[]},audio=communicationAudio({key:process.env.GEMINI_LIVE_API_KEY||key,model});
try{const turn={id:0,content:'Hello! What would you like to learn today?'},r=await audio.read(0,'synthetic',turn),replay=await audio.read(0,'synthetic',turn);report.checks.push({kind:'read_aloud',model,wav_bytes:r.data.length,valid_wav:r.data.toString('ascii',0,4)==='RIFF',repeat_cached:replay.cached,passed:r.data.length>44&&replay.cached});}catch(e){report.checks.push({kind:'read_aloud',passed:false,error:e.code||'PROVIDER_FAILED'});}finally{audio.close();}
try{const p=geminiProvider({key:config.secondaryKey||key,model:config.fastModel}),r=await p.generate('translation',{text:'What would you like to learn today?',source_language:'auto',target_language:'vi'});report.checks.push({kind:'translation',translation:r.translation,passed:typeof r.translation==='string'&&r.translation.trim().length>0});}catch(e){report.checks.push({kind:'translation',passed:false,error:e.code||'PROVIDER_FAILED'});}
report.passed=report.checks.length===2&&report.checks.every(c=>c.passed);writeFileSync('docs/communication-playback-provider-check.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
