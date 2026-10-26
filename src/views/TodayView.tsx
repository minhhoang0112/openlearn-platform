import React, { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  Compass,
  CheckCircle2,
  Play,
  RotateCcw,
  Sparkles,
  Repeat,
  ArrowRight,
  Loader2,
  AlertCircle,
  BookOpen,
  ChevronRight,
  Sliders,
  Check,
  BookX,
  X,
} from "lucide-react";
import {
  api,
  ApiError,
  TodayPlan,
  TodayPlanItem,
  LearningProfile,
} from "../api/client";
import { useRouter } from "../context/RouterContext";

export const TodayView: React.FC = () => {
  const { navigate } = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<TodayPlan | null>(null);
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [startingLesson, setStartingLesson] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustMinutes, setAdjustMinutes] = useState<number>(15);
  const [adjusting, setAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [todayData, profileData] = await Promise.all([
        api.getTodayPlan(),
        api.getLearningProfile().catch(() => null),
      ]);
      setPlan(todayData);
      setProfile(profileData);
    } catch (err) {
      setError(
        (err as Error).message || "Không thể tải kế hoạch học tập hôm nay",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleStartLesson = async (item: TodayPlanItem, forceNew = false) => {
    if (!item.lesson_id || !plan) return;
    if (item.session_id && !forceNew && plan.planner_policy === "legacy") {
      navigate(`/lesson-run/${item.session_id}?from=/today`);
      return;
    }

    setStartingLesson(true);
    try {
      if (forceNew || plan.planner_policy === "legacy") {
        const res = await api.startLearningSession(item.lesson_id, !forceNew);
        navigate(`/lesson-run/${res.id}?from=/today`);
        return;
      }
      const res = await api.startTodayItem(item.id, {
        plan_id: plan.plan_id,
        revision: plan.plan_revision ?? 0,
      });
      const targetCursor = res.daily_goal?.target_cursor;
      const query = new URLSearchParams({
        plan_id: res.daily_goal?.plan_id || plan.plan_id,
        item_id: res.daily_goal?.item_id || item.id,
        from: "/today",
      });
      if (targetCursor !== undefined) {
        query.set("target_cursor", String(targetCursor));
      }
      navigate(`/lesson-run/${res.session.id}?${query.toString()}`);
    } catch (err: any) {
      if (err instanceof ApiError && err.error?.code === "PLAN_CHANGED") {
        await fetchData();
        setError("Kế hoạch hôm nay đã thay đổi, đã làm mới danh sách bài học.");
      } else if (
        err instanceof ApiError &&
        err.error?.code === "DAILY_GOAL_COMPLETED"
      ) {
        if (item.session_id) {
          navigate(`/lesson-run/${item.session_id}?from=/today`);
        } else {
          await fetchData();
        }
      } else {
        setError(
          err.message ||
            "Không thể mở bài theo kế hoạch. Hãy thử lại; tiến độ đã lưu vẫn được giữ.",
        );
      }
    } finally {
      setStartingLesson(false);
    }
  };

  const handleAdjustTodayPlan = async () => {
    if (!plan) return;
    setAdjusting(true);
    setAdjustError(null);
    try {
      const updatedPlan = await api.adjustTodayPlan({
        plan_id: plan.plan_id,
        revision: plan.plan_revision ?? 0,
        remaining_minutes: adjustMinutes,
      });
      setPlan(updatedPlan);
      setAdjustModalOpen(false);
    } catch (err: any) {
      if (err instanceof ApiError && err.error?.code === "PLAN_CHANGED") {
        await fetchData();
        setAdjustError(
          "Kế hoạch đã thay đổi trên hệ thống. Đã làm mới kế hoạch mới nhất.",
        );
      } else {
        setAdjustError(
          (err as Error).message ||
            "Không thể điều chỉnh thời gian học hôm nay.",
        );
      }
    } finally {
      setAdjusting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 md:p-8 flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-semibold">
          Đang chuẩn bị kế hoạch học tập hôm nay...
        </p>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="max-w-4xl mx-auto p-6 md:p-8">
        <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-3xl text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-600 dark:text-rose-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 dark:text-white">
              Chưa thể tải kế hoạch học tập
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {error || "Vui lòng thử kết nối lại."}
            </p>
          </div>
          <button
            onClick={() => void fetchData()}
            className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm rounded-2xl hover:opacity-90 transition"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const allCompleted = plan.status === "completed";
  const isExhausted = plan.status === "content_exhausted";
  const isRestDay = plan.status === "rest_day";

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 pb-20">
      {/* Top Header Card */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        {/* Subtle decorative background shapes */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-widest">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(plan.local_date)}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              {allCompleted
                ? "Tuyệt vời! Bạn đã hoàn thành bài học hôm nay"
                : isRestDay
                  ? "Hôm nay là ngày nghỉ theo lịch của bạn"
                  : "Kế hoạch học tập hôm nay"}
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-xl">
              {isRestDay
                ? "Theo lịch học trong tuần đã chọn, hôm nay bạn không có bài mới bắt buộc. Bạn vẫn có thể tiếp tục bài dở hoặc ôn tập tự do."
                : "Hệ thống đã chọn lọc nội dung thực tế phù hợp với thời gian và định hướng học tập của bạn."}
            </p>
          </div>

          {/* Quick Profile Summary Badge */}
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-300">Thời gian học:</span>
              <span className="font-extrabold text-amber-300">
                {plan.budget_minutes} phút
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-300">Định hướng:</span>
              <span className="font-bold text-emerald-300 uppercase">
                {profile?.focus === "system" ? "IT / System" : "Nền tảng"}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-white/10 mt-1">
              <button
                type="button"
                data-testid="adjust-today-budget"
                onClick={() => {
                  setAdjustMinutes(
                    plan.estimated_remaining_minutes ||
                      plan.budget_minutes ||
                      15,
                  );
                  setAdjustError(null);
                  setAdjustModalOpen(true);
                }}
                className="text-[11px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 transition"
              >
                <Sliders className="w-3 h-3" />
                <span>Điều chỉnh hôm nay</span>
              </button>
              <span className="text-white/30">•</span>
              <button
                type="button"
                onClick={() => navigate("/settings/learning")}
                className="text-[11px] font-bold text-indigo-200 hover:text-white flex items-center gap-1 transition"
              >
                <span>Hồ sơ</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Resume Banner if active session exists anywhere */}
      {plan.resume_route && (
        <div
          className={`p-4 md:p-5 rounded-3xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
            allCompleted
              ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500/80"
              : "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500/80"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-10 h-10 rounded-2xl text-white flex items-center justify-center shrink-0 shadow-xs ${
                allCompleted ? "bg-emerald-600" : "bg-indigo-600"
              }`}
            >
              {allCompleted ? (
                <CheckCircle2 className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-5 h-5 fill-white ml-0.5" />
              )}
            </div>
            <div>
              <span
                className={`text-[10px] font-black uppercase tracking-wider ${
                  allCompleted
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-indigo-600 dark:text-indigo-400"
                }`}
              >
                {allCompleted
                  ? "Đã xong mục tiêu hôm nay"
                  : "Bài học đang làm dở"}
              </span>
              <h4 className="font-black text-sm md:text-base text-slate-900 dark:text-white">
                {allCompleted
                  ? "Bạn đã hoàn thành mục tiêu học hôm nay! Bạn có thể tiếp tục phần còn lại nếu muốn."
                  : "Bạn có một phiên học chưa hoàn thành"}
              </h4>
            </div>
          </div>
          <button
            onClick={() => navigate(plan.resume_route!)}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-2xl text-white font-extrabold text-xs flex items-center justify-center gap-2 transition shadow-xs ${
              allCompleted
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            <span>
              {allCompleted
                ? "Tiếp tục phần còn lại (tùy chọn)"
                : "Tiếp tục học ngay"}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mistake Summary Widget if mistakes exist */}
      {plan.mistake_summary && plan.mistake_summary.total > 0 && (
        <div className="p-4 md:p-5 rounded-3xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <BookX className="w-5 h-5 text-white" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Sổ lỗi & Ôn tập ngắt quãng
                </span>
                {plan.mistake_summary.due_count > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800/80 text-amber-900 dark:text-amber-100 text-[10px] font-black">
                    {plan.mistake_summary.due_count} câu đến hạn
                  </span>
                )}
              </div>
              <h4 className="font-extrabold text-sm md:text-base text-slate-900 dark:text-white">
                {plan.mistake_summary.due_count > 0
                  ? `Có ${plan.mistake_summary.due_count} câu hỏi cần ôn lại để củng cố kiến thức`
                  : `Đang theo dõi ${plan.mistake_summary.active_count} câu hỏi (${plan.mistake_summary.resolved_count} câu đã giải quyết)`}
              </h4>
            </div>
          </div>
          <button
            onClick={() =>
              navigate(
                plan.mistake_summary?.due_count
                  ? "/mistakes?due_only=true"
                  : "/mistakes",
              )
            }
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
          >
            <span>
              {plan.mistake_summary.due_count > 0 ? "Ôn ngay" : "Mở sổ lỗi"}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Profile Notice if changed */}
      <div className="text-[11px] text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1.5">
        <span>*</span>
        <span>
          Mọi thay đổi trong Cài đặt học tập sẽ được áp dụng cho kế hoạch của
          ngày tiếp theo ({plan.profile_changes_apply}).
        </span>
      </div>

      {/* Main Learning Items Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-lg text-slate-900 dark:text-white">
            Nhiệm vụ hôm nay
          </h2>
          <span className="text-xs font-semibold text-slate-400">
            {plan.items.length} nhiệm vụ
          </span>
        </div>

        {isRestDay ? (
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Hôm nay là ngày nghỉ theo lịch của bạn
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {plan.message ||
                  "Theo lịch học trong tuần đã chọn, hôm nay bạn không có bài mới bắt buộc. Bạn vẫn có thể tiếp tục bài dở hoặc ôn tập tự do."}
              </p>
            </div>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => navigate("/my-program")}
                className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold"
              >
                Xem Lộ trình của tôi
              </button>
              <button
                onClick={() => navigate("/practice")}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
              >
                Trung tâm Luyện tập
              </button>
            </div>
          </div>
        ) : isExhausted ? (
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <Compass className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Chưa có bài mới phù hợp cho ngày hôm nay
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {plan.message ||
                "Bạn có thể tự chọn học lại các bài trong Lộ trình hoặc luyện tập tự do trong Thư viện."}
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => navigate("/my-program")}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold"
              >
                Xem Lộ trình của tôi
              </button>
              <button
                onClick={() => navigate("/practice")}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
              >
                Luyện tập tự do
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {plan.items.map((item) => {
              const isReview = item.kind === "review";
              const isLesson = item.kind === "lesson";
              const isDone = item.status === "completed";
              const inProgress = item.status === "in_progress";

              return (
                <div
                  key={item.id}
                  className={`p-5 md:p-6 rounded-3xl border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isDone
                      ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/60"
                      : inProgress
                        ? "bg-white dark:bg-slate-900 border-indigo-600 shadow-md ring-2 ring-indigo-500/20"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        isDone
                          ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300"
                          : isReview
                            ? "bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400"
                            : "bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
                      }`}
                    >
                      {isDone ? (
                        <Check className="w-6 h-6 stroke-[3]" />
                      ) : isReview ? (
                        <Repeat className="w-6 h-6" />
                      ) : (
                        <BookOpen className="w-6 h-6" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {isReview ? "Ôn tập SRS" : "Bài học trọng tâm"}
                        </span>
                        {inProgress && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white animate-pulse">
                            Đang học dở
                          </span>
                        )}
                        {isDone && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                            {isLesson && item.lesson_completed === false
                              ? "Đã xong mục tiêu hôm nay"
                              : "Đã hoàn thành"}
                          </span>
                        )}
                      </div>

                      <h3 className="font-black text-base md:text-lg text-slate-900 dark:text-white">
                        {isReview
                          ? `Ôn tập từ vựng ngắt quãng (${item.due_count ?? item.initial_due_count ?? 0} từ đến hạn)`
                          : item.title || "Bài học trọng tâm"}
                      </h3>

                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Ước tính: {item.estimated_minutes} phút</span>
                        </span>
                        {isLesson && (
                          <span>
                            • Đa kỹ năng (Nghe, Từ vựng, Ngữ pháp, Nói, Viết)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 sm:self-center shrink-0">
                    {isReview && (
                      <button
                        onClick={() => navigate("/repetition-study")}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition shadow-xs"
                      >
                        <Repeat className="w-4 h-4" />
                        <span>Ôn tập ngay</span>
                      </button>
                    )}

                    {isLesson && !isDone && (
                      <button
                        disabled={startingLesson}
                        onClick={() => void handleStartLesson(item)}
                        className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition shadow-md disabled:opacity-50"
                      >
                        {startingLesson ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Đang mở...</span>
                          </>
                        ) : inProgress ? (
                          <>
                            <Play className="w-4 h-4 fill-white" />
                            <span>Tiếp tục học</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-white" />
                            <span>Bắt đầu bài học</span>
                          </>
                        )}
                      </button>
                    )}

                    {isLesson && isDone && (
                      <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                        {item.session_id && item.lesson_completed === false && (
                          <button
                            onClick={() =>
                              navigate(
                                `/lesson-run/${item.session_id}?from=/today`,
                              )
                            }
                            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs"
                          >
                            Tiếp tục phần còn lại (tùy chọn)
                          </button>
                        )}
                        <button
                          onClick={() => void handleStartLesson(item, false)}
                          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition"
                        >
                          Xem lại kết quả
                        </button>
                        <button
                          disabled={startingLesson}
                          onClick={() => void handleStartLesson(item, true)}
                          title="Tạo lượt học mới không ghi đè lượt cũ"
                          className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Học lại</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {plan.deferred && plan.deferred.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  Có {plan.deferred.length} nhiệm vụ đã được hoãn lại do giới
                  hạn thời gian học hôm nay ({plan.budget_minutes} phút). Hệ
                  thống sẽ chuyển tiếp sang các buổi sau.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Adjust Modal */}
      {adjustModalOpen && plan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Điều chỉnh hôm nay
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Chọn số phút muốn dành cho phần sắp học tiếp (5 - 90 phút)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdjustModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-center py-2">
                <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                  {adjustMinutes}
                </span>
                <span className="text-sm font-bold text-slate-500 ml-1">
                  phút
                </span>
              </div>

              <input
                type="range"
                min={5}
                max={90}
                step={5}
                value={adjustMinutes}
                onChange={(e) => setAdjustMinutes(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600"
              />

              <div className="grid grid-cols-4 gap-2">
                {[10, 15, 20, 30].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setAdjustMinutes(m)}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      adjustMinutes === m
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                        : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {m} phút
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                * Thao tác này chỉ điều chỉnh kế hoạch học tập của ngày hôm nay.
                Không thay đổi cài đặt hồ sơ dài hạn của bạn.
              </p>

              {adjustError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-600 font-medium">
                  {adjustError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAdjustModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={adjusting}
                onClick={() => void handleAdjustTodayPlan()}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-extrabold flex items-center gap-1.5 transition"
              >
                {adjusting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                <span>Áp dụng</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Options Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
        <div
          onClick={() => navigate("/")}
          className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 cursor-pointer transition-all flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Tự chọn bộ từ
            </span>
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
              Trang chủ &amp; Kho từ vựng
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Duyệt danh mục bộ từ, lộ trình chuyên ngành và khóa học.
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 group-hover:text-indigo-600 transition-all" />
        </div>

        <div
          onClick={() => navigate("/my-program")}
          className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 cursor-pointer transition-all flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Khám phá chương trình
            </span>
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
              Lộ trình của tôi
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Xem toàn bộ các chặng Nền tảng và IT / System.
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 group-hover:text-indigo-600 transition-all" />
        </div>

        <div
          onClick={() => navigate("/practice")}
          className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 cursor-pointer transition-all flex items-center justify-between group"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Rèn luyện kỹ năng
            </span>
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
              Trung tâm Luyện tập
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Luyện nghe chép, nói AI, ngữ pháp và đọc hiểu tự do.
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 group-hover:text-indigo-600 transition-all" />
        </div>
      </div>
    </div>
  );
};
