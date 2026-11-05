import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,Volume2,Mic,Square,ArrowRight,RotateCcw,CheckCircle2,Loader2} from 'lucide-react';
import {useRouter} from '../context/RouterContext';
import {guidedCourses,GuidedSession} from '../api/guidedCourses';
import {playAudio} from '../utils/audio';
import {useGuidedSpeech} from '../hooks/useGuidedSpeech';

export function GuidedCourseLessonView(){
 const {path,navigate}=useRouter(),lessonId=Number(path.match(/\/lesson\/(\d+)/)?.[1]);
 const [session,setSession]=useState<GuidedSession|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[answer,setAnswer]=useState(''),[option,setOption]=useState(''),[tokens,setTokens]=useState<string[]>([]),[speed,setSpeed]=useState(.9),[translation,setTranslation]=useState(true),[nextId,setNextId]=useState<number|null>(null);
 const request=useRef(0),current=session?.current,sessionRef=useRef(session);sessionRef.current=session;
 const speech=useGuidedSpeech(current?.id,setAnswer);
 const back=`/courses?course=${session?.course_id||Number(path.match(/\/courses\/(\d+)/)?.[1])}`;
 useEffect(()=>{let active=true;setSession(null);setError('');guidedCourses.start(lessonId).then(s=>{if(active)setSession(s);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;request.current++;window.speechSynthesis?.cancel();};},[lessonId]);
 useEffect(()=>{setAnswer('');setOption('');setTokens([]);setTranslation(true);if(current?.english&&['card','speak'].includes(current.type))playAudio(current.english,'en-US',speed);},[current?.id]);
 useEffect(()=>{if(session?.status==='completed')guidedCourses.map(session.course_id).then(m=>setNextId(m.next_lesson_id)).catch(()=>{});},[session?.status]);
 const send=async(body:Record<string,unknown>)=>{
  if(!session||busy)return;speech.stop();setBusy(true);setError('');const id=++request.current;
  try{const s=await guidedCourses.answer(session,body);if(id===request.current)setSession(s);}
  catch(e:any){if(id!==request.current)return;setError(e.message);if(e.status===409)try{setSession(await guidedCourses.get(session.id));}catch{}}
  finally{if(id===request.current)setBusy(false);}
 };
 const listen=async()=>{if(!session||!current)return;setError('');try{const text=current.type==='listen'?(await guidedCourses.listen(session.id)).text:current.english;if(text)playAudio(text,'en-US',speed);}catch(e:any){setError(e.message);}};
 const basic=current&&['intro','card'].includes(current.type),canCheck=current?.type==='choice'?!!option:current?.type==='arrange'?tokens.length===current.tokens?.length:!!answer.trim();
 const check=()=>void send(current?.type==='choice'?{option_id:option}:current?.type==='arrange'?{token_ids:tokens}:{answer});
 const reviewAudio=async()=>{
  if(!session||!speech.audio||busy)return;
  if(speech.audio.size>440000){setError('Bản ghi quá lớn. Hãy ghi một câu ngắn dưới 440 KB.');return;}
  setBusy(true);setError('');const id=++request.current;
  try{
   const data=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(new Error('Không đọc được bản ghi.'));r.readAsDataURL(speech.audio!);});
   const s=await guidedCourses.pronunciation(session,{mime_type:speech.audio.type.split(';')[0]||'audio/webm',data});if(id===request.current)setSession(s);
  }catch(e:any){if(id===request.current)setError(e.message);}finally{if(id===request.current)setBusy(false);}
 };
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key!=='Enter'||e.repeat||e.isComposing||e.ctrlKey||e.altKey||e.metaKey||(e.target as HTMLElement).closest('button,select,textarea'))return;e.preventDefault();if(busy||speech.recording)return;if(session?.feedback||basic)void send({action:'continue'});else if(canCheck)check();};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});
 if(!session)return <div className="max-w-xl mx-auto p-6 space-y-4"><button onClick={()=>navigate('/courses')} className="inline-flex gap-2 items-center"><ArrowLeft className="w-4 h-4"/>Về khóa học</button>{error?<p role="alert" className="text-rose-600">{error}</p>:<p className="flex gap-2"><Loader2 className="w-5 h-5 animate-spin"/>Đang mở bài học...</p>}</div>;
 const activity=session.activities.find(a=>a.number===current?.activity),feedback=session.feedback;
 return <div className="max-w-3xl mx-auto px-3 py-5 md:py-8 space-y-5">
  <header className="flex items-start gap-3"><button aria-label="Về bản đồ khóa học" onClick={()=>navigate(back)} className="p-2.5 rounded-xl border bg-white dark:bg-slate-900"><ArrowLeft className="w-5 h-5"/></button><div className="min-w-0 flex-1"><h1 className="text-lg font-bold break-words">{session.title}</h1><p className="text-sm text-slate-500">{session.status==='completed'?'Đã hoàn thành':`Hoạt động ${current?.activity}/7 · ${activity?.title}`}</p></div><span className="text-sm font-bold shrink-0">{session.activities.filter(a=>a.completed).length}/7</span></header>
  <div aria-label="Tiến độ bài học" className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-600 transition-all" style={{width:`${100*session.completed_tasks/session.total_tasks}%`}}/></div>
  {session.status==='completed'?<section className="p-6 md:p-9 rounded-3xl border bg-white dark:bg-slate-900 space-y-5 text-center">
   <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto"/><h2 className="text-2xl font-bold">Bạn đã hoàn thành bài này!</h2>
   <p>Đã học và ôn xong các câu cần thiết.</p><p className="text-sm text-slate-500">Đúng ngay lần đầu: {session.first_correct}/{session.graded_tasks}. Các câu sai đã được luyện lại.</p>
   {session.skipped_speaking>0&&<p className="text-sm text-amber-700">Bạn đã bỏ qua {session.skipped_speaking} lượt nói. Có thể quay lại luyện khi sẵn sàng.</p>}
   <div className="flex flex-wrap justify-center gap-3"><button onClick={()=>navigate(back)} className="border rounded-xl px-4 py-3">Về khóa học</button>{nextId&&<button onClick={()=>navigate(`/courses/${session.course_id}/lesson/${nextId}?guided=1`)} className="bg-indigo-600 text-white rounded-xl px-4 py-3">Học bài tiếp theo</button>}<button onClick={()=>{setError('');guidedCourses.start(lessonId,false).then(setSession).catch(e=>setError(e.message));}} className="border rounded-xl px-4 py-3">Ôn lại bài</button></div>
  </section>:current&&<section data-testid="guided-task" data-task-id={current.id} className="p-5 md:p-8 rounded-3xl border bg-white dark:bg-slate-900 space-y-5 min-w-0">
   <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500"><span>{activity?.title} · {activity?.done}/{activity?.total}</span>{current.retry_of&&<span className="text-amber-700">Ôn câu vừa sai</span>}</div>
   <h2 className="text-lg font-bold leading-relaxed">{current.prompt}</h2>
   {basic&&<div className="text-center py-5 space-y-4"><p className="text-2xl md:text-3xl font-bold break-words">{current.english}</p><p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{current.vietnamese}</p>{current.type==='card'&&<button onClick={()=>void listen()} className="inline-flex gap-2 p-3 border rounded-xl items-center"><Volume2 className="w-5 h-5"/>Nghe mẫu</button>}</div>}
   {current.type==='choice'&&<div className="grid gap-3">{current.options?.map(o=><button key={o.id} disabled={!!feedback||busy} aria-pressed={option===o.id} onClick={()=>setOption(o.id)} className={`text-left p-4 rounded-xl border break-words ${option===o.id?'border-indigo-600 bg-indigo-50 dark:bg-indigo-950':'border-slate-200 dark:border-slate-700'}`}>{o.text}</button>)}</div>}
   {current.type==='listen'&&<button onClick={()=>void listen()} className="p-5 rounded-2xl border bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-200 flex items-center justify-center gap-3 w-full"><Volume2 className="w-7 h-7"/>Nghe câu</button>}
   {current.type==='arrange'&&<div className="space-y-4"><div aria-label="Câu bạn đã xếp" className="min-h-16 p-3 border rounded-xl flex flex-wrap gap-2">{tokens.map((id,i)=><button key={id} disabled={!!feedback||busy} onClick={()=>setTokens(tokens.filter((_,j)=>j!==i))} className="px-3 py-2 rounded-lg bg-indigo-100 dark:bg-indigo-900">{current.tokens?.find(t=>t.id===id)?.text}</button>)}</div><div className="flex flex-wrap gap-2">{current.tokens?.map(t=><button key={t.id} data-testid={`guided-token-${t.id}`} disabled={tokens.includes(t.id)||!!feedback||busy} onClick={()=>setTokens([...tokens,t.id])} className="px-3 py-2 border rounded-lg disabled:opacity-30">{t.text}</button>)}</div></div>}
   {current.type==='speak'&&<div className="space-y-4"><p className="text-2xl font-bold break-words">{current.english}</p><button onClick={()=>setTranslation(!translation)} className="text-sm text-indigo-600">{translation?'Ẩn nghĩa':'Hiện nghĩa'}</button>{translation&&<p className="text-slate-500">{current.vietnamese}</p>}<div className="flex flex-wrap gap-3"><button disabled={!!feedback||busy} onClick={()=>void speech.start()} className="p-3 border rounded-xl inline-flex gap-2 items-center">{speech.recording?<Square className="w-4 h-4"/>:<Mic className="w-4 h-4"/>}{speech.recording?'Dừng ghi':'Nói qua mic'}</button><button onClick={()=>void listen()} className="p-3 border rounded-xl inline-flex gap-2 items-center"><Volume2 className="w-4 h-4"/>Nghe mẫu</button></div>{speech.preview&&<div><p className="text-sm mb-1">Bản ghi của bạn</p><audio controls src={speech.preview} className="w-full max-w-full"/></div>}<p className="text-xs text-slate-500">Kiểm tra nội dung câu nhận dạng; không chấm độ chuẩn phát âm bằng phần trăm. Bản ghi nghe lại chỉ giữ trên thiết bị trong lượt này. Nhận dạng lời có thể cần mạng.</p>{speech.error&&<p role="alert" className="text-sm text-amber-700">{speech.error}</p>}</div>}
   {['listen','write','speak'].includes(current.type)&&<input aria-label="Câu trả lời" value={answer} onChange={e=>setAnswer(e.target.value)} disabled={!!feedback||busy||speech.recording} placeholder={current.type==='speak'?'Câu nhận dạng từ mic hoặc câu bạn tự nhập...':'Nhập câu tiếng Anh...'} className="w-full p-3.5 rounded-xl border bg-white dark:bg-slate-950" autoComplete="off"/>}
   {current.type==='speak'&&<section className="space-y-3 border-t pt-3">
    <div className="flex flex-wrap gap-3 items-center"><button disabled={!speech.audio||speech.recording||busy} onClick={()=>void reviewAudio()} className="border border-indigo-300 text-indigo-700 dark:text-indigo-300 rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-40">{busy?'Đang xử lý...':'Nhận xét phát âm AI'}</button><button onClick={()=>navigate('/settings/ai?returnTo='+encodeURIComponent(path))} className="text-xs underline text-slate-500">Cài đặt AI</button></div>
    <p className="text-xs text-slate-500">Chỉ khi bấm nhận xét, bản ghi mới được gửi tới AI và có thể dùng hạn mức API. Không lưu file ghi âm trên server.</p>
    {session.pronunciation_review&&<div className="rounded-xl bg-indigo-50 dark:bg-indigo-950 p-4 space-y-2 text-sm"><p className="font-semibold">Nhận xét bản ghi đã gửi gần nhất</p><p>AI nghe được: {session.pronunciation_review.transcript||'Chưa rõ lời'}</p><p className="whitespace-pre-wrap">{session.pronunciation_review.feedback}</p>{session.pronunciation_review.improvements.map((v,i)=><p key={i}>• {v}</p>)}</div>}
   </section>}
   {feedback&&<div role="status" className={`p-4 rounded-2xl border space-y-2 ${feedback.correct?'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100':'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950 dark:text-amber-100'}`}><p className="font-semibold">{feedback.message}</p>{!feedback.skipped&&<p className="break-words">{feedback.expected}</p>}<p className="text-sm">{feedback.explanation}</p></div>}
   {error&&<p role="alert" className="text-sm text-rose-600">{error}</p>}
   <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><label className="text-xs text-slate-500">Tốc độ nghe <select aria-label="Tốc độ nghe" value={speed} onChange={e=>setSpeed(Number(e.target.value))} className="p-2 border rounded-lg bg-white dark:bg-slate-900">{[.75,.9,1].map(n=><option key={n} value={n}>{n}×</option>)}</select></label><div className="flex gap-2">{current.type==='speak'&&!feedback&&<button disabled={busy||speech.recording} onClick={()=>void send({skip:true})} className="text-sm p-3 border rounded-xl">Chưa tiện nói</button>}<button disabled={busy||speech.recording||(!basic&&!feedback&&!canCheck)} onClick={()=>feedback||basic?void send({action:'continue'}):check()} className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-40 inline-flex gap-2 items-center">{busy?<Loader2 className="w-5 h-5 animate-spin"/>:null}{feedback||basic?'Tiếp tục':'Kiểm tra'}<ArrowRight className="w-4 h-4"/></button></div></div>
  </section>}
  <p className="text-xs text-slate-500 text-center">Tiến độ lưu sau mỗi lần kiểm tra / tiếp tục. Bạn có thể rời bài và quay lại.</p>
 </div>;
}
