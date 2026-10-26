import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  History,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
  BookOpen,
  Headphones,
  FileText,
  Mic,
  PenTool,
  BookmarkCheck,
  RotateCcw,
  Play,
  X,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
  Check,
  XCircle,
  ShieldCheck,
  Sliders,
  Activity,
  MessageSquare,
  Layers
} from 'lucide-react';
import {
  api,
  LearningProgressData,
  LearningHistoryItem,
  LearningSessionEvidence,
  LearningAudioReviewItem,
  SkillProgressItem,
  ProgramProgressItem,
  LearningProfile,
  LearningActivity,
  LearningActivityItem
} from '../api/client';
import { useRouter } from '../context/RouterContext';

export const ProgressView: React.FC = () => {
  const { path, navigate } = useRouter();

  // Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'history'>('overview');
  const [windowDays, setWindowDays] = useState<number>(30);

  // Data state
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<LearningProgressData | null>(null);
  const [profile, setProfile] = useState<LearningProfile | null>(null);

  // Cross-engine activity state (1.19.0 / 1.20 contract)
  const [activityData, setActivityData] = useState<LearningActivity | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const activityReqRef = React.useRef<number>(0);

  // History state
  const [historyStatus, setHistoryStatus] = useState<'all' | 'active' | 'completed'>('all');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<LearningHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState<number>(0);

  // Evidence modal state
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [evidenceData, setEvidenceData] = useState<LearningSessionEvidence | null>(null);
  const [sessionAudioReviews, setSessionAudioReviews] = useState<LearningAudioReviewItem[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  // Fetch Progress Overview & Cross-Engine Activity
  const fetchProgress = async (days = windowDays) => {
    setLoadingProgress(true);
    setProgressError(null);
    const currentReq = ++activityReqRef.current;
    setLoadingActivity(true);
    setActivityError(null);

    const actPromise = api.getLearningActivity({ days, limit: 50, offset: 0 });

    try {
      const [prog, prof] = await Promise.all([
        api.getLearningProgress(days),
        api.getLearningProfile().catch(() => null),
      ]);
      setProgressData(prog);
      setProfile(prof);
    } catch (err) {
      setProgressError((err as Error).message || 'Không thể tải dữ liệu tiến độ học tập');
    } finally {
      setLoadingProgress(false);
    }

    try {
      const act = await actPromise;
      if (currentReq === activityReqRef.current) {
        setActivityData(act);
        setActivityError(null);
      }
    } catch (err) {
      if (currentReq === activityReqRef.current) {
        setActivityData(null);
        setActivityError((err as Error).message || 'Chưa tải được hoạt động toàn hệ thống');
      }
    } finally {
      if (currentReq === activityReqRef.current) {
        setLoadingActivity(false);
      }
    }
  };

  const fetchActivity = async (days = windowDays, offset = 0, append = false) => {
    const currentReq = ++activityReqRef.current;
    setLoadingActivity(true);
    setActivityError(null);
    try {
      const act = await api.getLearningActivity({ days, limit: 50, offset });
      if (currentReq !== activityReqRef.current) return;
      if (append && activityData) {
        setActivityData({
          ...act,
          items: [...activityData.items, ...act.items],
        });
      } else {
        setActivityData(act);
      }
      setActivityError(null);
    } catch (err) {
      if (currentReq === activityReqRef.current) {
        if (!append) setActivityData(null);
        setActivityError((err as Error).message || 'Chưa tải được hoạt động toàn hệ thống');
      }
    } finally {
      if (currentReq === activityReqRef.current) {
        setLoadingActivity(false);
      }
    }
  };

  // Fetch History
  const fetchHistory = async () => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const res = await api.getLearningHistory({ status: historyStatus, limit: 50 });
      setHistoryItems(res.items);
      setHistoryTotal(res.total);
    } catch (err) {
      setHistoryError((err as Error).message || 'Không thể tải lịch sử học tập');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    void fetchProgress(windowDays);
  }, [windowDays]);

  useEffect(() => {
    if (activeTab === 'history') {
      void fetchHistory();
    }
  }, [activeTab, historyStatus]);

  // Open evidence modal
  const openEvidence = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setEvidenceData(null);
    setSessionAudioReviews([]);
    setLoadingEvidence(true);
    setEvidenceError(null);
    try {
      const [evidenceRes, audioReviewsRes] = await Promise.all([
        api.getLearningSessionEvidence(sessionId),
        api.getLearningSessionAudioReviews(sessionId).catch(() => null)
      ]);
      setEvidenceData(evidenceRes);
      if (audioReviewsRes?.items) {
        setSessionAudioReviews(audioReviewsRes.items);
      }
    } catch (err) {
      setEvidenceError((err as Error).message || 'Không thể tải chi tiết bài nộp');
    } finally {
      setLoadingEvidence(false);
    }
  };

  const closeEvidence = () => {
    setSelectedSessionId(null);
    setEvidenceData(null);
    setSessionAudioReviews([]);
    setEvidenceError(null);
  };

  // Date formatting helpers
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

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('vi-VN', {
        timeZone: profile?.timezone || 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  // Skill icon & label mapping
  const getSkillMeta = (key: string) => {
    switch (key) {
      case 'listening':
        return { icon: Headphones, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800' };
      case 'grammar':
        return { icon: BookmarkCheck, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800' };
      case 'vocabulary':
        return { icon: BookOpen, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800' };
      case 'pronunciation':
        return { icon: Mic, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800' };
      case 'speaking':
        return { icon: Sparkles, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800' };
      case 'writing':
        return { icon: PenTool, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800' };
      case 'reading':
      default:
        return { icon: FileText, color: 'text-slate-600 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' };
    }
  };

  // Activity kind mapping (Contract 1.19.0)
  const getActivityMeta = (kind: string) => {
    switch (kind) {
      case 'vocabulary':
        return { label: 'Học từ vựng', icon: BookOpen, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800' };
      case 'srs_rating':
        return { label: 'Đánh giá SRS', icon: BookmarkCheck, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800' };
      case 'lesson':
        return { label: 'Bài học', icon: Play, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800' };
      case 'mistake':
        return { label: 'Ôn Sổ lỗi', icon: AlertCircle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800' };
      case 'listening':
        return { label: 'Luyện nghe', icon: Headphones, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800' };
      case 'material_dictation':
        return { label: 'Chép chính tả', icon: PenTool, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800' };
      case 'conversation':
        return { label: 'Hội thoại', icon: MessageSquare, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800' };
      case 'exercise':
        return { label: 'Luyện tập', icon: Layers, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800' };
      case 'ai_feedback':
      case 'audio_feedback':
      case 'speaking_feedback':
        return { label: 'Nhận xét AI', icon: Sparkles, color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/60 border-violet-200 dark:border-violet-800' };
      default:
        return { label: 'Hoạt động', icon: Activity, color: 'text-slate-600 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700' };
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
                <TrendingUp className="w-5 h-5" />
              </span>
              <div>
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">
                  Theo dõi dữ liệu thực tế
                </span>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  Tiến bộ & Lịch sử học tập
                </h1>
              </div>
            </div>

            <button
              onClick={() => navigate('/today')}
              className="text-xs font-bold text-indigo-200 hover:text-white flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition border border-white/10"
            >
              <span>Về màn Hôm nay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Hệ thống ghi nhận minh bạch dựa trên hoạt động luyện tập thực tế xuyên suốt các chế độ học. Không suy đoán điểm số giả lập, không làm tròn ảo.
          </p>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 pt-2 border-t border-white/10">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                activeTab === 'overview'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-indigo-200 hover:bg-white/10'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Tổng quan & Kỹ năng</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('activity');
                if (!activityData) void fetchActivity(windowDays);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                activeTab === 'activity'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-indigo-200 hover:bg-white/10'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Hoạt động gần đây</span>
              {activityData?.summary?.total_activities ? (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'activity' ? 'bg-slate-200 text-slate-900' : 'bg-white/10 text-white'
                }`}>
                  {activityData.summary.total_activities}
                </span>
              ) : null}
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-indigo-200 hover:bg-white/10'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Bài nộp & Bằng chứng</span>
              {historyTotal > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'history' ? 'bg-slate-200 text-slate-900' : 'bg-white/10 text-white'
                }`}>
                  {historyTotal}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & SKILLS */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Time window selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Khung thời gian phân tích:</span>
              {progressData && (
                <span className="text-slate-400 font-normal">
                  ({progressData.window.from_local_date} đến {progressData.window.to_local_date})
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {[7, 14, 30, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setWindowDays(days)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    windowDays === days
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {days} ngày
                </button>
              ))}
            </div>
          </div>

          {loadingProgress ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-xs font-semibold">Đang tổng hợp dữ liệu tiến độ thực tế...</p>
            </div>
          ) : progressError || !progressData ? (
            <div className="p-8 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
              <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">{progressError || 'Không có dữ liệu'}</p>
              <button
                onClick={() => void fetchProgress(windowDays)}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl"
              >
                Thử lại
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Lifetime & Cross-Engine Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Bài học đã hoàn tất
                  </span>
                  <div className="text-2xl md:text-3xl font-black text-indigo-600 dark:text-indigo-400">
                    {progressData.lifetime.unique_lessons_completed}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    trên tổng số bài học đã phát hành
                  </p>
                </div>

                <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Tổng hoạt động ({windowDays}d)
                  </span>
                  <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
                    {activityError ? (
                      <span className="text-xs text-rose-500 font-bold block pt-1">Chưa tải được</span>
                    ) : loadingActivity && !activityData ? (
                      <span className="text-xs text-slate-400 font-bold block pt-1">Đang tải...</span>
                    ) : (
                      activityData?.summary?.total_activities ?? 0
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {activityError ? (
                      <button
                        type="button"
                        onClick={() => void fetchActivity(windowDays, 0)}
                        className="text-indigo-600 dark:text-indigo-400 underline font-bold"
                      >
                        Thử lại
                      </button>
                    ) : activityData?.summary?.distinct_words_practised !== undefined ? (
                      `${activityData.summary.distinct_words_practised} từ vựng đã luyện`
                    ) : (
                      'hoạt động toàn hệ thống'
                    )}
                  </p>
                </div>

                <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Lượt ôn Sổ lỗi
                  </span>
                  <div className="text-2xl md:text-3xl font-black text-amber-600 dark:text-amber-400">
                    {progressData.review_practice.submitted}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {progressData.review_practice.unassisted_correct} lượt đúng tự nhớ
                  </p>
                </div>

                <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Ngày học thực tế
                  </span>
                  <div className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    {activityError ? (
                      <span className="text-xs text-rose-500 font-bold block pt-1">Chưa tải được</span>
                    ) : loadingActivity && !activityData ? (
                      <span className="text-xs text-slate-400 font-bold block pt-1">Đang tải...</span>
                    ) : (
                      <>
                        <span>{activityData?.summary?.active_days ?? 0}</span>
                        <span className="text-sm font-bold text-slate-400">/ {windowDays}</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {activityError ? (
                      <button
                        type="button"
                        onClick={() => void fetchActivity(windowDays, 0)}
                        className="text-indigo-600 dark:text-indigo-400 underline font-bold"
                      >
                        Thử lại
                      </button>
                    ) : (
                      'ngày có hoạt động toàn hệ thống'
                    )}
                  </p>
                </div>
              </div>

              {/* AI Feedback window summary (AI-01) */}
              {progressData.ai_feedback && (
                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        Nhận xét định tính AI trong kỳ:
                      </span>{' '}
                      <span className="text-slate-600 dark:text-slate-300">
                        {progressData.ai_feedback.reviews_created} lượt nhận xét ({progressData.ai_feedback.writing} bài viết, {progressData.ai_feedback.speaking_transcript} bản chép lời nói)
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 italic">
                    Nhận xét định tính không cộng vào tỷ lệ câu đúng
                  </span>
                </div>
              )}

              {/* Qualitative Audio Review summary (AUDIO-01 / FE-AUDIO-01) */}
              {progressData.audio_feedback && progressData.audio_feedback.reviews_created > 0 && (
                <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        Nhận xét âm thanh định tính trong kỳ:
                      </span>{' '}
                      <span className="text-slate-600 dark:text-slate-300">
                        {progressData.audio_feedback.reviews_created} lượt nhận xét phát âm từ bản thu thật
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 italic">
                    Nhận xét định tính từ bản thu âm, không cấp điểm phát âm chuẩn hóa
                  </span>
                </div>
              )}

              {/* Programs Completion Section */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span>Độ bao phủ chương trình học (Programs)</span>
                  </h3>
                  <button
                    onClick={() => navigate('/my-program')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition"
                  >
                    <span>Xem danh mục bài</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {progressData.programs.map((prog) => {
                    const percent = prog.completion_percent ?? 0;
                    return (
                      <div
                        key={prog.id}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                              {prog.kind === 'foundation' ? 'Nền tảng' : 'Chuyên ngành IT'}
                            </span>
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                              {prog.title}
                            </h4>
                          </div>
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                            {prog.completed_lessons} / {prog.published_lessons} bài
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                            <div
                              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                            <span>Hoàn thành bài học</span>
                            <span className="font-extrabold text-slate-700 dark:text-slate-300">{percent}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Skills Real Activity Section */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Dữ liệu thực hành theo kỹ năng</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Phản ánh chính xác số câu đã nộp trong khung {windowDays} ngày. Các kỹ năng tự luyện không suy diễn điểm số khi chưa có đánh giá tự động.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {progressData.skills.map((skill) => {
                    const meta = getSkillMeta(skill.key);
                    const Icon = meta.icon;

                    return (
                      <div
                        key={skill.key}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2.5 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`p-1.5 rounded-xl border ${meta.color}`}>
                                <Icon className="w-4 h-4" />
                              </span>
                              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                                {skill.label}
                              </span>
                            </div>

                            {/* Evidence status pill */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {skill.ai_feedback_count && skill.ai_feedback_count > 0 ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  Có nhận xét AI ({skill.ai_feedback_count})
                                </span>
                              ) : null}
                              {skill.ai_audio_review_count && skill.ai_audio_review_count > 0 ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                                  Nhận xét audio ({skill.ai_audio_review_count})
                                </span>
                              ) : null}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                skill.evidence_status === 'graded_practice'
                                  ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200'
                                  : skill.evidence_status === 'ai_audio_feedback'
                                  ? 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200'
                                  : skill.evidence_status === 'self_review_only'
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}>
                                {skill.evidence_status === 'graded_practice'
                                  ? 'Có chấm điểm'
                                  : skill.evidence_status === 'ai_audio_feedback'
                                  ? 'Nhận xét audio'
                                  : skill.evidence_status === 'self_review_only'
                                  ? 'Tự luyện'
                                  : 'Chưa đánh giá'}
                              </span>
                            </div>
                          </div>

                          {/* Skill content details */}
                          {skill.evidence_status === 'graded_practice' ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Đúng:</span>
                                <span className="font-extrabold text-slate-900 dark:text-white">
                                  {skill.correct} / {skill.graded_tasks} câu
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Độ chính xác:</span>
                                <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                                  {skill.accuracy_percent !== null ? `${skill.accuracy_percent}%` : 'Chưa có mẫu'}
                                </span>
                              </div>

                              {skill.unassisted_accuracy_percent !== null && (
                                <div className="flex items-center justify-between text-[11px] text-slate-400">
                                  <span>Đúng tự nhớ:</span>
                                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                                    {skill.unassisted_accuracy_percent}% ({skill.unassisted_correct}/{skill.unassisted_graded})
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : skill.evidence_status === 'ai_audio_feedback' ? (
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">Lượt nhận xét audio:</span>
                                <span className="font-extrabold text-teal-700 dark:text-teal-300">
                                  {skill.ai_audio_review_count ?? 0} lượt
                                </span>
                              </div>
                              {skill.self_review_tasks > 0 && (
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-500">Lượt tự luyện:</span>
                                  <span className="font-bold text-slate-700 dark:text-slate-300">
                                    {skill.self_review_tasks} lượt
                                  </span>
                                </div>
                              )}
                              <p className="text-[11px] text-slate-400 italic">
                                Nhận xét định tính từ bản thu âm, không cấp điểm chuẩn hóa
                              </p>
                            </div>
                          ) : skill.evidence_status === 'self_review_only' ? (
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">Lượt nộp thực tế:</span>
                                <span className="font-extrabold text-slate-900 dark:text-white">
                                  {skill.submitted_tasks} lượt
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 italic">
                                {skill.ai_feedback_count && skill.ai_feedback_count > 0
                                  ? 'Có nhận xét AI, chưa có điểm chuẩn hóa'
                                  : 'Tự đối chiếu tiêu chí rubric (chưa chấm điểm AI)'}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1 text-xs text-slate-400">
                              <p className="italic">Chưa có lượt đọc được chấm trong khoảng này.</p>
                            </div>
                          )}
                        </div>

                        {skill.last_practised_at && (
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 text-[10px] text-slate-400">
                            Gần nhất: {formatDateTime(skill.last_practised_at)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Daily Activity Visual (Last Days) */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <span>Nhật ký hoạt động từng ngày ({windowDays} ngày)</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Tính theo ngày địa phương ({progressData.timezone}). Bao gồm bài học và ôn Sổ lỗi.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                      Bài học
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      Ôn câu sai
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto pb-2">
                  <div className="flex items-end gap-1.5 min-w-[500px] h-32 pt-4 border-b border-slate-100 dark:border-slate-800">
                    {progressData.daily_activity.map((day, idx) => {
                      const totalActivity = day.lesson_submissions + day.mistake_reviews;
                      const hasActivity = totalActivity > 0;
                      const heightPercent = hasActivity ? Math.min(100, Math.max(15, totalActivity * 12)) : 4;

                      return (
                        <div
                          key={day.date}
                          className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                        >
                          {/* Tooltip on hover */}
                          <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                            <div className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-white text-[10px] font-bold shadow-lg whitespace-nowrap">
                              <div>{day.date}</div>
                              {hasActivity ? (
                                <div className="text-slate-300 font-normal">
                                  {day.lesson_submissions} bài nộp • {day.mistake_reviews} ôn lỗi
                                </div>
                              ) : (
                                <div className="text-slate-400 font-normal">Không có hoạt động</div>
                              )}
                            </div>
                          </div>

                          {/* Bar */}
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full rounded-t-md transition-all ${
                              hasActivity
                                ? day.mistake_reviews > 0 && day.lesson_submissions > 0
                                  ? 'bg-gradient-to-t from-indigo-600 to-amber-500'
                                  : day.mistake_reviews > 0
                                  ? 'bg-amber-500'
                                  : 'bg-indigo-600'
                                : 'bg-slate-100 dark:bg-slate-800'
                            }`}
                          />

                          {/* Date label for some points */}
                          {(idx === 0 || idx === progressData.daily_activity.length - 1 || idx % Math.ceil(windowDays / 7) === 0) && (
                            <span className="text-[9px] text-slate-400 mt-1 whitespace-nowrap">
                              {formatDate(day.date)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Sổ lỗi Snapshot Widget */}
              {progressData.mistakes && (
                <div className="p-5 rounded-3xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <BookmarkCheck className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        Sổ lỗi & Ôn tập ngắt quãng
                      </span>
                      <h4 className="font-extrabold text-sm md:text-base text-slate-900 dark:text-white">
                        Hiện có {progressData.mistakes.due_count} câu đến hạn • {progressData.mistakes.active_count} câu đang theo dõi
                      </h4>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(progressData.mistakes.due_count > 0 ? '/mistakes?due_only=true' : '/mistakes')}
                    className="px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                  >
                    <span>Mở Sổ lỗi</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Luyện nghe từng câu & Shadowing Snapshot Widget */}
              {progressData.listening_practice && (
                <div className="p-5 rounded-3xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Headphones className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-400">
                          Luyện nghe từng câu & Shadowing (Tự luyện)
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300">
                          Self-reported
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm md:text-base text-slate-900 dark:text-white">
                        Đã luyện {progressData.listening_practice.practised_sentences} câu • {progressData.listening_practice.repetitions_self_reported} lượt nhắc lại • {progressData.listening_practice.completed_sessions} phiên hoàn tất
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {progressData.listening_practice.active_sessions > 0
                          ? `Có ${progressData.listening_practice.active_sessions} phiên đang dở dang.`
                          : 'Học liệu WAV từng câu chất lượng cao, hỗ trợ lặp và thu âm đối chiếu.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {progressData.listening_practice.resume_route && (
                      <button
                        onClick={() => navigate(progressData.listening_practice!.resume_route!)}
                        className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Tiếp tục</span>
                      </button>
                    )}
                    <button
                      onClick={() => navigate('/listening')}
                      className="px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                    >
                      <span>Thư viện nghe</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Transparency & Limitations Box */}
              {progressData.limitations && progressData.limitations.length > 0 && (
                <div className="p-5 rounded-3xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div className="font-extrabold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Cam kết tính minh bạch của số liệu OpenQuiz:</span>
                  </div>
                  <ul className="space-y-1 list-disc list-inside text-[11px] text-slate-500 dark:text-slate-400 pl-1">
                    {progressData.limitations.map((lim, i) => (
                      <li key={i}>{lim}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CROSS-ENGINE ACTIVITY (Contract 1.19.0 / 1.20) */}
      {activeTab === 'activity' && (
        <div className="space-y-4 animate-fade-in">
          {/* Summary sub-card */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Toàn hệ thống ({windowDays} ngày):
              </span>
              {activityError ? (
                <span className="text-rose-600 dark:text-rose-400 font-bold">
                  Chưa tải được hoạt động toàn hệ thống
                </span>
              ) : (
                <>
                  <span className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-extrabold">
                    {activityData?.summary?.total_activities ?? 0} lượt hoạt động
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold">
                    {activityData?.summary?.active_days ?? 0} ngày học
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-extrabold">
                    {activityData?.summary?.distinct_words_practised ?? 0} từ đã luyện
                  </span>
                </>
              )}
            </div>

            <button
              onClick={() => void fetchActivity(windowDays, 0)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Làm mới</span>
            </button>
          </div>

          {/* Activity Items List */}
          {loadingActivity && !activityData ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-xs font-semibold">Đang tổng hợp hoạt động toàn hệ thống...</p>
            </div>
          ) : activityError ? (
            <div className="p-8 text-center rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
              <h3 className="text-base font-extrabold text-rose-900 dark:text-rose-200">
                Chưa tải được hoạt động toàn hệ thống
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-300 max-w-sm mx-auto">
                {activityError}
              </p>
              <button
                type="button"
                onClick={() => void fetchActivity(windowDays, 0)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition"
              >
                Thử lại
              </button>
            </div>
          ) : !activityData || activityData.items.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <Activity className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Chưa có hoạt động nào trong {windowDays} ngày qua
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Mỗi khi bạn nộp bài học, đánh giá từ vựng SRS, làm bài nghe hoặc ôn câu sai, hoạt động sẽ xuất hiện tại đây.
              </p>
              <button
                onClick={() => navigate('/today')}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs"
              >
                Bắt đầu học ngay
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activityData.items.map((item) => {
                const meta = getActivityMeta(item.kind);
                const Icon = meta.icon;

                return (
                  <div
                    key={item.id}
                    className="p-4 md:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700 transition flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className={`p-2.5 rounded-xl border shrink-0 ${meta.color}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${meta.color}`}>
                            {meta.label}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {formatDateTime(item.occurred_at)}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                          {item.title}
                        </h4>
                      </div>
                    </div>

                    {item.route && (
                      <button
                        onClick={() => navigate(item.route)}
                        className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition shrink-0 shadow-2xs"
                      >
                        <span>Mở bài</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Pagination for Activity (Contract 1.20) */}
              {activityData.items.length < activityData.total && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    disabled={loadingActivity}
                    onClick={() => void fetchActivity(windowDays, activityData.items.length, true)}
                    className="px-5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-2xs transition"
                  >
                    {loadingActivity ? 'Đang tải thêm...' : `Tải thêm hoạt động (đã xem ${activityData.items.length}/${activityData.total})`}
                  </button>
                </div>
              )}

              {/* Activity limitations footer */}
              {activityData.limitations && activityData.limitations.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 space-y-1 mt-4">
                  <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Quy tắc ghi nhận hoạt động:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1 text-slate-500 dark:text-slate-400">
                    {activityData.limitations.map((lim, idx) => (
                      <li key={idx}>{lim}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LEARNING SESSIONS & EVIDENCE */}
      {activeTab === 'history' && (
        <div className="space-y-4 animate-fade-in">
          {/* History filter buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setHistoryStatus('all')}
              className={`px-4 py-2 rounded-2xl font-bold text-xs transition ${
                historyStatus === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Tất cả các phiên
            </button>

            <button
              onClick={() => setHistoryStatus('active')}
              className={`px-4 py-2 rounded-2xl font-bold text-xs transition ${
                historyStatus === 'active'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Đang làm dở
            </button>

            <button
              onClick={() => setHistoryStatus('completed')}
              className={`px-4 py-2 rounded-2xl font-bold text-xs transition ${
                historyStatus === 'completed'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Đã hoàn thành
            </button>
          </div>

          {/* History List */}
          {loadingHistory ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-xs font-semibold">Đang tải lịch sử học tập...</p>
            </div>
          ) : historyError ? (
            <div className="p-8 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
              <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">{historyError}</p>
              <button
                onClick={() => void fetchHistory()}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl"
              >
                Thử lại
              </button>
            </div>
          ) : historyItems.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <History className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Chưa có phiên học nào trong bộ lọc này
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Bắt đầu một bài học mới từ mục Hôm nay hoặc Lộ trình của tôi để ghi nhận lịch sử.
              </p>
              <button
                onClick={() => navigate('/today')}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs"
              >
                Đến màn Hôm nay
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {historyItems.map((item) => {
                const isCompleted = item.status === 'completed';

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700 transition space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold border ${
                          item.program_id === 'english-foundation'
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        }`}>
                          {item.program_id === 'english-foundation' ? 'Nền tảng' : 'IT/System'}
                        </span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Phiên bản v{item.content_version}
                        </span>
                      </div>

                      <div>
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Đã hoàn thành
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-full border border-amber-300 dark:border-amber-700">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            Đang làm dở
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Lesson Title */}
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {item.title}
                    </h3>

                    {/* Progress indicator & Timestamps */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">
                          Tiến trình: <strong className="text-slate-800 dark:text-slate-200">{item.completed_steps}/{item.total_steps}</strong> bước hoàn thành
                        </span>
                        <span>•</span>
                        <span>Đã nộp: <strong>{item.submitted_steps}</strong> bước</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Evidence button */}
                        <button
                          onClick={() => void openEvidence(item.id)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Xem bài đã nộp</span>
                        </button>

                        {/* Resume button if active */}
                        {!isCompleted && (
                          <button
                            onClick={() => navigate(item.route)}
                            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs"
                          >
                            <Play className="w-3 h-3 fill-white" />
                            <span>Tiếp tục học</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* EVIDENCE VIEWER MODAL / DRAWER */}
      {selectedSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Nhật ký bài nộp thực tế
                  </span>
                  {evidenceData?.audio_review_count && evidenceData.audio_review_count > 0 ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 font-bold">
                      {evidenceData.audio_review_count} nhận xét audio
                    </span>
                  ) : null}
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Chi tiết các bước đã nộp
                </h3>
              </div>
              <button
                onClick={closeEvidence}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {loadingEvidence ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <p className="text-xs font-semibold">Đang tải nhật ký nộp bài...</p>
                </div>
              ) : evidenceError ? (
                <div className="p-4 rounded-2xl bg-rose-50 text-rose-800 text-xs font-semibold">
                  {evidenceError}
                </div>
              ) : !evidenceData || evidenceData.items.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-8">
                  Phiên học này chưa có bước nào được nộp.
                </p>
              ) : (
                evidenceData.items.map((step, idx) => (
                  <div
                    key={step.step_id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                        Bước {idx + 1}: {step.title}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatDateTime(step.submitted_at)}
                      </span>
                    </div>

                    <p className="font-bold text-slate-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                      {step.prompt}
                    </p>

                    {/* Step Type 1: Choice question (listening / grammar) */}
                    {step.options && step.response?.option_id && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Các lựa chọn:
                        </span>
                        <div className="space-y-1">
                          {step.options.map((opt) => {
                            const isChosen = step.response?.option_id === opt.id;
                            const isExpected = step.feedback?.expected_option_id === opt.id;

                            return (
                              <div
                                key={opt.id}
                                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                                  isChosen
                                    ? isExpected || step.feedback?.correct
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-bold'
                                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-900 dark:text-rose-200 font-bold'
                                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <span>{opt.id.toUpperCase()}. {opt.text}</span>
                                {isChosen && (
                                  <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10">
                                    Đã chọn
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Step Type 2: Speaking / Writing text submission */}
                    {step.response?.text && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Bản bài làm đã nộp của bạn:
                        </span>
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
                          {step.response.text}
                        </div>
                        {step.response.self_reviewed && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                            <Check className="w-3 h-3" />
                            Đã đối chiếu tiêu chí tự kiểm tra
                          </span>
                        )}
                      </div>
                    )}

                    {/* Step Type 3: Reflection */}
                    {step.response?.reflection && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Ghi chú tự suy ngẫm:
                        </span>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 italic">
                          "{step.response.reflection}"
                        </div>
                      </div>
                    )}

                    {/* Feedback recorded */}
                    {step.feedback?.explanation && (
                      <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                        <span className="font-bold">Giải thích:</span>
                        <p>{step.feedback.explanation}</p>
                      </div>
                    )}

                    {/* Saved Qualitative AI Feedback (AI-01) */}
                    {step.ai_feedback && (
                      <div className="mt-2.5 p-3.5 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-slate-800/90 space-y-2.5 text-xs shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-2">
                          <span className="font-extrabold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Nhận xét AI ({step.ai_feedback.model})</span>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatDateTime(step.ai_feedback.created_at)}
                          </span>
                        </div>

                        {step.ai_feedback.feedback.summary && (
                          <p className="font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                            {step.ai_feedback.feedback.summary}
                          </p>
                        )}

                        {step.ai_feedback.feedback.strengths?.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                              Điểm tốt:
                            </span>
                            <ul className="space-y-0.5 text-[11px] text-slate-700 dark:text-slate-300">
                              {step.ai_feedback.feedback.strengths.map((str, sIdx) => (
                                <li key={sIdx} className="flex items-start gap-1">
                                  <Check className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                                  <span>{str}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {step.ai_feedback.feedback.corrections?.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
                              Gợi ý sửa câu ({step.ai_feedback.feedback.corrections.length}):
                            </span>
                            <div className="space-y-1.5">
                              {step.ai_feedback.feedback.corrections.map((corr, cIdx) => (
                                <div key={cIdx} className="p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 text-[11px] space-y-1">
                                  <div className="font-mono flex items-center gap-1.5">
                                    <span className="line-through text-rose-600">"{corr.original}"</span>
                                    <span className="text-slate-400">→</span>
                                    <span className="font-bold text-emerald-600">"{corr.corrected}"</span>
                                  </div>
                                  {corr.explanation && (
                                    <p className="text-slate-600 dark:text-slate-300">{corr.explanation}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {step.ai_feedback.feedback.suggested_response && (
                          <div className="pt-1">
                            <span className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">
                              Câu mẫu tham khảo:
                            </span>
                            <div className="p-2.5 rounded-lg bg-indigo-50/40 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-[11px] italic text-slate-700 dark:text-slate-200">
                              "{step.ai_feedback.feedback.suggested_response}"
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Saved Qualitative Audio Review (AUDIO-01 / FE-AUDIO-01) */}
                    {sessionAudioReviews.filter((r) => r.step_id === step.step_id).map((rev) => (
                      <div key={rev.id} className="mt-2.5 p-3.5 rounded-2xl border border-teal-200 dark:border-teal-900/60 bg-white dark:bg-slate-800/90 space-y-2.5 text-xs shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-2">
                          <span className="font-extrabold text-teal-700 dark:text-teal-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Nhận xét phát âm AI ({rev.model || 'Gemini'})</span>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatDateTime(rev.created_at)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 text-[11px]">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Câu mẫu:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-100">"{rev.target}"</span>
                          </div>
                          <div className={`p-2.5 rounded-xl border text-[11px] ${
                            rev.needs_clearer_recording
                              ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                              : 'bg-teal-50/40 dark:bg-teal-950/20 border-teal-200 dark:border-teal-900/40'
                          }`}>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">AI nghe được:</span>
                            {rev.needs_clearer_recording ? (
                              <span className="font-semibold text-amber-700 dark:text-amber-300">(Chưa nghe rõ bản thu âm)</span>
                            ) : (
                              <span className="font-semibold text-teal-900 dark:text-teal-200">"{rev.transcript}"</span>
                            )}
                          </div>
                        </div>

                        {rev.feedback && (
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold uppercase text-slate-400">Nhận xét chi tiết:</span>
                            <p className="font-medium text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-line">
                              {rev.feedback}
                            </p>
                          </div>
                        )}

                        {rev.improvements?.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <span className="text-[10px] font-bold uppercase text-teal-700 dark:text-teal-400">Gợi ý cải thiện:</span>
                            <ul className="space-y-0.5 text-[11px] text-slate-700 dark:text-slate-300">
                              {rev.improvements.map((imp, impIdx) => (
                                <li key={impIdx} className="flex items-start gap-1">
                                  <Check className="w-3 h-3 text-teal-600 shrink-0 mt-0.5" />
                                  <span>{imp}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 italic">
                          Nhận xét định tính từ bản thu âm, không có điểm chuẩn hóa. Audio thô không lưu trên máy chủ.
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}

              {/* Additional audio reviews in session not tied to an existing attempt */}
              {sessionAudioReviews.filter((r) => !evidenceData?.items.some((it) => it.step_id === r.step_id)).length > 0 && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="font-extrabold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-teal-600" />
                    <span>Nhận xét phát âm khác trong phiên học</span>
                  </h4>
                  {sessionAudioReviews.filter((r) => !evidenceData?.items.some((it) => it.step_id === r.step_id)).map((rev) => (
                    <div key={rev.id} className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-teal-200 dark:border-teal-900/60 space-y-2.5 text-xs shadow-xs">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-2">
                        <span className="font-extrabold text-teal-700 dark:text-teal-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Bước: {rev.step_id} ({rev.model || 'Gemini'})</span>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatDateTime(rev.created_at)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 text-[11px]">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Câu mẫu:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-100">"{rev.target}"</span>
                        </div>
                        <div className={`p-2.5 rounded-xl border text-[11px] ${
                          rev.needs_clearer_recording
                            ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                            : 'bg-teal-50/40 dark:bg-teal-950/20 border-teal-200 dark:border-teal-900/40'
                        }`}>
                          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">AI nghe được:</span>
                          {rev.needs_clearer_recording ? (
                            <span className="font-semibold text-amber-700 dark:text-amber-300">(Chưa nghe rõ bản thu âm)</span>
                          ) : (
                            <span className="font-semibold text-teal-900 dark:text-teal-200">"{rev.transcript}"</span>
                          )}
                        </div>
                      </div>
                      {rev.feedback && (
                        <p className="font-medium text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-line">
                          {rev.feedback}
                        </p>
                      )}
                      {rev.improvements?.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] font-bold uppercase text-teal-700 dark:text-teal-400">Gợi ý cải thiện:</span>
                          <ul className="space-y-0.5 text-[11px] text-slate-700 dark:text-slate-300">
                            {rev.improvements.map((imp, impIdx) => (
                              <li key={impIdx} className="flex items-start gap-1">
                                <Check className="w-3 h-3 text-teal-600 shrink-0 mt-0.5" />
                                <span>{imp}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
              <button
                onClick={closeEvidence}
                className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

