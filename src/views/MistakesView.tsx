import React, { useEffect, useState, useRef } from 'react';
import {
  AlertCircle,
  BookX,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Flame,
  HelpCircle,
  History,
  Layers,
  Loader2,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Volume2,
  XCircle,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Calendar,
  Eye,
  EyeOff,
  Filter
} from 'lucide-react';
import {
  api,
  MistakeItem,
  MistakeDetail,
  MistakeSummary,
  MistakeReviewAttempt,
  MistakeReviewFeedback,
  LearningProfile,
  ApiError
} from '../api/client';
import { useRouter } from '../context/RouterContext';

export const MistakesView: React.FC = () => {
  const { path, navigate } = useRouter();

  // Extract query params from URL (e.g. /mistakes?id=...&status=...)
  const getQueryParams = () => {
    const qIndex = path.indexOf('?');
    if (qIndex === -1) return new URLSearchParams();
    return new URLSearchParams(path.slice(qIndex));
  };

  const queryParams = getQueryParams();
  const activeMistakeId = queryParams.get('id');
  const initialFilter = queryParams.get('due_only') === 'true'
    ? 'due'
    : (queryParams.get('status') || 'active');

  const [activeTab, setActiveTab] = useState<'due' | 'active' | 'resolved' | 'all'>(
    initialFilter === 'due' ? 'due' : (initialFilter as any) || 'active'
  );

  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [items, setItems] = useState<MistakeItem[]>([]);
  const [summary, setSummary] = useState<MistakeSummary | null>(null);
  const [profile, setProfile] = useState<LearningProfile | null>(null);

  // Detail & Review state
  const [selectedMistake, setSelectedMistake] = useState<MistakeDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Review interaction state
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [assistanceUsed, setAssistanceUsed] = useState<Set<string>>(new Set());
  const [showHint, setShowHint] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [reviewHistory, setReviewHistory] = useState<MistakeReviewAttempt[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Review submission
  const [submitting, setSubmitting] = useState(false);
  const [reviewResult, setReviewResult] = useState<MistakeReviewFeedback | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const pendingSubmissionId = useRef<string | null>(null);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioPlaybackRate, setAudioPlaybackRate] = useState<number>(1.0);

  // Fetch mistakes list based on active tab
  const fetchMistakes = async () => {
    setLoadingList(true);
    setListError(null);
    try {
      let params: { status?: 'active' | 'resolved' | 'all'; due_only?: boolean } = {};
      if (activeTab === 'due') {
        params = { due_only: true, status: 'all' };
      } else if (activeTab === 'active') {
        params = { status: 'active', due_only: false };
      } else if (activeTab === 'resolved') {
        params = { status: 'resolved', due_only: false };
      } else {
        params = { status: 'all', due_only: false };
      }

      const [res, prof] = await Promise.all([
        api.getMistakes(params),
        api.getLearningProfile().catch(() => null)
      ]);

      setItems(res.items);
      setSummary(res.summary);
      setProfile(prof);
    } catch (err) {
      setListError((err as Error).message || 'Không thể tải danh sách sổ lỗi');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    void fetchMistakes();
  }, [activeTab]);

  // Load single mistake detail if activeMistakeId is present
  const fetchMistakeDetail = async (id: string) => {
    setLoadingDetail(true);
    setDetailError(null);
    setReviewResult(null);
    setReviewError(null);
    setSelectedOption(null);
    setAssistanceUsed(new Set());
    setShowHint(false);
    setShowTranscript(false);
    setShowTranslation(false);
    setShowHistory(false);
    setReviewHistory([]);
    pendingSubmissionId.current = null;

    try {
      const data = await api.getMistake(id);
      setSelectedMistake(data);
    } catch (err) {
      setDetailError((err as Error).message || 'Không thể tải chi tiết câu hỏi cần ôn');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (activeMistakeId) {
      void fetchMistakeDetail(activeMistakeId);
    } else {
      setSelectedMistake(null);
    }
  }, [activeMistakeId]);

  // Load review history for active mistake
  const loadHistory = async (mistakeId: string) => {
    if (reviewHistory.length > 0) return;
    setLoadingHistory(true);
    try {
      const res = await api.getMistakeReviews(mistakeId);
      setReviewHistory(res.items);
    } catch {
      // Ignored
    } finally {
      setLoadingHistory(false);
    }
  };

  // Toggle assistance and record assistance type
  const toggleHint = () => {
    const next = !showHint;
    setShowHint(next);
    if (next) {
      setAssistanceUsed(prev => new Set(prev).add('model'));
    }
  };

  const toggleTranscript = () => {
    const next = !showTranscript;
    setShowTranscript(next);
    if (next) {
      setAssistanceUsed(prev => new Set(prev).add('transcript'));
    }
  };

  const toggleTranslation = () => {
    const next = !showTranslation;
    setShowTranslation(next);
    if (next) {
      setAssistanceUsed(prev => new Set(prev).add('translation'));
    }
  };

  const toggleHistory = (mistakeId: string) => {
    const next = !showHistory;
    setShowHistory(next);
    if (next) {
      // Viewing past answers counts as assistance per contract
      setAssistanceUsed(prev => new Set(prev).add('model'));
      void loadHistory(mistakeId);
    }
  };

  // Submit review answer
  const handleSubmitReview = async () => {
    if (!selectedMistake || !selectedOption || submitting) return;
    if (!selectedMistake.due) {
      setReviewError('Chưa đến lượt ôn tập tiếp theo.');
      return;
    }

    setSubmitting(true);
    setReviewError(null);

    // Keep existing submission_id for retry to prevent duplicate penalty
    if (!pendingSubmissionId.current) {
      pendingSubmissionId.current = crypto.randomUUID();
    }

    try {
      const res = await api.submitMistakeReview(selectedMistake.id, {
        submission_id: pendingSubmissionId.current,
        response: { option_id: selectedOption },
        assistance_used: Array.from(assistanceUsed)
      });

      setReviewResult(res.feedback);
      // Update local item and summary
      setSelectedMistake(prev => prev ? { ...prev, ...res.mistake } : null);
      setSummary(res.summary);
      // Also update in list if present
      setItems(prev => prev.map(it => it.id === res.mistake.id ? { ...it, ...res.mistake } : it));
      pendingSubmissionId.current = null;
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 409 && (apiErr.error.code === 'REVIEW_NOT_DUE' || apiErr.error.code === 'MISTAKE_RESOLVED')) {
        setReviewError(apiErr.error.message || 'Lỗi trạng thái ôn tập');
        // Refresh detail to get updated due_at and status
        void fetchMistakeDetail(selectedMistake.id);
      } else {
        setReviewError(apiErr.error?.message || (err as Error).message || 'Không thể nộp kết quả ôn tập');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Format date helper with user's timezone if available
  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return 'Chưa có';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('vi-VN', {
        timeZone: profile?.timezone || 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  const formatRelativeDue = (dueAtIso?: string | null) => {
    if (!dueAtIso) return 'Chưa lên lịch';
    try {
      const diffMs = new Date(dueAtIso).getTime() - Date.now();
      if (diffMs <= 0) return 'Đến hạn ngay';
      const diffMin = Math.round(diffMs / 60000);
      if (diffMin < 60) return `Sau ${diffMin} phút`;
      const diffHours = Math.round(diffMin / 60);
      if (diffHours < 24) return `Sau ${diffHours} giờ`;
      const diffDays = Math.round(diffHours / 24);
      return `Sau ${diffDays} ngày (${formatDateTime(dueAtIso)})`;
    } catch {
      return formatDateTime(dueAtIso);
    }
  };

  // Keyboard navigation for review
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedMistake || !selectedMistake.due || isPlaying) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Select option with keys 1..4 or a..d
      if (!reviewResult) {
        const key = e.key.toLowerCase();
        if (selectedMistake.question.options) {
          const opt = selectedMistake.question.options.find(
            (o, idx) => o.id.toLowerCase() === key || String(idx + 1) === key
          );
          if (opt) {
            setSelectedOption(opt.id);
          }
        }
        if (e.key === 'Enter' && selectedOption) {
          e.preventDefault();
          void handleSubmitReview();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMistake, selectedOption, reviewResult, isPlaying]);

  // Audio playback controls
  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = audioPlaybackRate;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const changeAudioSpeed = (rate: number) => {
    setAudioPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  // Badge label helper for step type
  const getStepTypeLabel = (type: string) => {
    switch (type) {
      case 'listen_comprehension': return 'Nghe hiểu';
      case 'grammar_practice': return 'Ngữ pháp';
      case 'vocabulary_in_context': return 'Từ vựng';
      case 'pronunciation_practice': return 'Phát âm';
      case 'reading_comprehension': return 'Đọc hiểu';
      case 'speaking_task': return 'Nói';
      case 'writing_task': return 'Viết';
      default: return type;
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 pb-24">
      {/* Top Header Card */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-indigo-600/30 border border-indigo-500/30 text-indigo-400">
                <BookX className="w-5 h-5" />
              </span>
              <div>
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">
                  Hệ thống ghi nhớ chủ động
                </span>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  Sổ lỗi cá nhân
                </h1>
              </div>
            </div>

            <button
              onClick={() => navigate('/today')}
              className="text-xs font-bold text-indigo-200 hover:text-white flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition border border-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Về màn Hôm nay</span>
            </button>
          </div>

          <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Tự động thu thập các câu trắc nghiệm bạn trả lời sai trong bài học. Ôn tập theo chu kỳ ngắt quãng (Spaced Repetition) và đạt <strong className="text-white">2 lần trả lời đúng liên tiếp không cần trợ giúp</strong> (cách nhau tối thiểu 24 giờ) để giải quyết hoàn toàn mục lỗi.
          </p>

          {/* Summary counters */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div
                onClick={() => { setActiveTab('due'); navigate('/mistakes?due_only=true'); }}
                className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                  activeTab === 'due'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                }`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                  Cần ôn ngay
                </div>
                <div className="text-2xl font-black text-white flex items-center gap-2">
                  <span>{summary.due_count}</span>
                  {summary.due_count > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </div>
              </div>

              <div
                onClick={() => { setActiveTab('active'); navigate('/mistakes?status=active'); }}
                className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                  activeTab === 'active'
                    ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                }`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">
                  Đang rèn luyện
                </div>
                <div className="text-2xl font-black text-white">{summary.active_count}</div>
              </div>

              <div
                onClick={() => { setActiveTab('resolved'); navigate('/mistakes?status=resolved'); }}
                className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                  activeTab === 'resolved'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                }`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                  Đã giải quyết
                </div>
                <div className="text-2xl font-black text-white">{summary.resolved_count}</div>
              </div>

              <div
                onClick={() => { setActiveTab('all'); navigate('/mistakes?status=all'); }}
                className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                  activeTab === 'all'
                    ? 'bg-slate-500/20 border-slate-400 text-slate-200'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                }`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Tổng số câu
                </div>
                <div className="text-2xl font-black text-white">{summary.total}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {selectedMistake ? (
        /* DETAIL & REVIEW INTERACTIVE PANEL */
        <div className="space-y-6 animate-fade-in">
          {/* Breadcrumb / Return button */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setSelectedMistake(null);
                navigate('/mistakes' + (activeTab === 'due' ? '?due_only=true' : activeTab !== 'active' ? `?status=${activeTab}` : ''));
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại danh sách câu hỏi</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                {getStepTypeLabel(selectedMistake.type)}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {selectedMistake.lesson_title}
              </span>
            </div>
          </div>

          {/* Interactive Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
            {/* Status & Spaced Timing Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center gap-3">
                <div className="space-y-0.5">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Trạng thái ôn tập
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedMistake.status === 'resolved' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        Đã giải quyết đạt yêu cầu
                      </span>
                    ) : selectedMistake.due ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Đến hạn ôn tập ngay
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        Chưa đến hạn • Ôn lại {formatRelativeDue(selectedMistake.due_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right space-y-0.5">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Chuỗi đúng tự nhớ
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <span className="text-indigo-600 dark:text-indigo-400 font-black text-sm">
                      {selectedMistake.correct_streak}
                    </span>
                    <span>/ {selectedMistake.required_correct}</span>
                    <div className="flex items-center gap-1 ml-1">
                      {Array.from({ length: selectedMistake.required_correct }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-2.5 h-2.5 rounded-full ${
                            i < selectedMistake.correct_streak
                              ? 'bg-indigo-600 dark:bg-indigo-400'
                              : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-right space-y-0.5 pl-4 border-l border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Lượt sai / Đã ôn
                  </div>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {selectedMistake.wrong_count} sai / {selectedMistake.review_count} ôn
                  </div>
                </div>
              </div>
            </div>

            {/* Audio player if media exists */}
            {selectedMistake.media?.url && (
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-indigo-600" />
                    <span>File âm thanh của bài học:</span>
                  </span>

                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    <button
                      onClick={() => changeAudioSpeed(1.0)}
                      className={`px-2 py-0.5 rounded-md transition ${
                        audioPlaybackRate === 1.0
                          ? 'bg-indigo-600 text-white'
                          : 'text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
                      }`}
                    >
                      1.0x
                    </button>
                    <button
                      onClick={() => changeAudioSpeed(0.8)}
                      className={`px-2 py-0.5 rounded-md transition ${
                        audioPlaybackRate === 0.8
                          ? 'bg-indigo-600 text-white'
                          : 'text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
                      }`}
                    >
                      0.8x
                    </button>
                  </div>
                </div>

                <audio
                  ref={audioRef}
                  src={selectedMistake.media.url}
                  controls
                  className="w-full h-10 accent-indigo-600"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              </div>
            )}

            {/* Question Prompt */}
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Câu hỏi:
                </span>
                <p className="text-lg md:text-xl font-black text-slate-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                  {selectedMistake.question.prompt}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {selectedMistake.question.options.map((opt) => {
                  const isSelected = selectedOption === opt.id;
                  const isExpected = reviewResult && reviewResult.expected_option_id === opt.id;
                  const isWrongChosen = reviewResult && isSelected && !reviewResult.correct;

                  let borderClass = 'border-slate-200 dark:border-slate-800 hover:border-indigo-400';
                  let bgClass = 'bg-slate-50/50 dark:bg-slate-800/40';

                  if (reviewResult) {
                    if (isExpected) {
                      borderClass = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-100';
                    } else if (isWrongChosen) {
                      borderClass = 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-100';
                    }
                  } else if (isSelected) {
                    borderClass = 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40';
                  }

                  const isDisabled = !selectedMistake.due || selectedMistake.status === 'resolved' || Boolean(reviewResult);

                  return (
                    <div
                      key={opt.id}
                      onClick={() => {
                        if (isDisabled) return;
                        setSelectedOption(opt.id);
                      }}
                      className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                        isDisabled ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'
                      } ${borderClass} ${bgClass}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {opt.id.toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {opt.text}
                        </span>
                      </div>

                      {reviewResult && isExpected && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      {reviewResult && isWrongChosen && (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Assistance Section (Hint, Transcript, Translation, History) */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Công cụ hỗ trợ (Mở hỗ trợ sẽ không tính vào chuỗi tự nhớ)
                </span>
                {assistanceUsed.size > 0 && (
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    Đã dùng hỗ trợ: {Array.from(assistanceUsed).join(', ')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                {/* Hint toggle */}
                {selectedMistake.hint && (
                  <button
                    onClick={toggleHint}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition ${
                      showHint
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>Gợi ý cấu trúc</span>
                    {showHint ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                )}

                {/* Transcript toggle */}
                {selectedMistake.transcript && (
                  <button
                    onClick={toggleTranscript}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition ${
                      showTranscript
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>Xem bài nghe</span>
                    {showTranscript ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                )}

                {/* Translation toggle */}
                {selectedMistake.translation && (
                  <button
                    onClick={toggleTranslation}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition ${
                      showTranslation
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>Xem bản dịch</span>
                    {showTranslation ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                )}

                {/* Review history toggle */}
                <button
                  onClick={() => toggleHistory(selectedMistake.id)}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition ${
                    showHistory
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <History className="w-3.5 h-3.5" />
                    Lịch sử ôn ({selectedMistake.review_count})
                  </span>
                  {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Collapsible content boxes */}
              {showHint && selectedMistake.hint && (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="font-extrabold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Gợi ý cấu trúc:
                  </div>
                  <p>{selectedMistake.hint}</p>
                </div>
              )}

              {showTranscript && selectedMistake.transcript && (
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 space-y-1">
                  <div className="font-extrabold text-indigo-600 dark:text-indigo-400">
                    Nội dung bài nghe (Transcript):
                  </div>
                  <p className="leading-relaxed">{selectedMistake.transcript}</p>
                </div>
              )}

              {showTranslation && selectedMistake.translation && (
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 space-y-1">
                  <div className="font-extrabold text-emerald-600 dark:text-emerald-400">
                    Bản dịch tiếng Việt tham khảo:
                  </div>
                  <p className="leading-relaxed">{selectedMistake.translation}</p>
                </div>
              )}

              {showHistory && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="font-extrabold text-xs text-slate-700 dark:text-slate-300">
                    Lịch sử các lần nộp câu hỏi này:
                  </div>
                  {loadingHistory ? (
                    <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      <span>Đang tải lịch sử...</span>
                    </div>
                  ) : reviewHistory.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Chưa có lượt ôn tập nào trước đó.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {reviewHistory.map((h, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold flex items-center gap-1.5">
                              {h.feedback.correct ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              )}
                              <span>Đã chọn: Option {h.response?.option_id?.toUpperCase()}</span>
                            </span>
                            <span className="text-[10px] text-slate-400">{formatDateTime(h.created_at)}</span>
                          </div>
                          {h.feedback.assistance_used && h.feedback.assistance_used.length > 0 && (
                            <div className="text-[10px] text-amber-600 dark:text-amber-400">
                              Hỗ trợ đã dùng: {h.feedback.assistance_used.join(', ')}
                            </div>
                          )}
                          <p className="text-[11px] text-slate-600 dark:text-slate-300">
                            {h.feedback.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Graded Review Feedback Banner */}
            {reviewResult && (
              <div
                className={`p-5 rounded-2xl border-2 space-y-3 animate-fade-in ${
                  reviewResult.correct
                    ? reviewResult.independent
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-100'
                      : 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-950 dark:text-amber-100'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-950 dark:text-rose-100'
                }`}
              >
                <div className="flex items-center gap-2 font-extrabold text-sm md:text-base">
                  {reviewResult.correct ? (
                    reviewResult.independent ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span>Chính xác tuyệt đối! Làm rất tốt.</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 text-amber-600" />
                        <span>Chính xác nhưng có trợ giúp.</span>
                      </>
                    )
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-rose-600" />
                      <span>Chưa chính xác.</span>
                    </>
                  )}
                </div>

                <div className="text-xs md:text-sm space-y-1">
                  <p>{reviewResult.message}</p>
                  {reviewResult.explanation && (
                    <p className="font-semibold pt-1 border-t border-black/10 dark:border-white/10">
                      {reviewResult.explanation}
                    </p>
                  )}
                </div>

                {reviewResult.resolved && (
                  <div className="p-3 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Chúc mừng! Câu hỏi này đã hoàn thành mục tiêu ôn tập (2 lượt đúng liên tiếp).</span>
                  </div>
                )}
              </div>
            )}

            {/* Error banner */}
            {reviewError && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{reviewError}</span>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500">
                {!selectedMistake.due && selectedMistake.status !== 'resolved' && (
                  <span className="flex items-center gap-1.5 text-slate-400 font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    Chưa đến hạn nộp lại câu trả lời.
                  </span>
                )}
                {selectedMistake.status === 'resolved' && (
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <Check className="w-3.5 h-3.5" />
                    Mục này đã đạt tiêu chí giải quyết.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {reviewResult ? (
                  <button
                    onClick={() => {
                      setSelectedMistake(null);
                      navigate('/mistakes' + (activeTab === 'due' ? '?due_only=true' : activeTab !== 'active' ? `?status=${activeTab}` : ''));
                    }}
                    className="px-6 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-sm hover:opacity-90 transition shadow-sm"
                  >
                    Quay lại danh sách
                  </button>
                ) : (
                  <button
                    disabled={!selectedMistake.due || selectedMistake.status === 'resolved' || !selectedOption || submitting}
                    onClick={() => void handleSubmitReview()}
                    className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm disabled:opacity-50 transition shadow-md flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang kiểm tra...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Kiểm tra đáp án</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* MISTAKES LIST VIEW */
        <div className="space-y-4">
          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => { setActiveTab('due'); navigate('/mistakes?due_only=true'); }}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition shrink-0 ${
                activeTab === 'due'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>Cần ôn ngay</span>
              {summary && summary.due_count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'due' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200'
                }`}>
                  {summary.due_count}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab('active'); navigate('/mistakes?status=active'); }}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition shrink-0 ${
                activeTab === 'active'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>Đang theo dõi</span>
              {summary && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'active' ? 'bg-indigo-800 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  {summary.active_count}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab('resolved'); navigate('/mistakes?status=resolved'); }}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition shrink-0 ${
                activeTab === 'resolved'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>Đã ôn đạt</span>
              {summary && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'resolved' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  {summary.resolved_count}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab('all'); navigate('/mistakes?status=all'); }}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition shrink-0 ${
                activeTab === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>Tất cả</span>
              {summary && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'all' ? 'bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-900' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  {summary.total}
                </span>
              )}
            </button>
          </div>

          {/* List Content */}
          {loadingList ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-xs font-semibold">Đang tải danh sách câu sai...</p>
            </div>
          ) : listError ? (
            <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
              <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">{listError}</p>
              <button
                onClick={() => void fetchMistakes()}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl"
              >
                Thử lại
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {activeTab === 'due'
                  ? 'Tuyệt vời! Hiện không có câu nào cần ôn gấp.'
                  : activeTab === 'resolved'
                  ? 'Chưa có câu nào được giải quyết đạt mục tiêu.'
                  : 'Sổ lỗi hiện đang trống!'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {activeTab === 'due'
                  ? 'Các câu sai sẽ tự động đến hạn theo chu kỳ ngắt quãng. Hãy tiếp tục học bài mới!'
                  : 'Mỗi khi bạn trả lời chưa chính xác trong bài học, câu hỏi sẽ được tự động lưu vào đây để bạn rèn luyện lại.'}
              </p>
              <div className="pt-2">
                <button
                  onClick={() => navigate('/today')}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition"
                >
                  Đến kế hoạch hôm nay
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const isDue = item.due;
                const isResolved = item.status === 'resolved';

                return (
                  <div
                    key={item.id}
                    className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border transition-all space-y-3 ${
                      isDue
                        ? 'border-amber-300 dark:border-amber-700/80 shadow-xs'
                        : isResolved
                        ? 'border-emerald-200 dark:border-emerald-800/80'
                        : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold border border-indigo-200 dark:border-indigo-800">
                          {getStepTypeLabel(item.type)}
                        </span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {item.lesson_title}
                        </span>
                      </div>

                      {/* Status indicator */}
                      <div>
                        {isResolved ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Đã đạt mục tiêu
                          </span>
                        ) : isDue ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-full border border-amber-300 dark:border-amber-700">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            Đến hạn ôn ngay
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                            <Clock className="w-3 h-3" />
                            Ôn lại {formatRelativeDue(item.due_at)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Prompt Preview */}
                    <p className="text-sm md:text-base font-extrabold text-slate-900 dark:text-white line-clamp-2">
                      {item.prompt}
                    </p>

                    {/* Meta row & Action */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {/* Streak Indicator */}
                        <div className="flex items-center gap-1.5">
                          <span>Chuỗi đúng:</span>
                          <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                            {item.correct_streak}/{item.required_correct}
                          </span>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: item.required_correct }).map((_, i) => (
                              <div
                                key={i}
                                className={`w-2 h-2 rounded-full ${
                                  i < item.correct_streak
                                    ? 'bg-indigo-600 dark:bg-indigo-400'
                                    : 'bg-slate-200 dark:bg-slate-700'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <span>•</span>
                        <span>{item.wrong_count} lần sai</span>
                        <span>•</span>
                        <span>{item.review_count} lượt ôn</span>
                      </div>

                      <button
                        onClick={() => {
                          navigate(`/mistakes?id=${item.id}`);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                          isDue
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                            : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {isDue ? (
                          <>
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Ôn tập ngay</span>
                          </>
                        ) : (
                          <>
                            <span>Xem câu hỏi & Lịch sử</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

