import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  api,
  ApiError,
  ApiWord,
  SrsPracticeGroup,
  SrsPracticeResponse,
} from '../api/client';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { playAudio } from '../utils/audio';
import { WordLearningDetails } from '../components/WordLearningDetails';
import { buildPracticeRoute, ReviewScope } from '../utils/practiceLaunch';
import {
  ArrowLeft,
  Settings,
  Calendar,
  Volume2,
  Star,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Loader2,
  Search,
  BookOpen,
  Sliders,
  AlertCircle,
  Layers,
  Mic,
  MessageSquare,
  FileText,
  Eye,
  Gamepad2,
  Headphones,
  PenTool,
  HelpCircle,
} from 'lucide-react';

interface SrsSummaryData {
  due: number;
  tracked: number;
  learning: number;
  mastered: number;
  forecast: { date: string; count: number }[];
}

type PracticeModeTab =
  | 'flashcard'
  | 'learn'
  | 'listen'
  | 'write'
  | 'quiz'
  | 'exam'
  | 'match'
  | 'speaking'
  | 'conversation'
  | 'grammar_order'
  | 'reading';

interface ModeTabMeta {
  id: PracticeModeTab;
  label: string;
  description: string;
  requiresAi: boolean;
  updatesSrs: boolean;
  needsExamples?: boolean;
  maxWords: number;
  icon: React.FC<{ className?: string }>;
}

const PRACTICE_MODES: ModeTabMeta[] = [
  {
    id: 'flashcard',
    label: 'Thẻ ghi nhớ',
    description: 'Lật thẻ và tự đánh giá mức độ nhớ theo thuật toán SM-2.',
    requiresAi: false,
    updatesSrs: true,
    maxWords: 100,
    icon: BookOpen,
  },
  {
    id: 'learn',
    label: 'Học kết hợp',
    description: 'Luyện hỏi đáp nhiều bước cho đúng danh sách từ trong phạm vi đang chọn.',
    requiresAi: false,
    updatesSrs: true,
    maxWords: 100,
    icon: Layers,
  },
  {
    id: 'listen',
    label: 'Nghe',
    description: 'Nghe phát âm và gõ lại chính xác từ vựng trong phạm vi ôn tập.',
    requiresAi: false,
    updatesSrs: true,
    maxWords: 100,
    icon: Headphones,
  },
  {
    id: 'write',
    label: 'Viết',
    description: 'Nhìn nghĩa tiếng Việt và gõ lại từ tiếng Anh tương ứng.',
    requiresAi: false,
    updatesSrs: true,
    maxWords: 100,
    icon: PenTool,
  },
  {
    id: 'quiz',
    label: 'Trắc nghiệm',
    description: 'Chọn đáp án đúng trong 4 lựa chọn cho các từ thuộc phạm vi đã lọc.',
    requiresAi: false,
    updatesSrs: true,
    maxWords: 100,
    icon: HelpCircle,
  },
  {
    id: 'exam',
    label: 'Kiểm tra',
    description: 'Làm bài kiểm tra tổng hợp cho các từ trong bộ thuộc phạm vi này.',
    requiresAi: false,
    updatesSrs: true,
    maxWords: 100,
    icon: CheckCircle2,
  },
  {
    id: 'match',
    label: 'Ghép thẻ',
    description: 'Nối nhanh từ tiếng Anh với nghĩa tiếng Việt tương ứng.',
    requiresAi: false,
    updatesSrs: true,
    maxWords: 100,
    icon: Gamepad2,
  },
  {
    id: 'grammar_order',
    label: 'Ngữ pháp',
    description: 'Sắp xếp câu và điền từ dựa trên câu ví dụ có sẵn (không tự đổi lịch SRS).',
    requiresAi: false,
    updatesSrs: false,
    needsExamples: true,
    maxWords: 30,
    icon: FileText,
  },
  {
    id: 'speaking',
    label: 'Speaking AI',
    description: 'Luyện trả lời câu hỏi phản xạ cùng AI cho các từ đang chọn (không tự đổi lịch SRS).',
    requiresAi: true,
    updatesSrs: false,
    maxWords: 20,
    icon: Mic,
  },
  {
    id: 'conversation',
    label: 'Hội thoại AI',
    description: 'Trò chuyện theo ngữ cảnh với danh sách từ mục tiêu (không tự đổi lịch SRS).',
    requiresAi: true,
    updatesSrs: false,
    maxWords: 100,
    icon: MessageSquare,
  },
  {
    id: 'reading',
    label: 'Đọc hiểu AI',
    description: 'Tạo đoạn văn đọc hiểu và điền từ bằng AI cho tối đa 30 từ (không tự đổi lịch SRS).',
    requiresAi: true,
    updatesSrs: false,
    maxWords: 30,
    icon: Eye,
  },
];

