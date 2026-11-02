// Two synthetic prompts only; no learner history, recordings or credentials logged.
import {existsSync,writeFileSync} from 'node:fs';
import {WebSocket} from 'ws';
import {geminiProvider} from '../server/providers.mjs';
import {tutorPolicy} from '../server/communication-policy.mjs';
import {liveSetup,LIVE_MODEL} from '../server/communication-live.mjs';
if(existsSync('.env'))process.loadEnvFile();
const key=String(process.env.GEMINI_API_KEY||'').split(',')[0].trim(),session={level:'beginner',mode:'guided',scenario:'it-work'},report={checked_at:new Date().toISOString(),synthetic_only:true,checks:[]};
try{
  if(!process.argv.includes('--voice-only')){
  const result=await geminiProvider({key,model:process.env.GEMINI_MODEL||'gemini-3.5-flash'}).generate('communication_reply',{policy:tutorPolicy(session),session,recent_turns:[],learner_message:'Tạm bỏ chủ đề IT. Viết giúp mình một đoạn hội thoại mua bánh ngắn bằng tiếng Anh, có nghĩa tiếng Việt từng câu nhé.'});
  report.checks.push({kind:'text_topic_change_and_bilingual_content',reply:result.reply,passed:typeof result.reply==='string'&&/[ăâđêôơưàáạảãấầậẩẫắằặẳẵếềệểễốồộổỗớờợởỡứừựửữ]/i.test(result.reply)&&/bánh|bread|cake|bakery/i.test(result.reply)});
  }
  const liveKey=process.env.GEMINI_LIVE_API_KEY||key,model=process.env.GEMINI_LIVE_MODEL||LIVE_MODEL;
  const voice=await new Promise(resolve=>{
    const ws=new WebSocket('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key='+encodeURIComponent(liveKey));let text='',audio=false,done=false;
    const finish=error=>{if(done)return;done=true;clearTimeout(timer);ws.close();resolve({kind:'voice_vietnamese_explanation',model,transcript:text,audio_received:audio,error,passed:!error&&audio&&/[ăâđêôơưàáạảãấầậẩẫắằặẳẵếềệểễốồộổỗớờợởỡứừựửữ]/i.test(text)});};
    const timer=setTimeout(()=>finish('TIMEOUT'),30000);
    ws.on('open',()=>ws.send(JSON.stringify(liveSetup(session,{recent_turns:[{role:'assistant',content:'What are you working on today?'}],memories:[]},model))));
    ws.on('message',raw=>{try{const r=JSON.parse(raw);if(r.error)return finish('PROVIDER_'+r.error.code);if(r.setupComplete)ws.send(JSON.stringify({clientContent:{turns:[{role:'user',parts:[{text:'Mình không hiểu câu vừa rồi nghĩa là gì. Bạn giải thích bằng tiếng Việt và giúp mình tìm một câu trả lời đơn giản, đừng hỏi câu tiếng Anh mới nhé.'}]}],turnComplete:true}}));const c=r.serverContent;if(c?.outputTranscription?.text)text+=c.outputTranscription.text;if(c?.modelTurn?.parts?.some(p=>p.inlineData?.data))audio=true;if(c?.turnComplete)finish();}catch{finish('INVALID_RESPONSE');}});
    ws.on('error',()=>finish('CONNECTION_FAILED'));ws.on('close',()=>{if(!done)finish('CONNECTION_CLOSED');});
  });report.checks.push(voice);
}catch(error){report.error=error.code||'PROVIDER_FAILED';}
report.passed=report.checks.length===(process.argv.includes('--voice-only')?1:2)&&report.checks.every(c=>c.passed);
writeFileSync('docs/communication-tutor-provider-check.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,checks:report.checks.map(({kind,passed,error})=>({kind,passed,error})),error:report.error}));if(!report.passed)process.exitCode=1;
