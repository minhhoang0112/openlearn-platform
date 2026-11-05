import {useEffect,useRef,useState} from 'react';

// Playback is the actual local recording. Text matching is not an acoustic pronunciation score.
export function useGuidedSpeech(taskId:string|undefined,onText:(text:string)=>void){
 const [recording,setRecording]=useState(false),[preview,setPreview]=useState(''),[error,setError]=useState('');
 const [audio,setAudio]=useState<Blob|null>(null);
 const stream=useRef<MediaStream|null>(null),recorder=useRef<MediaRecorder|null>(null),recognition=useRef<any>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const callback=useRef(onText);callback.current=onText;
 const generation=useRef(0);
 const stop=()=>{if(timer.current)clearTimeout(timer.current);try{recognition.current?.stop();}catch{}if(recorder.current?.state==='recording')recorder.current.stop();stream.current?.getTracks().forEach(t=>t.stop());setRecording(false);};
 useEffect(()=>{generation.current++;setRecording(false);setPreview('');setAudio(null);setError('');return()=>{generation.current++;try{recognition.current?.abort();}catch{}if(timer.current)clearTimeout(timer.current);if(recorder.current){recorder.current.onstop=null;if(recorder.current.state==='recording')recorder.current.stop();}stream.current?.getTracks().forEach(t=>t.stop());};},[taskId]);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
 const start=async()=>{
  if(recording){stop();return;}setError('');const gen=generation.current;
  try{
   const captured=await navigator.mediaDevices.getUserMedia({audio:true});
   if(gen!==generation.current){captured.getTracks().forEach(t=>t.stop());return;}
   stream.current=captured;
   const r=new MediaRecorder(stream.current),chunks:Blob[]=[];recorder.current=r;
   r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   r.onstop=()=>{stream.current?.getTracks().forEach(t=>t.stop());if(gen===generation.current){const blob=new Blob(chunks,{type:r.mimeType});setAudio(blob);setRecording(false);setPreview(URL.createObjectURL(blob));}};
   r.start();setRecording(true);setPreview('');setAudio(null);
   const Constructor=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
   if(Constructor){const sr=new Constructor();recognition.current=sr;sr.lang='en-US';sr.interimResults=false;sr.continuous=false;
    sr.onresult=(e:any)=>{if(gen===generation.current)callback.current(e.results[0][0].transcript);};
    sr.onend=()=>{if(gen===generation.current)stop();};sr.onerror=()=>{if(gen===generation.current)setError('Chưa nhận rõ lời. Nghe lại bản ghi, thử nói lại hoặc nhập câu bạn đã nói.');};sr.start();
   }else setError('Trình duyệt chưa hỗ trợ chép lời; bạn có thể nghe bản ghi rồi nhập câu đã nói.');
   timer.current=setTimeout(stop,20000);
  }catch{stop();setError('Không mở được mic. Kiểm tra quyền micro hoặc dùng ô nhập câu.');}
 };
 return {recording,preview,audio,error,start,stop};
}