const PAGE_SIZE = 20;

export function RepetitionStudyView() {
  const { navigate } = useRouter();
  const { user, logout, capabilities } = useAuth();

  const [viewMode, setViewMode] = useState<'overview' | 'review'>('overview');

  const [summary, setSummary] = useState<SrsSummaryData | null>(null);
  const [queue, setQueue] = useState<ApiWord[]>([]);
  const [queueTotal, setQueueTotal] = useState(0);
  const [queueOffset, setQueueOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [queueLoading, setQueueLoading] = useState(false);
  const [error, setError] = useState('');
  const [reviewConflictNotice, setReviewConflictNotice] = useState('');

  // Scoped practice groups from GET /srs/practice
  const [practiceData, setPracticeData] = useState<SrsPracticeResponse | null>(null);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceOffset, setPracticeOffset] = useState(0);

  // Review session state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);
  const ratingBusyRef = useRef(false);

  const [filterMode, setFilterMode] = useState<ReviewScope>('due');
  const [studyType, setStudyType] = useState<PracticeModeTab>('flashcard');
  const [searchWordQuery, setSearchWordQuery] = useState('');

  const loadSummary = useCallback(async () => {
    const sumRes = await api.getSrsSummary();
    setSummary({
      due: sumRes.due ?? 0,
      tracked: sumRes.tracked ?? 0,
      learning: sumRes.learning ?? 0,
      mastered: sumRes.mastered ?? 0,
      forecast: Array.isArray(sumRes.forecast) ? sumRes.forecast : [],
    });
    return sumRes;
  }, []);

  const loadScopeWords = useCallback(
    async (scope: ReviewScope, offset: number, q: string) => {
      setQueueLoading(true);
      try {
        if (scope === 'due') {
          const res = await api.getSrsQueue({ limit: PAGE_SIZE, offset });
          setQueue(res.items || []);
          setQueueTotal(res.total ?? (res.items || []).length);
        } else if (scope === 'all') {
          const res = await api.getMyWords({
            limit: PAGE_SIZE,
            offset,
            q: q.trim() || undefined,
          });
          setQueue(res.items || []);
          setQueueTotal(res.total ?? (res.items || []).length);
        } else {
          const res = await api.getMyWords({
            status: 'mastered',
            limit: PAGE_SIZE,
            offset,
            q: q.trim() || undefined,
          });
          setQueue(res.items || []);
          setQueueTotal(res.total ?? (res.items || []).length);
        }
      } catch (err: any) {
        setError(err?.message || 'Không thể tải danh sách từ ôn tập.');
      } finally {
        setQueueLoading(false);
      }
    },
    [],
  );

  const loadPracticeGroups = useCallback(async (scope: ReviewScope, offset: number) => {
    setPracticeLoading(true);
    try {
      const res = await api.getSrsPractice({ scope, limit: 12, offset });
      setPracticeData(res);
    } catch {
      // Non-blocking if practice groups fail
    } finally {
      setPracticeLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      loadSummary(),
      loadScopeWords('due', 0, ''),
      loadPracticeGroups('due', 0),
    ])
      .catch((err: any) => {
        if (active) setError(err?.message || 'Không thể tải dữ liệu Lặp lại ngắt quãng.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadSummary, loadScopeWords, loadPracticeGroups]);

  // Reload words when filterMode, queueOffset, or searchWordQuery changes
  useEffect(() => {
    if (loading) return;
    setCurrentIndex(0);
    setFlipped(false);
    void loadScopeWords(filterMode, queueOffset, searchWordQuery);
  }, [filterMode, queueOffset, searchWordQuery, loadScopeWords]);

  // Reload practice groups when filterMode or practiceOffset changes
  useEffect(() => {
    if (loading) return;
    void loadPracticeGroups(filterMode, practiceOffset);
  }, [filterMode, practiceOffset, loadPracticeGroups]);

  // Client-side filter only for `due` search box (since /srs/queue doesn't take `q`)
  const displayedQueue = useMemo(() => {
    if (filterMode === 'due' && searchWordQuery.trim()) {
      const q = searchWordQuery.trim().toLowerCase();
      return queue.filter(
        (w) =>
          w.term.toLowerCase().includes(q) ||
          w.definition.toLowerCase().includes(q),
      );
    }
    return queue;
  }, [queue, filterMode, searchWordQuery]);

  const currentWord: ApiWord | undefined = displayedQueue[currentIndex];

  useEffect(() => {
    setFlipped(false);
  }, [currentIndex, currentWord?.id]);

  // SM-2 Review Rating Action
  const handleRate = async (quality: number) => {
    if (!currentWord || ratingLoading || ratingBusyRef.current) return;
    ratingBusyRef.current = true;
    setRatingLoading(true);
    setReviewConflictNotice('');
    setError('');

    try {
      const updatedProgress = await api.wordProgress(currentWord.id, {
        quality,
        expected_last_reviewed_at: currentWord.last_reviewed_at ?? null,
      });

      window.dispatchEvent(new Event('openquiz:srs-updated'));

      const nowIso = new Date().toISOString();
      const stillDue = updatedProgress.due_at ? updatedProgress.due_at <= nowIso : false;

      if (filterMode === 'due') {
        if (!stillDue) {
          // Remove reviewed card from the due queue snapshot so index doesn't skip next card
          const nextQueue = queue.filter((w) => w.id !== currentWord.id);
          setQueue(nextQueue);
          setQueueTotal((prev) => Math.max(0, prev - 1));
          setCurrentIndex((prevIdx) =>
            nextQueue.length === 0 ? 0 : Math.min(prevIdx, nextQueue.length - 1),
          );
        } else {
          // Rated quality < 3 so it remains due immediately; update its progress metadata from BE
          setQueue((prev) =>
            prev.map((w) =>
              w.id === currentWord.id
                ? {
                    ...w,
                    status: updatedProgress.status,
                    due_at: updatedProgress.due_at,
                    last_reviewed_at: updatedProgress.last_reviewed_at,
                    repetitions: updatedProgress.repetitions,
                    interval_days: updatedProgress.interval_days,
                    ease: updatedProgress.ease,
                  }
                : w,
            ),
          );
          if (currentIndex < displayedQueue.length - 1) {
            setCurrentIndex((prev) => prev + 1);
          } else {
            setCurrentIndex(0);
          }
        }
      } else {
        // In 'all' or 'mastered' tab, update word status from BE response without faking status
        setQueue((prev) =>
          prev.map((w) =>
            w.id === currentWord.id
              ? {
                  ...w,
                  status: updatedProgress.status,
                  due_at: updatedProgress.due_at,
                  last_reviewed_at: updatedProgress.last_reviewed_at,
                  repetitions: updatedProgress.repetitions,
                  interval_days: updatedProgress.interval_days,
                  ease: updatedProgress.ease,
                }
              : w,
          ),
        );
        if (currentIndex < displayedQueue.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        }
      }

      await Promise.all([
        loadSummary(),
        loadPracticeGroups(filterMode, practiceOffset),
      ]);
    } catch (err: any) {
      if (err instanceof ApiError && (err.status === 409 || err.error?.code === 'REVIEW_CHANGED')) {
        setReviewConflictNotice('Từ này vừa được ôn ở phiên khác. Đã tải lại lịch ôn.');
        await Promise.all([
          loadSummary(),
          loadScopeWords(filterMode, queueOffset, searchWordQuery),
          loadPracticeGroups(filterMode, practiceOffset),
        ]);
      } else {
        setError(err?.message || 'Không thể lưu kết quả đánh giá SM-2.');
      }
    } finally {
      ratingBusyRef.current = false;
      setRatingLoading(false);
    }
  };

  const toggleStar = async (word: ApiWord) => {
    try {
      const updated = await api.wordProgress(word.id, { starred: !word.starred });
      setQueue((prev) =>
        prev.map((w) => (w.id === word.id ? { ...w, starred: Boolean(updated.starred) } : w)),
      );
    } catch (err: any) {
      setError(err?.message || 'Không thể cập nhật dấu sao.');
    }
  };

  const launchModeForGroup = (group: SrsPracticeGroup, modeId: PracticeModeTab) => {
    const wordIds = group.word_ids || [];
    if (wordIds.length === 0) return;

    if (modeId === 'flashcard') {
      setStudyType('flashcard');
      return;
    }

    let baseRoute = `/study/${group.set_id}`;
    let studyMode: 'learn' | 'write' | 'quiz' | null = null;
    let maxWords = 100;

    switch (modeId) {
      case 'learn':
        baseRoute = `/study/${group.set_id}`;
        studyMode = 'learn';
        break;
      case 'write':
        baseRoute = `/study/${group.set_id}`;
        studyMode = 'write';
        break;
      case 'quiz':
        baseRoute = `/study/${group.set_id}`;
        studyMode = 'quiz';
        break;
      case 'listen':
        baseRoute = `/dictation/${group.set_id}`;
        break;
      case 'exam':
        baseRoute = `/exam/${group.set_id}`;
        break;
      case 'match':
        baseRoute = `/game/match/${group.set_id}`;
        break;
      case 'speaking':
        baseRoute = `/ai-study/${group.set_id}`;
        maxWords = 20;
        break;
      case 'conversation':
        baseRoute = `/conversation/${group.set_id}`;
        maxWords = 100;
        break;
      case 'grammar_order':
        baseRoute = `/grammar/${group.set_id}`;
        maxWords = 30;
        break;
      case 'reading':
        baseRoute = `/reading/${group.set_id}`;
        maxWords = 30;
        break;
    }

    const targetRoute = buildPracticeRoute(baseRoute, {
      wordIds,
      reviewScope: filterMode,
      studyMode,
      maxWords,
      source: 'srs',
      from: '/repetition-study',
      setTitle: group.title,
    });
    navigate(targetRoute);
  };

  // Build 7-day forecast bar data from real backend UTC forecast (0 fabricated numbers)
  const forecast7Days = useMemo(() => {
    const dayNames = ['CN', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7'];
    const result: { dayLabel: string; dateStr: string; count: number; isToday: boolean }[] = [];
    const forecastList = summary?.forecast || [];

    if (forecastList.length >= 7) {
      for (let i = 0; i < 7; i++) {
        const item = forecastList[i];
        const parsed = new Date(`${item.date}T00:00:00Z`);
        const dayLabel = Number.isNaN(parsed.getUTCDay()) ? item.date.slice(5) : dayNames[parsed.getUTCDay()];
        result.push({
          dayLabel,
          dateStr: item.date,
          count: i === 0 ? (summary?.due ?? 0) + (item.count ?? 0) : (item.count ?? 0),
          isToday: i === 0,
        });
      }
      return result;
    }

    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i));
      const dateString = d.toISOString().slice(0, 10);
      const dayLabel = dayNames[d.getUTCDay()];
      const found = forecastList.find((f) => f.date === dateString);
      const count = i === 0 ? (summary?.due ?? 0) : (found?.count ?? 0);
      result.push({
        dayLabel,
        dateStr: dateString,
        count,
        isToday: i === 0,
      });
    }
    return result;
  }, [summary]);

  const maxForecastCount = Math.max(...forecast7Days.map((d) => d.count), 10);
  const selectedModeMeta = PRACTICE_MODES.find((m) => m.id === studyType) || PRACTICE_MODES[0];

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-slate-800 dark:text-slate-200" />
        <p className="text-xs font-semibold text-slate-500">
          Đang đồng bộ dữ liệu Lặp lại ngắt quãng (SM-2)...
        </p>
      </div>
    );
  }

  // ==========================================
  // VIEW 1: OVERVIEW & REAL SETTINGS LINKS
  // ==========================================
  if (viewMode === 'overview') {
    const dueCount = summary?.due ?? 0;
    const trackedCount = summary?.tracked ?? 0;
    const masteredCount = summary?.mastered ?? 0;
    const learningCount = summary?.learning ?? 0;

    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* User Header Profile */}
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-500 p-0.5 shadow-sm">
            <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center font-black text-lg text-indigo-600">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white">
              {user?.name || 'Học viên'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {user?.email || ''}
            </p>
          </div>
        </div>

        {/* CARD 1: LẶP LẠI NGẮT QUÃNG WITH REAL 7-DAY UTC BAR CHART */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              Lặp lại ngắt quãng (SRS)
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500 mt-1.5">
              <span>
                Từ đến hạn:{' '}
                <strong data-testid="srs-due-count" className="text-slate-900 dark:text-white font-extrabold">
                  {dueCount}
                </strong>
              </span>
              <span>
                Đang học:{' '}
                <strong className="text-slate-900 dark:text-white font-extrabold">
                  {learningCount}
                </strong>
              </span>
              <span>
                Thuần thục:{' '}
                <strong data-testid="srs-mastered-count" className="text-slate-900 dark:text-white font-extrabold">
                  {masteredCount}
                </strong>
              </span>
              <span>
                Tổng đang theo dõi:{' '}
                <strong data-testid="srs-tracked-count" className="text-slate-900 dark:text-white font-extrabold">
                  {trackedCount}
                </strong>
              </span>
            </div>
          </div>

          {/* 7-Day Bar Forecast Chart */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">
                Dự báo lịch ôn 7 ngày tới (theo ngày UTC)
              </span>
              <span className="text-[11px] text-slate-400">
                Dữ liệu thực từ lịch SM-2
              </span>
            </div>

            <div className="pt-6 pb-2">
              <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-32 px-1 border-b border-slate-100 dark:border-slate-800">
                {forecast7Days.map((f, idx) => {
                  const heightPercent =
                    f.count > 0
                      ? Math.max(14, Math.min(100, (f.count / maxForecastCount) * 100))
                      : 4;
                  return (
                    <div
                      key={idx}
                      title={`${f.dateStr} (UTC): ${f.count} từ`}
                      className="flex flex-col items-center gap-1.5 h-full justify-end group"
                    >
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        {f.count}
                      </span>

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

                      <span
                        className={`text-[11px] font-bold mt-1 ${
                          f.isToday ? 'text-orange-600 dark:text-orange-400 font-black' : 'text-slate-500'
                        }`}
                      >
                        {f.dayLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {trackedCount === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs space-y-3">
              <p className="text-slate-600 dark:text-slate-300 font-medium">
                Tài khoản của bạn chưa có từ vựng nào trong danh sách theo dõi SRS. Hãy học một bộ từ vựng để bắt đầu lên lịch ôn tập tự động.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition"
                >
                  Khám phá bộ từ tại Trang chủ
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/today')}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200 hover:bg-white transition"
                >
                  Mở Kế hoạch Học hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('review')}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200 hover:bg-white transition"
                >
                  Lặp lại ngắt quãng
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => setViewMode('review')}
                className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>Lặp lại ngắt quãng</span>
                <span className="px-2 py-0.5 rounded-full bg-white/15 text-[11px]">
                  {dueCount > 0 ? `${dueCount} đến hạn` : `${trackedCount} từ theo dõi`}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* CARD 2: REAL SETTINGS NAVIGATION (No fake save form) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-4 shadow-xs">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              Thiết lập học tập &amp; AI
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Quản lý mục tiêu thời gian hàng ngày, lịch học trong tuần và cấu hình khóa API AI.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => navigate('/settings/learning')}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 bg-slate-50/60 dark:bg-slate-800/40 text-left flex items-center justify-between transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white group-hover:text-indigo-600">
                    Cài đặt học tập
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Thời lượng, múi giờ &amp; ngày học
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/settings/ai')}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 bg-slate-50/60 dark:bg-slate-800/40 text-left flex items-center justify-between transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white group-hover:text-purple-600">
                    Cài đặt AI
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {capabilities?.ai.configured ? 'Đã kết nối AI' : 'Cấu hình nhà cung cấp AI'}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* CARD 3: TÀI KHOẢN */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-4 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            TÀI KHOẢN
          </span>
          <div className="space-y-2 text-xs font-bold">
            <button
              type="button"
              onClick={() => logout()}
              className="flex items-center gap-2 py-1 text-slate-800 dark:text-slate-200 hover:text-rose-600 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: INTERACTIVE REVIEW PLAYER & SCOPED MODES
  // ==========================================
  const totalPages = Math.max(1, Math.ceil(queueTotal / PAGE_SIZE));
  const currentPage = Math.floor(queueOffset / PAGE_SIZE) + 1;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-24">
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMode('overview')}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tổng quan lịch ôn</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/settings/learning')}
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          title="Cài đặt học tập"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <div className="text-center space-y-0.5">
        <h1 className="text-xl font-black text-slate-900 dark:text-white">
          Lặp lại ngắt quãng
        </h1>
        <p className="text-xs text-slate-400 font-medium">
          {filterMode === 'due'
            ? `Từ vựng đến hạn cần ôn (${summary?.due ?? queueTotal} từ)`
            : filterMode === 'all'
              ? `Toàn bộ từ đang theo dõi (${summary?.tracked ?? queueTotal} từ)`
              : `Từ vựng đã thuần thục (${summary?.mastered ?? queueTotal} từ)`}
        </p>
      </div>

      {/* Conflict / Error Banners */}
      {reviewConflictNotice && (
        <div
          role="status"
          className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>{reviewConflictNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setReviewConflictNotice('')}
            className="text-[11px] underline"
          >
            Đóng
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between gap-3"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            className="underline text-[11px]"
          >
            Đóng
          </button>
        </div>
      )}

      {/* 2. Scope Filter Pills (due / all / mastered) */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {[
          { key: 'due' as const, label: `Cần ôn (${summary?.due ?? 0})` },
          { key: 'all' as const, label: `Đang theo dõi (${summary?.tracked ?? 0})` },
          { key: 'mastered' as const, label: `Thuần thục (${summary?.mastered ?? 0})` },
        ].map((btn) => (
          <button
            key={btn.key}
            type="button"
            onClick={() => {
              setFilterMode(btn.key);
              setQueueOffset(0);
              setPracticeOffset(0);
              setCurrentIndex(0);
            }}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              filterMode === btn.key
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* 3. Exercise Mode Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 bg-slate-100/80 dark:bg-slate-900/80 p-2 rounded-2xl border border-slate-200/70 dark:border-slate-800">
        {PRACTICE_MODES.map((m) => {
          const Icon = m.icon;
          const active = studyType === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setStudyType(m.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 ${
                active
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4A. When studyType !== 'flashcard': Scoped Set Selector & Real Exercise Launcher */}
      {studyType !== 'flashcard' ? (
        <section
          data-testid="srs-scoped-practice-panel"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-5 shadow-xs"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Chế độ: {selectedModeMeta.label}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    selectedModeMeta.updatesSrs
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  {selectedModeMeta.updatesSrs ? 'Cập nhật lịch ôn SRS' : 'Vận dụng — không đổi lịch SRS'}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    selectedModeMeta.requiresAi
                      ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {selectedModeMeta.requiresAi ? 'Dùng AI' : 'Không cần AI'}
                </span>
              </div>
              <p className="text-xs text-slate-500">{selectedModeMeta.description}</p>
              <p className="text-[11px] text-slate-400">
                Chọn bộ từ bên dưới để mở bài tập thật chỉ gồm các từ thuộc phạm vi{' '}
                <strong>
                  {filterMode === 'due'
                    ? 'Cần ôn'
                    : filterMode === 'all'
                      ? 'Đang theo dõi'
                      : 'Thuần thục'}
                </strong>{' '}
                (tối đa {selectedModeMeta.maxWords} từ/lượt, không trộn lẫn nhiều bộ từ).
              </p>
            </div>
          </div>

          {practiceLoading ? (
            <div className="py-10 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang tải danh sách bộ từ theo phạm vi...</span>
            </div>
          ) : !practiceData || practiceData.items.length === 0 ? (
            <div className="p-8 text-center space-y-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Không có bộ từ nào có từ vựng trong phạm vi "{filterMode === 'due' ? 'Cần ôn' : filterMode === 'all' ? 'Đang theo dõi' : 'Thuần thục'}".
              </p>
              {filterMode === 'due' && (summary?.tracked ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
                >
                  Chuyển sang phạm vi Đang theo dõi ({summary?.tracked ?? 0} từ)
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {practiceData.items.map((group) => {
                const targetCount = Math.min(group.word_ids.length, selectedModeMeta.maxWords);
                const missingExCount = group.examples_missing?.length || 0;
                const blockedByMissingExamples =
                  selectedModeMeta.needsExamples && group.examples_available === 0;

                return (
                  <div
                    key={group.set_id}
                    data-testid={`srs-practice-group-${group.set_id}`}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                          {group.title}
                        </h3>
                        <span className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold">
                          {group.selection_truncated
                            ? `Chọn ${targetCount}/${group.word_count} từ`
                            : `${targetCount} từ trong phạm vi`}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500">
                        <span>
                          Có câu ví dụ: <strong>{group.examples_available}</strong>/{group.word_ids.length} từ
                        </span>
                        {missingExCount > 0 && (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">
                            • Thiếu ví dụ: {missingExCount} từ
                          </span>
                        )}
                      </div>

                      {selectedModeMeta.needsExamples && missingExCount > 0 && (
                        <div className="pt-1 flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-amber-700 dark:text-amber-300">
                            Bài ngữ pháp cần từ vựng có câu ví dụ.
                          </span>
                          <button
                            type="button"
                            onClick={() => navigate(`/study-set/${group.set_id}`)}
                            className="text-[11px] font-bold text-indigo-600 underline"
                          >
                            Mở bộ từ để bổ sung ví dụ
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={blockedByMissingExamples}
                        onClick={() => launchModeForGroup(group, studyType)}
                        className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-black transition shadow-2xs cursor-pointer"
                      >
                        Bắt đầu {selectedModeMeta.label} ({targetCount} từ)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        /* 4B. Center Flashcard Card when studyType === 'flashcard' */
        <>
          {queueLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span>Đang tải thẻ ôn tập...</span>
            </div>
          ) : currentWord ? (
            <div className="space-y-4">
              <div
                data-testid="srs-flashcard"
                onClick={() => setFlipped(!flipped)}
                className="w-full min-h-[240px] md:min-h-[280px] p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-indigo-400/80 transition flex flex-col justify-between cursor-pointer select-none group"
              >
                {/* Top Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        currentWord.status === 'mastered'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : currentWord.status === 'learning'
                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300'
                      }`}
                    >
                      {currentWord.status === 'mastered'
                        ? 'THUẦN THỤC'
                        : currentWord.status === 'learning'
                          ? 'ĐANG HỌC'
                          : 'MỚI'}
                    </span>
                    {currentWord.set_title && (
                      <span className="text-[11px] font-semibold text-slate-400 truncate max-w-[200px]">
                        • {currentWord.set_title}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    aria-label={currentWord.starred ? 'Bỏ đánh dấu sao' : 'Đánh dấu sao'}
                    onClick={(e) => {
                      e.stopPropagation();
                      void toggleStar(currentWord);
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

                {/* Word Center Content */}
                <div className="text-center space-y-3 py-4">
                  {!flipped ? (
                    <>
                      <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                        {currentWord.term}
                      </h2>
                      <p className="text-xs md:text-sm text-slate-400 font-mono">
                        {currentWord.phonetic || ''}{' '}
                        {currentWord.part_of_speech ? `• ${currentWord.part_of_speech}` : ''}
                      </p>
                    </>
                  ) : (
                    <div className="space-y-3 animate-fadeIn">
                      <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                        {currentWord.definition}
                      </h3>
                      <div className="max-w-lg mx-auto">
                        <WordLearningDetails
                          key={currentWord.id}
                          word={currentWord}
                          onChange={(updated) =>
                            setQueue((prev) =>
                              prev.map((w) => (w.id === updated.id ? { ...w, ...updated } : w)),
                            )
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Card Controls: Speaker & Flip Tip */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playAudio(currentWord.term, 'en-US');
                    }}
                    className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5 font-bold"
                  >
                    <Volume2 className="w-4 h-4 text-indigo-600" />
                    <span>Phát âm</span>
                  </button>

                  <span className="text-[11px] font-semibold text-slate-400 group-hover:text-slate-600">
                    Thẻ {currentIndex + 1} / {displayedQueue.length} •{' '}
                    {flipped ? 'Bấm để lật lại' : 'Chạm vào thẻ để xem nghĩa'}
                  </span>
                </div>
              </div>

              {/* SM-2 Rating Buttons */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block text-center">
                  Đánh giá khả năng ghi nhớ (Thuật toán SM-2 — cần tối thiểu 2 lần nhớ tốt để thuần thục)
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    disabled={ratingLoading}
                    onClick={() => void handleRate(1)}
                    className="py-3 px-2 rounded-2xl border-2 border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50 text-xs font-black shadow-xs transition flex flex-col items-center gap-0.5 cursor-pointer"
                  >
                    <span>Lặp lại</span>
                    <span className="text-[10px] font-semibold text-rose-400">Ôn lại ngay</span>
                  </button>

                  <button
                    type="button"
                    disabled={ratingLoading}
                    onClick={() => void handleRate(2)}
                    className="py-3 px-2 rounded-2xl border-2 border-amber-200 dark:border-amber-900 bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 disabled:opacity-50 text-xs font-black shadow-xs transition flex flex-col items-center gap-0.5 cursor-pointer"
                  >
                    <span>Khó</span>
                    <span className="text-[10px] font-semibold text-amber-400">Chưa vững</span>
                  </button>

                  <button
                    type="button"
                    disabled={ratingLoading}
                    onClick={() => void handleRate(4)}
                    className="py-3 px-2 rounded-2xl border-2 border-emerald-200 dark:border-emerald-900 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 disabled:opacity-50 text-xs font-black shadow-xs transition flex flex-col items-center gap-0.5 cursor-pointer"
                  >
                    <span>Tốt</span>
                    <span className="text-[10px] font-semibold text-emerald-400">Nhớ đúng</span>
                  </button>

                  <button
                    type="button"
                    disabled={ratingLoading}
                    onClick={() => void handleRate(5)}
                    className="py-3 px-2 rounded-2xl border-2 border-sky-200 dark:border-sky-900 bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 disabled:opacity-50 text-xs font-black shadow-xs transition flex flex-col items-center gap-0.5 cursor-pointer"
                  >
                    <span>Dễ</span>
                    <span className="text-[10px] font-semibold text-sky-400">Nhớ rất vững</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              data-testid="srs-empty-state"
              className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3"
            >
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {filterMode === 'due'
                  ? 'Tuyệt vời! Bạn đã hoàn thành các từ đến hạn'
                  : 'Không tìm thấy từ vựng nào trong mục này'}
              </h3>
              <p className="text-xs text-slate-500">
                {filterMode === 'due'
                  ? 'Hãy quay lại theo lịch ôn tập hoặc chuyển sang xem các từ đang theo dõi.'
                  : 'Hãy học thêm các bộ từ vựng mới để mở rộng danh sách theo dõi.'}
              </p>
              <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                {filterMode === 'due' && (summary?.tracked ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterMode('all');
                      setQueueOffset(0);
                    }}
                    className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
                  >
                    Xem từ đang theo dõi ({summary?.tracked ?? 0})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200"
                >
                  Về Trang chủ chọn bộ từ
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 5. Bottom Scrollable Words List with Real Totals & Pagination */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between gap-3 flex-wrap pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Danh sách từ trong phạm vi ({queueTotal} từ)
            </h3>
            <p className="text-[11px] text-slate-400">
              Bấm vào từ bất kỳ để xem thẻ ghi nhớ trực tiếp
            </p>
          </div>

          <div className="relative w-44 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm từ vựng..."
              value={searchWordQuery}
              onChange={(e) => {
                setSearchWordQuery(e.target.value);
                setQueueOffset(0);
              }}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-800 focus:outline-none"
            />
          </div>
        </div>

        {displayedQueue.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4 text-center">
            Chưa có từ vựng nào trong phạm vi này.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[480px] overflow-y-auto pr-1 space-y-0.5">
            {displayedQueue.map((w, idx) => {
              const isSelected = w.id === currentWord?.id;
              return (
                <div
                  key={w.id}
                  onClick={() => {
                    setStudyType('flashcard');
                    setCurrentIndex(idx);
                  }}
                  className={`py-3 px-3 rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition ${
                    isSelected
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40 ring-1 ring-indigo-500/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {w.term}
                      </span>
                      {w.part_of_speech && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {w.part_of_speech}
                        </span>
                      )}
                      {w.set_title && (
                        <span className="text-[10px] text-slate-400 truncate">
                          • {w.set_title}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
                      {w.definition}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        w.status === 'mastered'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : w.status === 'learning'
                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {w.status === 'mastered'
                        ? 'Thuần thục'
                        : w.status === 'learning'
                          ? 'Đang học'
                          : 'Mới'}
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

        {/* Pagination Controls */}
        {queueTotal > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500">
              Trang <strong>{currentPage}</strong> / {totalPages} (Tổng {queueTotal} từ)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={queueOffset === 0 || queueLoading}
                onClick={() => setQueueOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 disabled:opacity-40 font-bold inline-flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Trước</span>
              </button>
              <button
                type="button"
                disabled={queueOffset + PAGE_SIZE >= queueTotal || queueLoading}
                onClick={() => setQueueOffset((prev) => prev + PAGE_SIZE)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 disabled:opacity-40 font-bold inline-flex items-center gap-1"
              >
                <span>Sau</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
