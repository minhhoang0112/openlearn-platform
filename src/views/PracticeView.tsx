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
  FileAudio
} from 'lucide-react';
import { api, SetCard, LearningPhraseLibrary } from '../api/client';
import { useRouter } from '../context/RouterContext';

interface PracticeModeInfo {
  id: string;
  title: string;
  category: 'Nghe – Phát âm' | 'Nói – Viết' | 'Ngữ pháp – Đọc hiểu' | 'Phản xạ – Kiểm tra';
  description: string;
  icon: React.ElementType;
  color: string;
  badge?: string;
  buildRoute: (setId: number) => string;
}

const PRACTICE_MODES: PracticeModeInfo[] = [
  {
    id: 'sentence_listening',
    title: 'Nghe từng câu & Shadowing',
    category: 'Nghe – Phát âm',
    description: 'Nghe câu riêng biệt với WAV thật, điều chỉnh tốc độ, tự thu âm và luyện nói đuổi.',
    icon: Headphones,
    color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
    badge: 'Mới V2',
    buildRoute: () => '/listening',
  },
  {
    id: 'personal_materials',
    title: 'Học liệu nghe cá nhân',
    category: 'Nghe – Phát âm',
    description: 'Tải lên bài nghe riêng từ máy tính, lưu vị trí nghe, tốc độ và lặp đoạn A–B.',
    icon: FileAudio,
    color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800',
    badge: 'Mới V2',
    buildRoute: () => '/materials',
  },
  {
    id: 'dictation',
    title: 'Nghe chép chính tả',
    category: 'Nghe – Phát âm',
    description: 'Luyện nghe câu thật, phân biệt từng từ trong câu và rèn độ nhạy ngữ âm.',
    icon: Headphones,
    color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800',
    buildRoute: (setId) => `/dictation/${setId}`,
  },
  {
    id: 'speaking',
    title: 'Luyện nói & Phát âm AI',
    category: 'Nghe – Phát âm',
    description: 'Nghe mẫu bản xứ, thu âm nói và nhận phản hồi chi tiết từ AI.',
    icon: Mic,
    color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800',
    buildRoute: (setId) => `/ai-study/${setId}`,
  },
  {
    id: 'conversation',
    title: 'Hội thoại tương tác',
    category: 'Nói – Viết',
    description: 'Đóng vai và trò chuyện theo tình huống cụ thể bằng từ vựng của bài.',
    icon: MessageSquare,
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    buildRoute: (setId) => `/conversation/${setId}`,
  },
  {
    id: 'grammar',
    title: 'Ngữ pháp & Trật tự câu',
    category: 'Ngữ pháp – Đọc hiểu',
    description: 'Sắp xếp câu đúng cấu trúc ngữ pháp với 3 cấp độ thử thách.',
    icon: AlignLeft,
    color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
    buildRoute: (setId) => `/grammar/${setId}`,
  },
  {
    id: 'reading',
    title: 'Đọc hiểu & Điền từ',
    category: 'Ngữ pháp – Đọc hiểu',
    description: 'Đọc đoạn văn ngữ cảnh thật, điền từ vào chỗ trống và trả lời câu hỏi hiểu ý.',
    icon: BookOpen,
    color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    buildRoute: (setId) => `/reading/${setId}`,
  },
  {
    id: 'match',
    title: 'Ghép thẻ phản xạ',
    category: 'Phản xạ – Kiểm tra',
    description: 'Nối nhanh từ vựng với định nghĩa tiếng Anh để tăng tốc độ nhận biết từ.',
    icon: Layers,
    color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
    buildRoute: (setId) => `/game/match/${setId}`,
  },
  {
    id: 'exam',
    title: 'Kiểm tra trắc nghiệm',
    category: 'Phản xạ – Kiểm tra',
    description: 'Làm bài kiểm tra tổng hợp trắc nghiệm kết hợp tự luận để đánh giá năng lực.',
    icon: Award,
    color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800',
    buildRoute: (setId) => `/exam/${setId}`,
  },
];

