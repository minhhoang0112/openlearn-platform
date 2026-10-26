import React, { useEffect, useState } from 'react';
import {
  Headphones,
  Mic,
  MessageSquare,
  Sparkles,
  AlignLeft,
  BookOpen,
  Layers,
  Award,
  ChevronRight,
  Loader2,
  AlertCircle,
  FolderOpen,
  BookmarkCheck,
  Repeat,
  FileAudio,
  PenTool,
  CheckCircle2,
  ArrowLeft,
  ArrowLeftRight,
  Search,
  X
} from 'lucide-react';
import { api, SetCard, LearningPhraseLibrary, SrsPracticeResponse, SetReadiness } from '../api/client';
import { useRouter } from '../context/RouterContext';
import { buildPracticeRoute, BuildPracticeRouteOptions } from '../utils/practiceLaunch';
import { normalizeSetProgress } from '../utils/setProgress';
import { withNavigationContext } from '../utils/navigationContext';

interface DirectPracticeMode {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  badge: string;
  route: string;
}

interface SetPracticeMode {
  id: string;
  title: string;
  group: 'Ôn nhớ từ' | 'Vận dụng & Kỹ năng';
  category: 'Ôn nhớ từ' | 'Nghe – Phát âm' | 'Nói – Viết' | 'Ngữ pháp – Đọc hiểu' | 'Phản xạ – Kiểm tra';
  description: string;
  icon: React.ElementType;
  color: string;
  requiresAi: boolean;
  requiresExamples?: boolean;
  srsEffect: 'updates_srs' | 'none';
  buildRoute: (setId: number, options?: BuildPracticeRouteOptions) => string;
}

const DIRECT_LISTENING_MODES: DirectPracticeMode[] = [
  {
    id: 'sentence_listening',
    title: 'Nghe từng câu & Shadowing',
    description: 'Nghe 50 câu riêng biệt với audio WAV thật, điều chỉnh tốc độ, tự thu âm và luyện nói đuổi trực tiếp.',
    icon: Headphones,
    color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
    badge: 'Mở trực tiếp • Không gọi AI',
    route: '/listening',
  },
  {
    id: 'personal_materials',
    title: 'Học liệu nghe cá nhân',
    description: 'Tải lên bài nghe riêng và phụ đề SRT/VTT từ máy tính, lưu vị trí nghe, tốc độ và lặp đoạn A–B.',
    icon: FileAudio,
    color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800',
    badge: 'Mở trực tiếp • Không gọi AI',
    route: '/materials',
  },
];

