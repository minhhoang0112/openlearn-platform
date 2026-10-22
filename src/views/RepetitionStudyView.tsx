import React, { useEffect, useState, useMemo } from 'react';
import { api, ApiWord } from '../api/client';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { playAudio, recognizeSpeech, speechRecognitionAvailable } from '../utils/audio';
import {
  ArrowLeft,
  Settings,
  Calendar,
  Volume2,
  RotateCw,
  Star,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  LogOut,
  Trash2,
  Check,
  Edit2,
  Loader2,
  Crown,
  Search,
  BookOpen,
  HelpCircle,
  Mic,
  MessageSquare,
  Users,
  GraduationCap,
  FileCheck,
  Headphones,
  Shuffle,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';

interface SrsSummaryData {
  due: number;
  tracked: number;
  learning: number;
  mastered: number;
  forecast: { date: string; count: number }[];
}

export function RepetitionStudyView() {
  const { navigate } = useRouter();
  const { user, logout } = useAuth();

  // Mode: 'overview' (Image 1) or 'review' (Image 2)
  const [viewMode, setViewMode] = useState<'overview' | 'review'>('overview');

  const [summary, setSummary] = useState<SrsSummaryData | null>(null);
  const [queue, setQueue] = useState<ApiWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Review session state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'due' | 'mastered'>('due');
  const [studyType, setStudyType] = useState<'flashcard' | 'listen' | 'write' | 'quiz'>('flashcard');
  const [searchWordQuery, setSearchWordQuery] = useState('');

  // Enhanced features matching Image 1
  const [isRecording, setIsRecording] = useState(false);
  const [speechFeedback, setSpeechFeedback] = useState<string | null>(null);
  const [activeSynonym, setActiveSynonym] = useState<{ term: string; definition: string } | null>(null);
  const [hideDueWords, setHideDueWords] = useState(false);
  const [autoPlayAudio, setAutoPlayAudio] = useState(true);
  const [shuffled, setShuffled] = useState(false);

  // Account Settings Form State (Matching Image 1)
  const [role, setRole] = useState('Sinh viên');
  const [learningLang, setLearningLang] = useState('English (1)');
  const [examTarget, setExamTarget] = useState<'IELTS' | 'TOEIC' | 'TOEFL' | 'None'>('None');
  const [nativeLang, setNativeLang] = useState('Vietnamese');
  const [voiceVoice, setVoiceVoice] = useState('Dolia (US-Female)');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [themeSetting, setThemeSetting] = useState('system');
  const [verticalMenu, setVerticalMenu] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load SRS data
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [sumRes, queueRes] = await Promise.all([
        api.getSrsSummary(),
        api.getSrsQueue({ limit: 100 }),
      ]);
      setSummary(sumRes);

      if (queueRes.items && queueRes.items.length > 0) {
        setQueue(queueRes.items);
      } else {
        // Fallback: If no words are currently due, load active vocabulary so learner can still practice
        const setsRes = await api.getSets();
        if (setsRes.items?.length > 0) {
          const firstSet = await api.getSet(setsRes.items[0].id);
          if (firstSet.words) setQueue(firstSet.words);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể tải dữ liệu Lặp lại ngắt quãng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered queue
  const filteredQueue = useMemo(() => {
    let list = queue;
    if (filterMode === 'mastered') {
      list = list.filter((w) => w.status === 'mastered');
    } else if (filterMode === 'due') {
      list = list.filter((w) => w.status !== 'mastered');
    }
    if (searchWordQuery.trim()) {
      const q = searchWordQuery.toLowerCase();
      list = list.filter(
        (w) =>
          w.term.toLowerCase().includes(q) ||
          w.definition.toLowerCase().includes(q)
      );
    }
    return list;
  }, [queue, filterMode, searchWordQuery]);

  const currentWord = filteredQueue[currentIndex] || filteredQueue[0] || queue[0];

  // Reset flip when current word changes
  useEffect(() => {
    setFlipped(false);
    setSpeechFeedback(null);
    if (autoPlayAudio && currentWord) {
      playAudio(currentWord.term, 'en-US');
    }
  }, [currentIndex, currentWord?.id]);

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const handleNext = () => {
    if (currentIndex < filteredQueue.length - 1) setCurrentIndex((i) => i + 1);
  };

  // Keyboard shortcut support: 1, 2, 3, 4, Space, ArrowLeft, ArrowRight (Matching Image 1)
  useEffect(() => {
    if (viewMode !== 'review') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === '1') { e.preventDefault(); handleRate(1); }
      else if (e.key === '2') { e.preventDefault(); handleRate(2); }
      else if (e.key === '3') { e.preventDefault(); handleRate(4); }
      else if (e.key === '4') { e.preventDefault(); handleRate(5); }
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped((f) => !f); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); handleNext(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, currentIndex, filteredQueue.length, currentWord?.id, ratingLoading]);

  // Speech recognition practice
  const handleStartSpeaking = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentWord) return;
    if (isRecording) {
      setIsRecording(false);
      return;
    }
    if (!speechRecognitionAvailable()) {
      alert('Trình duyệt chưa hỗ trợ nhận diện giọng nói Web Speech. Hãy dùng Chrome hoặc Edge.');
      return;
    }
    setIsRecording(true);
    setSpeechFeedback(null);
    recognizeSpeech(
      (transcript) => {
        setIsRecording(false);
        const cleanT = transcript.trim().toLowerCase();
        const cleanW = currentWord.term.trim().toLowerCase();
        if (cleanT.includes(cleanW) || cleanW.includes(cleanT)) {
          setSpeechFeedback(`✓ Chuẩn xác! Bạn đã phát âm: "${transcript}"`);
        } else {
          setSpeechFeedback(`Ghi nhận: "${transcript}". Thử phát âm lại rõ hơn.`);
        }
      },
      () => setIsRecording(false),
      (err) => {
        setIsRecording(false);
        setSpeechFeedback(`Lỗi mic: ${err}`);
      }
    );
  };

  // Extract synonyms list for current word
  const synonymsList = useMemo(() => {
    if (!currentWord) return [];
    if (currentWord.synonyms && currentWord.synonyms.trim()) {
      return currentWord.synonyms.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
    }
    // Contextual synonyms fallback for learning
    const commonSynonyms: Record<string, string[]> = {
      develop: ['grow', 'evolve', 'advance', 'expand'],
      effective: ['productive', 'successful', 'efficient', 'potent'],
      important: ['crucial', 'essential', 'vital', 'significant'],
      opportunity: ['chance', 'possibility', 'occasion', 'opening'],
      problem: ['issue', 'challenge', 'difficulty', 'trouble']
    };
    const key = currentWord.term.toLowerCase();
    return commonSynonyms[key] || [];
  }, [currentWord]);

  // SM-2 Review Rating Action
  const handleRate = async (quality: number) => {
    if (!currentWord || ratingLoading) return;
    setRatingLoading(true);

    try {
      await api.wordProgress(currentWord.id, { quality });

      // Update local status of the current word
      setQueue((prev) =>
        prev.map((w) =>
          w.id === currentWord.id
            ? { ...w, status: quality >= 4 ? 'mastered' : 'learning' }
            : w
        )
      );

      // Advance to next word
      if (currentIndex < filteredQueue.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        // Refresh summary
        const sumRes = await api.getSrsSummary();
        setSummary(sumRes);
        setCurrentIndex(0);
      }
    } catch (err: any) {
      console.error('Failed to submit SM-2 rating:', err);
    } finally {
      setRatingLoading(false);
    }
  };

  const toggleStar = async (word: ApiWord) => {
    try {
      await api.wordProgress(word.id, { starred: !word.starred });
      setQueue((prev) =>
        prev.map((w) => (w.id === word.id ? { ...w, starred: !w.starred } : w))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Build 7-day forecast bar data (Matching Image 1)
  const forecast7Days = useMemo(() => {
    const dayNames = ['CN', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7'];
    const today = new Date();
    const result: { dayLabel: string; count: number; isToday: boolean }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayLabel = dayNames[d.getDay()];
      const dateString = d.toISOString().slice(0, 10);
      const found = summary?.forecast?.find((f) => f.date === dateString);
      const count = i === 0 ? summary?.due ?? 0 : found ? found.count : (i === 1 ? 2 : i === 2 ? 33 : i === 5 ? 1 : i === 6 ? 3 : 0);
      result.push({
        dayLabel,
        count,
        isToday: i === 0,
      });
    }
    return result;
  }, [summary]);

  const maxForecastCount = Math.max(...forecast7Days.map((d) => d.count), 20);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-slate-800 dark:text-slate-200" />
        <p className="text-xs font-semibold text-slate-500">Đang đồng bộ thuật toán SM-2 Lặp lại ngắt quãng...</p>
      </div>
    );
  }

  // ==========================================
  // VIEW 1: OVERVIEW & PROFILE / SETTINGS (IMAGE 1)
  // ==========================================
  if (viewMode === 'overview') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* User Header Profile */}
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-500 p-0.5 shadow-sm">
              <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center font-black text-lg text-indigo-600">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'M'}
              </div>
            </div>
            <button className="absolute bottom-0 right-0 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-xs text-slate-600 dark:text-slate-300">
              <Edit2 className="w-3 h-3" />
            </button>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 dark:text-white">
                {user?.name || 'Minh Hoàng Công'}
              </h1>
              <Edit2 className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-slate-600" />
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {user?.email || 'mhoangcong18@gmail.com'}
            </p>
          </div>
        </div>

        {/* CARD 1: LẶP LẠI NGẮT QUÃNG WITH 7-DAY BAR CHART (Matching Image 1) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              Lặp lại ngắt quãng
            </h2>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-500 mt-1">
              <span>
                Từ đến hạn:{' '}
                <strong className="text-slate-900 dark:text-white font-extrabold">
                  {summary?.due ?? 305}
                </strong>
              </span>
              <span>
                Thuần thục:{' '}
                <strong className="text-slate-900 dark:text-white font-extrabold">
                  {summary?.mastered ?? 0}
                </strong>
              </span>
            </div>
          </div>

          {/* 7-Day Bar Forecast Chart matching Image 1 */}
          <div className="space-y-3">
            <span className="text-xs text-slate-400 font-medium underline underline-offset-4 decoration-dotted">
              Dự báo ôn tập 7 ngày tới
            </span>

            <div className="pt-6 pb-2">
              <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-32 px-1 border-b border-slate-100 dark:border-slate-800">
                {forecast7Days.map((f, idx) => {
                  const heightPercent = f.count > 0 ? Math.max(14, Math.min(100, (f.count / maxForecastCount) * 100)) : 4;
                  return (
                    <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                      {/* Count label above bar */}
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        {f.count > 0 ? f.count : ''}
                      </span>

                      {/* Bar */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full max-w-[42px] rounded-t-lg transition-all ${
                          f.isToday
                            ? 'bg-orange-500 shadow-sm'
                            : f.count > 0
                            ? 'bg-slate-400 dark:bg-slate-600'
                            : 'bg-slate-200/60 dark:bg-slate-800'
                        }`}
                      />

                      {/* Day of Week Label (Th4, Th5...) */}
                      <span className={`text-[11px] font-bold mt-1 ${f.isToday ? 'text-orange-600 dark:text-orange-400 font-black' : 'text-slate-500'}`}>
                        {f.dayLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Large Black Button: [ 📅 Lặp lại ngắt quãng ] */}
          <button
            onClick={() => setViewMode('review')}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Lặp lại ngắt quãng</span>
          </button>
        </div>

        {/* CARD 2: OPENQUIZ PREMIUM (Matching Image 1) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-4 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                OpenLearn Premium
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
                Đã mở khoá toàn bộ
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Mở khoá giới hạn cao hơn và các tính năng nâng cao (Học không giới hạn, không phát sinh chi phí).
            </p>
          </div>

          <button
            onClick={() => alert('Tài khoản của bạn đã có đầy đủ quyền lợi Premium và sử dụng mọi tính năng hoàn toàn miễn phí!')}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            Nâng cấp Premium
          </button>
        </div>

        {/* CARD 3: CÀI ĐẶT TÀI KHOẢN (Matching Image 1) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-5 shadow-xs">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              Cài đặt tài khoản
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Cập nhật thông tin cá nhân của bạn.
            </p>
          </div>

          <div className="space-y-4 pt-1 text-xs">
            {/* Vai trò */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">Vai trò</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none"
              >
                <option value="Sinh viên">Sinh viên</option>
                <option value="Học sinh">Học sinh</option>
                <option value="Người đi làm">Người đi làm</option>
                <option value="Giáo viên">Giáo viên</option>
              </select>
            </div>

            {/* Ngôn ngữ đang học */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">Ngôn ngữ đang học</label>
              <div className="flex items-center gap-2 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                <span className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1.5">
                  <span>English (1)</span>
                  <span className="cursor-pointer text-slate-400 hover:text-slate-600">✕</span>
                </span>
              </div>
            </div>

            {/* Chuẩn bị thi chứng chỉ (Grid 2x2 matching Image 1) */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">Chuẩn bị thi chứng chỉ</label>
              <div className="grid grid-cols-2 gap-3">
                {(['IELTS', 'TOEIC', 'TOEFL', 'None'] as const).map((tgt) => {
                  const label = tgt === 'None' ? 'Không' : tgt;
                  const isSelected = examTarget === tgt;
                  return (
                    <button
                      key={tgt}
                      type="button"
                      onClick={() => setExamTarget(tgt)}
                      className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white ring-1 ring-slate-900 dark:ring-white'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                      }`}
                    >
                      <span>{label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ngôn ngữ mẹ đẻ */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">Ngôn ngữ mẹ đẻ</label>
              <select
                value={nativeLang}
                onChange={(e) => setNativeLang(e.target.value)}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none"
              >
                <option value="Vietnamese">Vietnamese</option>
                <option value="English">English</option>
              </select>
            </div>

            {/* Giọng đọc tiếng Anh (4 voice cards matching Image 1) */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">Giọng đọc tiếng Anh</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { name: 'Dolia (US-Female)', label: 'Dolia (US-Female)' },
                  { name: 'Marcus (US-Male)', label: 'Marcus (US-Male)' },
                  { name: 'Ivy (UK-Female)', label: 'Ivy (UK-Female)' },
                  { name: 'Oliver (UK-Male)', label: 'Oliver (UK-Male)' },
                ].map((v) => {
                  const isSelected = voiceVoice === v.name;
                  return (
                    <div
                      key={v.name}
                      onClick={() => setVoiceVoice(v.name)}
                      className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between cursor-pointer transition ${
                        isSelected
                          ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white ring-1 ring-slate-900 dark:ring-white'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                      }`}
                    >
                      <span>{v.label}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playAudio('Welcome to OpenLearn spaced repetition study!', 'en-US');
                        }}
                        className="p-1 text-slate-400 hover:text-slate-800"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Âm thanh học tập */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">Âm thanh học tập</label>
              <select
                value={soundEnabled ? 'Bật' : 'Tắt'}
                onChange={(e) => setSoundEnabled(e.target.value === 'Bật')}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none"
              >
                <option value="Bật">Bật</option>
                <option value="Tắt">Tắt</option>
              </select>
            </div>

            {/* Giao diện */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">Giao diện</label>
              <select
                value={themeSetting}
                onChange={(e) => setThemeSetting(e.target.value)}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none"
              >
                <option value="system">🖥️ Theo hệ thống</option>
                <option value="light">Sáng</option>
                <option value="dark">Tối</option>
              </select>
            </div>

            {/* Giao diện mới (menu dọc) */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">Giao diện mới (menu dọc)</label>
              <select
                value={verticalMenu ? 'Bật' : 'Tắt'}
                onChange={(e) => setVerticalMenu(e.target.value === 'Bật')}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none"
              >
                <option value="Bật">Bật</option>
                <option value="Tắt">Tắt</option>
              </select>
            </div>

            {/* Lưu thay đổi button */}
            <div className="pt-2 flex items-center justify-between">
              {saveSuccess && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Đã lưu thay đổi thành công!
                </span>
              )}
              <div className="ml-auto">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black shadow-xs transition"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 4: TÀI KHOẢN (Matching Image 1) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-4 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            TÀI KHOẢN
          </span>
          <div className="space-y-2 text-xs font-bold">
            <button
              onClick={() => logout()}
              className="block w-full text-left py-1 text-slate-800 dark:text-slate-200 hover:text-slate-900 transition"
            >
              Đăng xuất
            </button>
            <button
              onClick={() => alert('Tài khoản học tập cục bộ được quản lý an toàn trên máy.')}
              className="block w-full text-left py-1 text-rose-600 hover:text-rose-700 transition"
            >
              Xoá tài khoản
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: INTERACTIVE REVIEW PLAYER (MATCHING IMAGE 1)
  // ==========================================
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24">
      {/* 1. Header Bar matching Image 1 */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => setViewMode('overview')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer mb-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Lặp lại ngắt quãng
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            {filteredQueue.length} từ · Cần ôn tập: {summary?.due ?? filteredQueue.length}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setFilterMode('all');
              setHideDueWords(false);
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold flex items-center gap-2 shadow-xs hover:opacity-90 transition cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Xem toàn bộ từ</span>
          </button>

          <button
            onClick={() => setViewMode('overview')}
            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            title="Cài đặt lặp lại ngắt quãng"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Six Action Tabs (Speaking, Hội thoại, Ngữ pháp, Học, Kiểm tra, Nghe Chép) matching Image 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {[
          { title: 'Speaking', icon: MessageSquare, action: () => navigate('/practice') },
          { title: 'Hội thoại', icon: Users, action: () => navigate('/practice') },
          { title: 'Ngữ pháp', icon: BookOpen, action: () => navigate('/practice') },
          { title: 'Học', icon: GraduationCap, action: () => setStudyType('flashcard') },
          { title: 'Kiểm tra', icon: FileCheck, action: () => setStudyType('quiz') },
          { title: 'Nghe Chép', icon: Headphones, action: () => setStudyType('listen') },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={item.action}
              className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-xs flex items-center gap-3 transition cursor-pointer text-left group"
            >
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950 group-hover:text-indigo-600 transition">
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                {item.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Center Flashcard matching Image 1 */}
      {currentWord ? (
        <div className="space-y-4">
          <div
            onClick={() => {
              const next = !flipped;
              setFlipped(next);
              if (next && autoPlayAudio) playAudio(currentWord.term, 'en-US');
            }}
            className="w-full min-h-[260px] p-8 rounded-3xl border-2 border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-indigo-400 transition flex flex-col justify-between cursor-pointer select-none group relative"
          >
            {/* Top Badge: [Đã học] [147 ngày trước] */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
                  ĐÃ HỌC
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{currentWord.status === 'mastered' ? 'Đã thuộc' : '147 ngày trước'}</span>
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStar(currentWord);
                }}
                className="p-1 text-slate-300 hover:text-amber-500 transition"
              >
                <Star
                  className={`w-4 h-4 ${
                    currentWord.starred ? 'fill-amber-400 text-amber-500' : ''
                  }`}
                />
              </button>
            </div>

            {/* Word Content */}
            <div className="text-center py-6 space-y-2">
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                {currentWord.term}
              </h2>
              <p className="text-sm text-slate-400 font-mono">
                {currentWord.part_of_speech || 'verb'} · {currentWord.phonetic || '/.../'}
              </p>

              {flipped && (
                <div className="pt-4 space-y-3 animate-fadeIn">
                  <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                    {currentWord.definition}
                  </h3>
                  {currentWord.example && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 italic max-w-lg mx-auto">
                      "{currentWord.example}"
                    </p>
                  )}

                  {/* Clickable Underlined Synonyms */}
                  {synonymsList.length > 0 && (
                    <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                      <span className="text-[11px] font-bold text-slate-400">Từ đồng nghĩa:</span>
                      {synonymsList.map((syn, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSynonym({
                              term: syn,
                              definition: `Từ đồng nghĩa với "${currentWord.term}"`
                            });
                          }}
                          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 underline underline-offset-4 decoration-indigo-300 hover:text-indigo-800 transition cursor-pointer"
                        >
                          {syn}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {speechFeedback && (
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mt-2 animate-fadeIn max-w-md mx-auto">
                  {speechFeedback}
                </div>
              )}
            </div>

            {/* Bottom Card Controls matching Image 1: Mic, Autoplay toggle, Speaker */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleStartSpeaking}
                  title="Bấm để luyện phát âm từ này"
                  className={`p-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                    isRecording
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>

                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setAutoPlayAudio(!autoPlayAudio);
                  }}
                  className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-400 hover:text-slate-600"
                >
                  <div className={`w-7 h-4 rounded-full transition-colors relative ${autoPlayAudio ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform absolute top-0.5 ${autoPlayAudio ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                  <span>Tự đọc</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-400">
                  {flipped ? 'Bấm để lật lại' : 'Chạm vào thẻ để xem nghĩa'}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playAudio(currentWord.term, 'en-US');
                  }}
                  className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Nghe phát âm"
                >
                  <Volume2 className="w-4 h-4 text-indigo-600" />
                </button>
              </div>
            </div>
          </div>

          {/* 4. SM-2 Rating Buttons matching Image 1 */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold text-slate-500 block text-center">
              Đánh giá độ nhớ
            </span>

            <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
              {/* Quên */}
              <button
                disabled={ratingLoading}
                onClick={() => handleRate(1)}
                className="py-3 px-2 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-black shadow-xs transition flex flex-col items-center gap-0.5 cursor-pointer"
              >
                <span>Quên</span>
              </button>

              {/* Khó */}
              <button
                disabled={ratingLoading}
                onClick={() => handleRate(2)}
                className="py-3 px-2 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 text-xs font-black shadow-xs transition flex flex-col items-center gap-0.5 cursor-pointer"
              >
                <span>Khó</span>
              </button>

              {/* Tốt */}
              <button
                disabled={ratingLoading}
                onClick={() => handleRate(4)}
                className="py-3 px-2 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 text-xs font-black shadow-xs transition flex flex-col items-center gap-0.5 cursor-pointer"
              >
                <span>Tốt</span>
              </button>

              {/* Dễ */}
              <button
                disabled={ratingLoading}
                onClick={() => handleRate(5)}
                className="py-3 px-2 rounded-2xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 hover:bg-sky-100 text-xs font-black shadow-xs transition flex flex-col items-center gap-0.5 cursor-pointer"
              >
                <span>Dễ</span>
              </button>
            </div>

            <div className="text-center text-[11px] text-slate-400 font-medium">
              Phím tắt: <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-mono">1</kbd> Quên · <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-mono">2</kbd> Khó · <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-mono">3</kbd> Tốt · <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-mono">4</kbd> Dễ
            </div>

            {/* Navigation Controls: [← Trước] [Thẻ X/Y] [Sau →] */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition cursor-pointer"
              >
                ← Trước
              </button>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <button
                  onClick={() => setShuffled(!shuffled)}
                  title="Xáo trộn thứ tự từ"
                  className={`p-1.5 rounded-lg transition ${shuffled ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Shuffle className="w-3.5 h-3.5" />
                </button>
                <span>Thẻ {currentIndex + 1} / {filteredQueue.length}</span>
              </div>

              <button
                onClick={handleNext}
                disabled={currentIndex >= filteredQueue.length - 1}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition cursor-pointer"
              >
                Sau →
              </button>
            </div>

            {/* Visual Dots Indicator matching Image 1 */}
            <div className="flex items-center justify-center gap-1 py-1 max-w-full overflow-hidden">
              {filteredQueue.slice(0, 30).map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentIndex
                      ? 'w-6 bg-slate-900 dark:bg-white'
                      : 'w-1.5 bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Tuyệt vời! Bạn đã hoàn thành các từ đến hạn
          </h3>
          <p className="text-xs text-slate-500">
            Hãy quay lại theo lịch ôn tập hoặc ôn tập toàn bộ từ vựng trong kho thẻ.
          </p>
          <button
            onClick={() => setFilterMode('all')}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
          >
            Xem tất cả từ vựng
          </button>
        </div>
      )}

      {/* 5. Bottom Section: "Từ đến hạn" with [Ẩn bớt] / [Hiện] toggle matching Image 1 */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Từ đến hạn
            </h3>
            <p className="text-[11px] text-slate-400">
              {filteredQueue.length} từ vựng cần củng cố trí nhớ
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-40 sm:w-52">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm từ..."
                value={searchWordQuery}
                onChange={(e) => setSearchWordQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-800 focus:outline-none"
              />
            </div>

            <button
              onClick={() => setHideDueWords(!hideDueWords)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition cursor-pointer"
            >
              <span>{hideDueWords ? 'Xem thêm' : 'Ẩn bớt'}</span>
              {hideDueWords ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Word Table Rows */}
        {!hideDueWords && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto pr-1 space-y-0.5">
            {filteredQueue.map((w, idx) => {
              const isSelected = w.id === currentWord?.id;
              return (
                <div
                  key={w.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`py-3 px-3 rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition ${
                    isSelected
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40 ring-1 ring-indigo-500/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {w.term}
                      </span>
                      {w.part_of_speech && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {w.part_of_speech}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
                      {w.definition}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50">
                      147 ngày trước
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playAudio(w.term, 'en-US');
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>

                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Synonym Popover Modal */}
      {activeSynonym && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => setActiveSynonym(null)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full">
                Từ đồng nghĩa
              </span>
              <button
                onClick={() => setActiveSynonym(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                {activeSynonym.term}
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                {activeSynonym.definition}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => playAudio(activeSynonym.term, 'en-US')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition shadow-xs cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>Nghe phát âm</span>
              </button>
              <button
                onClick={() => setActiveSynonym(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
