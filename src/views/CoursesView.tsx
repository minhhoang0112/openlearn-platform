import React,{useEffect,useState} from 'react';
import {BookOpen,CheckCircle2,Lock,Play,ArrowLeft,ArrowRight,Loader2,X,GraduationCap} from 'lucide-react';
import {useRouter} from '../context/RouterContext';
import {api,CourseSummary} from '../api/client';
import {guidedCourses,GuidedMap,GuidedLesson} from '../api/guidedCourses';
import {toeicApi,ToeicCatalog} from '../api/toeicFoundation';
import {playAudio} from '../utils/audio';

const partLabels=['Chào hỏi và làm quen','Những điều quanh ta','Một ngày của tôi','Gia đình và bạn bè','Ăn uống và mua sắm','Đi lại và giao tiếp'];
export const CoursesView:React.FC=()=>{
 const {path,navigate}=useRouter(),query=new URLSearchParams(path.split('?')[1]||''),selectedId=Number(query.get('course'));
 const [catalog,setCatalog]=useState<CourseSummary[]>([]),[course,setCourse]=useState<GuidedMap|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[selected,setSelected]=useState<GuidedLesson|null>(null),[objectives,setObjectives]=useState(false);
 const [vocabularyPart,setVocabularyPart]=useState<number|null>(null);
 const [toeicCatalog,setToeicCatalog]=useState<ToeicCatalog|null>(null);
 useEffect(()=>{let active=true;setLoading(true);setError('');setSelected(null);
  toeicApi.getCatalog().then(cat=>{if(active)setToeicCatalog(cat);}).catch(()=>{});
  api.getCourses('en').then(async r=>{
   if(!active)return;setCatalog(r.items);const c=r.items.find(c=>c.id===selectedId)||r.items.find(c=>c.competence==='A1');
   if(!c){setCourse(null);return;}const m=await guidedCourses.map(c.id);if(active)setCourse(m);
  }).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[selectedId]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setSelected(null);setObjectives(false);setVocabularyPart(null);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 const open=(lesson:GuidedLesson)=>navigate(`/courses/${course!.id}/lesson/${lesson.id}?guided=1`);
 const next=course?.lessons.find(l=>l.id===course.next_lesson_id),ready=course?.lessons.some(l=>l.ready);
 return <div className="max-w-4xl mx-auto px-3 py-5 md:py-8 space-y-7 pb-20">
  <header className="space-y-4"><div className="flex items-center gap-3"><button aria-label="Về trang chủ" onClick={()=>navigate('/')} className="p-2 border rounded-xl"><ArrowLeft className="w-5 h-5"/></button><div><h1 className="text-2xl font-black">Khóa học</h1><p className="text-sm text-slate-500">Học từng bài nhỏ, biết rõ hôm nay bắt đầu từ đâu.</p></div></div>
   <div className="flex flex-wrap gap-3 items-center"><span className="px-3 py-2 rounded-xl border text-sm">🇬🇧 Tiếng Anh</span><label className="flex-1 min-w-0"><span className="sr-only">Chọn khóa học</span><select aria-label="Chọn khóa học" value={course?.id||''} onChange={e=>navigate('/courses?course='+e.target.value)} className="w-full max-w-md p-2.5 border rounded-xl bg-white dark:bg-slate-900">{catalog.map(c=><option key={c.id} value={c.id}>{c.title}{c.competence==='A1'?' · Chế độ mới':' · Chế độ trước'}</option>)}</select></label><button onClick={()=>setObjectives(true)} className="text-sm text-indigo-600">Mục tiêu khóa học</button></div>
  </header>
  {error&&<div role="alert" className="p-4 rounded-xl bg-rose-50 text-rose-700">{error}</div>}
  {loading?<p className="flex justify-center gap-2 py-10"><Loader2 className="w-5 h-5 animate-spin"/>Đang tải khóa học...</p>:course&&<>
   {toeicCatalog&&<section className="p-5 md:p-6 rounded-3xl border border-indigo-200 dark:border-indigo-900/60 bg-linear-to-br from-indigo-50/50 via-white to-sky-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 shadow-xs space-y-3">
    <div className="flex flex-wrap items-start justify-between gap-3">
     <div className="space-y-1">
      <div className="flex items-center gap-2">
       <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
        Khóa mới · SRS &amp; Nền tảng
       </span>
       <span className="text-xs text-slate-500">
        {toeicCatalog.phases.length} giai đoạn · {toeicCatalog.total_checkpoints} chặng · {toeicCatalog.total_units} bài
       </span>
      </div>
      <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white">
       {toeicCatalog.title}
      </h2>
     </div>
     <button
      onClick={()=>navigate('/courses/toeic')}
      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs md:text-sm transition shadow-xs"
     >
      Vào khóa TOEIC <ArrowRight className="w-4 h-4"/>
     </button>
    </div>
    <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
     {toeicCatalog.description}
    </p>
   </section>}
   <section className="p-5 md:p-6 rounded-3xl border bg-white dark:bg-slate-900 space-y-3">
    <div className="flex flex-wrap justify-between gap-2"><h2 className="font-bold text-lg">{course.title}</h2><span className="text-sm text-slate-500">{course.completed_lessons}/{course.total_lessons} bài đã hoàn thành</span></div>
    <p className="text-sm text-slate-500">{course.objective}</p>
    {ready?<button data-testid="guided-course-continue" onClick={()=>next?open(next):setSelected(course.lessons[0])} className="inline-flex gap-2 items-center px-5 py-3 bg-indigo-600 text-white rounded-xl font-bold">{next?.status==='in_progress'?'Tiếp tục bài đang học':next?'Bắt đầu bài tiếp theo':'Chọn bài để ôn lại'}<ArrowRight className="w-4 h-4"/></button>:<div className="space-y-2"><p className="text-sm text-amber-700">Khóa này đang dùng bài học phiên bản trước. Luồng mới hiện dành cho A1.</p><button onClick={()=>navigate('/courses?legacy=1')} className="border p-3 rounded-xl text-sm">Mở khóa học phiên bản trước</button></div>}
   </section>
   {ready&&Array.from(new Set(course.lessons.map(l=>l.part_id))).map((partId,partIndex)=>{
    const lessons=course.lessons.filter(l=>l.part_id===partId);
    return <section key={partId} className="max-w-xl mx-auto space-y-5" aria-label={`Phần ${partIndex+1}`}>
     <header className="text-center border-t pt-6 space-y-1"><p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Phần {partIndex+1}</p><h2 className="text-xl font-bold">{partLabels[partIndex]||lessons[0].part_title}</h2><p className="text-sm text-slate-500">{lessons[0].part_title}</p></header>
     <div className="text-center"><button onClick={()=>setVocabularyPart(lessons[0].part_number)} className="inline-flex gap-2 items-center text-sm text-indigo-600 border rounded-xl px-3 py-2"><BookOpen className="w-4 h-4"/>Sổ từ vựng phần {partIndex+1}</button></div>
     <ol className="relative space-y-5 before:absolute before:inset-y-4 before:left-1/2 before:border-l-2 before:border-dashed before:border-slate-300 dark:before:border-slate-700">
      {lessons.map((lesson,index)=>{const locked=lesson.status==='locked'||!lesson.ready,done=lesson.status==='completed',active=lesson.id===course.next_lesson_id;
       return <li key={lesson.id} className={`relative flex ${index%3===0?'justify-start':index%3===1?'justify-center':'justify-end'}`}>
        <button data-testid={`guided-lesson-${lesson.id}`} aria-label={locked?`Xem điều kiện mở bài ${lesson.title}`:undefined} onClick={()=>setSelected(lesson)} className={`relative w-[85%] sm:w-4/5 flex items-center gap-3 p-4 rounded-2xl border-2 text-left min-w-0 transition ${done?'border-emerald-400 bg-emerald-50 dark:bg-emerald-950':active?'border-indigo-600 bg-white dark:bg-slate-900 shadow-md':'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900'} ${locked?'text-slate-500':'hover:shadow-lg'}`}>
         <span className={`p-2.5 rounded-full shrink-0 ${done?'bg-emerald-100 text-emerald-700':active?'bg-indigo-100 text-indigo-700':'bg-slate-200 dark:bg-slate-800'}`}>{done?<CheckCircle2 className="w-5 h-5"/>:locked?<Lock className="w-5 h-5"/>:<BookOpen className="w-5 h-5"/>}</span>
         <span className="min-w-0"><span className="block text-xs mb-1">Bài {lesson.lesson_number} · {done?'Đã hoàn thành':locked?'Chưa mở':lesson.status==='in_progress'?'Đang học':'Sẵn sàng'}</span><span className="block font-bold break-words">{lesson.title}</span>{lesson.status==='in_progress'&&<span className="block text-xs mt-1">{lesson.completed_activities}/7 hoạt động xong</span>}</span>
        </button>
       </li>;
      })}
     </ol>
    </section>;
   })}
  </>}
  {vocabularyPart!==null&&<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"><section role="dialog" aria-modal="true" aria-label="Sổ từ vựng" className="w-full max-w-lg max-h-[85dvh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl p-6 space-y-5"><header className="flex justify-between gap-3"><h2 className="text-lg font-bold">Sổ từ vựng · Phần {vocabularyPart}</h2><button autoFocus aria-label="Đóng sổ từ vựng" onClick={()=>setVocabularyPart(null)}><X className="w-5 h-5"/></button></header>{course?.lessons.filter(l=>l.part_number===vocabularyPart).map(l=><section key={l.id} className="space-y-2"><h3 className="font-bold text-sm">{l.title}</h3>{l.vocabulary.map(w=><div key={w.english} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-3 border-b py-2 text-sm"><span className="font-semibold break-words">{w.english}</span><span className="text-slate-500 break-words">{w.vietnamese}</span><button aria-label={'Nghe từ '+w.english} onClick={()=>playAudio(w.english)} className="text-indigo-600 p-1"><Play className="w-4 h-4"/></button></div>)}</section>)}</section></div>}
  {(selected||objectives)&&<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={()=>{setSelected(null);setObjectives(false);}}><section role="dialog" aria-modal="true" aria-label={selected?.title||'Mục tiêu khóa học'} onClick={e=>e.stopPropagation()} className="w-full max-w-lg max-h-[85dvh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl p-6 space-y-5">
   <header className="flex items-start justify-between gap-3"><h2 className="text-xl font-bold">{selected?.title||'Bạn sẽ học như thế nào?'}</h2><button autoFocus aria-label="Đóng" onClick={()=>{setSelected(null);setObjectives(false);}} className="p-1.5"><X className="w-5 h-5"/></button></header>
   {selected?<><p className="text-sm text-slate-500">Phần {selected.part_number} · Bài {selected.lesson_number}</p>{selected.status==='locked'?<p className="p-4 rounded-xl bg-amber-50 text-amber-900">Hoàn thành bài phía trước để mở bài này. Bạn vẫn có thể ôn lại các bài đã hoàn thành.</p>:<><ol className="space-y-3">{['Làm quen từ và mẫu câu','Nhận biết nghĩa từ','Nghe và nhớ câu','Xếp từ thành câu','Nói lại câu mẫu','Dùng câu trong tình huống','Ôn lỗi và bài trước'].map((t,i)=><li key={t} className="flex gap-3 items-center"><span className="text-xs border rounded-full w-7 h-7 flex items-center justify-center">{i+1}</span><span>{t}</span></li>)}</ol><p className="text-xs text-slate-500">Câu sai được luyện lại. Các bước hoàn thành được lưu trên máy chủ.</p><button onClick={()=>open(selected)} className="w-full bg-indigo-600 text-white rounded-xl p-3 font-bold inline-flex gap-2 items-center justify-center"><Play className="w-4 h-4"/>{selected.status==='completed'?'Ôn lại bài':selected.status==='in_progress'?'Tiếp tục':'Bắt đầu học'}</button></>}</>:<div className="space-y-3 text-sm leading-relaxed"><p>{course?.objective}</p><p>Học một câu hỏi mỗi lần. Xem đáp án và giải thích trước khi tiếp tục; câu sai quay lại cuối hoạt động. Bài hoàn thành mới mở bài tiếp theo.</p><p>Không cần AI cho nội dung A1 có sẵn. Luyện nói dùng ghi âm / nhận dạng trên trình duyệt; không dùng phần trăm nhận dạng làm điểm phát âm.</p><p>Lộ trình, bộ thẻ và tiến độ cũ vẫn được giữ riêng.</p></div>}
  </section></div>}
 </div>;
};
