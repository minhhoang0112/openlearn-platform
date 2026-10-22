import React,{useState} from 'react';
import {api} from '../api/client';
import {useRouter} from '../context/RouterContext';
import {useAuth} from '../context/AuthContext';
type Question={q?:string;question?:string;options:string[];correct:number;rule?:string};
export function AiExercise({kind}:{kind:'reading'|'grammar'}) {
  const {params,path,navigate}=useRouter();const {capabilities}=useAuth();
  const setId=Number(params.id);
  const [result,setResult]=useState<Record<string,unknown>|null>(null);
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const [answers,setAnswers]=useState<Record<number,number>>({});const [submitted,setSubmitted]=useState(false);
  const generate=async()=>{if(!capabilities?.ai.configured){navigate('/settings/ai?returnTo='+encodeURIComponent(path));return;}setBusy(true);setError('');setResult(null);setAnswers({});setSubmitted(false);
    try{const response=await api.generate(setId,kind,'Use this set. Level A2-B1. Generate 3 multiple choice questions.');setResult(response.result);}
    catch(e){setError(e instanceof Error?e.message:'Không tạo được bài tập.');}finally{setBusy(false);}};
  const questions=(kind==='reading'?result?.questions:result?.exercises) as Question[]|undefined;
  return <div className="max-w-3xl mx-auto space-y-6 pb-16">
    <button onClick={()=>navigate(`/study-set/${setId}`)}>← Bộ từ</button><h1 className="text-2xl font-bold">{kind==='reading'?'Đọc hiểu':'Ngữ pháp'}</h1>
    {!capabilities?.ai.configured&&<p>AI chưa được kết nối. Bạn vẫn có thể học và ôn từ vựng.</p>}
    <button disabled={busy} onClick={()=>void generate()} className="rounded-xl bg-slate-900 text-white p-3 disabled:opacity-40">{busy?'Đang tạo bài...':'Tạo bài theo bộ từ này'}</button>
    {error&&<p role="alert">{error}</p>}
    {result&&<div className="bg-white dark:bg-slate-900 border rounded-2xl p-6 space-y-6">
      <p className="whitespace-pre-wrap leading-7">{String(result.passage||result.explanation||'')}</p>
      {questions?.map((q,i)=><fieldset disabled={submitted} key={i} className="space-y-2"><legend className="font-bold">{i+1}. {q.q||q.question}</legend>{q.options.map((o,j)=><label key={j} className="block p-2 border rounded-lg"><input type="radio" name={'q'+i} checked={answers[i]===j} onChange={()=>setAnswers(a=>({...a,[i]:j}))}/> {o}</label>)}{submitted&&<p>{answers[i]===q.correct?'Đúng':'Chưa đúng'} · Đáp án: {q.options[q.correct]} {q.rule}</p>}</fieldset>)}
      {!!questions?.length&&<button disabled={submitted||questions.some((_,i)=>answers[i]===undefined)} onClick={()=>setSubmitted(true)} className="rounded-xl border p-3 disabled:opacity-40">Kiểm tra bài luyện tập</button>}
      <p className="text-xs text-slate-500">Bài luyện tập do AI tạo, chưa được giáo viên duyệt. Kết quả này không cập nhật tiến độ từ vựng.</p>
    </div>}
  </div>;
}
