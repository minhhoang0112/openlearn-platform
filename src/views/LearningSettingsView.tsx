import React, { useEffect, useState } from 'react';
import {
  Clock,
  Compass,
  Calendar,
  Globe,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowLeft,
  Terminal,
  BookOpen,
  Info
} from 'lucide-react';
import { api, LearningProfile, UpdateLearningProfilePayload } from '../api/client';
import { useRouter } from '../context/RouterContext';

const WEEKDAYS = [
  { day: 1, label: 'Thứ 2', short: 'T2' },
  { day: 2, label: 'Thứ 3', short: 'T3' },
  { day: 3, label: 'Thứ 4', short: 'T4' },
  { day: 4, label: 'Thứ 5', short: 'T5' },
  { day: 5, label: 'Thứ 6', short: 'T6' },
  { day: 6, label: 'Thứ 7', short: 'T7' },
  { day: 7, label: 'Chủ nhật', short: 'CN' },
];

const TIME_OPTIONS: { value: 15 | 30 | 45; label: string; desc: string; badge?: string }[] = [
  {
    value: 15,
    label: '15 phút / ngày',
    desc: 'Duy trì nhịp học nhẹ nhàng: ôn từ đến hạn và hoàn thành một phần bài học.',
  },
  {
    value: 30,
    label: '30 phút / ngày',
    desc: 'Chuẩn bài học cân đối (Khuyên dùng): ôn tập + học đầy đủ nghe, ngữ pháp và nói/viết.',
    badge: 'Khuyên dùng',
  },
  {
    value: 45,
    label: '45 phút / ngày',
    desc: 'Mở rộng thực hành sâu: ôn tập toàn diện, bài tập tình huống mở và luyện phản xạ.',
  },
];

const COMMON_TIMEZONES = [
  { value: 'Asia/Ho_Chi_Minh', label: 'Việt Nam (GMT+7) - Asia/Ho_Chi_Minh' },
  { value: 'Asia/Bangkok', label: 'Bangkok (GMT+7) - Asia/Bangkok' },
  { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9) - Asia/Tokyo' },
  { value: 'Asia/Singapore', label: 'Singapore (GMT+8) - Asia/Singapore' },
  { value: 'UTC', label: 'Giờ chuẩn quốc tế - UTC' },
  { value: 'America/New_York', label: 'New York (EST/EDT) - America/New_York' },
  { value: 'Europe/London', label: 'London (GMT/BST) - Europe/London' },
];

