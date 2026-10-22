import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useRouter } from '../context/RouterContext';
import { useControlAudio } from '../utils/useControlAudio';
import { playAudio } from '../utils/audio';
import { 
  ArrowLeft, 
  Volume2, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Star, 
  Settings, 
  History as HistoryIcon,
  Sparkles,
  Loader2,
  X,
  BookOpen
} from 'lucide-react';

type Feedback = {
  correct: boolean;
  expected: string;
  translation: string;
  explanation: string;
  skipped: boolean;
};

type Attempt = {
  id: string;
  set_id: number;
  kind: string;
  saved: boolean;
  index: number;
  total: number;
  completed: boolean;
  correct: number;
  passage: string;
  difficulty: string;
  draft: string[] | string | null;
  feedback: Feedback | null;
  question: null | {
    id: string;
    type: 'order' | 'fill' | 'translate' | 'choice' | 'cloze';
    word_id?: number;
    definition?: string;
    prompt: string;
    required_token_count?: number;
    tokens?: { id: string; text: string }[];
    options?: { id: string; text: string }[];
  };
};

type History = {
  id: string;
  kind: string;
  saved: boolean;
  completed: boolean;
  index: number;
  correct: number;
  created_at: string;
};

export function PersistentExercise({ kind }: { kind: 'grammar_order' | 'reading' }) {
  const { params, navigate } = useRouter();
  const setId = Number(params.id) || 163;

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [history, setHistory] = useState<History[]>([]);
  const [selected, setSelected] = useState<string[] | string>(kind === 'grammar_order' ? [] : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [definition, setDefinition] = useState(false);
  const [translation, setTranslation] = useState(false);

  // Settings
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [starred, setStarred] = useState(false);
  const [unmastered, setUnmastered] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');
  const [types, setTypes] = useState<string[]>(['order', 'fill', 'translate']);

  const saving = useRef<Promise<unknown>>(Promise.resolve());

  const apply = (value: Attempt) => {
    setAttempt(value);
    setSelected(value.draft || (kind === 'grammar_order' ? [] : ''));
    setDefinition(false);
    setTranslation(false);
  };

  const refreshHistory = () =>
    api
      .request<{ items: History[] }>('GET', `/exercise-attempts?kind=${kind}&set_id=${setId}`)
      .then((v) => setHistory(v.items || []));

  useEffect(() => {
    setAttempt(null);
    setError('');
    void refreshHistory().catch((e) => setError(e.message));
    void start(true);
  }, [setId, kind]);

  const operation = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await saving.current;
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const start = (resume = false) =>
    operation(async () => {
      apply(
        await api.request<Attempt>('POST', '/exercise-attempts', {
          set_id: setId,
          kind,
          resume,
          difficulty,
          question_types: types,
          starred_only: starred,
          unmastered_only: unmastered,
          original_order: ordered,
        })
      );
      await refreshHistory();
    });

  const draft = (value: string[] | string) => {
    if (!attempt?.question) return;
    setSelected(value);
    const id = attempt.id;
    const question_id = attempt.question.id;
    saving.current = saving.current
      .catch(() => {})
      .then(() => api.request('PUT', `/exercise-attempts/${id}`, { question_id, draft: value }));
    void saving.current.catch((e) => setError(e.message));
  };

  const check = (skip = false) =>
    operation(async () => {
      if (!attempt?.question) return;
      apply(
        await api.request<Attempt>('POST', `/exercise-attempts/${attempt.id}/answers`, {
          question_id: attempt.question.id,
          answer: selected,
          skip,
        })
      );
      await refreshHistory();
    });

  const next = () =>
    operation(async () => {
      if (!attempt?.question) return;
      apply(
        await api.request<Attempt>('POST', `/exercise-attempts/${attempt.id}/next`, {
          question_id: attempt.question.id,
        })
      );
      await refreshHistory();
    });

  const speak = () => {
    const text = attempt?.feedback?.expected || attempt?.passage;
    if (text) playAudio(text, 'en-US', 0.9);
  };

  useControlAudio(speak);

  const question = attempt?.question;
  const tokens = question?.tokens || [];
  const selection = Array.isArray(selected) ? selected : [];
  const ready =
    question?.type === 'order'
      ? selection.length === (question.required_token_count ?? tokens.length)
      : typeof selected === 'string' && !!selected.trim();

  // Enter shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest('button,select,textarea,[contenteditable="true"]')) return;
      if (
        e.key === 'Enter' &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey &&
        !busy &&
        question &&
        !settingsOpen
      ) {
        e.preventDefault();
        if (attempt?.feedback) void next();
        else if (ready) void check();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const progressPercent = attempt?.total ? Math.round((attempt.index / attempt.total) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* 1. Header Toolbar matching source-grammar-order.png */}
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(`/study-set/${setId}`)}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 transition p-2 -ml-2 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại bộ từ</span>
        </button>

        <div className="flex items-center gap-2">
          {attempt && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void operation(async () => {
                  apply(
                    await api.request<Attempt>('PUT', `/exercise-attempts/${attempt.id}`, {
                      saved: !attempt.saved,
                    })
                  );
                  await refreshHistory();
                })
              }
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs font-bold transition shadow-2xs ${
                attempt.saved
                  ? 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${attempt.saved ? 'fill-amber-400 text-amber-500' : ''}`} />
              <span>{attempt.saved ? 'Đã lưu' : 'Lưu bài'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setHistoryOpen(!historyOpen)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 transition"
          >
            <HistoryIcon className="w-4 h-4 text-slate-500" />
            <span>Lịch sử ({history.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="p-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 transition"
            aria-label="Cài đặt"
          >
            <Settings className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </header>

      {/* Settings Modal matching source-grammar-settings.png */}
      {settingsOpen && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Cài đặt ngữ pháp
              </h3>
              <p className="text-[11px] text-slate-400">
                Tùy chỉnh cách bạn muốn luyện tập sắp xếp câu
              </p>
            </div>
            <button
              onClick={() => setSettingsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Lọc từ vựng */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-900 dark:text-white block">
                Lọc từ vựng
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={starred}
                    onChange={(e) => setStarred(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Chỉ học từ đánh dấu sao</span>
                </label>
                <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={unmastered}
                    onChange={(e) => setUnmastered(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Chỉ học từ chưa thuộc</span>
                </label>
              </div>
            </div>

            {/* Thứ tự học */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-900 dark:text-white block">
                Thứ tự học
              </label>
              <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={ordered}
                  onChange={(e) => setOrdered(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span>Học theo thứ tự (không xáo trộn)</span>
              </label>
            </div>

            {/* Độ khó matching source-grammar-settings.png */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-900 dark:text-white block">
                Độ khó
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: 'easy', label: 'Dễ' },
                  { val: 'medium', label: 'Trung bình' },
                  { val: 'hard', label: 'Khó' },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setDifficulty(item.val)}
                    className={`py-2.5 rounded-2xl border text-xs font-bold transition ${
                      difficulty === item.val
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200 ring-1 ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Loại câu hỏi */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-900 dark:text-white block">
                Loại câu hỏi
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['order', 'Sắp xếp câu'],
                  ['fill', 'Điền từ'],
                  ['translate', 'Dịch câu'],
                ].map(([val, label]) => (
                  <label
                    key={val}
                    className="flex items-center gap-2 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-medium cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={types.includes(val)}
                      onChange={(e) =>
                        setTypes((t) => (e.target.checked ? [...t, val] : t.filter((x) => x !== val)))
                      }
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={busy || !types.length}
            onClick={() => {
              setSettingsOpen(false);
              void start(false);
            }}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-2xl text-xs font-black transition shadow-xs"
          >
            Áp dụng và bắt đầu bài mới
          </button>
        </div>
      )}

      {/* History Panel */}
      {historyOpen && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Lịch sử các bài tập đã làm
            </h3>
            <button
              onClick={() => setHistoryOpen(false)}
              className="text-xs text-slate-400 font-bold hover:text-slate-600"
            >
              Đóng
            </button>
          </div>
          {history.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Chưa có bài tập nào.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {history.map((h) => (
                <button
                  key={h.id}
                  disabled={busy}
                  onClick={() =>
                    void operation(async () => {
                      apply(await api.request<Attempt>('GET', `/exercise-attempts/${h.id}`));
                      setHistoryOpen(false);
                    })
                  }
                  className={`w-full p-2.5 rounded-xl border text-left text-xs font-medium flex items-center justify-between transition ${
                    attempt?.id === h.id
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                      : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>
                    {h.saved ? '★ ' : ''}
                    {new Date(h.created_at).toLocaleString('vi-VN')}
                  </span>
                  <span>{h.completed ? `Hoàn thành (${h.correct} đúng)` : `Đang ở câu ${h.index + 1}`}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void start(false)}
            className="underline font-bold text-rose-900"
          >
            Tạo bài mới
          </button>
        </div>
      )}

      {/* Progress Counters */}
      {attempt && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>
              Câu hỏi: <strong>{Math.min(attempt.index + 1, attempt.total)}</strong> / {attempt.total}
            </span>
            <span>
              Đúng: <strong>{attempt.correct}</strong> câu
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-slate-900 dark:bg-white transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Interactive Stage */}
      {attempt && (
        <>
          {attempt.completed ? (
            /* Completed Screen */
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-sm">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-black text-slate-900 dark:text-white">
                  Hoàn thành bài tập ngữ pháp
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Bạn đã trả lời đúng {attempt.correct} / {attempt.total} câu hỏi.
                </p>
              </div>

              <div className="flex gap-3 justify-center pt-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void start(false)}
                  className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition shadow-xs"
                >
                  Luyện bài tập mới
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/study-set/${setId}`)}
                  className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 transition"
                >
                  Quay lại bộ từ
                </button>
              </div>
            </section>
          ) : (
            question && (
              /* Question & Feedback matching source-grammar-order.png & local-grammar-feedback.png */
              <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {question.type === 'order'
                      ? 'Sắp xếp câu'
                      : question.type === 'fill'
                      ? 'Điền từ'
                      : 'Dịch câu'}
                  </span>

                  {question.definition && (
                    <button
                      type="button"
                      onClick={() => setDefinition((v) => !v)}
                      className="text-xs font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1.5"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{definition ? 'Ẩn định nghĩa' : 'Xem định nghĩa'}</span>
                    </button>
                  )}
                </div>

                {definition && question.definition && (
                  <p className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 text-xs text-indigo-900 dark:text-indigo-200 font-medium border border-indigo-100 dark:border-indigo-900">
                    {question.definition}
                  </p>
                )}

                {/* Prompt */}
                <div>
                  <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white leading-snug">
                    {question.prompt}
                  </h2>
                  {question.type === 'order' &&
                    question.required_token_count !== undefined &&
                    tokens.length > question.required_token_count && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold mt-1">
                        * Chọn {question.required_token_count} thẻ để hoàn thành câu ({tokens.length - question.required_token_count} từ gây nhiễu).
                      </p>
                    )}
                </div>

                {/* Sentence Token Ordering UI matching source-grammar-order.png */}
                {question.type === 'order' ? (
                  <div className="space-y-4">
                    {/* Active Construction Zone */}
                    <div
                      aria-label="Câu đang sắp xếp"
                      className="min-h-24 p-4 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-950/20 flex flex-wrap items-center gap-2"
                    >
                      {selection.length > 0 ? (
                        selection.map((id) => {
                          const tok = tokens.find((t) => t.id === id);
                          return (
                            <button
                              key={id}
                              type="button"
                              disabled={!!attempt.feedback || busy}
                              onClick={() => draft(selection.filter((x) => x !== id))}
                              className="px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 text-xs font-bold text-slate-900 dark:text-white shadow-2xs hover:border-rose-400 hover:text-rose-600 transition flex items-center gap-1.5"
                            >
                              <span>{tok?.text}</span>
                              <X className="w-3 h-3 text-slate-400" />
                            </button>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-400 font-medium italic">
                          Nhấn vào các từ bên dưới để ghép thành câu hoàn chỉnh
                        </p>
                      )}
                    </div>

                    {/* Available Tokens Pool matching source-grammar-order.png */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {tokens.map((t) => {
                        const isUsed = selection.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            disabled={isUsed || !!attempt.feedback || busy}
                            onClick={() => draft([...selection, t.id])}
                            className={`px-4 py-2.5 rounded-2xl border text-xs font-bold transition shadow-2xs ${
                              isUsed
                                ? 'opacity-25 bg-slate-100 border-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-indigo-500 hover:text-indigo-600'
                            }`}
                          >
                            {t.text}
                          </button>
                        );
                      })}
                    </div>

                    {selection.length > 0 && !attempt.feedback && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => draft([])}
                          className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
                        >
                          Xóa lựa chọn
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Fill or Translate Input */
                  <div className="space-y-2">
                    <input
                      aria-label="Câu trả lời"
                      autoComplete="off"
                      spellCheck={false}
                      disabled={!!attempt.feedback || busy}
                      value={typeof selected === 'string' ? selected : ''}
                      onChange={(e) => draft(e.target.value)}
                      placeholder={
                        question.type === 'translate'
                          ? 'Nhập câu tiếng Anh tương ứng...'
                          : 'Nhập từ thích hợp vào chỗ trống...'
                      }
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm font-semibold bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </div>
                )}

                {/* Feedback or Action Buttons matching local-grammar-feedback.png */}
                {attempt.feedback ? (
                  <div className="space-y-4 pt-2">
                    <div
                      className={`p-5 rounded-2xl border space-y-3 ${
                        attempt.feedback.correct
                          ? 'border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200'
                          : 'border-rose-200 bg-rose-50/60 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-black text-sm">
                          {attempt.feedback.correct ? (
                            <>
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                              <span>✓ Chính xác!</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                              <span>Cần ôn lại câu này</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => playAudio(attempt.feedback?.expected || '', 'en-US', 0.9)}
                            className="p-1 rounded hover:bg-slate-200/50 text-slate-600"
                            title="Nghe câu đáp án (Ctrl)"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>

                          {attempt.feedback.translation && (
                            <button
                              type="button"
                              onClick={() => setTranslation((v) => !v)}
                              className="text-[11px] underline font-semibold text-indigo-700"
                            >
                              {translation ? 'Ẩn bản dịch' : 'Dịch nghĩa'}
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs font-semibold">
                        Đáp án đúng: <strong className="text-sm underline">{attempt.feedback.expected}</strong>
                      </p>

                      {translation && attempt.feedback.translation && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 italic pt-1 border-t border-slate-200/40">
                          {attempt.feedback.translation}
                        </p>
                      )}

                      {attempt.feedback.explanation && (
                        <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">
                          {attempt.feedback.explanation}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void next()}
                      className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition shadow-sm"
                    >
                      Tiếp tục (Enter)
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 pt-1">
                    <button
                      type="button"
                      disabled={!ready || busy}
                      onClick={() => void check()}
                      className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-black transition shadow-xs"
                    >
                      {busy ? 'Đang kiểm tra...' : 'Kiểm tra'}
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void check(true)}
                      className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-500 text-xs font-bold transition"
                    >
                      Tôi không biết
                    </button>
                  </div>
                )}
              </section>
            )
          )}

          <p className="text-center text-[11px] font-medium text-slate-400">
            Ctrl đơn: nghe câu đáp án • Enter: kiểm tra / tiếp tục
          </p>
        </>
      )}
    </div>
  );
}
