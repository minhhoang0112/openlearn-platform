import {useEffect,useRef,useState} from 'react';
import type {CommunicationTurn} from '../api/communication';
type VoiceState={phase:'idle'|'connecting'|'listening'|'thinking'|'speaking';connected:boolean;muted:boolean;input:string;output:string;error:string;notice:string;level:number;speakerError:string;localPlayback:boolean};
const initial:VoiceState={phase:'idle',connected:false,muted:false,input:'',output:'',error:'',notice:'',level:0,speakerError:'',localPlayback:false};
class StartupError extends Error {}
async function startupStage<T>(promise:Promise<T>,timeout:number,message:string):Promise<T>{let timer:ReturnType<typeof setTimeout>|undefined;try{return await Promise.race([promise,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new StartupError(message)),timeout);})]);}finally{clearTimeout(timer);}}
type SpeakerElement=HTMLAudioElement&{sinkId?:string;setSinkId?:(id:string)=>Promise<void>};
export function useCommunicationVoice(sessionId:string|undefined,onSaved:(turn:CommunicationTurn)=>void){
  const [state,setState]=useState(initial),[rate,setRate]=useState(0.9);
  const [devices,setDevices]=useState<MediaDeviceInfo[]>([]),[inputDevice,setInputDevice]=useState(''),[outputDevice,setOutputDevice]=useState('');
  const outputRef=useRef(outputDevice);outputRef.current=outputDevice;
  const refreshDevices=async()=>{try{const found=await navigator.mediaDevices?.enumerateDevices();if(found)setDevices(found);}catch{}};
  useEffect(()=>{void refreshDevices();const media=navigator.mediaDevices;const changed=()=>void refreshDevices();media?.addEventListener('devicechange',changed);return()=>media?.removeEventListener('devicechange',changed);},[]);
  const saved=useRef(onSaved);saved.current=onSaved;
  const control=useRef<{stop:()=>void;mute:(value:boolean)=>void;focus:(value:boolean)=>void;help:(action:string,turnId?:number)=>boolean;rate:(value:number)=>void;clear:()=>void;text:(value:string)=>boolean;speaker:()=>Promise<void>}|null>(null);
  const epoch=useRef(0),rateRef=useRef(rate);
  const stop=()=>{epoch.current++;control.current?.stop();control.current=null;setState(s=>({...s,phase:'idle',connected:false,muted:false,level:0,notice:'',input:'',output:'',speakerError:'',localPlayback:false}));};
  useEffect(()=>{return()=>{epoch.current++;control.current?.stop();control.current=null;};},[sessionId]);
  async function start(){
    if(!sessionId)return;stop();const attempt=++epoch.current;
    let stream:MediaStream|undefined,ctx:AudioContext|undefined,node:AudioWorkletNode|undefined,source:MediaStreamAudioSourceNode|undefined,playback:MediaStreamAudioDestinationNode|undefined,mutedOutput:GainNode|undefined,player:SpeakerElement|undefined,ws:WebSocket|undefined,timer:ReturnType<typeof setTimeout>|undefined,clockTimer:ReturnType<typeof setTimeout>|undefined,ready=false,closed=false,suppressed=false;
    let userMuted=false,localFocus=false,responding=false,complete=true,playing=false;
    const active=()=>epoch.current===attempt&&!closed;
    const update=(patch:Partial<VoiceState>)=>{if(active())setState(s=>({...s,...patch}));};
    const send=(data:unknown)=>{if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data));};
    const release=()=>{if(closed)return;closed=true;clearTimeout(timer);clearTimeout(clockTimer);if(node){node.port.onmessage=null;node.disconnect();}source?.disconnect();mutedOutput?.disconnect();player?.pause();if(player)player.srcObject=null;playback?.stream.getTracks().forEach(t=>t.stop());stream?.getTracks().forEach(t=>{t.onended=null;t.stop();});void ctx?.close().catch(()=>{});send({type:'stop'});ws?.close();};
    const fail=(message:string)=>{update({phase:'idle',connected:false,error:message,notice:'',speakerError:'',level:0});release();};
    const speaker=async()=>{if(!player||!active())return;try{
      const playing=player.play();playing.catch(()=>{});
      if(player.setSinkId&&player.sinkId!==outputRef.current)await startupStage(player.setSinkId(outputRef.current),4000,'Chưa chuyển được loa. Hãy chọn thiết bị khác.');
      await startupStage(playing,5000,'Loa chưa phát được. Chọn loa/tai nghe rồi bấm Bật lại loa.');update({speakerError:''});
    }catch{update({speakerError:'Mic vẫn hoạt động nhưng loa chưa phát được. Chọn loa/tai nghe và bấm Bật lại loa.'});}};
    const applyMute=()=>{const muted=userMuted||localFocus;stream?.getAudioTracks().forEach(t=>{t.enabled=!muted;});node?.port.postMessage({type:'mute',muted});if(muted)send({type:'pause'});};
    const actions={stop:release,speaker,mute:(muted:boolean)=>{userMuted=muted;applyMute();update({muted,level:0});},focus:(focused:boolean)=>{if(localFocus===focused)return;localFocus=focused;applyMute();if(focused){suppressed=responding;playing=false;node?.port.postMessage({type:'clear'});player?.pause();}else void speaker();update({localPlayback:focused,level:0});},help:(action:string,turnId?:number)=>{if(!ready||!active()||ws?.readyState!==WebSocket.OPEN)return false;send({type:'help',id:crypto.randomUUID(),action,...(turnId?{turn_id:turnId}:{})});return true;},rate:(value:number)=>node?.port.postMessage({type:'rate',rate:value}),clear:()=>{suppressed=responding;playing=false;node?.port.postMessage({type:'clear'});update({phase:'listening'});},text:(value:string)=>{if(!ready||!active()||ws?.readyState!==WebSocket.OPEN||ws.bufferedAmount>64000)return false;send({type:'text',id:crypto.randomUUID(),text:value});return true;}};
    control.current=actions;setState({...initial,phase:'connecting',notice:'Đang chờ quyền microphone...'});
    try{
      if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)return fail('Microphone cần HTTPS hoặc localhost. Bạn vẫn có thể nhập chữ.');
      const microphone=navigator.mediaDevices.getUserMedia({audio:{...(inputDevice?{deviceId:{exact:inputDevice}}:{}),channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false}).then(media=>{if(!active())media.getTracks().forEach(t=>t.stop());return media;});
      stream=await startupStage(microphone,20000,'Microphone chưa trả âm thanh sau 20 giây. Nếu đã cấp quyền, hãy chọn đúng mic trong danh sách và kiểm tra thiết bị đang được Windows sử dụng.');
      if(!active()){stream.getTracks().forEach(t=>t.stop());return;}
      void refreshDevices();update({notice:'Đã mở mic. Đang khởi động bộ xử lý âm thanh...'});
      // Capture uses an independent clock; playback goes to the real speaker.
      const independentOutput='setSinkId' in AudioContext.prototype;
      ctx=new AudioContext(independentOutput?{sinkId:{type:'none'}} as AudioContextOptions:undefined);
      await startupStage(ctx.resume(),5000,'Đã có quyền mic nhưng bộ xử lý âm thanh chưa khởi động. Hãy chọn lại mic/loa rồi kết nối lại.');if(!active()){stream.getTracks().forEach(t=>t.stop());void ctx.close();return;}
      update({notice:'Đang chuẩn bị luồng âm thanh...'});
      stream.getAudioTracks().forEach(t=>{t.onended=()=>fail('Microphone đã ngắt. Kiểm tra thiết bị rồi kết nối lại.');});
      await startupStage(ctx.audioWorklet.addModule('/audio/communication-worklet.js'),8000,'Chưa tải được bộ xử lý âm thanh. Tải lại trang rồi thử lại.');if(!active())return;
      node=new AudioWorkletNode(ctx,'live-voice',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]});node.onprocessorerror=()=>fail('Bộ xử lý âm thanh đã dừng. Hãy kết nối lại.');
      playback=ctx.createMediaStreamDestination();player=new Audio();player.setAttribute('playsinline','');player.srcObject=playback.stream;
      node.port.postMessage({type:'rate',rate:rateRef.current});source=ctx.createMediaStreamSource(stream);source.connect(node);node.connect(playback);mutedOutput=ctx.createGain();mutedOutput.gain.value=0;node.connect(mutedOutput);mutedOutput.connect(ctx.destination);
      clockTimer=setTimeout(()=>{if(active()&&ctx?.state==='running'&&ctx.currentTime===0)fail('Bộ âm thanh của trình duyệt chưa chạy. Kiểm tra thiết bị loa/mic mặc định trong hệ thống rồi kết nối lại.');},4000);
      node.port.onmessage=({data})=>{if(!active())return;
        if(data.type==='capture'){
          // When the UI thread stalls, old worklet messages can arrive in a burst.
          // Live voice must send current audio, not flood the socket with stale PCM.
          if(typeof data.time==='number'&&ctx&&ctx.currentTime-data.time>0.35)return;
          update({level:Math.min(1,data.level*5)});if(ready&&!localFocus){if(!ws||ws.bufferedAmount>64000)return fail('Mạng gửi mic quá chậm. Hãy kết nối lại.');const bytes=new Uint8Array(data.pcm);let b='';for(const x of bytes)b+=String.fromCharCode(x);send({type:'audio',data:btoa(b)});}
        }
        if(data.type==='playing'){playing=true;update({phase:'speaking'});}if(data.type==='drained'){playing=false;update({phase:complete||suppressed?'listening':'thinking'});}if(data.type==='overflow')fail('Âm thanh bị dồn quá nhiều. Hãy kết nối lại.');
      };
      ws=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/api/v1/communication/live?session_id=${encodeURIComponent(sessionId)}`);
      clearTimeout(timer);timer=setTimeout(()=>fail('Chưa kết nối được thoại sau 22 giây. Hãy thử nhập chữ hoặc kết nối lại.'),22000);update({notice:'Đang kết nối Gemini Live...'});
      ws.onmessage=({data})=>{if(!active())return;let msg;try{msg=JSON.parse(data);}catch{return fail('Luồng thoại không hợp lệ.');}
        if(msg.type==='ready'){ready=true;clearTimeout(timer);update({connected:true,phase:'listening',notice:'Mic đang nghe. Bạn có thể nói chen để ngắt lời AI.'});void speaker();}
        if(msg.type==='error')return fail(msg.message);if(msg.type==='notice')update({notice:msg.message});if(msg.type==='saved'&&msg.turn)saved.current(msg.turn);
        const c=msg.content;if(!c)return;
        if(c.interrupted){node?.port.postMessage({type:'clear'});playing=false;suppressed=false;responding=false;complete=true;update({phase:'listening',input:'',output:''});}
        if(!c.interrupted&&(c.outputTranscription?.text||c.modelTurn?.parts?.some((p:{inlineData?:{data?:string}})=>p.inlineData?.data))){responding=true;complete=false;if(localFocus)suppressed=true;if(!playing&&!suppressed)update({phase:'thinking'});}
        if(c.inputTranscription?.finished&&!playing&&!responding)update({phase:'thinking'});
        if(c.inputTranscription?.text)setState(s=>({...s,input:s.input+c.inputTranscription.text}));
        if(!c.interrupted&&c.outputTranscription?.text)setState(s=>({...s,output:s.output+c.outputTranscription.text}));
        if(!c.interrupted&&!suppressed&&!localFocus)for(const p of c.modelTurn?.parts||[]){const a=p.inlineData;if(!a?.data)continue;const sampleRate=Number(/rate=(\d+)/.exec(a.mimeType||'')?.[1]||24000);if(sampleRate!==24000)return fail('Tốc độ âm thanh AI chưa được hỗ trợ.');const b=Uint8Array.from(atob(a.data),x=>x.charCodeAt(0));if(b.byteLength%2)return fail('Âm thanh AI không hợp lệ.');node?.port.postMessage({type:'audio',pcm:b.buffer},[b.buffer]);}
        if(c.turnComplete&&!c.interrupted){suppressed=false;responding=false;complete=true;update({input:'',output:'',...(!playing?{phase:'listening'}:{})});}
      };
      ws.onerror=()=>fail('Không mở được thoại trực tiếp. Kiểm tra kết nối, quota Live hoặc cuộc gọi ở tab khác. Bạn vẫn có thể nhập chữ.');
      ws.onclose=()=>{if(active())fail('Cuộc gọi đã dừng. Tải lại lịch sử hoặc kết nối lại để tiếp tục.');};
    }catch(e){if(active()){const name=(e as Error).name;fail(e instanceof StartupError?e.message:name==='NotAllowedError'?'Chưa được cấp quyền microphone. Cho phép mic bên cạnh địa chỉ trang hoặc dùng nhập chữ.':name==='NotFoundError'||name==='OverconstrainedError'?'Không tìm thấy microphone đã chọn. Hãy chọn mic khác rồi kết nối lại.':name==='NotReadableError'?'Không đọc được mic. Kiểm tra thiết bị hoặc ứng dụng khác đang giữ mic.':'Không mở được bộ âm thanh. Chọn lại mic/loa rồi kết nối lại.');}else{stream?.getTracks().forEach(t=>t.stop());void ctx?.close().catch(()=>{});}}
  }
  return {...state,start,stop,devices,inputDevice,outputDevice,setInputDevice,setOutputDevice:(v:string)=>{outputRef.current=v;setOutputDevice(v);void control.current?.speaker();},refreshDevices,resumeSpeaker:()=>void control.current?.speaker(),pauseForPlayback:()=>control.current?.focus(true),resumeAfterPlayback:()=>control.current?.focus(false),sendHelp:(action:string,turnId?:number)=>control.current?.help(action,turnId)||false,setMuted:(v:boolean)=>control.current?.mute(v),interrupt:()=>control.current?.clear(),sendText:(v:string)=>control.current?.text(v)||false,rate,setRate:(v:number)=>{rateRef.current=v;setRate(v);control.current?.rate(v);}};
}
