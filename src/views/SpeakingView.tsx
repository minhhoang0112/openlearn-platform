import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiWord } from '../api/client';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { playAudio, recognizeSpeech, speechRecognitionAvailable } from '../utils/audio';
import { PronunciationPractice } from '../components/PronunciationPractice';
import { LearningBreadcrumb } from '../components/LearningBreadcrumb';
import { useControlAudio } from '../utils/useControlAudio';
import { parsePracticeLaunchQuery } from '../utils/practiceLaunch';
import { 
  ArrowLeft, 
  Volume2, 
  Mic, 
  MicOff, 
  Sparkles, 
  Languages, 
  ChevronRight, 
  RotateCcw, 
  BookOpen, 
  History as HistoryIcon,
  Bot,
  Loader2,
  AlertCircle,
  Repeat
} from 'lucide-react';

export function SpeakingView() {
  const { params, path, navigate } = useRouter();
  const { capabilities } = useAuth();
  const setId = Number(params.id) || 163;
  const launchQuery = useMemo(() => parsePracticeLaunchQuery(path), [path]);

  const [words, setWords] = useState<ApiWord[]>([]);
  const [setTitle, setSetTitle] = useState('');
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [question, setQuestion] = useState('');
  const [feedback, setFeedback] = useState('');
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [definition, setDefinition] = useState(false);
  const [translation, setTranslation] = useState('');
  const [history, setHistory] = useState<{ id: string; kind: string; set_id: number; created_at: string }[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const recognitionCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getSet(setId)
      .then((s) => {
        if (!active) return;
        setSetTitle(s.title || '');
        const allWords = s.words || [];
        if (launchQuery.wordIds.length > 0) {
          const allowed = new Set(launchQuery.wordIds.slice(0, 20));
          setWords(allWords.filter((w) => allowed.has(w.id)));
        } else {
          setWords(allWords);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      recognitionCleanup.current?.();
    };
  }, [setId, launchQuery]);

  const word = words[index];

  // Standalone Ctrl reads question or word
  useControlAudio(() => playAudio(question || word?.term || '', 'en-US'));

  const loadHistory = () =>
    api
      .request<{ items: typeof history }>('GET', '/ai/history')
      .then((r) =>
        setHistory(r.items.filter((h) => h.set_id === setId && h.kind.startsWith('speaking_')))
      );

  useEffect(() => {
    void loadHistory().catch(() => {});
    setIndex(0);
    setQuestion('');
    setAnswer('');
    setFeedback('');
    setHint('');
    setTranslation('');
  }, [setId]);

  const record = () => {
    if (recording) {
      recognitionCleanup.current?.();
      recognitionCleanup.current = null;
      setRecording(false);
      return;
    }
    if (!speechRecognitionAvailable()) {
      setError('Trình duyệt chưa hỗ trợ nhận dạng giọng nói. Bạn có thể nhập câu trả lời vào ô.');
      return;
    }
    setError('');
    setRecording(true);
    try {
      recognitionCleanup.current = recognizeSpeech(
        (transcript) => {
          setAnswer((prev) => (prev ? prev + ' ' + transcript : transcript));
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

  const generate = async (kind: 'speaking_question' | 'speaking_feedback' | 'speaking_hint') => {
    if (!capabilities?.ai.configured) {
      navigate('/settings/ai?returnTo=' + encodeURIComponent(path));
      return;
    }
    if (!word) return;

    setBusy(true);
    setError('');
    try {
      const r = await api.request<{ result: Record<string, unknown> }>('POST', '/ai/generate', {
        set_id: setId,
        kind,
        word_ids: [word.id],
        instruction: 'Target word: ' + word.term + '. Current question: ' + question,
        question,
        transcript: answer,
      });

      if (kind === 'speaking_question') {
        setQuestion(String(r.result.question));
        setFeedback('');
        setHint('');
        setTranslation('');
      } else if (kind === 'speaking_hint') {
        setHint(String(r.result.hint) + '\n' + String(r.result.example));
      } else {
        setFeedback(String(r.result.feedback));
      }
      await loadHistory();
    } catch (e: any) {
      setError(e?.message || 'Không kết nối được AI.');
    } finally {
      setBusy(false);
    }
  };

  const restoreHistory = async (h: typeof history[number]) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const r = await api.request<{ content: Record<string, unknown> }>('GET', '/ai/history/' + h.id);
      const data = r.content;
      const ids = Array.isArray(data._target_word_ids) ? data._target_word_ids : [];
      const target = words.findIndex((w) => w.id === ids[0]);
      if (target >= 0) setIndex(target);

      setFeedback('');
      setHint('');
      setTranslation('');
      setDefinition(false);
      setQuestion(String(data._speaking_question || ''));

      if (h.kind === 'speaking_question') setQuestion(String(data.question));
      else if (h.kind === 'speaking_feedback') {
        setFeedback(String(data.feedback));
        setAnswer(String(data._submission_transcript || ''));
      } else {
        setHint(String(data.hint || '') + '\n' + String(data.example || ''));
      }
      setHistoryOpen(false);
    } catch (e: any) {
      setError(e?.message || 'Không đọc được lịch sử.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* 1. Header Toolbar */}
      <LearningBreadcrumb
        currentLabel="Luyện nói AI"
        setId={setId}
        setTitle={setTitle || undefined}
        rightSlot={
          <div className="flex items-center gap-3">
            {words.length > 0 && (
              <span className="text-xs font-bold text-slate-500">
                Từ {index + 1} / {words.length}
              </span>
            )}

            <button
              type="button"
              onClick={() => setHistoryOpen(!historyOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-50 transition"
            >
              <HistoryIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Lịch sử ({history.length})</span>
            </button>
          </div>
        }
      />

      {(launchQuery.reviewScope || launchQuery.wordIds.length > 0) && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3 flex-wrap text-xs">
          <span className="font-bold text-amber-800 dark:text-amber-300">
            Luyện vận dụng từ đến hạn — không thay lượt ôn nhớ
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

      {/* History Panel */}
      {historyOpen && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Lịch sử luyện nói
            </h3>
            <button
              onClick={() => setHistoryOpen(false)}
              className="text-xs text-slate-400 font-bold hover:text-slate-600"
            >
              Đóng
            </button>
          </div>
          {history.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Chưa có lịch sử nào.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {history.map((h) => (
                <button
                  key={h.id}
                  disabled={busy}
                  onClick={() => void restoreHistory(h)}
                  className="w-full p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left text-xs font-medium flex items-center justify-between transition"
                >
                  <span className="font-bold">
                    {h.kind === 'speaking_question'
                      ? 'Câu hỏi'
                      : h.kind === 'speaking_feedback'
                      ? 'Phản hồi'
                      : 'Gợi ý'}
                  </span>
                  <span className="text-slate-400">
                    {new Date(h.created_at).toLocaleString('vi-VN')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Target Word & AI Question Stage matching user-speaking-question.png */}
      {word && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-5 shadow-sm">
          {/* Word row */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Từ vựng mục tiêu
              </span>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white">
                {word.term}
              </h1>
              {word.phonetic && (
                <p className="text-xs font-semibold text-slate-400">{word.phonetic}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => playAudio(word.term, 'en-US')}
                className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 transition shadow-2xs"
                title="Nghe từ này"
              >
                <Volume2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setDefinition((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
              >
                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                <span>{definition ? 'Ẩn nghĩa' : 'Xem định nghĩa'}</span>
              </button>
            </div>
          </div>

          {definition && word.definition && (
            <p className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300">
              {word.definition}
            </p>
          )}

          {/* AI Question Box */}
          <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-indigo-600" />
                <span>Câu hỏi luyện nói từ AI:</span>
              </span>

              {question && (
                <button
                  type="button"
                  onClick={() => playAudio(question, 'en-US')}
                  className="p-1 rounded text-indigo-700 hover:bg-indigo-100"
                  title="Nghe câu hỏi (Ctrl)"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {question ? (
              <p className="text-base font-bold text-slate-900 dark:text-white leading-relaxed">
                "{question}"
              </p>
            ) : (
              <p className="text-xs text-slate-500 italic">
                Chưa có câu hỏi. Nhấn "Tạo câu hỏi" bên dưới để gia sư AI tạo câu hỏi phản xạ cho từ này.
              </p>
            )}

            {/* Translation if toggled */}
            {translation && (
              <p className="text-xs text-slate-600 dark:text-slate-300 italic pt-1 border-t border-indigo-100 dark:border-indigo-800">
                {translation}
              </p>
            )}

            {/* Hint if present */}
            {hint && (
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs space-y-1">
                <span className="font-bold text-indigo-700">💡 Gợi ý trả lời:</span>
                <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{hint}</p>
              </div>
            )}

            {/* Question Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={() => void generate('speaking_question')}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{question ? 'Đổi câu hỏi khác' : 'Tạo câu hỏi'}</span>
              </button>

              {question && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void generate('speaking_hint')}
                    className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-50 transition"
                  >
                    Xem gợi ý
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      if (translation) {
                        setTranslation('');
                        return;
                      }
                      setBusy(true);
                      try {
                        const r = await api.generate(
                          setId,
                          'translation',
                          'Translate this exact question into Vietnamese: ' + question
                        );
                        setTranslation(String(r.result.translation));
                      } catch (e: any) {
                        setError(e?.message || 'Không dịch được.');
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-50 transition flex items-center gap-1"
                  >
                    <Languages className="w-3.5 h-3.5" />
                    <span>{translation ? 'Ẩn bản dịch' : 'Dịch câu hỏi'}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 3. User Response Input */}
          <div className="space-y-3 pt-2">
            <textarea
              aria-label="Câu trả lời"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={3}
              placeholder="Nói vào micro hoặc nhập câu trả lời tiếng Anh của bạn tại đây..."
              className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs md:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={record}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
                    recording
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 hover:bg-indigo-100'
                  }`}
                >
                  {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span>{recording ? 'Dừng micro' : 'Bắt đầu nói'}</span>
                </button>

                <button
                  type="button"
                  disabled={busy || !answer.trim()}
                  onClick={() => void generate('speaking_feedback')}
                  className="px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-black transition shadow-xs flex items-center gap-1.5"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                  <span>Nhận phản hồi AI</span>
                </button>
              </div>

              <button
                type="button"
                disabled={!words.length || recording || busy}
                onClick={() => {
                  setIndex((i) => (i + 1) % words.length);
                  setAnswer('');
                  setQuestion('');
                  setFeedback('');
                  setHint('');
                  setTranslation('');
                  setDefinition(false);
                }}
                className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-xs font-bold text-slate-700 dark:text-slate-300 transition flex items-center gap-1"
              >
                <span>Từ tiếp theo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* AI Feedback Card matching local-speaking-feedback.png */}
          {feedback && (
            <div className="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs space-y-2 animate-fadeIn">
              <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-emerald-600" />
                <span>Nhận xét từ gia sư AI (Về ngữ pháp & diễn đạt):</span>
              </div>
              <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed select-text">
                {feedback}
              </p>
            </div>
          )}

          {/* 4. Audio Pronunciation Component */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <PronunciationPractice key={word.id} word={word} />
          </div>
        </section>
      )}

      <p className="text-center text-[11px] font-medium text-slate-400">
        Nhấn riêng <kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Ctrl</kbd> để nghe câu hỏi hoặc từ vựng mục tiêu.
      </p>
    </div>
  );
}
