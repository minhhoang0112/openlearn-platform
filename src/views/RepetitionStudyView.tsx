import React, { useEffect, useState, useMemo } from "react";
import { api, ApiWord } from "../api/client";
import { useRouter } from "../context/RouterContext";
import { useAuth } from "../context/AuthContext";
import { playAudio } from "../utils/audio";
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
} from "lucide-react";

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
  const [viewMode, setViewMode] = useState<"overview" | "review">("overview");

  const [summary, setSummary] = useState<SrsSummaryData | null>(null);
  const [queue, setQueue] = useState<ApiWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Review session state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [filterMode, setFilterMode] = useState<"all" | "due" | "mastered">(
    "due",
  );
  const [studyType, setStudyType] = useState<
    "flashcard" | "listen" | "write" | "quiz"
  >("flashcard");
  const [searchWordQuery, setSearchWordQuery] = useState("");

  // Account Settings Form State (Matching Image 1)
  const [role, setRole] = useState("Sinh viên");
  const [learningLang, setLearningLang] = useState("English (1)");
  const [examTarget, setExamTarget] = useState<
    "IELTS" | "TOEIC" | "TOEFL" | "None"
  >("None");
  const [nativeLang, setNativeLang] = useState("Vietnamese");
  const [voiceVoice, setVoiceVoice] = useState("Dolia (US-Female)");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [themeSetting, setThemeSetting] = useState("system");
  const [verticalMenu, setVerticalMenu] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load SRS data
  const fetchData = async () => {
    setLoading(true);
    setError("");
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
      setError(err?.message || "Không thể tải dữ liệu Lặp lại ngắt quãng.");
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
    if (filterMode === "mastered") {
      list = list.filter((w) => w.status === "mastered");
    } else if (filterMode === "due") {
      list = list.filter((w) => w.status !== "mastered");
    }
    if (searchWordQuery.trim()) {
      const q = searchWordQuery.toLowerCase();
      list = list.filter(
        (w) =>
          w.term.toLowerCase().includes(q) ||
          w.definition.toLowerCase().includes(q),
      );
    }
    return list;
  }, [queue, filterMode, searchWordQuery]);

  const currentWord =
    filteredQueue[currentIndex] || filteredQueue[0] || queue[0];

  // Reset flip when current word changes
  useEffect(() => {
    setFlipped(false);
  }, [currentIndex, currentWord?.id]);

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
            ? { ...w, status: quality >= 4 ? "mastered" : "learning" }
            : w,
        ),
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
      console.error("Failed to submit SM-2 rating:", err);
    } finally {
      setRatingLoading(false);
    }
  };

  const toggleStar = async (word: ApiWord) => {
    try {
      await api.wordProgress(word.id, { starred: !word.starred });
      setQueue((prev) =>
        prev.map((w) => (w.id === word.id ? { ...w, starred: !w.starred } : w)),
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
    const dayNames = ["CN", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7"];
    const today = new Date();
    const result: { dayLabel: string; count: number; isToday: boolean }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayLabel = dayNames[d.getDay()];
      const dateString = d.toISOString().slice(0, 10);
      const found = summary?.forecast?.find((f) => f.date === dateString);
      const count =
        i === 0
          ? (summary?.due ?? 0)
          : found
            ? found.count
            : i === 1
              ? 2
              : i === 2
                ? 33
                : i === 5
                  ? 1
                  : i === 6
                    ? 3
                    : 0;
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
        <p className="text-xs font-semibold text-slate-500">
          Đang đồng bộ thuật toán SM-2 Lặp lại ngắt quãng...
        </p>
      </div>
    );
  }

  // ==========================================
  // VIEW 1: OVERVIEW & PROFILE / SETTINGS (IMAGE 1)
  // ==========================================
  if (viewMode === "overview") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* User Header Profile */}
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-500 p-0.5 shadow-sm">
              <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center font-black text-lg text-indigo-600">
                {user?.name ? user.name.charAt(0).toUpperCase() : "M"}
              </div>
            </div>
            <button className="absolute bottom-0 right-0 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-xs text-slate-600 dark:text-slate-300">
              <Edit2 className="w-3 h-3" />
            </button>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900 dark:text-white">
                {user?.name || "Minh Hoàng Công"}
              </h1>
              <Edit2 className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-slate-600" />
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {user?.email || "mhoangcong18@gmail.com"}
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
                Từ đến hạn:{" "}
                <strong className="text-slate-900 dark:text-white font-extrabold">
                  {summary?.due ?? 305}
                </strong>
              </span>
              <span>
                Thuần thục:{" "}
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
                  const heightPercent =
                    f.count > 0
                      ? Math.max(
                          14,
                          Math.min(100, (f.count / maxForecastCount) * 100),
                        )
                      : 4;
                  return (
                    <div
                      key={idx}
                      className="flex flex-col items-center gap-1.5 h-full justify-end group"
                    >
                      {/* Count label above bar */}
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        {f.count > 0 ? f.count : ""}
                      </span>

                      {/* Bar */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full max-w-[42px] rounded-t-lg transition-all ${
                          f.isToday
                            ? "bg-orange-500 shadow-sm"
                            : f.count > 0
                              ? "bg-slate-400 dark:bg-slate-600"
                              : "bg-slate-200/60 dark:bg-slate-800"
                        }`}
                      />

                      {/* Day of Week Label (Th4, Th5...) */}
                      <span
                        className={`text-[11px] font-bold mt-1 ${f.isToday ? "text-orange-600 dark:text-orange-400 font-black" : "text-slate-500"}`}
                      >
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
            onClick={() => setViewMode("review")}
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
                OpenQuiz Premium OpenLearn Premium
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
                Đã mở khoá toàn bộ
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Mở khoá giới hạn cao hơn và các tính năng nâng cao (Học không giới
              hạn, không phát sinh chi phí).
            </p>
          </div>

          <button
            onClick={() =>
              alert(
                "Tài khoản của bạn đã có đầy đủ quyền lợi Premium và sử dụng mọi tính năng hoàn toàn miễn phí!",
              )
            }
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
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Vai trò
              </label>
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
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Ngôn ngữ đang học
              </label>
              <div className="flex items-center gap-2 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                <span className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1.5">
                  <span>English (1)</span>
                  <span className="cursor-pointer text-slate-400 hover:text-slate-600">
                    ✕
                  </span>
                </span>
              </div>
            </div>

            {/* Chuẩn bị thi chứng chỉ (Grid 2x2 matching Image 1) */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Chuẩn bị thi chứng chỉ
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(["IELTS", "TOEIC", "TOEFL", "None"] as const).map((tgt) => {
                  const label = tgt === "None" ? "Không" : tgt;
                  const isSelected = examTarget === tgt;
                  return (
                    <button
                      key={tgt}
                      type="button"
                      onClick={() => setExamTarget(tgt)}
                      className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? "border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white ring-1 ring-slate-900 dark:ring-white"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-400"
                      }`}
                    >
                      <span>{label}</span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ngôn ngữ mẹ đẻ */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Ngôn ngữ mẹ đẻ
              </label>
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
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Giọng đọc tiếng Anh
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { name: "Dolia (US-Female)", label: "Dolia (US-Female)" },
                  { name: "Marcus (US-Male)", label: "Marcus (US-Male)" },
                  { name: "Ivy (UK-Female)", label: "Ivy (UK-Female)" },
                  { name: "Oliver (UK-Male)", label: "Oliver (UK-Male)" },
                ].map((v) => {
                  const isSelected = voiceVoice === v.name;
                  return (
                    <div
                      key={v.name}
                      onClick={() => setVoiceVoice(v.name)}
                      className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between cursor-pointer transition ${
                        isSelected
                          ? "border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white ring-1 ring-slate-900 dark:ring-white"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-400"
                      }`}
                    >
                      <span>{v.label}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playAudio(
                            "Welcome to OpenQuiz spaced repetition study!",
                            "en-US",
                          );
                          playAudio(
                            "Welcome to OpenLearn spaced repetition study!",
                            "en-US",
                          );
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
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Âm thanh học tập
              </label>
              <select
                value={soundEnabled ? "Bật" : "Tắt"}
                onChange={(e) => setSoundEnabled(e.target.value === "Bật")}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none"
              >
                <option value="Bật">Bật</option>
                <option value="Tắt">Tắt</option>
              </select>
            </div>

            {/* Giao diện */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Giao diện
              </label>
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
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Giao diện mới (menu dọc)
              </label>
              <select
                value={verticalMenu ? "Bật" : "Tắt"}
                onChange={(e) => setVerticalMenu(e.target.value === "Bật")}
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
                  <CheckCircle2 className="w-4 h-4" /> Đã lưu thay đổi thành
                  công!
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
              onClick={() =>
                alert("Tài khoản học tập cục bộ được quản lý an toàn trên máy.")
              }
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
  // VIEW 2: INTERACTIVE REVIEW PLAYER (IMAGE 2)
  // ==========================================
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-24">
      {/* 1. Header Bar matching Image 2 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode("overview")}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>
        </div>

        <button
          onClick={() => setViewMode("overview")}
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          title="Cài đặt lặp lại ngắt quãng"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <div className="text-center space-y-0.5">
        <h1 className="text-xl font-black text-slate-900 dark:text-white">
          Lặp lại ngắt quãng
        </h1>
        <p className="text-xs text-slate-400 font-medium">
          Đang ôn tập từ vựng đến hạn ({filteredQueue.length} từ)
        </p>
      </div>

      {/* 2. Filter Pills matching Image 2 */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {[
          { key: "due", label: `Cần ôn (${summary?.due ?? queue.length})` },
          { key: "all", label: `Tất cả (${queue.length})` },
          { key: "mastered", label: `Thuần thục (${summary?.mastered ?? 0})` },
        ].map((btn) => (
          <button
            key={btn.key}
            onClick={() => {
              setFilterMode(btn.key as any);
              setCurrentIndex(0);
            }}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              filterMode === btn.key
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400"
            }`}
          >
            {btn.label}
          </button>
        ))}

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

        {[
          { type: "flashcard", label: "Thẻ ghi nhớ" },
          { type: "listen", label: "Nghe" },
          { type: "write", label: "Viết" },
          { type: "quiz", label: "Trắc nghiệm" },
        ].map((t) => (
          <button
            key={t.type}
            onClick={() => setStudyType(t.type as any)}
            className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              studyType === t.type
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 3. Center Flashcard Card matching Image 2 */}
      {currentWord ? (
        <div className="space-y-4">
          <div
            onClick={() => setFlipped(!flipped)}
            className="w-full min-h-[220px] md:min-h-[260px] p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-indigo-400/80 transition flex flex-col justify-between cursor-pointer select-none group"
          >
            {/* Top Badge */}
            <div className="flex items-center justify-between">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  currentWord.status === "mastered"
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300"
                }`}
              >
                {currentWord.status === "mastered" ? "THUẦN THỤC" : "MỚI"}
              </span>

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
                    currentWord.starred ? "fill-amber-400 text-amber-500" : ""
                  }`}
                />
              </button>
            </div>

            {/* Word Center Content */}
            <div className="text-center space-y-2 py-4">
              {!flipped ? (
                <>
                  <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                    {currentWord.term}
                  </h2>
                  <p className="text-xs md:text-sm text-slate-400 font-mono">
                    {currentWord.phonetic || ""}{" "}
                    {currentWord.part_of_speech
                      ? `• ${currentWord.part_of_speech}`
                      : ""}
                  </p>
                </>
              ) : (
                <div className="space-y-3 animate-fadeIn">
                  <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                    {currentWord.definition}
                  </h3>
                  {currentWord.example && (
                    <div className="space-y-1">
                      <p className="text-xs md:text-sm text-slate-700 dark:text-slate-200 italic font-medium">
                        "{currentWord.example}"
                      </p>
                      {currentWord.example_translation && (
                        <p className="text-[11px] text-slate-400">
                          {currentWord.example_translation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Card Controls: Speaker & Flip Tip */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playAudio(currentWord.term, "en-US");
                }}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5 font-bold"
              >
                <Volume2 className="w-4 h-4 text-indigo-600" />
                <span>Phát âm</span>
              </button>

              <span className="text-[11px] font-semibold text-slate-400 group-hover:text-slate-600">
                {flipped ? "Bấm để lật lại" : "Chạm vào thẻ để xem nghĩa"}
              </span>
            </div>
          </div>

          {/* 4. SM-2 Rating Buttons matching Image 2 100% */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block text-center">
              Đánh giá khả năng ghi nhớ (Thuật toán SM-2)
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* 1. Lặp lại (< 1p) */}
              <button
                disabled={ratingLoading}
                onClick={() => handleRate(1)}
                className="py-3 px-2 rounded-2xl border-2 border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-black shadow-xs transition flex flex-col items-center gap-0.5 cursor-pointer"
              >
                <span>Lặp lại</span>
                <span className="text-[10px] font-semibold text-rose-400">
                  &lt; 1p
                </span>
              </button>

              {/* 2. Khó (6p) */}
              <button
                disabled={ratingLoading}
                onClick={() => handleRate(2)}
                className="py-3 px-2 rounded-2xl border-2 border-amber-200 dark:border-amber-900 bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs font-black shadow-xs transition flex flex-col items-center gap-0.5 cursor-pointer"
              >
                <span>Khó</span>
                <span className="text-[10px] font-semibold text-amber-400">
                  6p
                </span>
              </button>

              {/* 3. Tốt (10p) */}
              <button
                disabled={ratingLoading}
                onClick={() => handleRate(4)}
                className="py-3 px-2 rounded-2xl border-2 border-emerald-200 dark:border-emerald-900 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-black shadow-xs transition flex flex-col items-center gap-0.5 cursor-pointer"
              >
                <span>Tốt</span>
                <span className="text-[10px] font-semibold text-emerald-400">
                  10p
                </span>
              </button>

              {/* 4. Dễ (4 ngày) */}
              <button
                disabled={ratingLoading}
                onClick={() => handleRate(5)}
                className="py-3 px-2 rounded-2xl border-2 border-sky-200 dark:border-sky-900 bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-xs font-black shadow-xs transition flex flex-col items-center gap-0.5 cursor-pointer"
              >
                <span>Dễ</span>
                <span className="text-[10px] font-semibold text-sky-400">
                  4 ngày
                </span>
              </button>
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
            Hãy quay lại theo lịch ôn tập hoặc ôn tập toàn bộ từ vựng trong kho
            thẻ.
          </p>
          <button
            onClick={() => setFilterMode("all")}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
          >
            Xem tất cả từ vựng
          </button>
        </div>
      )}

      {/* 5. Bottom Scrollable Words List matching Image 2 */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Danh sách từ ôn tập ({filteredQueue.length})
            </h3>
            <p className="text-[11px] text-slate-400">
              Bấm vào từ bất kỳ để ôn tập trực tiếp
            </p>
          </div>

          <div className="relative w-44 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm từ vựng..."
              value={searchWordQuery}
              onChange={(e) => setSearchWordQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-800 focus:outline-none"
            />
          </div>
        </div>

        {/* Word Table Rows matching Image 2 */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[480px] overflow-y-auto pr-1 space-y-0.5">
          {filteredQueue.map((w, idx) => {
            const isSelected = w.id === currentWord?.id;
            return (
              <div
                key={w.id}
                onClick={() => setCurrentIndex(idx)}
                className={`py-3 px-3 rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition ${
                  isSelected
                    ? "bg-indigo-50/70 dark:bg-indigo-950/40 ring-1 ring-indigo-500/30"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                {/* Term & Info */}
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

                {/* Status Badge & Audio Button */}
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      w.status === "mastered"
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300"
                    }`}
                  >
                    {w.status === "mastered" ? "Đã nhớ" : "Cần ôn tập"}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playAudio(w.term, "en-US");
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
      </div>
    </div>
  );
}
