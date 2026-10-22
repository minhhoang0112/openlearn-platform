import React, { useState, useEffect } from "react";
import { useRouter } from "../context/RouterContext";
import { useAuth } from "../context/AuthContext";
import { api, DashboardData, SetCard, PathCard, TodayPlan } from "../api/client";
import {
  Search,
  ArrowRight,
  ChevronRight,
  BookOpen,
  Sparkles,
  ShieldCheck,
  User,
  Clock,
  Flame,
  Globe,
  Bell,
  CheckCircle2,
  Share2,
  ExternalLink,
  Laptop,
  Repeat,
  BookX,
  TrendingUp,
} from "lucide-react";

export const DashboardView: React.FC = () => {
  const { navigate } = useRouter();
  const { user } = useAuth();

  const [searchVal, setSearchVal] = useState("");
  const [searchResults, setSearchResults] = useState<{ sets: SetCard[]; paths: PathCard[] } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [selectedLanguageTab, setSelectedLanguageTab] = useState<
    "english" | "other"
  >("english");
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [todayPlan, setTodayPlan] = useState<TodayPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api
      .dashboard()
      .then((d) => {
        if (mounted) setDashData(d);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });

    api
      .getTodayPlan()
      .then((p) => {
        if (mounted) setTodayPlan(p);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchVal.trim();
    if (!query) {
      setSearchResults(null);
      return;
    }

    setSearchLoading(true);
    setSearchError("");
    try {
      const res = await api.search(query);
      setSearchResults(res);
    } catch (err: any) {
      setSearchError(err?.message || "Không thể tìm kiếm.");
    } finally {
      setSearchLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchVal("");
    setSearchResults(null);
    setSearchError("");
  };

  const activePath = dashData?.studying_paths?.[0];
  const userSets = dashData?.studying_sets || [];

  return (
    <div className="max-w-5xl mx-auto space-y-7 pb-24">
      {/* 1. Top Search Bar matching Image 4 */}
      <form onSubmit={handleSearchSubmit} className="relative w-full">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          placeholder="Tìm kiếm bộ từ, lộ trình, chủ đề... (Nhấn Enter để tìm)"
          className="w-full pl-11 pr-24 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl text-xs md:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-2xs"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searchVal && (
            <button
              type="button"
              onClick={clearSearch}
              className="px-2 py-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Xóa
            </button>
          )}
          <button
            type="submit"
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            Tìm
          </button>
        </div>
      </form>

      {/* Search Results Display */}
      {(searchLoading || searchResults || searchError) && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Kết quả tìm kiếm cho: "{searchVal}"
              </h3>
            </div>
            <button
              onClick={clearSearch}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Đóng kết quả
            </button>
          </div>

          {searchLoading && (
            <div className="py-8 text-center text-xs font-medium text-slate-400">
              Đang tìm kiếm dữ liệu...
            </div>
          )}

          {searchError && (
            <p className="text-xs text-rose-500 font-semibold">{searchError}</p>
          )}

          {searchResults && (
            <div className="space-y-6">
              {/* Sets */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Bộ từ vựng ({searchResults.sets.length})
                </h4>
                {searchResults.sets.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Không có bộ từ phù hợp.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {searchResults.sets.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => navigate(`/study-set/${s.id}`)}
                        className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer space-y-2 group shadow-2xs"
                      >
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                          {s.word_count} từ
                        </span>
                        <h5 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition line-clamp-1">
                          {s.title}
                        </h5>
                        {s.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-2">
                            {s.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Paths */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Lộ trình học ({searchResults.paths.length})
                </h4>
                {searchResults.paths.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Không có lộ trình phù hợp.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {searchResults.paths.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => navigate(`/learning-path/${p.id}`)}
                        className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer space-y-2 group shadow-2xs"
                      >
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                          {p.set_count} bộ từ
                        </span>
                        <h5 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition line-clamp-1">
                          {p.title}
                        </h5>
                        {p.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-2">
                            {p.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Notification Yellow/Orange Banner (Dynamic Due SRS or AI Beta) */}
      {dashData && dashData.due_today > 0 ? (
        <div className="flex items-center justify-between p-3.5 px-4 bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 rounded-2xl text-indigo-950 dark:text-indigo-200 text-xs font-semibold shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Repeat className="w-4 h-4 text-indigo-600 animate-pulse" />
            <span>
              Hôm nay bạn có <strong>{dashData.due_today} từ vựng</strong> đến
              lịch ôn tập lặp lại ngắt quãng (SRS)!
            </span>
          </div>
          <button
            onClick={() => navigate("/repetition-study")}
            className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs font-bold shrink-0 ml-2"
          >
            Ôn tập ngay →
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3.5 px-4 bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl text-amber-900 dark:text-amber-200 text-xs font-semibold shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="text-base">📢</span>
            <span>
              Thử nghiệm tính năng <strong>AI Study Beta</strong>: luyện phát âm
              và giao tiếp trực tiếp với gia sư ảo OpenQuiz AI!
            </span>
          </div>
          <button
            onClick={() => navigate("/category/nen-tang")}
            className="text-amber-700 dark:text-amber-400 hover:underline text-xs font-bold shrink-0 ml-2"
          >
            Trải nghiệm ngay →
          </button>
        </div>
      )}

      {/* 2.5. V2 Today Learning Plan Hero Banner */}
      {todayPlan && (
        <div className="p-4 md:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Kế hoạch học tập V2 hôm nay
                </span>
                {todayPlan.status === "completed" ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                    Đã hoàn thành
                  </span>
                ) : todayPlan.resume_route ? (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                    Đang học dở
                  </span>
                ) : todayPlan.status === "rest_day" ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                    Ngày nghỉ
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                    {todayPlan.budget_minutes} phút
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-sm md:text-base text-slate-900 dark:text-white">
                {todayPlan.status === "rest_day"
                  ? "Hôm nay là ngày nghỉ theo lịch của bạn"
                  : todayPlan.items.find((i) => i.kind === "lesson")?.title || "Bài học trọng tâm hôm nay"}
              </h3>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            {todayPlan.mistake_summary && todayPlan.mistake_summary.due_count > 0 && (
              <button
                onClick={() => navigate("/mistakes?due_only=true")}
                className="px-3.5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-xs font-bold transition flex items-center gap-1.5"
              >
                <BookX className="w-3.5 h-3.5" />
                <span>Ôn {todayPlan.mistake_summary.due_count} câu sai</span>
              </button>
            )}

            {todayPlan.resume_route ? (
              <button
                onClick={() => navigate(todayPlan.resume_route!)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <span>Tiếp tục học</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => navigate("/today")}
                className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <span>Xem kế hoạch</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Section: Lộ trình đang học (Matching Image 4) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
            Lộ trình đang học
          </h2>
          <button
            onClick={() => navigate("/category/nen-tang")}
            className="text-xs text-slate-400 hover:text-slate-600 font-medium"
          >
            Xem tất cả
          </button>
        </div>

        {/* Featured Card with cute earth planet illustration */}
        <div
          onClick={() =>
            navigate(
              activePath
                ? `/learning-path/${activePath.id}`
                : "/learning-path/20269",
            )
          }
          className="group relative overflow-hidden p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-slate-300 transition cursor-pointer flex items-center justify-between gap-6"
        >
          <div className="space-y-3">
            <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition">
              {activePath ? activePath.title : "Lộ trình A1-A2 tiếng Anh"}
            </h3>

            {/* Language flags pair */}
            <div className="flex items-center gap-2 text-xs">
              <span>🇬🇧</span>
              <span className="w-8 h-px bg-slate-300 dark:bg-slate-700 inline-block" />
              <span>🇻🇳</span>
            </div>

            {/* Tags */}
            <div className="flex items-center gap-2 text-[11px]">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                {activePath?.set_count || activePath?.expected_set_count || 20}{" "}
                Bộ thẻ
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400" />
                <span>Openquiz Team</span>
              </span>
            </div>
          </div>

          {/* Cute Earth Character Illustration */}
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-tr from-sky-400 to-emerald-400 flex items-center justify-center text-white text-3xl shadow-md shrink-0 group-hover:scale-105 transition-transform">
            🌍
          </div>
        </div>
      </div>

      {/* 4. Section: Bộ từ đang học (Real user progress from server) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
            Bộ từ đang học
          </h2>
          <button
            onClick={() => navigate("/my-created")}
            className="text-xs text-slate-400 hover:text-slate-600 font-medium"
          >
            Xem tất cả
          </button>
        </div>

        {userSets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {userSets.slice(0, 3).map((s) => {
              const mastered = s.mastered_count || 0;
              const total = Math.max(1, s.word_count || 1);
              const pct = Math.round((mastered / total) * 100);
              return (
                <div
                  key={s.id}
                  onClick={() => navigate(`/study-set/${s.id}`)}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-slate-300 transition cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {s.title}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {s.word_count} từ
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                    <span>
                      Đã nhớ {mastered}/{s.word_count} từ
                    </span>
                    <span className="font-bold text-indigo-600">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Starter reference sets when learner has not started reviewing yet */}
            {[
              { id: 163, title: "Tuyển dụng & việc làm", words: 12 },
              { id: 10164, title: "Lương thưởng & tài chính", words: 12 },
              { id: 10165, title: "Kinh doanh & thị trường", words: 12 },
            ].map((s) => (
              <div
                key={s.id}
                onClick={() => navigate(`/study-set/${s.id}`)}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-slate-300 transition cursor-pointer space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {s.title}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {s.words} từ
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-300 dark:bg-slate-700 rounded-full"
                    style={{ width: "0%" }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                  <span>Chưa bắt đầu</span>
                  <span className="font-bold text-indigo-600">Học ngay →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Section: Khóa học Promo matching Image 4 */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-rose-50 via-pink-50 to-orange-50 dark:from-rose-950/20 dark:via-pink-950/20 dark:to-orange-950/20 border border-rose-100 dark:border-rose-900/40 flex items-center justify-between gap-6 shadow-2xs">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-rose-500 text-white flex items-center justify-center text-xs font-bold">
              AI
            </span>
            <h3 className="text-sm md:text-base font-black text-slate-900 dark:text-white">
              Đọc hiểu nhưng không giao tiếp trôi chảy?
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Học phát âm chuẩn cùng AI ngay qua phương pháp shadowing & phản xạ
            trực tiếp.
          </p>
          <button
            onClick={() => navigate("/category/nen-tang")}
            className="mt-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition"
          >
            <span>Tiếp tục</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Cute Red Character Illustration */}
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center text-white text-3xl shadow-sm shrink-0">
          🍎
        </div>
      </div>

      {/* 6. Section: Lộ trình gợi ý with [English] / [Khác] Pills matching Image 4 */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Lộ trình gợi ý
            </h2>
            {/* Filter pills */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSelectedLanguageTab("english")}
                className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                  selectedLanguageTab === "english"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                English
              </button>
              <button
                onClick={() => setSelectedLanguageTab("other")}
                className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                  selectedLanguageTab === "other"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                Khác
              </button>
            </div>
          </div>
        </div>

        {/* Sub-section: Nền tảng */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Nền tảng
            </span>
            <button
              onClick={() => navigate("/category/nen-tang")}
              className="text-[11px] text-slate-400 hover:text-slate-600 font-semibold"
            >
              Xem tất cả
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => navigate("/learning-path/20269")}
              className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-slate-300 transition cursor-pointer flex items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition">
                  Lộ trình A1-A2 tiếng Anh
                </h4>
                <div className="flex items-center gap-2 text-xs">
                  <span>🇬🇧</span>
                  <span className="w-6 h-px bg-slate-300 dark:bg-slate-700 inline-block" />
                  <span>🇻🇳</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                  <span>20 Bộ thẻ</span>
                  <span>•</span>
                  <span>Openquiz Team</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center text-xl shrink-0">
                🌙
              </div>
            </div>

            <div
              onClick={() => navigate("/learning-path/102453")}
              className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-slate-300 transition cursor-pointer flex items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition truncate">
                    Lộ trình làm chủ Chunking
                  </h4>
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span>🇬🇧</span>
                  <span className="w-6 h-px bg-slate-300 dark:bg-slate-700 inline-block" />
                  <span>🇻🇳</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                  <span>10 Bộ thẻ</span>
                  <span>•</span>
                  <span>Openquiz Team</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center text-xl shrink-0">
                💬
              </div>
            </div>
          </div>
        </div>

        {/* Sub-section: TOEIC */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              TOEIC
            </span>
            <button
              onClick={() => navigate("/category/toeic")}
              className="text-[11px] text-slate-400 hover:text-slate-600 font-semibold"
            >
              Xem tất cả
            </button>
          </div>

          <div
            onClick={() => navigate("/learning-path/14")}
            className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-slate-300 transition cursor-pointer flex items-center justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition">
                  600 Essential words for the TOEIC Exam
                </h4>
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span>🇬🇧</span>
                <span className="w-6 h-px bg-slate-300 dark:bg-slate-700 inline-block" />
                <span>🇻🇳</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                <span>50 Bộ thẻ</span>
                <span>•</span>
                <span>Openquiz Team</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-500 flex items-center justify-center text-2xl shrink-0">
              🪐
            </div>
          </div>
        </div>

        {/* Sub-section: Công việc */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Công việc
            </span>
            <button
              onClick={() => navigate("/category/cong-viec")}
              className="text-[11px] text-slate-400 hover:text-slate-600 font-semibold"
            >
              Xem tất cả
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => navigate("/learning-path/20274")}
              className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-slate-300 transition cursor-pointer flex items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition">
                  English for Technical Work
                </h4>
                <div className="flex items-center gap-2 text-xs">
                  <span>🇬🇧</span>
                  <span className="w-6 h-px bg-slate-300 dark:bg-slate-700 inline-block" />
                  <span>🇻🇳</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                  <span>10 Bộ thẻ</span>
                  <span>•</span>
                  <span>Openquiz Team</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500 flex items-center justify-center text-xl shrink-0">
                ⚙️
              </div>
            </div>

            <div
              onClick={() => navigate("/learning-path/20276")}
              className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-slate-300 transition cursor-pointer flex items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition">
                  English for Business
                </h4>
                <div className="flex items-center gap-2 text-xs">
                  <span>🇬🇧</span>
                  <span className="w-6 h-px bg-slate-300 dark:bg-slate-700 inline-block" />
                  <span>🇻🇳</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                  <span>10 Bộ thẻ</span>
                  <span>•</span>
                  <span>Openquiz Team</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-500 flex items-center justify-center text-xl shrink-0">
                💼
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Bottom Promotional & Community Cards matching Image 4 */}
      <div className="space-y-4 pt-4">
        {/* Video Ngắn Promo Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Bạn có nghiện Video Ngắn?
            </h3>
            <p className="text-xs text-slate-500">
              Nghiện nhưng lại muốn học tiếng Anh qua Video? Xem các đoạn cắt
              ngắn từ vựng đời sống.
            </p>
            <button
              onClick={() =>
                alert("Tính năng học qua Video Ngắn đang được tối ưu hóa.")
              }
              className="mt-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
            >
              Xem ngay
            </button>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <svg className="w-7 h-7 fill-red-600" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
        </div>

        {/* Chrome Extension Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Cài đặt OpenQuiz Extension
            </h3>
            <p className="text-xs text-slate-500">
              Tra cứu và bôi đen lưu từ vựng ngay khi lướt web trên trình duyệt
              Chrome/Edge.
            </p>
            <button
              onClick={() =>
                alert("OpenQuiz Extension đã sẵn sàng tải từ Chrome Web Store.")
              }
              className="mt-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
            >
              Cài đặt Extension
            </button>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 text-2xl font-bold">
            🌐
          </div>
        </div>

        {/* Community & Apps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>Tham gia Cộng đồng OpenQuiz</span>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </div>
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>Quy chế hoạt động & Điều khoản</span>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
};
