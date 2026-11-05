import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Lock,
  Play,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Volume2,
  Sparkles,
  HelpCircle,
  FileText,
  Headphones,
  BookMarked,
  MessageSquareQuote,
  Mic,
  AlertCircle
} from 'lucide-react';
import { useRouter } from '../context/RouterContext';
import {
  toeicApi,
  ToeicUnitDetail,
  ToeicRoadmapUnit,
  ToeicModule,
  getPosLabel
} from '../api/toeicFoundation';
import { playAudio } from '../utils/audio';

export const ToeicUnitView: React.FC = () => {
  const { path, navigate } = useRouter();

  // Extract unit id from path: /courses/toeic/units/:id
  const match = path.match(/\/courses\/toeic\/units\/([a-zA-Z0-9-]+)/);
  const unitId = match ? match[1] : '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unit, setUnit] = useState<ToeicUnitDetail | null>(null);
  const [roadmapUnit, setRoadmapUnit] = useState<ToeicRoadmapUnit | null>(null);
  const [startingModule, setStartingModule] = useState<string | null>(null);

  // Active material tab: 'rule' | 'vocabulary' | 'phrases' | 'dialogue' | 'pronunciation'
  const [activeMaterialTab, setActiveMaterialTab] = useState<'rule' | 'vocabulary' | 'phrases' | 'dialogue' | 'pronunciation'>('rule');

  useEffect(() => {
    return () => {
      // Cancel TTS when unmounting
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [unitId, activeMaterialTab]);

  useEffect(() => {
    let active = true;
    if (!unitId) return;

    setLoading(true);
    setError('');
    setRoadmapUnit(null);
    setActiveMaterialTab('rule');

    Promise.all([
      toeicApi.getUnit(unitId),
      toeicApi.getRoadmap()
    ])
      .then(([uData, rmData]) => {
        if (!active) return;
        setUnit(uData);
        if (rmData) {
          const found = rmData.items.find(i => i.id === unitId);
          setRoadmapUnit(found || null);
        }
      })
      .catch((e: any) => {
        if (active) setError(e?.message || 'Không thể tải thông tin bài học.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [unitId]);

  // Handle starting/resuming a module session
  const handleStartModule = async (module: ToeicModule) => {
    if (!unitId) return;
    try {
      setStartingModule(module);
      const sess = await toeicApi.startUnitSession(unitId, { module, resume: true });
      navigate(`/courses/toeic/sessions/${sess.id}`);
    } catch (e: any) {
      if (e?.error?.code === 'ENROLL_REQUIRED') {
        alert('Bạn cần tham gia khóa học trước khi bắt đầu bài tập.');
        navigate('/courses/toeic');
      } else if (e?.error?.code === 'UNIT_LOCKED') {
        alert('Bài học này đang bị khóa. Hãy hoàn thành các bài học và bài ôn tập trước đó.');
      } else {
        alert(e?.message || 'Không thể mở phiên học.');
      }
    } finally {
      setStartingModule(null);
    }
  };

  // Determine next incomplete core module
  const getNextIncompleteModule = (): ToeicModule => {
    const completed = roadmapUnit?.completed_modules || [];
    const core: ToeicModule[] = ['grammar', 'vocabulary', 'listening', 'reading'];
    for (const m of core) {
      if (!completed.includes(m)) return m;
    }
    return 'grammar';
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-semibold">Đang tải dữ liệu bài học...</p>
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-4">
        <div role="alert" className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-sm">
          {error || 'Không tìm thấy bài học.'}
        </div>
        <button
          onClick={() => navigate('/courses/toeic')}
          className="px-4 py-2 border rounded-xl text-sm font-semibold inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Về khóa TOEIC
        </button>
      </div>
    );
  }

  const isLocked = roadmapUnit ? !roadmapUnit.unlocked : true;
  const isDone = roadmapUnit?.status === 'completed';
  const completedModules = roadmapUnit?.completed_modules || [];

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-5 md:py-8 space-y-6 pb-24">
      {/* 1. Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs md:text-sm text-slate-500 flex-wrap">
        <button
          onClick={() => navigate('/courses')}
          className="hover:text-indigo-600 transition inline-flex items-center gap-1 font-medium"
        >
          Khóa học
        </button>
        <span>/</span>
        <button
          onClick={() => navigate('/courses/toeic')}
          className="hover:text-indigo-600 transition font-medium"
        >
          TOEIC — Từ nền tảng
        </button>
        <span>/</span>
        <span className="font-semibold text-slate-900 dark:text-white">
          Chặng {unit.week} · {unit.title}
        </span>
      </nav>

      {/* 2. Unit Header & Action Hero */}
      <header className="p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                Giai đoạn {unit.phase} · Chặng {unit.week}
              </span>
              {isDone ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Đã hoàn thành 4/4 phần
                </span>
              ) : isLocked ? (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Chưa mở (Xem trước tài liệu)
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                  {completedModules.length}/4 phần cốt lõi hoàn tất
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {unit.title}
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Hãy đọc kỹ tài liệu lý thuyết, từ vựng và câu mẫu trước khi bắt đầu làm bài luyện tập.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto">
            {!isLocked ? (
              <button
                onClick={() => handleStartModule(getNextIncompleteModule())}
                disabled={startingModule !== null}
                className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                {startingModule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {isDone ? 'Ôn lại bài học' : 'Học tiếp phần chưa xong'}
              </button>
            ) : (
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300 font-medium flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-400" />
                Cần hoàn thành bài trước để mở làm bài tập
              </div>
            )}
          </div>
        </div>

        {/* 4 Core Module Status Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {[
            { id: 'grammar', title: '1. Ngữ pháp', desc: 'Trắc nghiệm & Sắp xếp câu' },
            { id: 'vocabulary', title: '2. Từ vựng', desc: 'Nhận diện & Tự viết nghĩa' },
            { id: 'listening', title: '3. Nghe', desc: 'Nghe hiểu & Chép chính tả' },
            { id: 'reading', title: '4. Đọc', desc: 'Đọc hiểu thông tin câu' }
          ].map(m => {
            const mDone = completedModules.includes(m.id);
            return (
              <div
                key={m.id}
                className={`p-3 rounded-2xl border text-left transition ${
                  mDone
                    ? 'border-emerald-300 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{m.title}</span>
                  {mDone && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
                <span className="text-[11px] opacity-80 block mt-0.5">{m.desc}</span>
              </div>
            );
          })}
        </div>
      </header>

      {/* 3. Section: Bắt đầu làm bài theo từng phần */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            Các phần đánh giá trong bài
          </h2>
          <span className="text-xs text-slate-500">Hoàn thành cả 4 phần cốt lõi để mở bài tiếp theo</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Module 1: Grammar */}
          <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <FileText className="w-4 h-4" /> Phần 1 · Cốt lõi
              </span>
              {completedModules.includes('grammar') && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn thành
                </span>
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Ngữ pháp</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                1 câu hỏi nhận biết cấu trúc và 3 câu sắp xếp từ theo câu mẫu song ngữ.
              </p>
            </div>
            <button
              onClick={() => handleStartModule('grammar')}
              disabled={isLocked || startingModule !== null}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 disabled:opacity-50 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              {startingModule === 'grammar' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {completedModules.includes('grammar') ? 'Ôn lại ngữ pháp' : 'Làm bài ngữ pháp'}
            </button>
          </div>

          {/* Module 2: Vocabulary */}
          <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <BookMarked className="w-4 h-4" /> Phần 2 · Cốt lõi
              </span>
              {completedModules.includes('vocabulary') && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn thành
                </span>
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Từ vựng</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhận diện nghĩa và tự viết nghĩa tiếng Việt (kết nối trực tiếp hệ thống SRS).
              </p>
            </div>
            <button
              onClick={() => handleStartModule('vocabulary')}
              disabled={isLocked || startingModule !== null}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 disabled:opacity-50 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              {startingModule === 'vocabulary' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {completedModules.includes('vocabulary') ? 'Ôn lại từ vựng' : 'Làm bài từ vựng'}
            </button>
          </div>

          {/* Module 3: Listening */}
          <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <Headphones className="w-4 h-4" /> Phần 3 · Cốt lõi
              </span>
              {completedModules.includes('listening') && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn thành
                </span>
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Nghe hiểu</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Nghe hiểu thông tin chính và nghe chép chính tả các câu mẫu đã học.
              </p>
            </div>
            <button
              onClick={() => handleStartModule('listening')}
              disabled={isLocked || startingModule !== null}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 disabled:opacity-50 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              {startingModule === 'listening' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {completedModules.includes('listening') ? 'Ôn lại bài nghe' : 'Làm bài nghe'}
            </button>
          </div>

          {/* Module 4: Reading */}
          <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <BookOpen className="w-4 h-4" /> Phần 4 · Cốt lõi
              </span>
              {completedModules.includes('reading') && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn thành
                </span>
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Đọc hiểu</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Đọc đoạn câu ngắn, trả lời câu hỏi thông tin và hiểu nghĩa ngữ cảnh.
              </p>
            </div>
            <button
              onClick={() => handleStartModule('reading')}
              disabled={isLocked || startingModule !== null}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 disabled:opacity-50 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              {startingModule === 'reading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {completedModules.includes('reading') ? 'Ôn lại bài đọc' : 'Làm bài đọc'}
            </button>
          </div>
        </div>

        {/* Optional Module: Pronunciation */}
        {unit.pronunciation && (
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  Phát âm · Hỗ trợ tùy chọn
                </span>
                <span className="text-xs text-slate-400">Không chặn tiến độ bài học</span>
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {unit.pronunciation.topic}
              </h4>
            </div>

            <button
              onClick={() => handleStartModule('pronunciation')}
              disabled={isLocked || startingModule !== null}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-300 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shrink-0"
            >
              <Mic className="w-3.5 h-3.5 text-purple-600" />
              Luyện phân biệt âm
            </button>
          </div>
        )}
      </section>

      {/* 4. Section: Tài liệu học tập (Học trước khi làm bài) */}
      <section className="p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" /> Tài liệu học tập chuẩn bị
            </h2>
            <p className="text-xs text-slate-500">
              Xem kỹ lý thuyết, danh sách từ và câu mẫu có âm thanh trước khi vào làm bài đánh giá.
            </p>
          </div>

          {/* Material navigation tabs */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveMaterialTab('rule')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${activeMaterialTab === 'rule' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
            >
              Quy tắc ngữ pháp
            </button>
            <button
              onClick={() => setActiveMaterialTab('vocabulary')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${activeMaterialTab === 'vocabulary' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
            >
              Từ vựng ({unit.vocabulary.length})
            </button>
            <button
              onClick={() => setActiveMaterialTab('phrases')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${activeMaterialTab === 'phrases' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
            >
              Câu mẫu ({unit.phrases.length})
            </button>
            {unit.dialogue && (
              <button
                onClick={() => setActiveMaterialTab('dialogue')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${activeMaterialTab === 'dialogue' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
              >
                Hội thoại
              </button>
            )}
            {unit.pronunciation && (
              <button
                onClick={() => setActiveMaterialTab('pronunciation')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${activeMaterialTab === 'pronunciation' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
              >
                Phát âm
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Rule */}
        {activeMaterialTab === 'rule' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                Giải thích cốt lõi
              </span>
              <p className="text-sm md:text-base text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {unit.rule}
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Vocabulary Table */}
        {activeMaterialTab === 'vocabulary' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {unit.vocabulary.map(word => (
                <div
                  key={word.id}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-black text-slate-900 dark:text-white">
                        {word.term}
                      </span>
                      {word.phonetic && (
                        <span className="text-xs text-slate-400 font-mono">
                          {word.phonetic}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        {getPosLabel(word.part_of_speech)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {word.definition}
                    </p>
                  </div>

                  <button
                    onClick={() => playAudio(word.term)}
                    aria-label={`Nghe phát âm từ ${word.term}`}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition shrink-0"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Bilingual Phrases */}
        {activeMaterialTab === 'phrases' && (
          <div className="space-y-3">
            {unit.phrases.map((phrase, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <p className="text-sm md:text-base font-bold text-slate-900 dark:text-white">
                    {phrase.english}
                  </p>
                  <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                    {phrase.vietnamese}
                  </p>
                </div>

                <button
                  onClick={() => playAudio(phrase.english)}
                  aria-label={`Nghe câu ${phrase.english}`}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition shrink-0"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Dialogue (if any) */}
        {activeMaterialTab === 'dialogue' && unit.dialogue && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 mb-2">Hội thoại thực hành ngắn theo vai A và B:</p>
            {unit.dialogue.turns.map(([speaker, en, vi], idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border flex items-start justify-between gap-3 ${
                  speaker === 'A'
                    ? 'border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-black shrink-0 ${speaker === 'A' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
                    {speaker}
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{en}</p>
                    <p className="text-xs text-slate-500">{vi}</p>
                  </div>
                </div>

                <button
                  onClick={() => playAudio(en)}
                  aria-label={`Nghe lượt nói của ${speaker}`}
                  className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl transition shrink-0"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tab 5: Pronunciation Tips */}
        {activeMaterialTab === 'pronunciation' && unit.pronunciation && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50 space-y-1.5">
              <h4 className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase">
                Mẹo phát âm: {unit.pronunciation.topic}
              </h4>
              <p className="text-xs md:text-sm text-slate-700 dark:text-slate-300">
                {unit.pronunciation.tip}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {unit.pronunciation.pairs.map(([term, ipa, vi], idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{term}</span>
                      <span className="text-xs font-mono text-purple-600 dark:text-purple-400">{ipa}</span>
                    </div>
                    <p className="text-xs text-slate-500">{vi}</p>
                  </div>

                  <button
                    onClick={() => playAudio(term)}
                    aria-label={`Nghe mẫu ${term}`}
                    className="p-2 text-slate-400 hover:text-purple-600 rounded-xl transition shrink-0"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
