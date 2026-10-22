import React,{useEffect,useRef,useState} from 'react';
import {api,ApiWord} from '../api/client';
import {useAuth} from '../context/AuthContext';
import {useRouter} from '../context/RouterContext';
export function PronunciationPractice({word}:{word:ApiWord}){
  const {capabilities}=useAuth();const {path,navigate}=useRouter();
  const [recording,setRecording]=useState(false);const [busy,setBusy]=useState(false);const [audio,setAudio]=useState<Blob|null>(null);const [preview,setPreview]=useState('');
  const [feedback,setFeedback]=useState<{feedback:string;transcript:string;improvements:string[]}|null>(null);const [error,setError]=useState('');
  const recorder=useRef<MediaRecorder|null>(null);const stream=useRef<MediaStream|null>(null);const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const stop=()=>{if(recorder.current?.state==='recording')recorder.current.stop();stream.current?.getTracks().forEach(t=>t.stop());if(timer.current)clearTimeout(timer.current);};
  useEffect(()=>()=>{if(recorder.current){recorder.current.onstop=null;stop();}},[]);
  useEffect(()=>{setFeedback(null);setAudio(null);setError('');},[word.id]);
  useEffect(()=>{if(!audio){setPreview('');return;}const url=URL.createObjectURL(audio);setPreview(url);return()=>URL.revokeObjectURL(url);},[audio]);
  const record=async()=>{if(recording){stop();return;}setError('');setFeedback(null);
    try{stream.current=await navigator.mediaDevices.getUserMedia({audio:true});const r=new MediaRecorder(stream.current);recorder.current=r;const chunks:Blob[]=[];
      r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};r.onstop=()=>{setRecording(false);setAudio(new Blob(chunks,{type:r.mimeType}));stream.current?.getTracks().forEach(t=>t.stop());};
      r.start();setRecording(true);timer.current=setTimeout(stop,15000);
    }catch{stream.current?.getTracks().forEach(t=>t.stop());setError('Không bật được micro. Kiểm tra quyền trình duyệt hoặc chọn tệp âm thanh.');}
  };
  const review=async()=>{if(!audio)return;if(!capabilities?.ai.configured){navigate('/settings/ai?returnTo='+encodeURIComponent(path));return;}if(audio.size>440000){setError('Hãy dùng bản ghi ngắn, tối đa khoảng 15 giây và 440 KB.');return;}
    setBusy(true);setError('');try{
      const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(audio);});
      const r=await api.request<{result:{feedback:string;transcript:string;improvements:string[]}}>('POST','/ai/generate',{set_id:word.set_id,kind:'pronunciation',word_ids:[word.id],instruction:'Listen to the actual audio. The target word or phrase is '+word.term+'. Give specific pronunciation feedback without a fabricated numerical score.',audio:{mime_type:audio.type.split(';')[0]||'audio/webm',data}});
      setFeedback(r.result);
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  };
  return <section className="border rounded-2xl p-5 space-y-3"><h2 className="font-bold">Luyện phát âm bằng bản ghi âm</h2><p className="text-sm text-slate-500">Đọc “{word.term}”. Bản ghi được gửi tới model khi bạn bấm nhận xét.</p>
    <div className="flex flex-wrap gap-3"><button disabled={busy} onClick={()=>void record()} className="border rounded-xl p-3">{recording?'Dừng ghi âm':'Ghi âm tối đa 15 giây'}</button><input aria-label="Chọn bản ghi âm" type="file" accept="audio/*" disabled={recording||busy} onChange={e=>{setAudio(e.target.files?.[0]||null);setFeedback(null);}}/></div>
    {preview&&<audio controls src={preview}/>}
    <button disabled={!audio||recording||busy} onClick={()=>void review()} className="border rounded-xl p-3 disabled:opacity-40">{busy?'Đang nghe bản ghi...':'Nhận xét phát âm từ âm thanh'}</button>
    {error&&<p role="alert">{error}</p>}{feedback&&<div className="space-y-2"><p>AI nghe được: {feedback.transcript||'Chưa rõ lời'}</p><p className="whitespace-pre-wrap">{feedback.feedback}</p>{feedback.improvements.map((v,i)=><p key={i}>• {v}</p>)}</div>}
  </section>;
}
