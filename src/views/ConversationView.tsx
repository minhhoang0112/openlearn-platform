import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { playAudio, recognizeSpeech, speechRecognitionAvailable } from '../utils/audio';
import { useControlAudio } from '../utils/useControlAudio';
import { parsePracticeLaunchQuery } from '../utils/practiceLaunch';
import { LearningBreadcrumb } from '../components/LearningBreadcrumb';
import { 
  ArrowLeft, 
  Volume2, 
  Languages, 
  Send, 
  Mic, 
  MicOff, 
  Sparkles, 
  RotateCcw, 
  History as HistoryIcon,
  Bot,
  User,
  Trash2,
  Loader2,
  AlertCircle,
  Repeat
} from 'lucide-react';

type Message = { id: number; role: string; content: string };
type Thread = { id: string; set_id: number; title: string; messages: Message[] };

export function ConversationView() {
  const { params, path, navigate } = useRouter();
  const { capabilities } = useAuth();
  const setId = Number(params.id) || 163;
  const launchQuery = useMemo(() => parsePracticeLaunchQuery(path), [path]);

  const [thread, setThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [saved, setSaved] = useState<Thread[]>([]);

  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [topic, setTopic] = useState('');
  const [exam, setExam] = useState('none');
  const [filters, setFilters] = useState({
    no_vocab_hints: false,
    starred_only: false,
    unmastered_only: false,
    ordered: false,
  });

  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [visible, setVisible] = useState<Record<number, boolean>>({});
  const [hint, setHint] = useState<{ hint: string; example: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const sending = useRef(false);
  const recognitionCleanup = useRef<(() => void) | null>(null);

  const loadHistory = () =>
    api
      .request<{ items: Thread[] }>('GET', '/conversations')
      .then((r) => setSaved(r.items.filter((t) => t.set_id === setId)));

  useEffect(() => {
    setThread(null);
    setMessages([]);
    setInput('');
    setError('');
    setTranslations({});
    setVisible({});
    setHint(null);
    void loadHistory().catch((e) => setError(e.message));
    return () => {
      recognitionCleanup.current?.();
    };
  }, [setId]);

  // Standalone Ctrl plays latest assistant message
  useControlAudio(() => {
    const last = messages.filter((m) => m.role === 'assistant').at(-1);
    if (last) playAudio(last.content, 'en-US');
  });

  const run = async (work: () => Promise<void>) => {
    if (sending.current) return;
    if (!capabilities?.ai.configured) {
      navigate('/settings/ai?returnTo=' + encodeURIComponent(path));
      return;
    }
    sending.current = true;
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (e: any) {
      setError(e?.message || 'Không kết nối được AI. Hãy thử lại.');
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };

  const start = () =>
    run(async () => {
      let id = thread;
      if (!id) {
        const r = await api.request<{ id: string }>('POST', '/conversations', {
          set_id: setId,
          settings: {
            language: 'en',
            exam,
            topic,
            ...filters,
            ...(launchQuery.wordIds.length > 0 ? { word_ids: launchQuery.wordIds.slice(0, 100) } : {}),
          },
        });
        id = r.id;
        setThread(id);
      }
      const r = await api.request<{ messages: Message[] }>('POST', `/conversations/${id}/start`, {});
      setMessages(r.messages);
      await loadHistory();
    });

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!thread || !input.trim() || busy) return;
    const text = input.trim();
    void run(async () => {
      const r = await api.request<{ messages: Message[] }>(
        'POST',
        `/conversations/${thread}/messages`,
        { message: text }
      );
      setMessages(r.messages);
      setInput('');
      setHint(null);
    });
  };

  const translate = (m: Message) =>
    run(async () => {
      if (translations[m.id]) {
        setVisible((v) => ({ ...v, [m.id]: !v[m.id] }));
        return;
      }
      const r = await api.request<{ translation: string }>(
        'POST',
        `/conversations/${thread}/messages/${m.id}/translation`,
        {}
      );
      setTranslations((v) => ({ ...v, [m.id]: r.translation }));
      setVisible((v) => ({ ...v, [m.id]: true }));
    });

  const resume = (id: string) =>
    run(async () => {
      const r = await api.request<Thread>('GET', `/conversations/${id}`);
      setThread(r.id);
      setMessages(r.messages);
      setInput('');
      setHint(null);
      setTranslations({});
      setVisible({});
      setHistoryOpen(false);
    });

  const microphone = () => {
    if (recording) {
      recognitionCleanup.current?.();
      recognitionCleanup.current = null;
      setRecording(false);
      return;
    }
    if (!speechRecognitionAvailable()) {
      setError('Trình duyệt chưa hỗ trợ nhận dạng giọng nói. Bạn có thể nhập tin nhắn.');
      return;
    }
    setError('');
    setRecording(true);
    try {
      recognitionCleanup.current = recognizeSpeech(
        (transcript) => {
          setInput((prev) => (prev ? prev + ' ' + transcript : transcript));
        },
        () => setRecording(false),
        (msg) => {
          setRecording(false);
          setError(msg);
        },
        'en-US'
      );
    } catch {
      setRecording(false);
      setError('Không bật được micro.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* 1. Header Navigation */}
      <LearningBreadcrumb
        currentLabel="Hội thoại AI"
        setId={setId}
        rightSlot={
          <div className="flex items-center gap-2">
            {thread && (
              <button
                type="button"
                onClick={() => {
                  setThread(null);
                  setMessages([]);
                  setHint(null);
                  setInput('');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-50 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Hội thoại mới</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setHistoryOpen(!historyOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-50 transition"
            >
              <HistoryIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Lịch sử ({saved.length})</span>
            </button>
          </div>
        }
      />

      {(launchQuery.reviewScope || launchQuery.wordIds.length > 0) && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3 flex-wrap text-xs">
          <span className="font-bold text-amber-800 dark:text-amber-300">
            Luyện vận dụng từ đến hạn — không thay lượt ôn nhớ ({launchQuery.wordIds.slice(0, 100).length} từ mục tiêu)
          </span>
          <button
            type="button"
            onClick={() => navigate('/repetition-study')}
            className="px-3 py-1.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-bold inline-flex items-center gap-1.5 transition"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Quay về ôn tập</span>
          </button>
        </div>
      )}

      {/* History Modal */}
      {historyOpen && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Lịch sử các cuộc hội thoại
            </h3>
            <button
              onClick={() => setHistoryOpen(false)}
              className="text-xs text-slate-400 font-bold hover:text-slate-600"
            >
              Đóng
            </button>
          </div>
          {saved.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Chưa có hội thoại nào được lưu.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {saved.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  <button
                    disabled={busy}
                    onClick={() => void resume(t.id)}
                    className="text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 truncate flex-1 text-left"
                  >
                    {t.title || 'Hội thoại tiếng Anh'}
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await api.request('DELETE', `/conversations/${t.id}`, {});
                        if (thread === t.id) {
                          setThread(null);
                          setMessages([]);
                        }
                        await loadHistory();
                      })
                    }
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg ml-2"
                    title="Xóa cuộc hội thoại"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          {!messages.length && (
            <button
              type="button"
              onClick={() => void start()}
              className="underline font-bold text-rose-900"
            >
              Thử lại
            </button>
          )}
        </div>
      )}

      {/* 2. Setup Screen matching user-conversation-setup.png */}
      {!messages.length ? (
        <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
              Chế độ Hội thoại
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Tùy chỉnh cài đặt học tập của bạn trước khi bắt đầu trò chuyện với gia sư AI
            </p>
          </div>

          <div className="space-y-4">
            {/* Language */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-900 dark:text-white block">
                Ngôn ngữ đang học (ở flashcard này)
              </label>
              <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs font-bold text-slate-800 dark:text-slate-200">
                🇬🇧 English
              </div>
            </div>

            {/* Exam Target */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-900 dark:text-white block">
                Bạn muốn ôn tập dựa theo bài thi nào không?
              </label>
              <select
                value={exam}
                onChange={(e) => setExam(e.target.value)}
                disabled={!!thread}
                className="block w-full border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-xs font-medium bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="none">Không</option>
                <option value="toeic">TOEIC</option>
              </select>
            </div>

            {/* Conversation Topic */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-900 dark:text-white block">
                Chủ đề hội thoại
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={!!thread}
                placeholder="Tự động theo bộ từ (hoặc nhập chủ đề tùy chọn...)"
                className="w-full border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-xs font-medium bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Filter Checkboxes */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-black text-slate-900 dark:text-white block">
                Lọc từ vựng
              </label>
              <div className="space-y-2">
                {[
                  { key: 'no_vocab_hints', label: 'Không gợi ý từ vựng' },
                  { key: 'starred_only', label: 'Chỉ học từ đánh dấu sao' },
                  { key: 'unmastered_only', label: 'Chỉ học từ chưa thuộc' },
                  { key: 'ordered', label: 'Học theo thứ tự (không xáo trộn)' },
                ].map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-center gap-2.5 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <input
                      type="checkbox"
                      checked={filters[key as keyof typeof filters]}
                      disabled={!!thread}
                      onChange={(e) =>
                        setFilters((v) => ({ ...v, [key]: e.target.checked }))
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
            disabled={busy}
            onClick={() => void start()}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-2xl text-xs font-black transition shadow-sm flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang kết nối AI...</span>
              </>
            ) : (
              <span>Bắt đầu cuộc hội thoại</span>
            )}
          </button>
        </section>
      ) : (
        /* 3. Chat Messages Stage matching local-conversation.png */
        <section className="space-y-4">
          <div className="space-y-3 min-h-[300px]">
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] rounded-3xl p-4 md:p-5 space-y-2 shadow-2xs ${
                      isUser
                        ? 'bg-slate-900 text-white rounded-tr-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-900 dark:text-white rounded-tl-xs'
                    }`}
                  >
                    <div className="text-[11px] font-bold opacity-60">
                      {isUser ? 'Bạn' : 'Gia sư AI'}
                    </div>

                    <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap select-text">
                      {m.content}
                    </p>

                    {!isUser && (
                      <div className="flex items-center gap-3 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <button
                          type="button"
                          onClick={() => playAudio(m.content, 'en-US')}
                          className="flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                          title="Nghe tin nhắn này"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Nghe</span>
                        </button>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void translate(m)}
                          className="flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                        >
                          <Languages className="w-3.5 h-3.5" />
                          <span>{visible[m.id] ? 'Ẩn bản dịch' : 'Dịch nghĩa'}</span>
                        </button>
                      </div>
                    )}

                    {visible[m.id] && translations[m.id] && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic pt-1 border-t border-slate-100 dark:border-slate-800">
                        {translations[m.id]}
                      </p>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-1">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Hint Area */}
          {hint && (
            <div className="p-4 rounded-3xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-xs space-y-2 animate-fadeIn">
              <div className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Gợi ý phản hồi:</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300">{hint.hint}</p>
              {hint.example && (
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-2">
                  <span className="font-serif italic text-slate-800 dark:text-slate-200 truncate">
                    "{hint.example}"
                  </span>
                  <button
                    type="button"
                    onClick={() => setInput(hint.example)}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold shrink-0 shadow-2xs"
                  >
                    Dùng câu này
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Input Form matching local-conversation.png */}
          <div className="space-y-2">
            <form onSubmit={send} className="relative">
              <textarea
                aria-label="Tin nhắn"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Write your response in English... (Enter để gửi)"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !busy) send(e);
                  }
                }}
                className="w-full p-4 pr-24 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs md:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 shadow-xs resize-none"
              />

              <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
                {speechRecognitionAvailable() && (
                  <button
                    type="button"
                    onClick={microphone}
                    className={`p-2 rounded-2xl transition ${
                      recording
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={recording ? 'Dừng micro' : 'Nói tin nhắn'}
                  >
                    {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}

                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  className="p-2 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white transition shadow-2xs"
                  title="Gửi tin nhắn"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-2">
              <span>Nhấn riêng <kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Ctrl</kbd> để nghe tin nhắn AI mới nhất.</span>

              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(async () =>
                    setHint(await api.request('POST', `/conversations/${thread}/hint`, {}))
                  )
                }
                className="underline font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Bí ý tưởng? Xem gợi ý</span>
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