export const LearningSettingsView: React.FC = () => {
  const { navigate } = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Profile data
  const [profile, setProfile] = useState<LearningProfile | null>(null);

  // Form states
  const [timeBudget, setTimeBudget] = useState<15 | 30 | 45>(30);
  const [focus, setFocus] = useState<'general' | 'system'>('general');
  const [timezone, setTimezone] = useState<string>('Asia/Ho_Chi_Minh');
  const [preferredDays, setPreferredDays] = useState<number[]>([1, 2, 3, 4, 5]);

  // Action states
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchProfile = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.getLearningProfile();
      setProfile(data);
      setTimeBudget(data.time_budget_minutes);
      setFocus(data.focus);
      setTimezone(data.timezone);
      setPreferredDays(data.preferred_days);
    } catch (err) {
      setLoadError((err as Error).message || 'Không thể tải hồ sơ học tập');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProfile();
  }, []);

  const toggleDay = (day: number) => {
    setSaveSuccess(null);
    setSaveError(null);
    if (preferredDays.includes(day)) {
      if (preferredDays.length === 1) {
        setSaveError('Vui lòng chọn ít nhất 1 ngày học trong tuần.');
        return;
      }
      setPreferredDays(preferredDays.filter((d) => d !== day));
    } else {
      setPreferredDays([...preferredDays, day].sort((a, b) => a - b));
    }
  };

  const setPresetDays = (preset: 'all' | 'weekdays' | 'weekend') => {
    setSaveSuccess(null);
    setSaveError(null);
    if (preset === 'all') setPreferredDays([1, 2, 3, 4, 5, 6, 7]);
    if (preset === 'weekdays') setPreferredDays([1, 2, 3, 4, 5]);
    if (preset === 'weekend') setPreferredDays([6, 7]);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    if (preferredDays.length === 0) {
      setSaveError('Vui lòng chọn ít nhất một ngày học trong tuần.');
      setSaving(false);
      return;
    }

    try {
      const payload: UpdateLearningProfilePayload = {
        time_budget_minutes: timeBudget,
        focus,
        timezone,
        preferred_days: preferredDays,
      };

      const updated = await api.updateLearningProfile(payload);
      setProfile(updated);
      setTimeBudget(updated.time_budget_minutes);
      setFocus(updated.focus);
      setTimezone(updated.timezone);
      setPreferredDays(updated.preferred_days);
      setSaveSuccess('Đã lưu cấu hình học tập cá nhân thành công!');
    } catch (err) {
      setSaveError((err as Error).message || 'Lưu cài đặt thất bại. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 md:p-8 flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-semibold">Đang tải cấu hình học tập...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-4xl mx-auto p-6 md:p-8">
        <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-3xl text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-600 dark:text-rose-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 dark:text-white">Không thể kết nối hồ sơ học tập</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">{loadError}</p>
          </div>
          <button
            onClick={() => void fetchProfile()}
            className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm rounded-2xl hover:opacity-90 transition"
          >
            Thử lại kết nối
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 pb-20">
      {/* Top Header & Navigation Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            <span>Cài đặt học tập cá nhân</span>
            <span>•</span>
            <span>Hồ sơ học tập</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Cài đặt lộ trình & Thời gian học
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Cá nhân hoá thời gian học, mục tiêu định hướng và lịch học hàng tuần của bạn.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/settings/ai')}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Cài đặt AI</span>
          </button>
        </div>
      </div>

      {/* Profile Status Banner */}
      <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
          <div className="font-bold flex items-center gap-2">
            <span>Trạng thái hồ sơ:</span>
            {profile?.is_default ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[11px] font-semibold">
                Mặc định hệ thống (Chưa tuỳ chỉnh)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold">
                Đã cá nhân hoá
              </span>
            )}
            {profile?.updated_at && (
              <span className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80">
                (Cập nhật lần cuối: {new Date(profile.updated_at).toLocaleString('vi-VN')})
              </span>
            )}
          </div>
          <p className="text-indigo-700 dark:text-indigo-300">
            Hồ sơ học tập được lưu trữ an toàn trên tài khoản của bạn. Mọi thay đổi sẽ tự động áp dụng cho lộ trình điều phối các bài học.
          </p>
        </div>
      </div>

      {/* Settings Form */}
      <div className="space-y-6">
        {/* Section 1: Định hướng học tập (Focus) */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-900 dark:text-white">Định hướng học tập chính</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Chọn chương trình học phù hợp với mục tiêu hiện tại của bạn.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* General Foundation */}
            <div
              onClick={() => { setFocus('general'); setSaveSuccess(null); }}
              className={`p-4 md:p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                focus === 'general'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-bold text-sm text-slate-900 dark:text-white">Tiếng Anh nền tảng & Giao tiếp</span>
                </div>
                <input
                  type="radio"
                  name="learning_focus"
                  checked={focus === 'general'}
                  onChange={() => setFocus('general')}
                  className="accent-indigo-600 w-4 h-4 cursor-pointer mt-0.5"
                />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                Chương trình chuẩn cho mọi học viên: củng cố ngữ âm, đại từ, thì cơ bản, từ vựng sinh hoạt và giao tiếp thường ngày.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                  Giao tiếp A1-B1
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                  Từ vựng đời sống
                </span>
              </div>
            </div>

            {/* IT / System Engineering */}
            <div
              onClick={() => { setFocus('system'); setSaveSuccess(null); }}
              className={`p-4 md:p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                focus === 'system'
                  ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-bold text-sm text-slate-900 dark:text-white">English for IT / System</span>
                </div>
                <input
                  type="radio"
                  name="learning_focus"
                  checked={focus === 'system'}
                  onChange={() => setFocus('system')}
                  className="accent-indigo-600 w-4 h-4 cursor-pointer mt-0.5"
                />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                Khoá chuyên biệt định hướng kỹ thuật hệ thống: hướng dẫn cài đặt, command-line, server status, incident ticket, log analysis và trao đổi kỹ thuật.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                  IT & DevOps
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                  Báo lỗi & Bàn giao
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Thời lượng học mỗi ngày (Time Budget) */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-900 dark:text-white">Thời lượng học mỗi ngày</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Điều chỉnh số phút học dự kiến để hệ thống sắp xếp khối lượng bài phù hợp.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
            {TIME_OPTIONS.map((opt) => {
              const isSelected = timeBudget === opt.value;
              return (
                <div
                  key={opt.value}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setTimeBudget(opt.value);
                      setSaveSuccess(null);
                    }
                  }}
                  onClick={() => { setTimeBudget(opt.value); setSaveSuccess(null); }}
                  className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-base text-slate-900 dark:text-white">{opt.label}</span>
                      {opt.badge && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                      {opt.desc}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                    <input
                      type="radio"
                      name="time_budget"
                      checked={isSelected}
                      onChange={() => setTimeBudget(opt.value)}
                      className="accent-indigo-600 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isSelected ? 'Đang chọn' : 'Chọn mức này'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 3: Ngày học trong tuần (Preferred Days) */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-base text-slate-900 dark:text-white">Lịch học trong tuần</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Chọn những ngày bạn muốn nhận bài học trọng tâm.</p>
              </div>
            </div>

            {/* Quick preset buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setPresetDays('weekdays')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              >
                T2 - T6
              </button>
              <button
                type="button"
                onClick={() => setPresetDays('weekend')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              >
                Cuối tuần (T7, CN)
              </button>
              <button
                type="button"
                onClick={() => setPresetDays('all')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              >
                Cả tuần (7 ngày)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 pt-1">
            {WEEKDAYS.map((w) => {
              const active = preferredDays.includes(w.day);
              return (
                <button
                  key={w.day}
                  type="button"
                  onClick={() => toggleDay(w.day)}
                  className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 text-center transition-all ${
                    active
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs font-bold">{w.short}</span>
                  <span className={`text-[11px] font-medium ${active ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {w.label}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            * Những ngày không chọn học chính vẫn luôn mở để bạn luyện tập tự do hoặc ôn từ đến hạn bất kỳ lúc nào.
          </p>
        </section>

        {/* Section 4: Múi giờ địa phương (Timezone) */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-100 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-900 dark:text-white">Múi giờ khu vực</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Dùng để tính ngày học địa phương và chốt kế hoạch học tập hàng ngày chính xác.</p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Chọn múi giờ IANA chuẩn
            </label>
            <select
              value={timezone}
              onChange={(e) => { setTimezone(e.target.value); setSaveSuccess(null); }}
              aria-label="Múi giờ IANA chuẩn"
              className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
              {!COMMON_TIMEZONES.some((tz) => tz.value === timezone) && (
                <option value={timezone}>{timezone} (Hiện tại)</option>
              )}
            </select>
          </div>
        </section>
      </div>

      {/* Save Action & Feedback Messages */}
      <div className="pt-2 space-y-4">
        {saveError && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-3 text-rose-700 dark:text-rose-300 text-sm font-semibold">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-700 dark:text-emerald-300 text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-sm text-slate-700 dark:text-slate-300 transition"
          >
            Quay lại Trang chủ
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="w-full sm:w-auto px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-sm rounded-2xl hover:opacity-90 transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang lưu cài đặt...</span>
              </>
            ) : (
              <span>Lưu cài đặt học tập</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

