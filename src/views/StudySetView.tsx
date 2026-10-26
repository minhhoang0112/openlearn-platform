import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from '../context/RouterContext';
import { api, ApiWord, SetCard, MemoryStatus } from '../api/client';
import { playAudio } from '../utils/audio';
import {WordExample} from '../components/WordExample';
import {WordLearningDetails} from '../components/WordLearningDetails';
import {LearningBreadcrumb} from '../components/LearningBreadcrumb';
import {forwardNavigationContext} from '../utils/navigationContext';
import {normalizeSetProgress} from '../utils/setProgress';
import {useControlAudio} from '../utils/useControlAudio';
import {useAuth} from '../context/AuthContext';
import {
  ArrowLeft,
  Bookmark,
  Share2,
  Repeat,
  Volume2,
  Star,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  RotateCcw,
  BookOpen,
  Mic,
  MessageSquare,
  FileText,
  Eye,
  Brain,
  Gamepad2,
  Headphones,
  Check,
  Search,
  Sparkles,
  Loader2,
  Lock,
  Globe,
  SlidersHorizontal,
  ChevronDown,
  UserCheck,
  Briefcase
} from 'lucide-react';

export const StudySetView: React.FC = () => {
  const { params, path, navigate, goBack } = useRouter();
  const {capabilities}=useAuth();
  const setId = Number(params.id) || 163;

  const [set, setSet] = useState<(SetCard & { words: ApiWord[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enriching,setEnriching]=useState(false);
  const [exampleMessage,setExampleMessage]=useState('');
  const stopExamples=useRef(false);
  useEffect(()=>()=>{stopExamples.current=true;},[]);

  // Flashcard states
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);

  // Filter & search states
  const [saved, setSaved] = useState(false);
  const [hideList, setHideList] = useState(false);
  const [sortOrder, setSortOrder] = useState('original');
  useControlAudio(()=>{const index=isShuffled?shuffledIndices[currentIndex]??0:currentIndex;const word=set?.words[index];if(word)playAudio(word.term);});
  const [optionsOpen,setOptionsOpen]=useState(false);
  const [actionMessage,setActionMessage]=useState('');
  const [actionBusy,setActionBusy]=useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);setCurrentIndex(0);setIsFlipped(false);setIsShuffled(false);
    api.getSet(setId)
      .then((res) => {
        if (mounted) {
          setSet(res);
          setSaved(res.saved || false);
          setShuffledIndices(res.words.map((_, i) => i));
        }
      })
      .catch((err) => {
        if (mounted) setError(err?.message || 'Không thể tải bộ từ vựng.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [setId]);

  // Keyboard navigation for flashcard matching OpenQuiz shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if(loading||!set)return;
      if ((e.target as HTMLElement)?.closest('input, textarea, button, select, [contenteditable="true"]')) return;

      if (e.code === 'Space' || e.code === 'Enter' || e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading,set, currentIndex, isShuffled, shuffledIndices]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm">Đang tải bộ thẻ và danh sách từ vựng...</p>
      </div>
    );
  }

  if (error || !set) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
        <p className="text-rose-500 font-semibold mb-3">{error || 'Không tìm thấy bộ từ vựng'}</p>
        <button
          onClick={() => goBack()}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold"
        >
          Quay lại
        </button>
      </div>
    );
  }

  const words = set.words || [];
  const currentWordIndex = isShuffled ? shuffledIndices[currentIndex] ?? 0 : currentIndex;
  const currentWord: ApiWord | undefined = words[currentWordIndex];
  const sortedWords=[...words].sort((a,b)=>sortOrder==='alphabet'?a.term.localeCompare(b.term):sortOrder==='starred'?Number(b.starred)-Number(a.starred):['new','learning','mastered'].includes(sortOrder)?Number(b.status===sortOrder)-Number(a.status===sortOrder):0);
  const share=async()=>{try{await navigator.clipboard.writeText(window.location.origin+'/study-set/'+setId);setActionMessage('Đã sao chép liên kết bộ từ.');}catch{setActionMessage('Liên kết: '+window.location.origin+'/study-set/'+setId);}};
  const exportSet=async()=>{setActionBusy(true);try{const data=await api.request('GET','/sets/'+setId+'/export');const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='study-set-'+setId+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setOptionsOpen(false);}catch(e){setActionMessage((e as Error).message);}finally{setActionBusy(false);}};
  const cloneSet=async()=>{setActionBusy(true);try{const copy=await api.request<SetCard>('POST','/sets/'+setId+'/clone',{});navigate('/study-set/'+copy.id);}catch(e){setActionMessage((e as Error).message);}finally{setActionBusy(false);}};

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % (words.length || 1));
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + (words.length || 1)) % (words.length || 1));
  };

  const handleToggleShuffle = () => {
    if (!isShuffled) {
      const arr = words.map((_, i) => i);
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      setShuffledIndices(arr);
      setIsShuffled(true);
      setCurrentIndex(0);
    } else {
      setIsShuffled(false);
      setCurrentIndex(0);
    }
    setIsFlipped(false);
  };

  const handleToggleStar = async (word: ApiWord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStarred = !word.starred;
    try {
      await api.wordProgress(word.id, { starred: newStarred });
      setSet((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          words: prev.words.map((w) => (w.id === word.id ? { ...w, starred: newStarred } : w))
        };
      });
    } catch (err) {
      console.error('Failed to toggle star', err);
    }
  };

  const handleToggleSaveSet = async () => {
    const nextSaved = !saved;
    setSaved(nextSaved);
    try {
      await api.save('set', setId, nextSaved);
    } catch {
      setSaved(!nextSaved);
    }
  };

  // Render thumbnail illustration for specific vocabulary
  const renderThumbnail = (term: string) => {
    const t = term.toLowerCase();
    if (t === 'hire') {
      return (
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
          <Briefcase className="w-6 h-6" />
        </div>
      );
    }
    if (t === 'interview') {
      return (
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-800 to-indigo-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
          <UserCheck className="w-6 h-6" />
        </div>
      );
    }
    if (t === 'profile') {
      return (
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
          <FileText className="w-6 h-6" />
        </div>
      );
    }
    return null;
  };

  const enrichExamples=async()=>{
    if(!set)return;
    if(!capabilities?.ai.configured){navigate('/settings/ai?returnTo='+encodeURIComponent(path));return;}
    const missing=set.words.filter(w=>!w.example.trim());stopExamples.current=false;setEnriching(true);setExampleMessage('');
    let completed=0;
    try{
      for(let i=0;i<missing.length&&!stopExamples.current;i+=20){
        const batch=missing.slice(i,i+20);
        const r=await api.request<{result:{examples:{word_id:number;example:string;translation:string;synonyms:string}[]}}>('POST','/ai/generate',{set_id:setId,kind:'word_examples',word_ids:batch.map(w=>w.id)});
        setSet(previous=>previous?{...previous,words:previous.words.map(w=>{const e=r.result.examples.find(v=>v.word_id===w.id);return e?{...w,example:e.example,example_translation:e.translation,synonyms:e.synonyms,example_source:'ai'}:w;})}:previous);
        completed+=r.result.examples.length;setExampleMessage('Đã tạo và lưu '+completed+'/'+missing.length+' ví dụ.');
      }
    }catch(e){setExampleMessage((e as Error).message+' Các ví dụ đã tạo vẫn được giữ lại.');}
    finally{setEnriching(false);}
  };

  const setProgress = normalizeSetProgress(set);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* 1. Header Bar & Breadcrumb */}
      <LearningBreadcrumb
        currentLabel={set.title}
        setId={setId}
        setTitle={set.title}
        rightSlot={
          <button
            onClick={() => navigate('/repetition-study')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition shadow-2xs"
          >
            <Bookmark className="w-3.5 h-3.5 text-slate-500" />
            <span>Lặp lại ngắt quãng</span>
          </button>
        }
      />

      {/* Title, Progress Badge & Action Icons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {set.title}
            </h1>
            <span title="Bộ từ công khai" className="text-slate-400">
              <Globe className="w-4 h-4 text-slate-400 inline" />
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-bold text-slate-600 dark:text-slate-300">{setProgress.totalWords} từ</span>
            <span>•</span>
            <span
              data-testid={`set-state-badge-${set.id}`}
              className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                setProgress.state === 'mastered'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : setProgress.state === 'in_progress'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {setProgress.stateLabel}
            </span>
            <span data-testid={`set-progress-text-${set.id}`} className="text-slate-500 dark:text-slate-400 font-medium">
              {setProgress.summaryText}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          <button
            type="button"
            onClick={handleToggleSaveSet}
            aria-label={saved ? 'Bỏ lưu bộ thẻ' : 'Lưu bộ thẻ'}
            title={saved ? 'Bỏ lưu' : 'Lưu bộ thẻ'}
            className="p-2 hover:text-slate-900 dark:hover:text-white rounded-lg transition"
          >
            <Bookmark className={`w-4 h-4 ${saved ? 'fill-slate-900 dark:fill-white text-slate-900 dark:text-white' : ''}`} />
          </button>
          <button
            type="button"
            aria-label="Chia sẻ bộ thẻ"
            title="Chia sẻ"
            onClick={()=>void share()}
            className="p-2 hover:text-slate-900 dark:hover:text-white rounded-lg transition"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Tùy chọn khác"
            title="Tùy chọn khác"
            aria-expanded={optionsOpen}
            onClick={()=>setOptionsOpen(v=>!v)}
            className="p-2 hover:text-slate-900 dark:hover:text-white rounded-lg transition"
          >
            <span className="font-bold text-base leading-none">⋮</span>
          </button>
        </div>
      </div>

      {optionsOpen&&<div className="flex gap-4 border rounded-xl p-3 text-sm"><button disabled={actionBusy} onClick={()=>void exportSet()}>Xuất bộ từ JSON</button><button disabled={actionBusy} onClick={()=>void cloneSet()}>Tạo bản sao trong thư viện của tôi</button></div>}
      {actionMessage&&<p role="status" className="text-sm text-slate-500">{actionMessage}</p>}

      {/* 2. Eight Study Mode Buttons matching Image 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Row 1, Col 1: Kết hợp (Đề xuất) */}
        <button
          onClick={() => navigate(forwardNavigationContext(`/comprehensive/${setId}`, path, { setTitle: set.title }))}
          className="relative flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl hover:border-indigo-400 hover:shadow-xs transition group"
        >
          <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Brain className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition">
            Kết hợp
          </span>
          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-extrabold text-purple-600 dark:text-purple-400 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            <span>Đề xuất</span>
          </span>
        </button>

        {/* Row 1, Col 2: Speaking */}
        <button
          onClick={() => navigate(forwardNavigationContext(`/ai-study/${setId}`, path, { setTitle: set.title }))}
          className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl hover:border-rose-400 hover:shadow-xs transition group"
        >
          <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <Mic className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-rose-600 transition">
            Speaking
          </span>
        </button>

        {/* Row 1, Col 3: Hội thoại */}
        <button
          onClick={() => navigate(forwardNavigationContext(`/conversation/${setId}`, path, { setTitle: set.title }))}
          className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl hover:border-emerald-400 hover:shadow-xs transition group"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <MessageSquare className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 transition">
            Hội thoại
          </span>
        </button>

        {/* Row 2, Col 1: Ngữ pháp */}
        <button
          onClick={() => navigate(forwardNavigationContext(`/grammar/${setId}`, path, { setTitle: set.title }))}
          className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl hover:border-amber-400 hover:shadow-xs transition group"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <FileText className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-amber-600 transition">
            Ngữ pháp
          </span>
        </button>

        {/* Row 2, Col 2: Đọc hiểu */}
        <button
          onClick={() => navigate(forwardNavigationContext(`/reading/${setId}`, path, { setTitle: set.title }))}
          className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl hover:border-blue-400 hover:shadow-xs transition group"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Eye className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition">
            Đọc hiểu
          </span>
        </button>

        {/* Row 2, Col 3: Học */}
        <button
          onClick={() => navigate(forwardNavigationContext(`/study/${setId}`, path, { setTitle: set.title }))}
          className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl hover:border-violet-400 hover:shadow-xs transition group"
        >
          <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-violet-600 transition">
            Học
          </span>
        </button>

        {/* Row 3, Col 1: Test/Game */}
        <button
          onClick={() => navigate(forwardNavigationContext(`/exam/${setId}`, path, { setTitle: set.title }))}
          className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl hover:border-teal-400 hover:shadow-xs transition group"
        >
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
            <Gamepad2 className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-teal-600 transition">
            Test/Game
          </span>
        </button>

        {/* Row 3, Col 2: Nghe Chép */}
        <button
          onClick={() => navigate(forwardNavigationContext(`/dictation/${setId}`, path, { setTitle: set.title }))}
          className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl hover:border-indigo-400 hover:shadow-xs transition group"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Headphones className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition">
            Nghe Chép
          </span>
        </button>
      </div>

      {/* 3. Central Flashcard Player matching Image 3 */}
      {currentWord && (
      <div className="space-y-4 pt-2">
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={enriching||!words.some(w=>!w.example.trim())} onClick={()=>void enrichExamples()} className="border rounded-xl px-4 py-2 text-sm disabled:opacity-40">{enriching?'Đang tạo ví dụ...':'Tạo ví dụ AI cho các từ còn thiếu'}</button>
          {enriching&&<button onClick={()=>{stopExamples.current=true;}} className="text-sm underline">Dừng sau lượt này</button>}
          {exampleMessage&&<p role="status" className="text-sm text-slate-500">{exampleMessage}</p>}
        </div>
          <div
            data-testid="flashcard-player"
            role="button"
            tabIndex={0}
            aria-label="Thẻ học từ vựng. Bấm phím cách hoặc Enter để lật mặt thẻ"
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return;
              if (e.code === 'Space' || e.key === 'Enter') {
                e.preventDefault();
                setIsFlipped((prev) => !prev);
              }
            }}
            onClick={() => setIsFlipped(!isFlipped)}
            className="relative w-full min-h-[300px] md:min-h-[340px] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-7 shadow-xs hover:shadow-md cursor-pointer transition-all flex flex-col justify-between select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {/* Top Bar inside card */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleShuffle();
                }}
                aria-label={isShuffled ? 'Đang xáo trộn thẻ, bấm để hoàn tác' : 'Xáo trộn thứ tự thẻ'}
                title={isShuffled ? 'Đang xáo trộn thẻ' : 'Xáo trộn thứ tự thẻ'}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <Shuffle className={`w-4 h-4 ${isShuffled ? 'text-indigo-600' : ''}`} />
              </button>

              <span className="text-[10px] font-bold text-slate-400">
                {isFlipped ? 'Mặt sau (Nghĩa)' : 'Mặt trước (Từ vựng)'}
              </span>
            </div>

            {/* Main Word Display */}
            <div className="text-center py-6">
              {!isFlipped ? (
                <>
                  <div className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                    {currentWord.term}
                  </div>
                  <div className="text-sm md:text-base font-semibold text-slate-500 dark:text-slate-400">
                    {currentWord.part_of_speech || 'word'} - {currentWord.phonetic || ''}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-3">
                    {currentWord.definition}
                  </div>
                  <div className="max-w-lg mx-auto" onClick={(e) => e.stopPropagation()}>
                    <WordLearningDetails key={currentWord.id} word={currentWord} auto variant="flashcard" onChange={updated=>setSet(previous=>previous?{...previous,words:previous.words.map(w=>w.id===updated.id?updated:w)}:previous)}/>
                  </div>
                </>
              )}
            </div>

            {/* Bottom-right Action Icons inside card */}
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(forwardNavigationContext(`/ai-study/${setId}`, path, { setTitle: set.title }));
                }}
                aria-label="Luyện nói AI"
                title="Luyện nói AI"
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <Mic className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(!isFlipped);
                }}
                aria-label="Lật thẻ"
                title="Lật thẻ"
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <Eye className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playAudio(currentWord.term);
                }}
                aria-label="Nghe phát âm"
                title="Nghe phát âm"
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Keyboard shortcut hint matching Image 3 */}
          <div className="text-center text-[11px] text-slate-400 font-medium">
            Phím tắt:{' '}
            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-300 font-bold">←</span>{' '}
            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-300 font-bold">→</span>{' '}
            để chuyển thẻ •{' '}
            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-300 font-bold">Space</span> /{' '}
            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-300 font-bold">Enter</span> hoặc{' '}
            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-300 font-bold">C</span>{' '}
            lật thẻ
          </div>

          {/* Flashcard Control Bar matching Image 3 */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => navigate('/repetition-study')}
              className="px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-xl shadow-2xs hover:bg-slate-50 transition"
            >
              Tiến độ
            </button>

            <div className="flex items-center gap-3">
              <button
                aria-label="Thẻ trước"
                onClick={handlePrev}
                className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition shadow-2xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 min-w-16 text-center">
                Thẻ {currentIndex + 1} / {words.length}
              </span>

              <button
                aria-label="Thẻ tiếp theo"
                onClick={handleNext}
                className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition shadow-2xs"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleToggleShuffle}
              aria-label={isShuffled ? 'Đang xáo trộn thẻ, bấm để hoàn tác' : 'Xáo trộn thứ tự thẻ'}
              title={isShuffled ? 'Đang xáo trộn thẻ' : 'Xáo trộn thứ tự thẻ'}
              className={`p-2 rounded-xl border transition shadow-2xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                isShuffled
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-600 dark:bg-indigo-950 dark:border-indigo-800'
                  : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              <Shuffle className="w-4 h-4" />
            </button>
          </div>

          <div className="text-center pt-1">
            <button
              onClick={() => alert('Hướng dẫn: Dùng các phím mũi tên để duyệt thẻ, bấm Space để lật mặt thẻ xem định nghĩa tiếng Việt. Bấm nút loa để nghe giọng đọc chuẩn bản ngữ.')}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline font-medium"
            >
              Xem hướng dẫn cách học
            </button>
          </div>
        </div>
      )}

      {/* 4. Vocabulary List Section matching Image 3 100% */}
      <div className="space-y-4 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Danh sách từ
            </h2>
            <button
              onClick={() => setHideList(!hideList)}
              className="text-xs text-slate-400 hover:text-slate-600 transition"
            >
              {hideList ? 'Hiện danh sách' : 'Ẩn bớt'}
            </button>
          </div>

          <select aria-label="Sắp xếp từ vựng" value={sortOrder} onChange={e=>setSortOrder(e.target.value)} className="border rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-900"><option value="original">Thứ tự gốc</option><option value="alphabet">Theo bảng chữ cái</option><option value="starred">Được đánh dấu sao trước</option><option value="new">Chưa học trước</option><option value="learning">Đang học trước</option><option value="mastered">Đã thành thạo trước</option></select>
        </div>

        {!hideList && (
          <div className="space-y-3">
            {sortedWords.map((w) => {
              const thumbnail = renderThumbnail(w.term);

              return (
                <div
                  key={w.id}
                  className="p-4 md:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition flex items-center justify-between gap-4"
                >
                  {/* Left Column: Thumbnail + Term + Part of speech + Phonetic + Synonym */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    {thumbnail}

                    <div className="min-w-0">
                      <div className="text-sm md:text-base font-black text-slate-900 dark:text-white tracking-tight">
                        {w.term}
                      </div>
                      <div className="text-xs text-slate-400 font-medium truncate mt-0.5">
                        {w.part_of_speech || 'noun'} - {w.phonetic || ''}
                      </div>
                    </div>
                  </div>

                  {/* Middle/Right Column: Definition + Example (with lock indicator) */}
                  <div className="flex items-center gap-6">
                    <div className="min-w-0 max-w-xs md:max-w-md">
                      <div className="text-xs md:text-sm font-bold text-slate-900 dark:text-white">
                        {w.definition}
                      </div>

                      {/* Example sentence */}
                      <WordExample word={w} onChange={updated=>setSet(previous=>previous?{...previous,words:previous.words.map(item=>item.id===updated.id?updated:item)}:previous)}/>
                    </div>

                    {/* Star & Audio Actions matching Image 3 */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => handleToggleStar(w, e)}
                        aria-label={w.starred ? `Bỏ đánh dấu sao cho từ ${w.term}` : `Đánh dấu sao cho từ ${w.term}`}
                        title={w.starred ? 'Bỏ đánh dấu sao' : 'Đánh dấu sao'}
                        className="p-1.5 text-slate-400 hover:text-amber-500 rounded-lg transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
                      >
                        <Star className={`w-4 h-4 ${w.starred ? 'fill-amber-500 text-amber-500' : ''}`} />
                      </button>

                      <button
                        onClick={() => playAudio(w.term)}
                        aria-label={`Nghe phát âm từ ${w.term}`}
                        title="Nghe phát âm"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
