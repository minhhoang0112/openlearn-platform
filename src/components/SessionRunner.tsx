import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Mic,
  RotateCcw,
  Star,
  Volume2,
} from 'lucide-react';
import { api, ApiWord, GradedAnswer, StudySession } from '../api/client';
import { playAudio, recognizeSpeech, speechRecognitionAvailable } from '../utils/audio';
import { WordLearningDetails } from './WordLearningDetails';

type RichRunnerSession = StudySession & {
  completed_words?: number;
  total_words?: number;
  retry_limit_reached?: boolean;
  question: (NonNullable<StudySession['question']> & {
    direction?: string;
    answer_mode?: string;
    dictation_content?: string;
  }) | null;
};

export interface SessionRunnerProps {
  initial: StudySession;
  onFinish: (session: StudySession) => Promise<void>;
  onRestart?: () => Promise<void>;
  words?: ApiWord[];
  onWordChange?: (updated: ApiWord) => void;
  stepTitle?: string;
}

export function SessionRunner({
  initial,
  onFinish,
  onRestart,
  words: initialWords = [],
  onWordChange,
  stepTitle,
}: SessionRunnerProps) {
  const [session, setSession] = useState<RichRunnerSession>(initial as RichRunnerSession);
  const [words, setWords] = useState<ApiWord[]>(initialWords);
  const [result, setResult] = useState<GradedAnswer | null>(null);
  const [answer, setAnswer] = useState('');
  const [optionId, setOptionId] = useState<string | undefined>(undefined);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    setSession(initial as RichRunnerSession);
    setResult(null);
    setAnswer('');
    setOptionId(undefined);
    setFlipped(false);
    setError('');
  }, [initial.id]);

  useEffect(() => {
    setWords(initialWords);
  }, [initialWords]);

  const q = session.question;
  const currentWord = words.find((w) => w.id === q?.word_id);
  const isDictation =
    session.mode === 'dictation' || q?.type === 'dictation' || q?.type === 'word_dictation';
  const isFlashcard = session.mode === 'flashcard' || q?.type === 'flashcard';

  const listen = useCallback(() => {
    const text = q?.speech_text || currentWord?.term || q?.prompt || '';
    if (text) playAudio(text, 'en-US', 0.95);
  }, [q?.speech_text, currentWord?.term, q?.prompt]);

  useEffect(() => {
    if (!q || result) return;
    if (isDictation) {
      listen();
    }
    if (!isFlashcard && !q.options?.length) {
      inputRef.current?.focus();
    }
  }, [q?.id, isDictation, isFlashcard, result]);

  useEffect(() => {
    return () => {
      recognitionCleanup.current?.();
    };
  }, []);

  const updateWordInList = (updated: ApiWord) => {
    setWords((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    onWordChange?.(updated);
  };

  const submit = async (
    submittedText: string,
    extra: { option_id?: string; known?: boolean; skip?: boolean } = {},
  ) => {
    if (!q || busy || result) return;
    if (!isFlashcard && !extra.skip && !submittedText.trim()) return;
    recognitionCleanup.current?.();
    setRecording(false);
    setBusy(true);
    setError('');
    try {
      const graded = await api.answer(session.id, q.id, submittedText, extra);
      window.dispatchEvent(new Event('openquiz:srs-updated'));
      if (isFlashcard) {
        // Flashcard advances immediately after rating known/unknown
        setSession(graded.session as RichRunnerSession);
        setResult(null);
        setAnswer('');
        setOptionId(undefined);
        setFlipped(false);
      } else {
        setResult(graded);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lưu được câu trả lời.');
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    if (!result) return;
    setSession(result.session as RichRunnerSession);
    setResult(null);
    setAnswer('');
    setOptionId(undefined);
    setFlipped(false);
  };

  const correctSelf = async () => {
    if (!q || !result || busy) return;
    setBusy(true);
    setError('');
    try {
      const corrected = await api.request<GradedAnswer>(
        'POST',
        `/study/sessions/${session.id}/answers/${q.id}/correction`,
        {},
      );
      window.dispatchEvent(new Event('openquiz:srs-updated'));
      setResult(corrected);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể cập nhật tự chấm lại.');
    } finally {
      setBusy(false);
    }
  };

  const toggleMicrophone = () => {
    if (recording) {
      recognitionCleanup.current?.();
      recognitionCleanup.current = null;
      setRecording(false);
      return;
    }
    setError('');
    setRecording(true);
    const lang =
      !isDictation && q?.direction === 'term_to_definition' && q?.answer_mode !== 'synonyms'
        ? 'vi-VN'
        : 'en-US';
    try {
      recognitionCleanup.current = recognizeSpeech(
        (text) => setAnswer(text),
        () => setRecording(false),
        (message) => {
          setRecording(false);
          setError(message);
        },
        lang,
      );
    } catch {
      setRecording(false);
      setError('Không thể mở micro. Bạn vẫn có thể nhập câu trả lời.');
    }
  };

  // Keyboard shortcuts: standalone Ctrl to replay audio, Enter to submit/next, Space/C/1/2 for flashcard
  useEffect(() => {
    let ctrlAlone = false;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' && !e.repeat) {
        ctrlAlone = !e.altKey && !e.shiftKey && !e.metaKey;
        return;
      }
      if (e.ctrlKey) ctrlAlone = false;

      if (session.status === 'completed' || !q) return;

      const target = e.target as HTMLElement;
      const inEditable = !!target?.closest('input,textarea,select,[contenteditable="true"]');

      if (isFlashcard && !inEditable) {
        if ((e.key === ' ' || e.key === 'c' || e.key === 'C') && !e.repeat) {
          if (target?.closest('button')) return;
          e.preventDefault();
          setFlipped((f) => !f);
          return;
        }
        if (e.key === '1' && !e.repeat && !busy) {
          e.preventDefault();
          void submit('', { known: false });
          return;
        }
        if (e.key === '2' && !e.repeat && !busy) {
          e.preventDefault();
          void submit('', { known: true });
          return;
        }
      }

      if (
        e.key === 'Enter' &&
        !e.repeat &&
        !e.isComposing &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        if (isFlashcard && !inEditable) {
          if (target?.closest('button')) return;
          e.preventDefault();
          setFlipped((f) => !f);
          return;
        }
        const selectedAnswerButton =
          target?.closest('[data-answer-option]')?.getAttribute('data-answer-option') ===
            optionId && !!optionId;
        if (target?.closest('button,select,textarea,[role="dialog"]') && !selectedAnswerButton) {
          return;
        }
        e.preventDefault();
        if (result) {
          next();
        } else if (answer.trim()) {
          void submit(answer, { option_id: optionId });
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        if (ctrlAlone) listen();
        ctrlAlone = false;
      }
    };

    const onBlur = () => {
      ctrlAlone = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [session.status, q, isFlashcard, busy, result, answer, optionId, listen]);

  const progressPercent = session.total
    ? Math.min(100, Math.round((session.completed / session.total) * 100))
    : 0;

  if (session.status === 'completed') {
    return (
      <section
        data-testid="session-runner-completed"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-sm"
      >
        <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            {stepTitle ? `Hoàn thành bước: ${stepTitle}` : 'Đã hoàn thành phiên học'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Đã hoàn thành {session.correct}/{session.total} câu đúng
            {session.total_words ? ` • Đã luyện ${session.completed_words ?? session.correct}/${session.total_words} từ` : ''}
          </p>
        </div>

        {error && (
          <p role="alert" className="text-xs font-semibold text-rose-600 bg-rose-50 p-3 rounded-2xl border border-rose-200">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            disabled={busy}
            data-testid="save-step-button"
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                await onFinish(session);
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Không lưu được bước học.');
              } finally {
                setBusy(false);
              }
            }}
            className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-black transition shadow-sm"
          >
            {busy ? 'Đang lưu...' : 'Lưu bước học và tiếp tục'}
          </button>

          {onRestart && (
            <button
              type="button"
              disabled={busy}
              data-testid="restart-step-button"
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  await onRestart();
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Không thể khởi tạo phiên luyện lại.');
                } finally {
                  setBusy(false);
                }
              }}
              className="px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Luyện lại bước này</span>
            </button>
          )}
        </div>
      </section>
    );
  }

  if (!q) {
    return (
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
        Không có câu hỏi trong phiên này.
      </div>
    );
  }

  return (
    <div data-testid="session-runner-active" className="space-y-5">
      {/* Progress Bar & Counters */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
          <span>
            Đã hoàn thành: <strong>{session.completed_words ?? session.correct}</strong> /{' '}
            {session.total_words ?? session.total} từ
          </span>
          <span>
            Câu hỏi: <strong>{Math.min(session.completed + 1, session.total)}</strong> / {session.total}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-slate-900 dark:bg-white transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium"
        >
          {error}
        </div>
      )}

      {/* Main Question / Card Container */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
        {/* Top Bar */}
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            {isFlashcard
              ? 'Thẻ ghi nhớ (Flashcards)'
              : isDictation
                ? 'Nghe chép từ/cụm từ'
                : q.type === 'quiz' || q.options?.length
                  ? 'Trắc nghiệm từ vựng'
                  : q.direction === 'definition_to_term'
                    ? 'Nhập từ tiếng Anh'
                    : 'Nhập nghĩa / từ tương ứng'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Nghe phát âm (Ctrl)"
              title="Nghe lại (Ctrl đơn)"
              onClick={listen}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Volume2 className="w-4 h-4" />
            </button>

            {currentWord && (
              <button
                type="button"
                aria-label={currentWord.starred ? 'Bỏ đánh dấu sao' : 'Đánh dấu sao'}
                aria-pressed={currentWord.starred}
                onClick={async () => {
                  try {
                    await api.wordProgress(currentWord.id, { starred: !currentWord.starred });
                    updateWordInList({ ...currentWord, starred: !currentWord.starred });
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Không thể cập nhật dấu sao.');
                  }
                }}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <Star
                  className={`w-4 h-4 ${
                    currentWord.starred
                      ? 'fill-amber-400 text-amber-500'
                      : 'text-slate-400 hover:text-amber-500'
                  }`}
                />
              </button>
            )}
          </div>
        </div>

        {/* Mode-specific Body */}
        {isFlashcard ? (
          <div className="space-y-5">
            <div
              onClick={() => setFlipped((f) => !f)}
              role="button"
              tabIndex={0}
              aria-label="Thẻ lật từ vựng"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setFlipped((f) => !f);
                }
              }}
              className="min-h-[220px] p-6 md:p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-indigo-400 transition cursor-pointer flex flex-col items-center justify-center text-center space-y-4 select-none"
            >
              {!flipped ? (
                <>
                  <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
                    {q.prompt || currentWord?.term}
                  </h2>
                  {(q.phonetic || currentWord?.phonetic || q.part_of_speech || currentWord?.part_of_speech) && (
                    <p className="text-xs md:text-sm font-semibold text-slate-400">
                      {(q.part_of_speech || currentWord?.part_of_speech) && (
                        <span className="italic">
                          {q.part_of_speech || currentWord?.part_of_speech} •{' '}
                        </span>
                      )}
                      {q.phonetic || currentWord?.phonetic}
                    </p>
                  )}
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 pt-2">
                    Nhấn vào thẻ hoặc phím Space để lật xem nghĩa &amp; câu ví dụ
                  </span>
                </>
              ) : (
                <div className="w-full space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Nghĩa tiếng Việt
                    </span>
                    <h3 className="text-2xl md:text-3xl font-black text-indigo-600 dark:text-indigo-400">
                      {currentWord?.definition || q.prompt}
                    </h3>
                    <p className="text-xs font-bold text-slate-500">
                      {currentWord?.term}{' '}
                      {currentWord?.phonetic ? `(${currentWord.phonetic})` : ''}
                    </p>
                  </div>

                  {currentWord && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="pt-3 border-t border-slate-200 dark:border-slate-700"
                    >
                      <WordLearningDetails
                        word={currentWord}
                        auto
                        variant="flashcard"
                        onChange={updateWordInList}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void submit('', { known: false })}
                className="py-3.5 px-4 rounded-2xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200 text-xs font-black transition"
              >
                Cần học lại (1)
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void submit('', { known: true })}
                className="py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow-xs"
              >
                Đã nhớ (2)
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Prompt or Dictation Speaker */}
            {isDictation ? (
              <div className="text-center space-y-4 py-2">
                <button
                  type="button"
                  aria-label="Phát âm thanh nghe chép"
                  onClick={listen}
                  className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border-2 border-indigo-200 dark:border-indigo-800 text-indigo-600 flex items-center justify-center mx-auto hover:scale-105 active:scale-95 transition shadow-sm"
                >
                  <Volume2 className="w-9 h-9" />
                </button>
                <div className="space-y-1">
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    Nghe và nhập lại từ/cụm từ tiếng Anh
                  </h2>
                  {currentWord?.definition && (
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Gợi ý nghĩa: <strong className="text-slate-700 dark:text-slate-200">{currentWord.definition}</strong>
                    </p>
                  )}
                  <p className="text-[11px] font-semibold text-slate-400">
                    Nhấn biểu tượng loa hoặc phím{' '}
                    <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      Ctrl
                    </span>{' '}
                    để nghe lại
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                  {q.prompt}
                </h2>
                {q.direction !== 'definition_to_term' && (q.phonetic || q.part_of_speech) && (
                  <p className="text-xs md:text-sm font-semibold text-slate-400">
                    {q.part_of_speech && <span className="italic">{q.part_of_speech} • </span>}
                    {q.phonetic}
                  </p>
                )}
              </div>
            )}

            {/* Answer Input or MCQ Options */}
            {q.options?.length ? (
              <div
                role="group"
                aria-label="Các lựa chọn trả lời"
                className="grid gap-2.5 sm:grid-cols-2"
              >
                {q.options.map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    data-answer-option={option.id}
                    aria-pressed={optionId === option.id}
                    disabled={!!result || busy}
                    onClick={() => {
                      setOptionId(option.id);
                      setAnswer(option.text);
                    }}
                    className={`p-4 rounded-2xl border text-xs font-bold text-left transition cursor-pointer flex items-center gap-3 ${
                      optionId === option.id
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full border border-slate-400 shrink-0" />
                    <span>{option.text}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  aria-label="Câu trả lời"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={!!result || busy}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={
                    isDictation
                      ? 'Nhập từ/cụm từ bạn nghe được...'
                      : 'Nhập câu trả lời của bạn...'
                  }
                  className="w-full border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-base font-semibold bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
                {speechRecognitionAvailable() && !result && (
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={recording ? 'Dừng micro' : 'Nhập bằng giọng nói'}
                    aria-pressed={recording}
                    onClick={toggleMicrophone}
                    className={`px-4 rounded-2xl flex items-center justify-center transition shrink-0 ${
                      recording
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Full Feedback Panel or Submit Buttons */}
            {result ? (
              <div data-testid="session-runner-feedback" className="space-y-4 pt-2">
                <div
                  className={`p-5 rounded-2xl border space-y-3 ${
                    result.correct
                      ? 'border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200'
                      : 'border-rose-200 bg-rose-50/60 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-black text-sm">
                      {result.correct ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <span>✓ Chính xác!</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                          <span>Chưa đúng. Từ này sẽ được ôn lại.</span>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        playAudio(currentWord?.term || result.expected || '', 'en-US', 0.95)
                      }
                      className="p-1.5 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 text-xs font-bold"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>Nghe từ</span>
                    </button>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="font-semibold">
                      Đáp án đúng: <strong className="text-sm underline">{result.expected}</strong>
                    </p>
                    {currentWord && (
                      <p className="text-slate-600 dark:text-slate-300 font-medium">
                        <span className="font-bold text-slate-800 dark:text-white">
                          {currentWord.term}
                        </span>
                        {currentWord.phonetic ? ` ${currentWord.phonetic}` : ''} —{' '}
                        <span>{currentWord.definition}</span>
                      </p>
                    )}
                  </div>

                  {currentWord && (
                    <div className="pt-2 border-t border-emerald-200/50 dark:border-emerald-800/40">
                      <WordLearningDetails
                        word={currentWord}
                        auto
                        variant="feedback"
                        onChange={updateWordInList}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={next}
                    className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition shadow-sm"
                  >
                    Tiếp tục (Enter)
                  </button>

                  {result.correct && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void correctSelf()}
                      className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Tôi trả lời sai</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => void submit(answer, { option_id: optionId })}
                  disabled={busy || !answer.trim()}
                  className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-black transition shadow-xs"
                >
                  {busy ? 'Đang kiểm tra...' : 'Kiểm tra'}
                </button>

                <button
                  type="button"
                  onClick={() => void submit('', { skip: true })}
                  disabled={busy}
                  className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-500 text-xs font-bold transition"
                >
                  Tôi không biết
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <p className="text-center text-[11px] font-medium text-slate-400">
        {isFlashcard
          ? 'Space / Enter: lật thẻ • 1: Cần học lại • 2: Đã nhớ • Ctrl đơn: nghe từ'
          : 'Ctrl đơn: nghe lại • Enter: kiểm tra / tiếp tục'}
      </p>
    </div>
  );
}
