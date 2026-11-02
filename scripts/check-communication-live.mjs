import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {WebSocket} from 'ws';
import {liveSetup,LIVE_MODEL} from '../server/communication-live.mjs';
if(existsSync('.env'))process.loadEnvFile();
const key=process.env.GEMINI_LIVE_API_KEY||String(process.env.GEMINI_API_KEY||'').split(',')[0].trim(),model=process.env.GEMINI_LIVE_MODEL||LIVE_MODEL;
const audioTest=process.argv.includes('--audio');
const report={checked_at:new Date().toISOString(),model,configured:!!key,setup_ok:false,audio_received:false,transcript_received:false,input_transcript_received:false,turn_complete:false,synthetic_only:true,input:audioTest?'prepared_curriculum_wav':'fixed_text'};
let pcm;
if(audioTest){
  const wav=readFileSync('server/content/learning-v2/media/sentences/foundation-introductions-01-v1-s01.wav');
  if(wav.toString('ascii',0,4)!=='RIFF'||wav.readUInt16LE(20)!==1||wav.readUInt16LE(22)!==1||wav.readUInt16LE(34)!==16)throw new Error('Expected mono PCM16 WAV');
  let data;for(let i=12;i+8<=wav.length;){const n=wav.readUInt32LE(i+4);if(wav.toString('ascii',i,i+4)==='data'){data=wav.subarray(i+8,i+8+n);break;}i+=8+n+(n%2);}
  if(!data)throw new Error('WAV has no data');const rate=wav.readUInt32LE(24),samples=Math.floor(data.length/2),length=Math.floor(samples*16000/rate);pcm=Buffer.alloc(length*2);
  for(let i=0;i<length;i++)pcm.writeInt16LE(data.readInt16LE(Math.min(samples-1,Math.floor(i*rate/16000))*2),i*2);
}
if(!key)throw new Error('Live key is not configured');
await new Promise(resolve=>{
  const ws=new WebSocket('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key='+encodeURIComponent(key));
  let done=false;const stop=()=>{if(done)return;done=true;clearTimeout(timer);ws.close();if(ws.readyState===WebSocket.CONNECTING)ws.terminate();resolve();};
  const timer=setTimeout(()=>{report.error='TIMEOUT';stop();},25000);
  ws.on('open',()=>ws.send(JSON.stringify(liveSetup({level:'beginner',mode:'guided',scenario:'introductions'},{recent_turns:[],memories:[]},model))));
  ws.on('message',raw=>{try{const r=JSON.parse(raw.toString());if(r.error){report.error_code=r.error.code;stop();return;}if(r.setupComplete){report.setup_ok=true;if(audioTest){void(async()=>{for(let i=0;i<pcm.length&&!done;i+=1024){ws.send(JSON.stringify({realtimeInput:{audio:{data:pcm.subarray(i,i+1024).toString('base64'),mimeType:'audio/pcm;rate=16000'}}}));await new Promise(r=>setTimeout(r,32));}if(!done)ws.send(JSON.stringify({realtimeInput:{audioStreamEnd:true}}));})();}else ws.send(JSON.stringify({clientContent:{turns:[{role:'user',parts:[{text:'Say only: Hello! What is your name?'}]}],turnComplete:true}}));}const c=r.serverContent;if(c?.inputTranscription?.text)report.input_transcript_received=true;if(c?.modelTurn?.parts?.some(p=>p.inlineData?.data))report.audio_received=true;if(c?.outputTranscription?.text)report.transcript_received=true;if(c?.turnComplete){report.turn_complete=true;stop();}}catch{report.error='INVALID_RESPONSE';stop();}});
  ws.on('error',()=>{report.error='CONNECTION_FAILED';stop();});ws.on('close',code=>{if(!done){report.close_code=code;stop();}});
});
writeFileSync('docs/communication-live-provider-check.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
if(!report.setup_ok||!report.audio_received||!report.turn_complete||(audioTest&&!report.input_transcript_received))process.exitCode=1;
