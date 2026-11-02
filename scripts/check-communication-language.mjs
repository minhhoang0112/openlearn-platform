// Synthetic two-turn conversation only; no private history or microphone data.
import {existsSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {WebSocket} from 'ws';
import {liveSetup,LIVE_MODEL} from '../server/communication-live.mjs';
if(existsSync('.env'))process.loadEnvFile();
const key=process.env.GEMINI_LIVE_API_KEY||String(process.env.GEMINI_API_KEY||'').split(',')[0].trim();
const prompts=['Mình mới học, hãy hướng dẫn bằng tiếng Việt xuyên suốt nhé. Mình sẽ thử nói một câu tiếng Anh, nhưng vẫn cần bạn giải thích tiếng Việt.','I like music.'];
const report={checked_at:new Date().toISOString(),synthetic_only:true,mode:'free',level:'beginner',turns:[]};
await new Promise(resolve=>{
  const ws=new WebSocket('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key='+encodeURIComponent(key));
  let index=0,text='',started=0,firstAudio=null,done=false;
  const finish=error=>{if(done)return;done=true;clearTimeout(timer);ws.close();report.error=error;resolve();};
  const timer=setTimeout(()=>finish('TIMEOUT'),45000);
  const send=()=>{started=performance.now();text='';firstAudio=null;ws.send(JSON.stringify({clientContent:{turns:[{role:'user',parts:[{text:prompts[index]}]}],turnComplete:true}}));};
  ws.on('open',()=>ws.send(JSON.stringify(liveSetup({level:'beginner',mode:'free',scenario:'free-talk'},{recent_turns:[],memories:[]},process.env.GEMINI_LIVE_MODEL||LIVE_MODEL))));
  ws.on('message',raw=>{try{
    const r=JSON.parse(raw);if(r.error)return finish('PROVIDER_'+r.error.code);if(r.setupComplete)send();
    const c=r.serverContent;if(c?.outputTranscription?.text)text+=c.outputTranscription.text;
    if(firstAudio===null&&c?.modelTurn?.parts?.some(p=>p.inlineData?.data))firstAudio=Math.round(performance.now()-started);
    if(c?.turnComplete){report.turns.push({prompt:prompts[index],reply:text,first_audio_ms:firstAudio,complete_ms:Math.round(performance.now()-started),vietnamese_support:/[ăâđêôơưàáạảãấầậẩẫắằặẳẵếềệểễốồộổỗớờợởỡứừựửữ]/i.test(text)});if(++index<prompts.length)send();else finish();}
  }catch{finish('INVALID_RESPONSE');}});
  ws.on('error',()=>finish('CONNECTION_FAILED'));ws.on('close',()=>{if(!done)finish('CONNECTION_CLOSED');});
});
report.passed=!report.error&&report.turns.length===2&&report.turns.every(t=>t.vietnamese_support&&t.first_audio_ms!==null);
writeFileSync('docs/communication-language-provider-check.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
