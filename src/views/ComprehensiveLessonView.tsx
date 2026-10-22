import React,{useEffect,useState} from 'react';
import {api,StudySession} from '../api/client';
import {useRouter} from '../context/RouterContext';
import {SessionRunner} from '../components/SessionRunner';
import {useAuth} from '../context/AuthContext';
type Overview=Awaited<ReturnType<typeof api.getLessons>>;
type Lesson=Awaited<ReturnType<typeof api.getLesson>>;
export function ComprehensiveLessonView(){
  const {params,path,navigate}=useRouter();const {capabilities}=useAuth();const setId=Number(params.id);
  const [overview,setOverview]=useState<Overview|null>(null);const [lesson,setLesson]=useState<Lesson|null>(null);
  const [session,setSession]=useState<StudySession|null>(null);const [step,setStep]=useState<number|null>(null);
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const [answer,setAnswer]=useState('');const [reply,setReply]=useState('');const [thread,setThread]=useState<string|null>(null);
  const refresh=async(index?:number)=>{setOverview(await api.getLessons(setId));if(index)setLesson(await api.getLesson(setId,index));};
  useEffect(()=>{let active=true;api.getLessons(setId).then(o=>{if(active)setOverview(o);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[setId]);
  const select=async(index:number)=>{setBusy(true);setError('');try{setLesson(await api.getLesson(setId,index));setStep(null);setSession(null);setThread(null);}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  const start=async(index:number)=>{if(!lesson)return;if(index>=4&&!capabilities?.ai.configured){navigate('/settings/ai?returnTo='+encodeURIComponent(path));return;}setBusy(true);setError('');try{const r=await api.startLessonStep(setId,lesson.lesson_index,index);setSession(r.session||null);setStep(index);setAnswer('');setReply('');setThread(null);}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  const complete=async(evidence:Record<string,unknown>)=>{if(!lesson||step===null)return;await api.completeLessonStep(setId,lesson.lesson_index,step,evidence);await refresh(lesson.lesson_index);setSession(null);setStep(null);};
  const ai=async()=>{if(!lesson||!answer.trim())return;setBusy(true);setError('');try{
    if(step===4){const r=await api.generate(setId,'speaking_feedback','Evaluate use of these lesson terms: '+lesson.words.map(w=>w.term).join(', '),answer);setReply(String(r.result.feedback));await complete({feedback_ids:[r.id]});}
    else if(step===5){let id=thread;if(!id){const r=await api.request<{id:string}>('POST','/conversations',{set_id:setId});id=r.id;setThread(id);}const r=await api.request<{reply:string}>('POST','/conversations/'+id+'/messages',{message:answer});setReply(r.reply);setAnswer('');}
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  return <div className="max-w-4xl mx-auto space-y-6 pb-16"><button onClick={()=>navigate('/study-set/'+setId)}>← Bộ từ</button><h1 className="text-2xl font-bold">Học kết hợp · 5 từ mỗi bài</h1>
    <p className="text-sm text-slate-500">Chọn bất kỳ bước nào bạn muốn luyện. Tiến độ được lưu riêng cho từng bước.</p>
    {error&&<p role="alert">{error}</p>}
    <div className="flex flex-wrap gap-2">{overview?.lessons.map(l=><button disabled={busy} onClick={()=>void select(l.index)} key={l.index} className="border rounded-xl p-3">Bài {l.index} · {l.completed_steps}/5</button>)}</div>
    {lesson&&<section className="bg-white dark:bg-slate-900 border rounded-2xl p-6 space-y-5"><h2 className="font-bold">{lesson.words.map(w=>w.term).join(' · ')}</h2>
      <div className="flex flex-wrap gap-2">{lesson.steps.map(s=><button disabled={busy} onClick={()=>void start(s.index)} key={s.index} className="border rounded-xl p-3 disabled:opacity-40">{s.index}. {s.name} {s.completed?'✓':''}</button>)}</div>
      {session&&<SessionRunner key={session.id} initial={session} words={lesson.words} onFinish={s=>complete({session_id:s.id})}/>}
      {step!==null&&step>=4&&<div className="space-y-3"><p>Dùng tất cả các từ của bài trong câu trả lời hoặc hội thoại tiếng Anh.</p><textarea aria-label="Câu trả lời" className="w-full border rounded-xl p-3" value={answer} onChange={e=>setAnswer(e.target.value)}/><button disabled={busy||!answer.trim()} onClick={()=>void ai()} className="border rounded-xl p-3">{busy?'Đang xử lý...':step===4?'Gửi để nhận phản hồi':'Gửi tin nhắn'}</button>{step===5&&thread&&<button disabled={busy} onClick={async()=>{setBusy(true);try{await complete({conversation_id:thread});}catch(e){setError((e as Error).message);}finally{setBusy(false);}}} className="border rounded-xl p-3">Hoàn thành hội thoại</button>}</div>}
      {reply&&<p className="whitespace-pre-wrap border rounded-xl p-4">{reply}</p>}
    </section>}
  </div>;
}