export const PracticeView: React.FC = () => {
  const { navigate } = useRouter();

  const [sets, setSets] = useState<SetCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phraseLibrary, setPhraseLibrary] = useState<LearningPhraseLibrary | null>(null);

  // Selected mode
  const [activeMode, setActiveMode] = useState<PracticeModeInfo>(PRACTICE_MODES[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');

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
    let mounted = true;
    api.getSets()
      .then((res) => {
        if (mounted) {
          setSets(res.items || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError((err as Error).message || 'Không thể tải danh sách bộ từ');
          setLoading(false);
        }
      });

    fetchPhraseLibrary();

    const handleSrsUpdated = () => {
      fetchPhraseLibrary();
    };

    window.addEventListener('openquiz:srs-updated', handleSrsUpdated);

    return () => {
      mounted = false;
      window.removeEventListener('openquiz:srs-updated', handleSrsUpdated);
    };
  }, []);

  const categories = ['Tất cả', 'Nghe – Phát âm', 'Nói – Viết', 'Ngữ pháp – Đọc hiểu', 'Phản xạ – Kiểm tra'];

  const filteredModes = selectedCategory === 'Tất cả'
    ? PRACTICE_MODES
    : PRACTICE_MODES.filter((m) => m.category === selectedCategory);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 pb-20">
      {/* Top Banner */}
      <div className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
          <span>Trung tâm kỹ năng</span>
          <span>•</span>
          <span>Luyện tập tự do</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Luyện tập theo kỹ năng
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
          Tập trung vào từng kỹ năng chuyên biệt: Nghe–Phát âm, Nói–Viết, Ngữ pháp–Đọc hiểu bằng ngữ liệu từ các bộ từ vựng thực tế của bạn.
        </p>
      </div>

      {/* Feature Highlight: V2 Sentence Listening & Shadowing */}
      <div className="p-5 md:p-6 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider">
              Tính năng V2 mới
            </span>
            <span className="text-xs text-indigo-200">50 audio WAV từng câu riêng biệt</span>
          </div>
          <h3 className="text-lg md:text-xl font-black">
            Luyện nghe câu & Nói đuổi (Shadowing)
          </h3>
          <p className="text-xs text-indigo-200 max-w-xl">
            Tập trung rèn phản xạ ngữ âm cho từng câu ngắn với audio chuẩn, tùy chỉnh tốc độ, số lần nhắc lại và tự thu âm đối chiếu.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/listening')}
          className="px-6 py-3 bg-white text-indigo-950 font-black text-xs rounded-2xl hover:bg-indigo-50 transition shadow-md shrink-0 flex items-center justify-center gap-2"
        >
          <Headphones className="w-4 h-4 text-indigo-600" />
          <span>Vào thư viện luyện nghe</span>
          <ChevronRight className="w-4 h-4 text-indigo-600" />
        </button>
      </div>

      {/* V2 Phrase Library Card (When user has saved phrases) */}
      {phraseLibrary && phraseLibrary.set_id && (
        <div className="p-5 md:p-6 rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg border border-emerald-700/30">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider">
                Bộ cụm từ V2
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
              Cụm từ ngữ cảnh được bạn lưu từ bài học V2, tích hợp vào bộ thẻ cá nhân và hệ thống lặp lại ngắt quãng (SRS).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {phraseLibrary.route && (
              <button
                type="button"
                onClick={() => navigate(phraseLibrary.route!)}
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

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
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
          const isCurrent = activeMode.id === mode.id;

          return (
            <div
              key={mode.id}
              onClick={() => setActiveMode(mode)}
              className={`p-5 rounded-3xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                isCurrent
                  ? 'border-indigo-600 bg-white dark:bg-slate-900 shadow-md ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${mode.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {mode.category}
                  </span>
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
                <span className={`text-xs font-bold ${isCurrent ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                  {isCurrent ? 'Đang chọn chế độ này' : 'Bấm để chọn'}
                </span>
                <ChevronRight className={`w-4 h-4 transition-transform ${isCurrent ? 'translate-x-1 text-indigo-600' : 'text-slate-300'}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Choose Set to Practice section */}
      <div className="bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 md:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center ${activeMode.color}`}>
              <activeMode.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bước tiếp theo</div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Chọn bộ từ để luyện: <span className="text-indigo-600 dark:text-indigo-400">{activeMode.title}</span>
              </h2>
            </div>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            {sets.length} bộ từ có sẵn trong thư viện
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-xs font-bold">Đang tải danh sách học liệu...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 rounded-2xl text-center text-rose-600 text-sm">
            {error}
          </div>
        ) : sets.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
            <FolderOpen className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Bạn chưa có bộ từ nào để bắt đầu bài luyện tập
            </p>
            <p className="text-xs text-slate-500">
              Hãy tạo bộ thẻ mới hoặc duyệt thư viện để thêm học liệu trước.
            </p>
            <button
              onClick={() => navigate('/create-flashcard')}
              className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl"
            >
              Tạo bộ thẻ mới
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {sets.map((s) => (
              <div
                key={s.id}
                onClick={() => navigate(activeMode.buildRoute(s.id))}
                className="group p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl cursor-pointer transition-all shadow-xs hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold">{s.tag || 'Từ vựng'}</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-[11px] text-slate-600 dark:text-slate-300">
                      {s.word_count} từ
                    </span>
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                    {s.title}
                  </h4>
                  {s.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {s.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <span>Bắt đầu luyện ngay</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

