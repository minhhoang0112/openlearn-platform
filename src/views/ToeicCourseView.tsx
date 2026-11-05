import React, { useEffect, useState, useRef } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Lock,
  Play,
  ArrowLeft,
  ArrowRight,
  Loader2,
  RotateCcw,
  Sparkles,
  Sliders,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  Layers,
  BookX,
  Volume2,
  ShieldCheck,
  Award
} from 'lucide-react';
import { useRouter } from '../context/RouterContext';
import {
  toeicApi,
  ToeicCatalog,
  ToeicRoadmap,
  ToeicToday,
  ToeicRoadmapUnit,
  getPosLabel,
  ToeicVocabularyItem,
  ToeicMistakeItem
} from '../api/toeicFoundation';
import { playAudio } from '../utils/audio';

export const ToeicCourseView: React.FC = () => {
  const { navigate } = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enrolling, setEnrolling] = useState(false);

  const [catalog, setCatalog] = useState<ToeicCatalog | null>(null);
  const [roadmap, setRoadmap] = useState<ToeicRoadmap | null>(null);
  const [today, setToday] = useState<ToeicToday | null>(null);

  // Active view tab: 'roadmap' | 'vocabulary' | 'mistakes'
  const [activeTab, setActiveTab] = useState<'roadmap' | 'vocabulary' | 'mistakes'>('roadmap');

  // Expanded week accordion
  const [expandedWeek, setExpandedWeek] = useState<number>(1);

  // Settings dropdown
  const [showSettings, setShowSettings] = useState(false);
  const [dailyMinutes, setDailyMinutes] = useState<number>(60);
  const [wordsPerDay, setWordsPerDay] = useState<number>(10);
  const [targetScore, setTargetScore] = useState<string>('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');

  // Vocabulary tab state
  const [vocabPhase, setVocabPhase] = useState<number | undefined>(undefined);
  const [vocabWeek, setVocabWeek] = useState<number | undefined>(undefined);
  const [vocabDueOnly, setVocabDueOnly] = useState(false);
  const [vocabItems, setVocabItems] = useState<ToeicVocabularyItem[]>([]);
  const [vocabTotal, setVocabTotal] = useState(0);
  const [vocabLoading, setVocabLoading] = useState(false);
  const [vocabOffset, setVocabOffset] = useState(0);
  const [vocabError, setVocabError] = useState('');
  const vocabRequest = useRef(0);

  // Mistakes tab state
  const [mistakes, setMistakes] = useState<ToeicMistakeItem[]>([]);
  const [mistakesTotal, setMistakesTotal] = useState(0);
  const [mistakesLoading, setMistakesLoading] = useState(false);
  const [mistakesOffset, setMistakesOffset] = useState(0);
  const [mistakesError, setMistakesError] = useState('');
  const mistakesRequest = useRef(0);

  useEffect(() => () => window.speechSynthesis?.cancel(), [activeTab]);

  // Load initial data
  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const cat = await toeicApi.getCatalog();
      setCatalog(cat);

      try {
        const [rm, td] = await Promise.all([
          toeicApi.getRoadmap(),
          toeicApi.getToday()
        ]);
        setRoadmap(rm);
        setToday(td);
        if (rm.profile) {
          setDailyMinutes(rm.profile.daily_minutes || 60);
          setWordsPerDay(rm.profile.new_words_per_day || 10);
          setTargetScore(rm.profile.target_score ? String(rm.profile.target_score) : '');
        }
        // Expand the active week
        if (td.next?.week) {
          setExpandedWeek(td.next.week);
        } else if (rm.items.length > 0) {
          const firstIncomplete = rm.items.find(i => i.unlocked && i.status !== 'completed');
          if (firstIncomplete?.week) setExpandedWeek(firstIncomplete.week);
        }
      } catch (err) {
        throw err;
      }
    } catch (e: any) {
      setError(e?.message || 'Không thể tải thông tin khóa học TOEIC.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Enrollment
  const handleEnroll = async () => {
    try {
      setEnrolling(true);
      setError('');
      await toeicApi.enroll();
      await loadData();
    } catch (e: any) {
      setError(e?.message || 'Không thể bắt đầu khóa học. Vui lòng thử lại.');
    } finally {
      setEnrolling(false);
    }
  };

  // Handle saving profile preferences
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      setSettingsMessage('');
      const scoreNum = targetScore.trim() ? Number(targetScore.trim()) : null;
      if (scoreNum !== null && (isNaN(scoreNum) || scoreNum < 10 || scoreNum > 990)) {
        setSettingsMessage('Mục tiêu điểm số phải từ 10 đến 990, hoặc để trống.');
        setSavingSettings(false);
        return;
      }
      await toeicApi.updateProfile({
        daily_minutes: dailyMinutes as 30 | 45 | 60 | 90 | 120,
        new_words_per_day: wordsPerDay,
        target_score: scoreNum
      });
      setSettingsMessage('Đã lưu thiết lập thành công!');
      setTimeout(() => setSettingsMessage(''), 3000);
      const td = await toeicApi.getToday();
      setToday(td);
    } catch (err: any) {
      setSettingsMessage(err?.message || 'Không thể lưu thiết lập.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Start due words review
  const handleStartReview = async () => {
    try {
      const sess = await toeicApi.startReviewSession({ limit: 20, resume: true });
      navigate(`/courses/toeic/sessions/${sess.id}`);
    } catch (e: any) {
      if (e?.error?.code === 'NO_DUE_WORDS') {
        alert('Hiện chưa có từ TOEIC nào đến hạn ôn tập!');
      } else {
        alert(e?.message || 'Không thể mở phiên ôn tập.');
      }
    }
  };

  // Start or resume checkpoint
  const handleStartCheckpoint = async (week: number, resume = true) => {
    try {
      const sess = await toeicApi.startCheckpointSession(week, { resume });
      navigate(`/courses/toeic/sessions/${sess.id}`);
    } catch (e: any) {
      alert(e?.message || 'Không thể mở bài ôn tập chặng.');
    }
  };

  // Load Vocabulary tab
  const loadVocabulary = async () => {
    const request = ++vocabRequest.current;
    try {
      setVocabLoading(true);
      setVocabError('');
      const res = await toeicApi.getVocabulary({
        phase: vocabPhase,
        week: vocabWeek,
        due: vocabDueOnly ? true : undefined,
        limit: 100,
        offset: vocabOffset
      });
      if (request !== vocabRequest.current) return;
      setVocabItems(res.items);
      setVocabTotal(res.total);
    } catch (e: any) {
      if (request === vocabRequest.current) setVocabError(e?.message || 'Không thể tải sổ từ vựng.');
    } finally {
      if (request === vocabRequest.current) setVocabLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'vocabulary') {
      loadVocabulary();
    } else if (activeTab === 'mistakes') {
      const request = ++mistakesRequest.current;
      setMistakesLoading(true);
      setMistakesError('');
      toeicApi.getMistakes({ limit: 100, offset: mistakesOffset })
        .then(res => {
          if (request !== mistakesRequest.current) return;
          setMistakes(res.items);
          setMistakesTotal(res.total);
        })
        .catch((e: any) => { if (request === mistakesRequest.current) setMistakesError(e?.message || 'Không thể tải sổ lỗi.'); })
        .finally(() => { if (request === mistakesRequest.current) setMistakesLoading(false); });
    }
    return () => { vocabRequest.current++; mistakesRequest.current++; };
  }, [activeTab, vocabPhase, vocabWeek, vocabDueOnly, vocabOffset, mistakesOffset]);

  const isEnrolled = !!roadmap?.profile?.enrolled_at;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-semibold">Đang tải khóa học TOEIC — Từ nền tảng...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-5 md:py-8 space-y-6 pb-24">
      {/* 1. Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs md:text-sm text-slate-500">
        <button
          onClick={() => navigate('/courses')}
          className="hover:text-indigo-600 transition inline-flex items-center gap-1 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Khóa học
        </button>
        <span>/</span>
        <span className="font-semibold text-slate-900 dark:text-white">TOEIC — Từ nền tảng</span>
      </nav>

      {/* 2. Hero Header */}
      <header className="p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                Lộ trình 8 chặng · 40 bài
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                540 mục từ cốt lõi
              </span>
              <span className="text-xs text-slate-400">
                SRS &amp; Thực hành toàn diện
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              TOEIC — Từ nền tảng
            </h1>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Dành cho người học lại từ đầu; xây vững ngữ pháp, từ vựng, nghe và đọc câu ngắn trước khi luyện đề. Tám chặng học linh hoạt theo tiến độ thực tế, không ép lịch tuần cứng nhắc.
            </p>
          </div>

          {/* Quick Enrolled / CTA button */}
          <div className="shrink-0 flex flex-col gap-2 w-full sm:w-auto">
            {!isEnrolled ? (
              <button
                onClick={handleEnroll}
                disabled={enrolling || !!error}
                className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Bắt đầu khóa học
              </button>
            ) : today?.next ? (
              <button
                onClick={() => {
                  if (today.next?.checkpoint) {
                    handleStartCheckpoint(today.next.week);
                  } else if (today.next?.id) {
                    navigate(`/courses/toeic/units/${today.next.id}`);
                  }
                }}
                className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Học tiếp · {today.next.title}
              </button>
            ) : null}
          </div>
        </div>

        {error && (
          <div role="alert" className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-sm">
            {error}
            <button onClick={loadData} className="block mt-2 font-bold underline">Thử tải lại</button>
          </div>
        )}

        {/* Not enrolled notice */}
        {!isEnrolled && !error && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs md:text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <p className="font-bold">Bạn đang xem trước chương trình học</p>
              <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                Bạn có thể xem trước lý thuyết và từ vựng của mọi bài học. Để bắt đầu làm các bài đánh giá và ghi nhận tiến độ, hãy nhấn nút &ldquo;Bắt đầu khóa học&rdquo;.
              </p>
            </div>
          </div>
        )}

        {/* Enrolled Action Banner */}
        {isEnrolled && today && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400">Tiến độ khóa học</span>
                <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {today.completed_units} / {today.total_units} bài
                </p>
              </div>
              <Award className="w-8 h-8 text-indigo-500 opacity-80" />
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400">Từ vựng đến hạn ôn</span>
                <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {today.due_words} từ
                </p>
              </div>
              {today.due_words > 0 ? (
                <button
                  onClick={handleStartReview}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Ôn ngay
                </button>
              ) : (
                <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-80" />
              )}
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400">Gợi ý hôm nay</span>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                  Ôn tập {today.suggested_minutes.review}p · Học mới {today.suggested_minutes.next_unit}p
                </p>
              </div>
              <Clock className="w-8 h-8 text-slate-400 opacity-80" />
            </div>
          </div>
        )}
      </header>

      {/* 3. Settings Collapsible (Hồ sơ học tập & Mục tiêu) */}
      {isEnrolled && (
        <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
          <button
            onClick={() => setShowSettings(prev => !prev)}
            className="w-full p-4 md:p-5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
          >
            <div className="flex items-center gap-3">
              <Sliders className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Thiết lập mục tiêu học tập cá nhân</h3>
                <p className="text-xs text-slate-500">
                  {dailyMinutes} phút/ngày · {wordsPerDay} từ mới/ngày · {targetScore ? `Mục tiêu ${targetScore} điểm` : 'Chưa đặt mục tiêu điểm'}
                </p>
              </div>
            </div>
            {showSettings ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          {showSettings && (
            <form onSubmit={handleSaveSettings} className="p-5 border-t border-slate-200 dark:border-slate-800 space-y-4 bg-slate-50/50 dark:bg-slate-950/30">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Thời gian học mỗi ngày
                  </label>
                  <select
                    value={dailyMinutes}
                    onChange={e => setDailyMinutes(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  >
                    {[30, 45, 60, 90, 120].map(m => (
                      <option key={m} value={m}>{m} phút</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Mục tiêu từ mới / ngày (10–15)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={15}
                    value={wordsPerDay}
                    onChange={e => setWordsPerDay(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Mục tiêu điểm số (Tùy chọn)
                  </label>
                  <input
                    type="number"
                    placeholder="VD: 550 (để trống nếu chưa rõ)"
                    value={targetScore}
                    onChange={e => setTargetScore(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-xs text-slate-500">
                  Mục tiêu là gợi ý nhịp độ học tập linh hoạt, không giới hạn hoặc khóa phiên học của bạn.
                </p>
                <div className="flex items-center gap-3">
                  {settingsMessage && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {settingsMessage}
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition"
                  >
                    {savingSettings ? 'Đang lưu...' : 'Lưu thiết lập'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </section>
      )}

      {/* 4. Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm font-bold">
        <button
          onClick={() => setActiveTab('roadmap')}
          className={`pb-3 transition relative ${activeTab === 'roadmap' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
        >
          Lộ trình 8 chặng
          {activeTab === 'roadmap' && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-indigo-600" />}
        </button>

        <button
          onClick={() => setActiveTab('vocabulary')}
          className={`pb-3 transition relative flex items-center gap-1.5 ${activeTab === 'vocabulary' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
        >
          <BookOpen className="w-4 h-4" />
          Sổ từ vựng khóa học
          {activeTab === 'vocabulary' && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-indigo-600" />}
        </button>

        <button
          onClick={() => setActiveTab('mistakes')}
          className={`pb-3 transition relative flex items-center gap-1.5 ${activeTab === 'mistakes' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
        >
          <BookX className="w-4 h-4" />
          Sổ lỗi cần ôn
          {activeTab === 'mistakes' && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-indigo-600" />}
        </button>
      </div>

      {/* 5. Tab Content: Roadmap (8 Chặng) */}
      {activeTab === 'roadmap' && (
        <div className="space-y-8">
          {/* Phase 1 & 2 */}
          {[1, 2].map(phaseId => {
            const phaseTitle = phaseId === 1 ? 'Giai đoạn 1: Xây lại nền tảng' : 'Giai đoạn 2: Củng cố và chuyển sang ngữ cảnh công việc';
            const phaseWeeks = phaseId === 1 ? [1, 2, 3, 4] : [5, 6, 7, 8];
            const phaseDesc = phaseId === 1
              ? 'Nhận diện từ loại, hiểu câu đơn, dùng các cấu trúc đầu tiên và nghe câu rất ngắn.'
              : 'Phân biệt cấu trúc thường gặp, nghe trao đổi ngắn và đọc email/thông báo đơn giản.';

            return (
              <section key={phaseId} className="space-y-4">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">{phaseTitle}</h2>
                  <p className="text-xs text-slate-500">{phaseDesc}</p>
                </div>

                {/* Week selector buttons */}
                <div className="flex flex-wrap gap-2">
                  {phaseWeeks.map(w => {
                    const isExpanded = expandedWeek === w;
                    // Check completion in this week
                    const weekUnits = roadmap?.items.filter(i => i.week === w && !i.checkpoint) || [];
                    const weekDone = weekUnits.every(i => i.status === 'completed');
                    const checkpoint = roadmap?.items.find(i => i.week === w && i.checkpoint);
                    const cpDone = checkpoint?.status === 'completed';

                    return (
                      <button
                        key={w}
                        onClick={() => setExpandedWeek(w)}
                        className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 border ${
                          isExpanded
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        Chặng {w}
                        {weekDone && cpDone ? (
                          <CheckCircle2 className={`w-3.5 h-3.5 ${isExpanded ? 'text-white' : 'text-emerald-500'}`} />
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                {/* Units List for active week in this phase */}
                {phaseWeeks.includes(expandedWeek) && (
                  <div className="p-4 md:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Danh sách bài học · Chặng {expandedWeek}
                      </h3>
                      <span className="text-xs text-slate-500">5 bài học + 1 bài ôn tập tổng hợp</span>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {/* Units */}
                      {roadmap?.items
                        .filter(u => u.week === expandedWeek && !u.checkpoint)
                        .map((unit, uIdx) => {
                          const isDone = unit.status === 'completed';
                          const isLocked = !unit.unlocked;
                          const inProgress = unit.status === 'in_progress';

                          return (
                            <div
                              key={unit.id}
                              className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                                isDone
                                  ? 'border-emerald-200 dark:border-emerald-950 bg-emerald-50/30 dark:bg-emerald-950/20'
                                  : inProgress
                                  ? 'border-indigo-300 dark:border-indigo-900 bg-indigo-50/20 dark:bg-indigo-950/10'
                                  : isLocked
                                  ? 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 opacity-80'
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                              }`}
                            >
                              <div className="space-y-1.5 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                    Bài {uIdx + 1}
                                  </span>
                                  {isDone ? (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                                      Đã hoàn thành 4/4
                                    </span>
                                  ) : isLocked ? (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                      <Lock className="w-3 h-3" /> Chưa mở
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                                      {unit.completed_modules?.length || 0}/4 phần xong
                                    </span>
                                  )}
                                  <span className="text-xs text-slate-400">
                                    {unit.vocabulary_items} mục từ
                                  </span>
                                </div>
                                <h4 className="text-sm md:text-base font-bold text-slate-900 dark:text-white">
                                  {unit.title}
                                </h4>

                                {/* Module pills */}
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {['grammar', 'vocabulary', 'listening', 'reading'].map(m => {
                                    const mDone = unit.completed_modules?.includes(m);
                                    const mName = m === 'grammar' ? 'Ngữ pháp' : m === 'vocabulary' ? 'Từ vựng' : m === 'listening' ? 'Nghe' : 'Đọc';
                                    return (
                                      <span
                                        key={m}
                                        className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${
                                          mDone
                                            ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                            : 'border-slate-200 dark:border-slate-800 text-slate-500'
                                        }`}
                                      >
                                        {mName} {mDone && '✓'}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-2">
                                <button
                                  onClick={() => navigate(`/courses/toeic/units/${unit.id}`)}
                                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                    isLocked
                                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                  }`}
                                >
                                  {isLocked ? 'Xem trước tài liệu' : isDone ? 'Ôn lại bài' : 'Vào bài học'}
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                      {/* Checkpoint Card */}
                      {roadmap?.items
                        .filter(u => u.week === expandedWeek && u.checkpoint)
                        .map(cp => {
                          const isDone = cp.status === 'completed';
                          const isLocked = !cp.unlocked;
                          const needsReview = cp.status === 'needs_review';
                          const inProgress = cp.status === 'in_progress';

                          return (
                            <div
                              key={cp.id}
                              className={`p-5 rounded-2xl border-2 transition space-y-3 ${
                                isDone
                                  ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20'
                                  : needsReview
                                  ? 'border-amber-400 bg-amber-50/40 dark:bg-amber-950/20'
                                  : isLocked
                                  ? 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 opacity-75'
                                  : 'border-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20'
                              }`}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                                      Ôn tập chặng {cp.week}
                                    </span>
                                    <span className="text-xs text-slate-500">20 câu hỏi tổng hợp · Yêu cầu đạt 80%</span>
                                  </div>
                                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                                    {cp.title}
                                  </h4>
                                </div>

                                <div className="shrink-0">
                                  {isDone ? (
                                    <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Đã vượt qua
                                    </span>
                                  ) : needsReview ? (
                                    <button
                                      onClick={() => handleStartCheckpoint(cp.week, false)}
                                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" /> Luyện lại lượt mới
                                    </button>
                                  ) : isLocked ? (
                                    <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-medium flex items-center gap-1">
                                      <Lock className="w-3.5 h-3.5" /> Chưa mở
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleStartCheckpoint(cp.week, true)}
                                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                                    >
                                      <Play className="w-3.5 h-3.5" /> {inProgress ? 'Tiếp tục ôn tập' : 'Bắt đầu ôn tập'}
                                    </button>
                                  )}
                                </div>
                              </div>

                              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                {isLocked
                                  ? 'Hoàn thành đủ 4 phần của cả 5 bài học trong chặng này để mở bài ôn tập tổng hợp.'
                                  : needsReview
                                  ? 'Bạn chưa đạt mức 16/20 (80%) câu đúng ngay lần đầu ở lượt trước. Hãy xem lại các bài học và nhấn "Luyện lại lượt mới" để thử sức đạt chuẩn.'
                                  : 'Mỗi bài gồm 4 câu hỏi: ngữ pháp, từ vựng, đọc và nghe. Bạn cần đúng từ 16/20 câu lần đầu không trợ giúp và sửa hết câu sai để mở chặng tiếp theo.'}
                              </p>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </section>
            );
          })}

          {/* Phase 3 & 4 (Planned - no CTA) */}
          <section className="p-6 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Sẽ phát triển sau
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Giai đoạn 3 &amp; 4: Làm quen các dạng bài TOEIC &amp; Luyện đề có bấm giờ
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Giai đoạn 3 và 4 chưa được triển khai. Trước mắt hãy học và ôn hai giai đoạn nền tảng đã có.
            </p>
          </section>
        </div>
      )}

      {/* 6. Tab Content: Sổ từ vựng */}
      {activeTab === 'vocabulary' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Giai đoạn</label>
                <select
                  value={vocabPhase ?? ''}
                  onChange={e => { setVocabPhase(e.target.value ? Number(e.target.value) : undefined); setVocabWeek(undefined); setVocabOffset(0); }}
                  className="p-2 rounded-xl border text-xs bg-white dark:bg-slate-900"
                >
                  <option value="">Tất cả giai đoạn</option>
                  <option value="1">Giai đoạn 1 (Chặng 1–4)</option>
                  <option value="2">Giai đoạn 2 (Chặng 5–8)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Chặng</label>
                <select
                  value={vocabWeek ?? ''}
                  onChange={e => { setVocabWeek(e.target.value ? Number(e.target.value) : undefined); setVocabOffset(0); }}
                  className="p-2 rounded-xl border text-xs bg-white dark:bg-slate-900"
                >
                  <option value="">Tất cả chặng</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].filter(w => vocabPhase === undefined || (vocabPhase === 1 ? w <= 4 : w >= 5)).map(w => (
                    <option key={w} value={w}>Chặng {w}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="vocabDueOnly"
                  checked={vocabDueOnly}
                  onChange={e => { setVocabDueOnly(e.target.checked); setVocabOffset(0); }}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <label htmlFor="vocabDueOnly" className="text-xs font-semibold cursor-pointer">
                  Chỉ hiện từ đến hạn ôn
                </label>
              </div>
            </div>

            <div className="text-xs text-slate-500 font-semibold">
              Tổng số: {vocabTotal} mục từ
            </div>
          </div>

          {vocabError ? <div role="alert" className="p-4 rounded-xl bg-rose-50 text-rose-700 text-sm">{vocabError}<button className="block font-bold underline mt-2" onClick={loadVocabulary}>Thử tải lại</button></div> : vocabLoading ? (
            <div className="py-12 flex justify-center text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> Đang tải từ vựng...
            </div>
          ) : vocabItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              Không tìm thấy từ vựng nào khớp với bộ lọc.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {vocabItems.map(item => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {item.term}
                      </span>
                      {item.phonetic && (
                        <span className="text-xs text-slate-400 ml-2 font-mono">
                          {item.phonetic}
                        </span>
                      )}
                      <span className="ml-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                        {getPosLabel(item.part_of_speech)}
                      </span>
                    </div>

                    <button
                      onClick={() => playAudio(item.term)}
                      aria-label={`Nghe phát âm từ ${item.term}`}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 transition"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    {item.definition}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                    <span>Chặng {item.week} · Bài {item.unit_id}</span>
                    <span className={`font-semibold ${item.progress.status === 'mastered' ? 'text-emerald-600' : item.progress.status === 'learning' ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {item.progress.status === 'mastered' ? 'Đã thuộc' : item.progress.status === 'learning' ? 'Đang học (SRS)' : 'Mới'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!vocabError && vocabTotal > 100 && (
            <nav aria-label="Phân trang sổ từ vựng" className="flex flex-wrap justify-center items-center gap-3 text-sm">
              <button disabled={vocabLoading || vocabOffset === 0} onClick={() => setVocabOffset(n => Math.max(0, n - 100))} className="px-3 py-2 border rounded-xl disabled:opacity-40">Trang trước</button>
              <span>{vocabOffset + 1}–{Math.min(vocabOffset + 100, vocabTotal)} / {vocabTotal}</span>
              <button disabled={vocabLoading || vocabOffset + 100 >= vocabTotal} onClick={() => setVocabOffset(n => n + 100)} className="px-3 py-2 border rounded-xl disabled:opacity-40">Trang sau</button>
            </nav>
          )}
        </section>
      )}

      {/* 7. Tab Content: Sổ lỗi */}
      {activeTab === 'mistakes' && (
        <section className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Danh sách lỗi và câu đã trợ giúp</h3>
              <p className="text-xs text-slate-500">Các câu từng làm sai hoặc có dùng gợi ý trợ giúp trong các phiên học TOEIC.</p>
            </div>
            <span className="text-xs font-bold text-slate-500">Tổng: {mistakesTotal} lỗi ghi nhận</span>
          </div>

          {mistakesError ? <div role="alert" className="p-4 rounded-xl bg-rose-50 text-rose-700 text-sm">{mistakesError}</div> : mistakesLoading ? (
            <div className="py-12 flex justify-center text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> Đang tải sổ lỗi...
            </div>
          ) : mistakes.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              Tuyệt vời! Bạn chưa có lỗi nào cần khắc phục trong khóa học TOEIC.
            </div>
          ) : (
            <div className="space-y-3">
              {mistakes.map((err, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                        {err.module}
                      </span>
                      <span className="text-xs text-slate-400">
                        Bài {err.unit_id}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {err.prompt}
                    </p>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${err.resolved ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                    {err.resolved ? 'Đã sửa xong ✓' : 'Cần ôn lại'}
                  </span>
                </div>
              ))}
            </div>
          )}
          {!mistakesError && mistakesTotal > 100 && (
            <nav aria-label="Phân trang sổ lỗi" className="flex flex-wrap justify-center items-center gap-3 text-sm">
              <button disabled={mistakesLoading || mistakesOffset === 0} onClick={() => setMistakesOffset(n => Math.max(0, n - 100))} className="px-3 py-2 border rounded-xl disabled:opacity-40">Trang trước</button>
              <span>{mistakesOffset + 1}–{Math.min(mistakesOffset + 100, mistakesTotal)} / {mistakesTotal}</span>
              <button disabled={mistakesLoading || mistakesOffset + 100 >= mistakesTotal} onClick={() => setMistakesOffset(n => n + 100)} className="px-3 py-2 border rounded-xl disabled:opacity-40">Trang sau</button>
            </nav>
          )}
        </section>
      )}
    </div>
  );
};