const SET_PRACTICE_MODES: SetPracticeMode[] = [
  {
    id: 'study_learn',
    title: 'Học từ kết hợp',
    group: 'Ôn nhớ từ',
    category: 'Ôn nhớ từ',
    description: 'Kết hợp trắc nghiệm, tự luận và nghe gõ từ theo nhịp độ ghi nhớ của từng thẻ.',
    icon: BookOpen,
    color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    requiresAi: false,
    srsEffect: 'updates_srs',
    buildRoute: (setId, opts) => buildPracticeRoute(`/study/${setId}`, { ...opts, studyMode: 'learn' }),
  },
  {
    id: 'study_bidirectional',
    title: 'Học hai chiều (Anh ↔ Việt)',
    group: 'Ôn nhớ từ',
    category: 'Ôn nhớ từ',
    description: 'Rèn phản xạ nhớ nghĩa xuôi và nhớ từ ngược (Anh → Việt và Việt → Anh) trên cùng bộ từ.',
    icon: ArrowLeftRight,
    color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800',
    requiresAi: false,
    srsEffect: 'updates_srs',
    buildRoute: (setId, opts) => buildPracticeRoute(`/study/${setId}`, { ...opts, studyMode: 'learn', direction: 'both' }),
  },
  {
    id: 'study_write',
    title: 'Luyện viết từ',
    group: 'Ôn nhớ từ',
    category: 'Nói – Viết',
    description: 'Nhìn nghĩa tiếng Việt và gõ chính xác thuật ngữ tiếng Anh để củng cố trí nhớ chủ động.',
    icon: PenTool,
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    requiresAi: false,
    srsEffect: 'updates_srs',
    buildRoute: (setId, opts) => buildPracticeRoute(`/study/${setId}`, { ...opts, studyMode: 'write' }),
  },
  {
    id: 'study_quiz',
    title: 'Trắc nghiệm từ vựng',
    group: 'Ôn nhớ từ',
    category: 'Phản xạ – Kiểm tra',
    description: 'Chọn nhanh đáp án đúng trong 4 lựa chọn cho từng từ mục tiêu.',
    icon: CheckCircle2,
    color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
    requiresAi: false,
    srsEffect: 'updates_srs',
    buildRoute: (setId, opts) => buildPracticeRoute(`/study/${setId}`, { ...opts, studyMode: 'quiz' }),
  },
  {
    id: 'dictation',
    title: 'Nghe chép chính tả',
    group: 'Ôn nhớ từ',
    category: 'Nghe – Phát âm',
    description: 'Nghe phát âm từ/câu và gõ lại chính xác để rèn độ nhạy ngữ âm.',
    icon: Headphones,
    color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800',
    requiresAi: false,
    srsEffect: 'updates_srs',
    buildRoute: (setId, opts) => buildPracticeRoute(`/dictation/${setId}`, opts),
  },
  {
    id: 'match',
    title: 'Ghép thẻ phản xạ',
    group: 'Ôn nhớ từ',
    category: 'Phản xạ – Kiểm tra',
    description: 'Nối nhanh từ vựng với nghĩa tiếng Việt tương ứng để tăng tốc độ nhận diện từ.',
    icon: Layers,
    color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
    requiresAi: false,
    srsEffect: 'updates_srs',
    buildRoute: (setId, opts) => buildPracticeRoute(`/game/match/${setId}`, opts),
  },
  {
    id: 'exam',
    title: 'Kiểm tra bộ từ',
    group: 'Ôn nhớ từ',
    category: 'Phản xạ – Kiểm tra',
    description: 'Làm bài kiểm tra bộ từ tổng hợp (trắc nghiệm kết hợp tự luận) để rà soát mức độ thuộc từ.',
    icon: Award,
    color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800',
    requiresAi: false,
    srsEffect: 'updates_srs',
    buildRoute: (setId, opts) => buildPracticeRoute(`/exam/${setId}`, opts),
  },
  {
    id: 'grammar',
    title: 'Ngữ pháp & Trật tự câu',
    group: 'Vận dụng & Kỹ năng',
    category: 'Ngữ pháp – Đọc hiểu',
    description: 'Sắp xếp câu đúng cấu trúc ngữ pháp dựa trên câu ví dụ có sẵn của bộ từ.',
    icon: AlignLeft,
    color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
    requiresAi: false,
    requiresExamples: true,
    srsEffect: 'none',
    buildRoute: (setId, opts) => buildPracticeRoute(`/grammar/${setId}`, opts),
  },
  {
    id: 'speaking',
    title: 'Luyện nói & Nhận xét AI',
    group: 'Vận dụng & Kỹ năng',
    category: 'Nghe – Phát âm',
    description: 'Nghe mẫu TTS, luyện trả lời câu hỏi chứa từ vựng và nhận nhận xét từ AI.',
    icon: Mic,
    color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800',
    requiresAi: true,
    srsEffect: 'none',
    buildRoute: (setId, opts) => buildPracticeRoute(`/ai-study/${setId}`, opts),
  },
  {
    id: 'conversation',
    title: 'Hội thoại tương tác AI',
    group: 'Vận dụng & Kỹ năng',
    category: 'Nói – Viết',
    description: 'Đóng vai và trò chuyện theo tình huống cụ thể bằng các từ vựng mục tiêu của bài.',
    icon: MessageSquare,
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    requiresAi: true,
    srsEffect: 'none',
    buildRoute: (setId, opts) => buildPracticeRoute(`/conversation/${setId}`, opts),
  },
  {
    id: 'reading',
    title: 'Đọc hiểu & Điền từ AI',
    group: 'Vận dụng & Kỹ năng',
    category: 'Ngữ pháp – Đọc hiểu',
    description: 'Đọc đoạn văn ngữ cảnh do AI biên soạn theo yêu cầu, điền từ vào chỗ trống và trả lời câu hỏi.',
    icon: Sparkles,
    color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    requiresAi: true,
    srsEffect: 'none',
    buildRoute: (setId, opts) => buildPracticeRoute(`/reading/${setId}`, opts),
  },
];

