import React,{useState} from 'react';
import {api,StudySession,GradedAnswer,ApiWord} from '../api/client';
import {playAudio} from '../utils/audio';
import {WordLearningDetails} from './WordLearningDetails';
import {useControlAudio} from '../utils/useControlAudio';
export function SessionRunner({initial,onFinish,words=[]}:{initial:StudySession;onFinish:(session:StudySession)=>Promise<void>;words?:ApiWord[]}) {
  const [session,setSession]=useState(initial);const [result,setResult]=useState<GradedAnswer|null>(null);
  const [text,setText]=useState('');const [flipped,setFlipped]=useState(false);
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const q=session.question;
  useControlAudio(()=>{if(q)playAudio(q.speech_text||q.prompt||'');});
  const submit=async(answer:string,extra:{option_id?:string;known?:boolean;skip?:boolean}={})=>{
    if(!q||busy||result)return;setBusy(true);setError('');
    try{setResult(await api.answer(session.id,q.id,answer,extra));}catch(e){setError(e instanceof Error?e.message:'Không lưu được câu trả lời.');}finally{setBusy(false);}
  };
  const next=()=>{if(!result)return;setSession(result.session);setResult(null);setText('');setFlipped(false);};
  if(session.status==='completed')return <div className="space-y-4"><p>Đã hoàn thành {session.correct}/{session.total} câu đúng.</p>{error&&<p role="alert">{error}</p>}<button disabled={busy} className="border p-3 rounded-xl" onClick={async()=>{setBusy(true);try{await onFinish(session);}catch(e){setError(e instanceof Error?e.message:'Không lưu được bước học.');}finally{setBusy(false);}}}>Lưu bước học và tiếp tục</button></div>;
  if(!q)return <p>Không có câu hỏi.</p>;
  return <div className="space-y-4"><p>{session.completed}/{session.total}</p>
    <h2 className="text-2xl font-bold">{q.type==='dictation'?'Nghe và nhập từ tiếng Anh':q.prompt}</h2>
    <button onClick={()=>playAudio(q.speech_text||q.prompt||'')}>Nghe</button>
    {q.type==='flashcard'?<div className="border rounded-xl p-5 space-y-3"><button className="block w-full text-left" onClick={()=>setFlipped(f=>!f)}>{flipped?words.find(w=>w.id===q.word_id)?.definition:'Lật thẻ để xem nghĩa'}</button>{flipped&&words.find(w=>w.id===q.word_id)&&<WordLearningDetails key={q.word_id} word={words.find(w=>w.id===q.word_id)!} auto/>}</div>:null}
    {q.type==='quiz'?q.options?.map(o=><button disabled={busy||!!result} key={o.id} onClick={()=>void submit(o.text,{option_id:o.id})} className="block border rounded-lg p-3 w-full text-left">{o.text}</button>):q.type==='flashcard'?<div className="flex gap-3"><button disabled={busy||!!result} onClick={()=>void submit('',{known:true})}>Đã nhớ</button><button disabled={busy||!!result} onClick={()=>void submit('',{known:false})}>Cần học lại</button></div>:<form onSubmit={e=>{e.preventDefault();void submit(text);}} className="flex gap-3"><input aria-label="Câu trả lời" value={text} onChange={e=>setText(e.target.value)} disabled={!!result} className="border rounded-lg p-3 flex-1"/><button disabled={busy||!!result||!text.trim()}>Kiểm tra</button></form>}
    {result&&<div className="rounded-xl border p-4"><p>{result.correct?'Đúng':'Cần ôn lại'} · {result.expected}</p><button onClick={next} className="mt-3 underline">Tiếp tục</button></div>}{error&&<p role="alert">{error}</p>}
  </div>;
}
