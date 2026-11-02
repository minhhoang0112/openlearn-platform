import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Loader2, Settings, Star, Volume2, RotateCcw, CheckCircle2, AlertCircle, Repeat } from 'lucide-react';
import { api, ApiError, ApiWord, GradedAnswer, StudySession, StudyMode, UserProfile, StudyOptionsResponse } from '../api/client';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { playAudio } from '../utils/audio';
import { WordLearningDetails } from './WordLearningDetails';
import { LearningBreadcrumb } from './LearningBreadcrumb';
import { forwardNavigationContext } from '../utils/navigationContext';
import { defaultStudyPreferences, StudyPreferences, StudyPreferencesDialog } from './StudyPreferences';
import { parsePracticeLaunchQuery, buildScopedSessionStorageKey } from '../utils/practiceLaunch';

type RichSession = StudySession & {
  completed_words?: number;
  total_words?: number;
  retry_limit_reached?: boolean;
  question: (NonNullable<StudySession['question']> & {
    direction?: string;
    answer_mode?: string;
    dictation_content?: string;
  }) | null;
};

export function StudyPractice({ dictation = false }: { dictation?: boolean }) {
  const { params, path, navigate } = useRouter();
  const { user } = useAuth();
  const setId = Number(params.id) || 163;

  const [session, setSession] = useState<RichSession | null>(null);
  const [words, setWords] = useState<ApiWord[]>([]);
  const [setTitle, setSetTitle] = useState<string>('');
  const [studyCounts, setStudyCounts] = useState<{ total: number; starred: number; unmastered: number }>({
    total: 0,
    starred: 0,
    unmastered: 0,
  });

  const [settings, setSettings] = useState<StudyPreferences>(defaultStudyPreferences);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<GradedAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [optionId, setOptionId] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [missingExamples, setMissingExamples] = useState<number[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  const launchQuery = useMemo(() => parsePracticeLaunchQuery(path), [path]);
  const launchDirection = launchQuery.direction==='en-vi'?'term_to_definition':launchQuery.direction==='vi-en'?'definition_to_term':launchQuery.direction;
  const mode: StudyMode = dictation
    ? 'dictation'
    : launchQuery.studyMode === 'write'
      ? 'write'
      : launchQuery.studyMode === 'quiz'
        ? 'quiz'
        : 'learn';
  const isDueScope = launchQuery.reviewScope === 'due' || path.includes('due=1');
  const storageKey = useMemo(
    () =>
      buildScopedSessionStorageKey('oq-study', user?.id, mode, setId, {
        reviewScope: launchQuery.reviewScope || (path.includes('due=1') ? 'due' : null),
        wordIds: launchQuery.wordIds,
        studyMode: launchQuery.studyMode,
        direction: launchQuery.direction,
      }),
    [user?.id, mode, setId, launchQuery, path],
  );
  const currentWord = words.find((w) => w.id === session?.question?.word_id);

  const handleError = (e: unknown) => {
    setError(e instanceof Error ? e.message : 'Không thể tải phiên học. Hãy thử lại.');
    if (e instanceof ApiError && e.error.code === 'EXAMPLES_REQUIRED') {
      setMissingExamples((e.error.details as { word_ids: number[] })?.word_ids || []);
    }
  };

  const buildStartPayload = useCallback(
    (preferences: StudyPreferences): Record<string, unknown> => ({
      ...preferences,
      learning_engine: mode === 'learn' ? 'segmented_v2' : 'legacy_v1',
      ...(mode === 'learn' ? { adaptive: true } : {}),
      required_correct: mode === 'learn' ? 2 : 1,
      max_attempts: 3,
      ...(launchDirection ? { direction: launchDirection } : {}),
      ...(launchQuery.studyMode === 'quiz'
        ? { question_types: ['quiz'] }
        : launchQuery.studyMode === 'write'
          ? { question_types: ['write'] }
          : {}),
      ...(launchQuery.wordIds.length > 0 ? { word_ids: launchQuery.wordIds } : {}),
      ...(isDueScope ? { due_only: true } : {}),
    }),
    [mode, launchQuery, isDueScope],
  );

  const create = async (preferences: StudyPreferences) => {
    setBusy(true);
    setError('');
    setMissingExamples([]);
    setSession(null);
    setOptionId(undefined);
    try {
      const next = await api.startStudy(setId, mode, buildStartPayload(preferences));
      setSession(next as RichSession);
      setResult(null);
      setAnswer('');
      sessionStorage.setItem(storageKey, next.id);
      return true;
    } catch (e) {
      handleError(e);
      return false;
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setSession(null);
    setError('');
    setResult(null);
    setAnswer('');
    setOptionId(undefined);

    Promise.all([
      api.me(),
      api.getSet(setId),
      api.getStudyOptions(setId, mode).catch(() => null),
    ])
      .then(async ([profile, set, opts]) => {
        if (!active) return;
        setWords(set.words);
        setSetTitle(set.title || '');
        if (opts?.counts) {
          setStudyCounts(opts.counts);
        }

        const savedStudy = (profile.settings.study || {}) as Record<string, unknown>;
        const rawOptsSettings = (opts?.settings || {}) as Partial<StudyPreferences>;
        const preference: StudyPreferences = {
          ...defaultStudyPreferences,
          ...rawOptsSettings,
          ...((savedStudy[mode] || savedStudy) as Partial<StudyPreferences>),
          required_correct: mode === 'learn' ? 2 : 1,
          max_attempts: 3,
        };

        // Upgrade the old default once; explicit v2 settings remain respected.
        if (mode === 'learn' && (savedStudy[mode] as any)?.learning_engine !== 'segmented_v2') {
          Object.assign(preference, { learning_engine: 'segmented_v2', direction: 'definition_to_term', question_types: ['write','quiz'], shuffle: true, auto_audio: true, adaptive: true, accept_synonyms: true });
        }
        if (preference.answer_mode === 'speech') preference.answer_mode = 'meaning';
        if (mode === 'learn') preference.adaptive = true;
        else preference.learning_engine = 'legacy_v1';
        if (dictation && savedStudy[mode] === undefined) {
          preference.auto_audio = true;
        }
        if (launchDirection) {
          preference.direction = launchDirection;
        }
        if (launchQuery.studyMode === 'quiz') {
          preference.question_types = ['quiz'] as any;
        } else if (launchQuery.studyMode === 'write') {
          preference.question_types = ['write'] as any;
        }

        const id = sessionStorage.getItem(storageKey);
        if (id) {
          try {
            const resumed = await api.resumeStudy(id);
            const resumedWordIds = Array.isArray(resumed.settings?.word_ids) ? resumed.settings.word_ids : [];
            const sameScope =
              launchQuery.wordIds.length === 0
                ? resumedWordIds.length === 0
                : JSON.stringify(resumedWordIds) === JSON.stringify(launchQuery.wordIds);
            if (active && resumed.set_id === setId && resumed.mode === mode && resumed.status === 'active' && sameScope && (mode !== 'learn' || resumed.settings.learning_engine === 'segmented_v2')) {
              setSession(resumed as RichSession);
              setSettings({ ...preference, ...resumed.settings } as StudyPreferences);
              return;
            }
          } catch {
            // Replace stale session
          }
        }

        if (!active) return;
        setSettings(preference);
        const next = await api.startStudy(setId, mode, buildStartPayload(preference));
        if (active) {
          setSession(next as RichSession);
          sessionStorage.setItem(storageKey, next.id);
        }
      })
      .catch((e) => {
        if (active) handleError(e);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [setId, mode, user?.id, storageKey, buildStartPayload]);

  const listen = useCallback(() => {
    const text = session?.question?.speech_text || currentWord?.term;
    if (text) playAudio(text, 'en-US', settings.audio_rate, settings.voice_uri);
  }, [session?.question?.speech_text, currentWord?.term, settings.audio_rate, settings.voice_uri]);

  useEffect(() => {
    // A hidden English answer is spoken after grading, not leaked on entry.
    const revealed = session?.question?.direction !== 'definition_to_term' || dictation || !!result;
    if (settings.auto_audio && session?.question && revealed && (!result || session.question.direction === 'definition_to_term' && !dictation)) listen();
    if (!result) inputRef.current?.focus();
  }, [session?.question?.id, settings.auto_audio, !!result]);

  const submit = async (skip = false) => {
    if (!session?.question || busy || result || (!skip && !answer.trim())) return;
    setBusy(true);
    setError('');
    try {
      const graded = await api.answer(session.id, session.question.id, answer, { skip, option_id: optionId });
      setResult(graded);
      sessionStorage.setItem(storageKey, graded.session.id);
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    if (!result) return;
    setSession(result.session as RichSession);
    setResult(null);
    setAnswer('');
    setOptionId(undefined);
    if (result.session.status === 'completed') sessionStorage.removeItem(storageKey);
  };

  useEffect(() => {
    if (!settings.auto_advance_on_correct || !result?.correct || result.verdict==='close' || busy || settingsOpen) return;
    const timer = window.setTimeout(next, 1200);
    return () => window.clearTimeout(timer);
  }, [settings.auto_advance_on_correct, result, busy, settingsOpen]);

  // Standalone Ctrl release plays audio; Ctrl+C/V/A retain browser behavior
  useEffect(() => {
    let ctrlAlone = false;
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Control' && !e.repeat) {
        ctrlAlone = !e.altKey && !e.shiftKey && !e.metaKey;
        return;
      }
      if (e.ctrlKey) ctrlAlone = false;
      if (e.key === 'Enter' && !e.repeat && !e.isComposing && !e.ctrlKey && !e.metaKey && !e.altKey && !settingsOpen) {
        const target = e.target as HTMLElement;
        const selectedAnswerButton =
          target.closest('[data-answer-option]')?.getAttribute('data-answer-option') === optionId && !!optionId;
        if (target.closest('button,select,textarea,[role="dialog"]') && !selectedAnswerButton) return;
        e.preventDefault();
        if (result) next();
        else void submit();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        if (ctrlAlone && !settingsOpen) listen();
        ctrlAlone = false;
      }
    };
    const blur = () => {
      ctrlAlone = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [session, result, answer, optionId, busy, listen, settingsOpen]);

  const save = async (value: StudyPreferences) => {
    setBusy(true);
    setError('');
    try {
      const profile = await api.me();
      await api.request<UserProfile>('PATCH', '/me', {
        settings: { study: { ...profile.settings.study, [mode]: value } },
      });
      setSettings(value);
      setSettingsOpen(false);
      await create(value);
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(false);
    }
  };

  const correctSelf = async () => {
    if (!session?.question || !result || busy) return;
    setBusy(true);
    setError('');
    try {
      setResult(
        await api.request<GradedAnswer>(
          'POST',
          `/study/sessions/${session.id}/answers/${session.question.id}/correction`,
          {}
        )
      );
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (
      !window.confirm(
        'Đặt lại toàn bộ trạng thái nhớ, lịch ôn và dấu sao của bộ từ này? Các phiên học cũ vẫn được giữ trong lịch sử.'
      )
    )
      return;
    setBusy(true);
    setError('');
    try {
      await api.resetSetProgress(setId);
      sessionStorage.removeItem(storageKey);
      setWords((await api.getSet(setId)).words);
      setSettingsOpen(false);
      await create(settings);
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(false);
    }
  };

  const prepareExamples = async () => {
    setBusy(true);
    setError('');
    try {
      for (let i = 0; i < missingExamples.length; i += 20) {
        await api.request('POST', '/ai/generate', {
          set_id: setId,
          kind: 'word_examples',
          word_ids: missingExamples.slice(i, i + 20),
        });
      }
      setWords((await api.getSet(setId)).words);
      await create(settings);
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(false);
    }
  };

  const q = session?.question;
  const progressPercent = session?.total ? Math.round((session.completed / session.total) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* 1. Header bar */}
      <LearningBreadcrumb
        currentLabel={
          dictation
            ? 'Nghe chép chính tả'
            : launchQuery.studyMode === 'write'
            ? 'Luyện viết từ'
            : launchQuery.studyMode === 'quiz'
            ? 'Trắc nghiệm từ vựng'
            : launchQuery.direction === 'both'
            ? 'Học hai chiều'
            : 'Học từ vựng'
        }
        setId={setId}
        setTitle={setTitle || undefined}
        rightSlot={
          <div className="flex items-center gap-2">
            {(launchQuery.reviewScope || launchQuery.wordIds.length > 0) && (
              <button
                type="button"
                onClick={() => navigate('/repetition-study')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 transition"
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>Quay về ôn tập ({launchQuery.wordIds.length || session?.total_words || session?.total || 0} từ)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 transition"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span>Cài đặt</span>
            </button>
          </div>
        }
      />

      {/* Progress Bar & Counters matching Image 1 */}
      {session && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>
              Đạt mục tiêu phiên: <strong>{session.completed_words ?? session.correct}</strong> / {session.total_words ?? session.total} từ
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
      )}

      {/* Error alert with retry */}
      {error && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium space-y-2">
          <p>{error}</p>
          {missingExamples.length > 0 && (
            <button
              disabled={busy}
              onClick={() => void prepareExamples()}
              className="underline font-bold block text-indigo-700"
            >
              Chuẩn bị câu ví dụ bằng AI ({missingExamples.length} từ), rồi nghe chép
            </button>
          )}
          <button
            disabled={busy}
            type="button"
            onClick={() => void create(settings)}
            className="underline font-bold block"
          >
            Thử lại phiên học
          </button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center p-16 gap-3 text-slate-500 text-xs font-semibold">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span>Đang chuẩn bị phiên học từ máy chủ...</span>
        </div>
      )}

      {!loading && session && (
        <>
          {session.status === 'completed' ? (
            /* Completed Screen */
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-sm">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-black text-slate-900 dark:text-white">
                  Hoàn thành phiên {dictation ? 'nghe chép' : 'học'}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Đúng {session.correct} / {session.total} lượt hỏi • Đạt mục tiêu phiên {session.completed_words ?? session.correct} / {session.total_words ?? session.total} từ
                </p>
              </div>

              {session.retry_limit_reached && (
                <p className="text-xs font-semibold text-amber-700 bg-amber-50 p-3 rounded-2xl border border-amber-200">
                  Một số từ vẫn cần ôn thêm (đã đạt số lượt tối đa trong phiên). Bạn nên nghỉ ngơi và tiếp tục ôn lại sau.
                </p>
              )}

              <div className="flex gap-3 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => void create(settings)}
                  className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition shadow-xs"
                >
                  Học lại phiên mới
                </button>
                <button
                  type="button"
                  onClick={() => navigate(forwardNavigationContext(`/study-set/${setId}`, path))}
                  className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 transition"
                >
                  Quay lại bộ từ
                </button>
              </div>
            </section>
          ) : (
            q && (
              /* Question & Feedback Stage */
              <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
                {/* Top card action bar */}
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {dictation
                      ? settings.dictation_content === 'example'
                        ? 'Nghe chép ví dụ'
                        : 'Nghe và viết từ'
                      : q.answer_mode === 'synonyms'
                      ? 'Trả lời bằng từ đồng nghĩa'
                      : q.direction === 'definition_to_term'
                      ? 'Nhập từ tiếng Anh'
                      : 'Nhập nghĩa tiếng Việt'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Nghe từ (Ctrl)"
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
                            setWords((all) =>
                              all.map((w) => (w.id === currentWord.id ? { ...w, starred: !w.starred } : w))
                            );
                          } catch (e) {
                            handleError(e);
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

                {/* Question / Prompt presentation */}
                {dictation ? (
                  /* Dictation Center Stage matching source-dictation.png */
                  <div className="text-center space-y-4 py-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      <span>Tốc độ: {settings.audio_rate}×</span>
                      <span>•</span>
                      <span>{settings.voice_uri ? 'Giọng tùy chọn' : 'Giọng mặc định'}</span>
                    </div>

                    <div>
                      <button
                        type="button"
                        aria-label="Phát âm thanh nghe chép"
                        onClick={listen}
                        className="w-24 h-24 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border-2 border-indigo-200 dark:border-indigo-800 text-indigo-600 flex items-center justify-center mx-auto hover:scale-105 active:scale-95 transition shadow-sm group"
                      >
                        <Volume2 className="w-10 h-10 group-hover:animate-pulse" />
                      </button>
                      <p className="mt-3 text-xs font-semibold text-slate-400">
                        Nhấn nút hoặc chạm <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Ctrl</span> để nghe lại
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Standard Question Header matching user-study-question.png */
                  <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white leading-tight">
                      {q.prompt}
                    </h1>
                    {q.direction !== 'definition_to_term' && (q.phonetic || q.part_of_speech) && (
                      <p className="text-xs md:text-sm font-semibold text-slate-400">
                        {q.part_of_speech && <span className="italic">{q.part_of_speech} • </span>}
                        {q.phonetic}
                      </p>
                    )}
                  </div>
                )}

                {/* Input or Options Stage */}
                {q.options?.length ? (
                  <div role="group" aria-label="Các lựa chọn trả lời" className="grid gap-2.5 sm:grid-cols-2">
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
                        dictation
                          ? settings.dictation_content === 'example'
                            ? 'Nhập câu ví dụ bạn nghe được...'
                            : 'Nhập từ bạn nghe được...'
                          : 'Nhập câu trả lời của bạn...'
                      }
                      className="w-full border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-base font-semibold bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </div>
                )}

                {/* Feedback or Actions */}
                {result ? (
                  /* Feedback Card matching user-study-feedback.png */
                  <div className="space-y-4 pt-2">
                    <div
                      className={`p-5 rounded-2xl border space-y-3 ${
                        result.verdict === 'close'
                          ? 'border-amber-300 bg-amber-50/70 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200'
                          : result.correct
                          ? 'border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200'
                          : 'border-rose-200 bg-rose-50/60 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-black text-sm">
                        {result.verdict === 'close' ? <><AlertCircle className="w-5 h-5 text-amber-600 shrink-0"/><span>{result.correct?'Đúng nghĩa · Cần chú ý cách viết':'Gần đúng · Cần sửa cách viết'}</span></> : result.correct ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            <span>✓ Câu trả lời của bạn đúng!</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                            <span>{mode === 'learn' && settings.adaptive ? 'Chưa đúng. Từ này sẽ được ôn lại trong phiên.' : 'Chưa đúng. Từ này đã được cập nhật vào lịch ôn.'}</span>
                          </>
                        )}
                      </div>

                      {result.verdict === 'close' && result.message && <p className="text-xs font-medium" role="status">{result.message}</p>}

                      <p className="text-xs font-semibold">
                        Đáp án đầy đủ: <strong className="text-sm underline">{result.expected}</strong>
                      </p>

                      {currentWord && (
                        <div className="pt-2 border-t border-emerald-200/50 dark:border-emerald-800/40">
                          <WordLearningDetails
                            word={currentWord}
                            auto
                            onChange={(updated) =>
                              setWords((all) => all.map((w) => (w.id === updated.id ? updated : w)))
                            }
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
                  /* Action Buttons matching user-study-question.png */
                  <div className="space-y-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => void submit()}
                      disabled={busy || !answer.trim()}
                      className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-black transition shadow-xs"
                    >
                      {busy ? 'Đang kiểm tra...' : 'Kiểm tra'}
                    </button>

                    <button
                      type="button"
                      onClick={() => void submit(true)}
                      disabled={busy}
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
            Ctrl đơn: nghe lại • Enter: kiểm tra / tiếp tục • Tab: chuyển nút
          </p>
        </>
      )}

      {settingsOpen && (
        <StudyPreferencesDialog
          value={settings}
          dictation={dictation}
          counts={studyCounts}
          busy={busy}
          onSave={(val) => void save(val)}
          onClose={() => setSettingsOpen(false)}
          onReset={() => void reset()}
        />
      )}
    </div>
  );
}