export const PracticeView: React.FC = () => {
  const { path, navigate } = useRouter();

  const [sets, setSets] = useState<SetCard[]>([]);
  const [setsTotal, setSetsTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phraseLibrary, setPhraseLibrary] = useState<LearningPhraseLibrary | null>(null);

  // The route owns the selection so refresh and browser Back restore it.
  const query = new URLSearchParams(path.split('?')[1] || '');
  const modeId = path.split('?')[0].split('/')[2] || query.get('mode');
  const activeMode = SET_PRACTICE_MODES.find((mode) => mode.id === modeId) || null;
  const isSelectorPage = Boolean(modeId);
  const selectedCategory = query.get('cat') || 'Tất cả';
  type SourceMode = 'library' | 'due' | 'all' | 'mastered';
  const rawScope = query.get('scope');
  const sourceMode: SourceMode = rawScope === 'due' || rawScope === 'all' || rawScope === 'mastered' ? rawScope : 'library';
  const searchQuery = query.get('q') || '';
  const currentPage = Math.max(1, parseInt(query.get('page') || '1', 10));

  const [searchInput, setSearchInput] = useState<string>(searchQuery);
  const [readinessModal, setReadinessModal] = useState<{
    set: SetCard;
    readiness: SetReadiness;
    blockedMode: {
      id: string;
      blocked_reason: string | null;
      missing_fields: string[];
      max_words: number;
      requires_subset: boolean;
    };
  } | null>(null);
  const [checkingReadinessId, setCheckingReadinessId] = useState<number | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      const currentQ = searchQuery;
      const newQ = searchInput.trim();
      if (newQ !== currentQ) {
        updateSelectorQuery({ q: newQ || null, page: '1' });
      }
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const handleCardClick = async (s: SetCard) => {
    if (!activeMode) return;
    const returnFrom = selectorRoute(activeMode.id, sourceMode, searchQuery, currentPage);
    const targetUrl = activeMode.buildRoute(s.id, {
      source: 'practice',
      from: returnFrom,
      setTitle: s.title,
      practiceMode: activeMode.id,
      practiceCat: selectedCategory,
    });

    setCheckingReadinessId(s.id);
    try {
      const readiness = await api.getSetReadiness(s.id);
      const modeMap: Record<string, string> = {
        study_learn: 'learn',
        study_bidirectional: 'learn',
        study_write: 'write',
        study_quiz: 'quiz',
        dictation: 'dictation',
        match: 'match',
        exam: 'exam',
        grammar: 'grammar_order',
        speaking: 'speaking',
        conversation: 'conversation',
        reading: 'reading',
      };
      const targetModeId = modeMap[activeMode.id] || activeMode.id;
      const modeCheck = readiness.modes.find((m) => m.id === targetModeId);
      if (modeCheck && !modeCheck.ready) {
        setReadinessModal({
          set: s,
          readiness,
          blockedMode: modeCheck,
        });
        return;
      }
    } catch {
      // In case of error, continue normal flow
    } finally {
      setCheckingReadinessId(null);
    }
    navigate(targetUrl);
  };

  const modePickerRoute = '/practice?' + new URLSearchParams({ cat: selectedCategory });
  const selectorRoute = (
    id: string,
    scope: SourceMode = sourceMode,
    q: string = searchQuery,
    pageNum: number = currentPage
  ) => {
    const p = new URLSearchParams({ cat: selectedCategory, scope });
    if (q) p.set('q', q);
    if (pageNum > 1) p.set('page', String(pageNum));
    return '/practice/' + id + '?' + p.toString();
  };

  const updateSelectorQuery = (updates: Record<string, string | null>) => {
    if (!activeMode) return;
    const p = new URLSearchParams(path.split('?')[1] || '');
    p.set('cat', selectedCategory);
    p.set('scope', sourceMode);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === '') p.delete(k);
      else p.set(k, v);
    });
    navigate('/practice/' + activeMode.id + '?' + p.toString());
  };

  const setSourceMode = (scope: SourceMode) => {
    if (activeMode) navigate(selectorRoute(activeMode.id, scope, searchQuery, 1));
  };
  const [srsPractice, setSrsPractice] = useState<SrsPracticeResponse | null>(null);
  const [srsLoading, setSrsLoading] = useState(false);

  const fetchPhraseLibrary = () => {
    api.getLearningPhraseLibrary()
      .then((res) => {
        if (res && res.set_id) {
          setPhraseLibrary(res);
        } else {
          setPhraseLibrary(null);
        }
      })
      .catch(() => {
        // Silent fail if unauthorized or error
      });
  };

  useEffect(() => {
    fetchPhraseLibrary();
    const handleSrsUpdated = () => {
      fetchPhraseLibrary();
    };
    window.addEventListener('openquiz:srs-updated', handleSrsUpdated);
    return () => {
      window.removeEventListener('openquiz:srs-updated', handleSrsUpdated);
    };
  }, []);

  // Fetch sets when in library mode: reacts to search query and pagination with debounce/cancellation
  useEffect(() => {
    if (sourceMode !== 'library') return;
    let active = true;
    setLoading(true);
    setError(null);

    const pageSize = 12;
    const targetCount = Math.max(pageSize, currentPage * pageSize);

    async function loadSets() {
      try {
        if (targetCount <= 100) {
          const res = await api.getSets({
            q: searchQuery.trim() || undefined,
            limit: targetCount,
            offset: 0,
          });
          if (!active) return;
          setSets(res.items || []);
          setSetsTotal(res.total ?? (res.items || []).length);
        } else {
          const batches = [];
          for (let offset = 0; offset < targetCount; offset += 100) {
            const limit = Math.min(100, targetCount - offset);
            batches.push(api.getSets({ q: searchQuery.trim() || undefined, limit, offset }));
          }
          const results = await Promise.all(batches);
          if (!active) return;
          const combinedItems = results.flatMap((r) => r.items || []);
          setSets(combinedItems);
          setSetsTotal(results[0]?.total ?? combinedItems.length);
        }
      } catch (err) {
        if (!active) return;
        setError((err as Error).message || 'Không thể tải danh sách bộ từ');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSets();

    return () => {
      active = false;
    };
  }, [sourceMode, searchQuery, currentPage]);

  useEffect(() => {
    if (sourceMode === 'library') return;
    let mounted = true;
    setSrsLoading(true);
    api.getSrsPractice({ scope: sourceMode, limit: 50, offset: 0 })
      .then((res) => {
        if (mounted) {
          setSrsPractice(res);
          setSrsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setSrsPractice(null);
          setSrsLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [sourceMode]);

  const categories = ['Tất cả', 'Ôn nhớ từ', 'Nghe – Phát âm', 'Nói – Viết', 'Ngữ pháp – Đọc hiểu', 'Phản xạ – Kiểm tra'];

  const filteredModes = selectedCategory === 'Tất cả'
    ? SET_PRACTICE_MODES
    : SET_PRACTICE_MODES.filter((m) => m.category === selectedCategory);

  const handleSelectMode = (mode: SetPracticeMode) => {
    navigate(selectorRoute(mode.id, 'library'));
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 pb-20">
      <button type="button" onClick={() => navigate(isSelectorPage ? modePickerRoute : '/')}
        className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 dark:text-slate-300">
        <ArrowLeft className="w-4 h-4" />
        {isSelectorPage ? 'Trở về chọn chế độ' : 'Trở về Trang chủ'}
      </button>
      {!isSelectorPage && <>
      {/* Top Banner */}
      <div className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
          <span>Trung tâm kỹ năng</span>
          <span>•</span>
          <span>Luyện tập chủ động</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Luyện tập theo kỹ năng & chế độ học
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
          Chọn mở trực tiếp học liệu nghe độc lập hoặc chọn một chế độ bài luyện bên dưới rồi chọn bộ từ (từ thư viện hoặc danh sách Ôn đến hạn).
        </p>
      </div>

      {/* SECTION 1: Direct Listening Materials (No set selection required) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              1. Học liệu nghe độc lập (Mở trực tiếp — không cần chọn bộ từ)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Luyện nghe từng câu có sẵn hoặc tải lên tệp âm thanh & phụ đề cá nhân của bạn.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DIRECT_LISTENING_MODES.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => navigate(withNavigationContext(item.route, { source: 'practice', from: modePickerRoute }))}
                className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500 dark:hover:border-indigo-500 cursor-pointer transition-all shadow-xs hover:shadow-md flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      {item.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <span>Mở {item.title}</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* V2 Phrase Library Card (When user has saved phrases) */}
      {phraseLibrary && phraseLibrary.set_id && (
        <div className="p-5 md:p-6 rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg border border-emerald-700/30">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider">
                Bộ cụm từ đã lưu
              </span>
              <span className="text-xs text-emerald-200">
                {phraseLibrary.word_count} cụm từ • {phraseLibrary.source_links} liên kết bài học
              </span>
              {phraseLibrary.due_count > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black shadow-xs">
                  {phraseLibrary.due_count} thẻ đến hạn ôn
                </span>
              )}
            </div>
            <h3 className="text-lg md:text-xl font-black flex items-center gap-2">
              <BookmarkCheck className="w-5 h-5 text-emerald-400" />
              <span>{phraseLibrary.title || 'Cụm từ từ bài học của tôi'}</span>
            </h3>
            <p className="text-xs text-emerald-200/90 max-w-xl">
              Cụm từ ngữ cảnh được bạn lưu từ bài nghe, tích hợp vào bộ thẻ cá nhân và hệ thống lặp lại ngắt quãng (SRS).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {phraseLibrary.route && (
              <button
                type="button"
                onClick={() => navigate(withNavigationContext(phraseLibrary.route!, { source: 'practice', from: '/practice' }))}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs rounded-2xl transition shadow-xs flex items-center gap-1.5"
              >
                <FolderOpen className="w-4 h-4 text-emerald-300" />
                <span>Xem bộ từ</span>
              </button>
            )}
            {phraseLibrary.review_route && (
              <button
                type="button"
                onClick={() => navigate(phraseLibrary.review_route!)}
                className="px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs rounded-2xl transition shadow-md flex items-center gap-1.5"
              >
                <Repeat className="w-4 h-4" />
                <span>Ôn tập ngay</span>
                {phraseLibrary.due_count > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-950 text-white text-[10px]">
                    {phraseLibrary.due_count}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: Set-based Practice Modes */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              2. Bài luyện theo bộ từ (Bước 1: Chọn chế độ học → Bước 2: Chọn bộ từ hoặc phạm vi ôn)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nhóm <strong>Ôn nhớ từ</strong> cập nhật lịch ôn SRS. Nhóm <strong>Vận dụng & Kỹ năng</strong> giúp thực hành ngữ cảnh mà không tự thay đổi lịch SRS.
            </p>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => navigate('/practice?' + new URLSearchParams({ cat }))}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Practice Modalities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModes.map((mode) => {
            const Icon = mode.icon;
            const isCurrent = activeMode?.id === mode.id;

            return (
              <div
                key={mode.id}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSelectMode(mode);
                  }
                }}
                onClick={() => handleSelectMode(mode)}
                className={`p-5 rounded-3xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'border-indigo-600 bg-white dark:bg-slate-900 shadow-md ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${mode.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        mode.requiresAi
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      }`}>
                        {mode.requiresAi ? 'Dùng AI' : 'Không gọi AI'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        {mode.srsEffect === 'updates_srs' ? 'Cập nhật SRS' : 'Luyện vận dụng'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                      {mode.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {mode.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <span className={`text-xs font-bold ${isCurrent ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {isCurrent ? 'Mở danh sách bộ từ' : `Chọn ${mode.title}`}
                  </span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${isCurrent ? 'translate-x-1 text-indigo-600' : 'text-slate-300'}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      </>}

      {isSelectorPage && <>
        <header className="space-y-2">
          <p className="text-sm text-slate-500">Luyện tập / Chọn bộ từ</p>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">{activeMode?.title || 'Không tìm thấy chế độ luyện tập'}</h1>
          <p className="text-sm text-slate-500">{activeMode?.description || 'Hãy trở về để chọn một chế độ đang có.'}</p>
        </header>
      {/* Step 2: Choose Set or SRS Scope */}
      <div
        id="practice-set-selector"
        className="bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 md:p-7 space-y-5"
      >
        {!activeMode ? (
          <div className="py-6 text-center space-y-2">
            <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
              Chế độ này không tồn tại
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Dùng nút Trở về chọn chế độ phía trên để mở danh sách chế độ luyện tập.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center ${activeMode.color}`}>
                  <activeMode.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bước 2 • Chọn nguồn từ vựng</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      activeMode.requiresAi
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}>
                      {activeMode.requiresAi ? 'Dùng AI khi tạo bài' : 'Không gọi AI'}
                    </span>
                    {activeMode.requiresExamples && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 text-[10px] font-bold">
                        Cần câu ví dụ có sẵn
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    Chọn bộ từ để bắt đầu: <span className="text-indigo-600 dark:text-indigo-400">{activeMode.title}</span>
                  </h2>
                </div>
              </div>

              {/* Source Switcher: Library vs SRS Due / Tracked / Mastered */}
              <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSourceMode('library')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    sourceMode === 'library'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Thư viện bộ từ ({setsTotal})
                </button>
                <button
                  type="button"
                  onClick={() => setSourceMode('due')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    sourceMode === 'due'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Từ đến hạn ôn (SRS)
                </button>
                <button
                  type="button"
                  onClick={() => setSourceMode('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    sourceMode === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Từ đang theo dõi
                </button>
                <button
                  type="button"
                  onClick={() => setSourceMode('mastered')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    sourceMode === 'mastered'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Từ đã thành thạo
                </button>
              </div>
            </div>

            {sourceMode === 'library' ? (
              <div className="space-y-4">
                {/* Search Bar for Sets */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Tìm kiếm bộ từ theo tên, thẻ phân loại..."
                      className="w-full pl-10 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 shadow-2xs"
                    />
                    {searchInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchInput('');
                          updateSelectorQuery({ q: null, page: '1' });
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label="Xóa tìm kiếm bộ từ"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 shrink-0 font-medium">
                    {setsTotal} bộ từ
                  </span>
                </div>

                {loading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                    <p className="text-xs font-bold">Đang tải danh sách bộ từ...</p>
                  </div>
                ) : error ? (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 rounded-2xl text-center text-rose-600 text-sm">
                    {error}
                  </div>
                ) : sets.length === 0 ? (
                  searchQuery.trim() ? (
                    <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Không tìm thấy bộ từ nào khớp với &ldquo;{searchQuery}&rdquo;
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchInput('');
                          updateSelectorQuery({ q: null, page: '1' });
                        }}
                        className="text-xs text-indigo-600 hover:underline font-bold"
                      >
                        Xóa từ khóa tìm kiếm
                      </button>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                      <FolderOpen className="w-10 h-10 text-slate-400 mx-auto" />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        Bạn chưa có bộ từ nào để bắt đầu bài luyện tập
                      </p>
                      <p className="text-xs text-slate-500">
                        Hãy tạo bộ thẻ mới hoặc khám phá danh mục ở Trang chủ.
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate('/create-flashcard')}
                        className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl"
                      >
                        Tạo bộ thẻ mới
                      </button>
                    </div>
                  )
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {sets.map((s) => {
                        const prog = normalizeSetProgress(s);
                        const isChecking = checkingReadinessId === s.id;

                        return (
                          <div
                            key={s.id}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                void handleCardClick(s);
                              }
                            }}
                            onClick={() => void handleCardClick(s)}
                            className="group p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl cursor-pointer transition-all shadow-xs hover:shadow-md flex flex-col justify-between focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
                          >
                            <div>
                              <div className="flex items-center justify-between text-xs text-slate-400 gap-2 flex-wrap">
                                <span className="font-semibold">{s.tag || 'Từ vựng'}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-[11px] text-slate-600 dark:text-slate-300">
                                    {prog.totalWords} từ
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                    prog.state === 'mastered'
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                      : prog.state === 'in_progress'
                                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                  }`}>
                                    {prog.stateLabel}
                                  </span>
                                </div>
                              </div>
                              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                                {s.title}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                                {prog.summaryText}
                              </p>
                            </div>

                            <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                              <span>{isChecking ? 'Đang kiểm tra...' : `Bắt đầu ${activeMode.title}`}</span>
                              {isChecking ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Load More Button for Sets */}
                    {sets.length < setsTotal && (
                      <div className="pt-2 text-center">
                        <button
                          type="button"
                          onClick={() => updateSelectorQuery({ page: String(currentPage + 1) })}
                          className="px-5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-2xs transition"
                        >
                          Tải thêm {Math.min(12, setsTotal - sets.length)} bộ từ tiếp theo (đã tải {sets.length}/{setsTotal})
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : srsLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
                <p className="text-xs font-bold">Đang tải phạm vi từ vựng SRS...</p>
              </div>
            ) : !srsPractice || srsPractice.items.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {sourceMode === 'due'
                    ? 'Hiện không có từ nào đến hạn ôn trong phạm vi này'
                    : sourceMode === 'mastered'
                    ? 'Bạn chưa có từ nào ở trạng thái Đã thành thạo'
                    : 'Bạn chưa có từ nào đang theo dõi trong tiến độ SRS'}
                </p>
                <p className="text-xs text-slate-500">
                  Bạn có thể chuyển sang tab &ldquo;Thư viện bộ từ&rdquo; để luyện toàn bộ bộ từ bất kỳ.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {srsPractice.items.map((group) => {
                  const missingExamplesCount = group.examples_missing?.length || 0;
                  const isUnavailable = group.available === false;
                  return (
                    <div
                      key={group.set_id}
                      onClick={() => {
                        if (isUnavailable) return;
                        const returnFrom = selectorRoute(activeMode.id);
                        navigate(
                          activeMode.buildRoute(group.set_id, {
                            wordIds: group.word_ids,
                            reviewScope: sourceMode,
                            source: 'practice',
                            from: returnFrom,
                            setTitle: group.title,
                            practiceMode: activeMode.id,
                            practiceCat: selectedCategory,
                          })
                        );
                      }}
                      className={`group p-4 bg-white dark:bg-slate-900 border rounded-2xl transition-all flex flex-col justify-between ${
                        isUnavailable
                          ? 'border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed'
                          : 'border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 cursor-pointer shadow-xs hover:shadow-md'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 font-bold text-[11px] text-indigo-700 dark:text-indigo-300">
                            {group.selection_truncated
                              ? `${group.word_ids.length}/${group.word_count} từ trong phạm vi`
                              : `${group.word_count} từ trong phạm vi`}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            activeMode.requiresAi
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}>
                            {activeMode.requiresAi ? 'Dùng AI' : 'Không AI'}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                          {group.title}
                        </h4>
                        <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
                          <span>Có ví dụ: {group.examples_available}/{group.word_ids.length}</span>
                          {missingExamplesCount > 0 && (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">
                              • Thiếu {missingExamplesCount} ví dụ
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        <span>
                          {isUnavailable ? 'Bộ từ tạm khóa' : `Bắt đầu ${activeMode.title}`}
                        </span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      {readinessModal && activeMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Chưa sẵn sàng: {activeMode.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                    Bộ từ: {readinessModal.set.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReadinessModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              {readinessModal.blockedMode.blocked_reason === 'MISSING_CONTENT' && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 space-y-2">
                  <p className="font-bold text-amber-900 dark:text-amber-200">
                    Chế độ này cần câu ví dụ {readinessModal.blockedMode.missing_fields.includes('example_translation') ? 'và bản dịch' : ''} có sẵn.
                  </p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    Bộ từ có {readinessModal.readiness.total_words} từ, nhưng hiện còn {readinessModal.readiness.missing_example_ids.length} từ chưa có câu ví dụ
                    {readinessModal.readiness.missing_translation_ids.length > 0 && ` và ${readinessModal.readiness.missing_translation_ids.length} từ chưa có bản dịch`}.
                  </p>
                </div>
              )}

              {readinessModal.blockedMode.blocked_reason === 'SELECTION_LIMIT' && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 space-y-2">
                  <p className="font-bold text-amber-900 dark:text-amber-200">
                    Số lượng từ vượt quá giới hạn ({readinessModal.readiness.total_words}/{readinessModal.blockedMode.max_words} từ).
                  </p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    Chế độ này hoạt động hiệu quả nhất với tối đa {readinessModal.blockedMode.max_words} từ. Bạn có thể chia nhỏ bộ từ hoặc chọn chế độ Học kết hợp (tự động chia 5 từ/bài).
                  </p>
                </div>
              )}

              {readinessModal.blockedMode.blocked_reason === 'AI_NOT_CONFIGURED' && (
                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 space-y-2">
                  <p className="font-bold text-indigo-900 dark:text-indigo-200">
                    Chế độ này yêu cầu AI nhưng hệ thống chưa được kích hoạt AI.
                  </p>
                  <p className="text-[11px] text-indigo-800 dark:text-indigo-300">
                    Bạn có thể mở Cài đặt AI để kết nối khóa API hoặc chuyển sang các chế độ học không cần AI (Flashcard, Học từ kết hợp, Viết từ, Trắc nghiệm).
                  </p>
                </div>
              )}

              {readinessModal.blockedMode.blocked_reason === 'EMPTY_SET' && (
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 space-y-2">
                  <p className="font-bold text-slate-900 dark:text-white">
                    Bộ từ chưa có từ vựng nào.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Hãy thêm ít nhất một thẻ từ vào bộ này trước khi bắt đầu bài luyện tập.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const sid = readinessModal.set.id;
                  setReadinessModal(null);
                  navigate('/study/' + sid + '?studyMode=learn');
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition"
              >
                Chuyển sang Học từ vựng (Không cần ví dụ)
              </button>
              <button
                type="button"
                onClick={() => {
                  const sid = readinessModal.set.id;
                  setReadinessModal(null);
                  navigate('/study-set/' + sid);
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs transition"
              >
                Mở bộ thẻ để bổ sung
              </button>
              <button
                type="button"
                onClick={() => setReadinessModal(null)}
                className="w-full sm:w-auto px-3 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      </>}
    </div>
  );
};
