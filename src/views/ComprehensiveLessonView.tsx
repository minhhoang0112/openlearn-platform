import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Headphones,
  HelpCircle,
  Languages,
  Loader2,
  MessageSquare,
  Mic,
  PenTool,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Volume2,
} from 'lucide-react';
import {
  api,
  ApiError,
  ApiWord,
  LessonDetailResponse,
  LessonOverviewItem,
  LessonStepMeta,
  StudySession,
} from '../api/client';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { SessionRunner } from '../components/SessionRunner';
import { WordLearningDetails } from '../components/WordLearningDetails';
import { LearningBreadcrumb } from '../components/LearningBreadcrumb';
import { playAudio, recognizeSpeech, speechRecognitionAvailable } from '../utils/audio';

function normalizeTokenText(value = ''): string {
  return String(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function hasWholeTerm(haystack: string, term: string): boolean {
  const cleanTerm = normalizeTokenText(term);
  const cleanHaystack = normalizeTokenText(haystack);
  if (!cleanTerm || !cleanHaystack) return false;
  const pattern = new RegExp(`(^|[^a-z0-9'])${escapeRegExp(cleanTerm)}(?=$|[^a-z0-9'])`, 'i');
  return pattern.test(cleanHaystack);
}

interface ChatTurn {
  id: string;
  sender: 'ai' | 'user';
  content: string;
  translation?: string;
}

export function ComprehensiveLessonView() {
  const { params, path, navigate } = useRouter();
  const { user, capabilities } = useAuth();
  const setId = Number(params.id) || 163;

  const [setTitle, setSetTitle] = useState<string>('');
  const [lessons, setLessons] = useState<LessonOverviewItem[]>([]);
  const [lesson, setLesson] = useState<LessonDetailResponse | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [session, setSession] = useState<StudySession | null>(null);

  const [loading, setLoading] = useState(true);
  const [stepBusy, setStepBusy] = useState(false);
  const [error, setError] = useState('');

  // Step 4: Speaking AI state
  const [speakingQuestion, setSpeakingQuestion] = useState('');
  const [speakingQuestionTranslation, setSpeakingQuestionTranslation] = useState('');
  const [speakingHint, setSpeakingHint] = useState('');
  const [speakingText, setSpeakingText] = useState('');
  const [speakingSubmittedTexts, setSpeakingSubmittedTexts] = useState<string[]>([]);
  const [speakingFeedback, setSpeakingFeedback] = useState('');
  const [feedbackIds, setFeedbackIds] = useState<string[]>([]);
  const [speakingMissingTerms, setSpeakingMissingTerms] = useState<string[]>([]);
  const [speakingRecording, setSpeakingRecording] = useState(false);

  // Step 5: Conversation AI state
  const [threadId, setThreadId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatTurn[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatHint, setChatHint] = useState('');
  const [chatMissingTerms, setChatMissingTerms] = useState<string[]>([]);
  const [chatRecording, setChatRecording] = useState(false);

  const recognitionCleanup = useRef<(() => void) | null>(null);

  const activeStepStorageKey = useMemo(
    () => `oq-comp-state:${user?.id ?? 'anon'}:${setId}`,
    [user?.id, setId],
  );

  const savePersistedStepState = useCallback(
    (lessonIdx: number, stepIdx: number | null) => {
      try {
        sessionStorage.setItem(
          activeStepStorageKey,
          JSON.stringify({ lessonIndex: lessonIdx, stepIndex: stepIdx }),
        );
      } catch {
        // Ignore storage errors
      }
    },
    [activeStepStorageKey],
  );

  const readPersistedStepState = useCallback((): {
    lessonIndex?: number;
    stepIndex?: number | null;
  } | null => {
    try {
      const raw = sessionStorage.getItem(activeStepStorageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [activeStepStorageKey]);

  const resetAiStepStates = useCallback((words: ApiWord[]) => {
    const termsList = words.map((w) => w.term).join(', ');
    setSpeakingQuestion(
      termsList
        ? `Hãy đặt câu hoặc trả lời ngắn bằng tiếng Anh có sử dụng các từ mục tiêu: ${termsList}.`
        : 'Hãy trả lời bằng tiếng Anh sử dụng các từ mục tiêu của bài học.',
    );
    setSpeakingQuestionTranslation('');
    setSpeakingHint('');
    setSpeakingText('');
    setSpeakingSubmittedTexts([]);
    setSpeakingFeedback('');
    setFeedbackIds([]);
    setSpeakingMissingTerms([]);
    setThreadId(null);
    setChatMessages([]);
    setChatInput('');
    setChatHint('');
    setChatMissingTerms([]);
  }, []);

  const loadLessonDetail = useCallback(
    async (lessonIdx: number, autoRestoreStepIndex?: number | null) => {
      const detail = await api.getLesson(setId, lessonIdx);
      setLesson(detail);
      resetAiStepStates(detail.words || []);

      if (autoRestoreStepIndex && autoRestoreStepIndex >= 1 && autoRestoreStepIndex <= 5) {
        const stepMeta = detail.steps.find((s) => s.index === autoRestoreStepIndex);
        if (stepMeta && (!stepMeta.requires_ai || stepMeta.ai_configured || capabilities?.ai.configured)) {
          setActiveStepIndex(autoRestoreStepIndex);
          if (autoRestoreStepIndex <= 3) {
            const started = await api.startLessonStep(setId, lessonIdx, autoRestoreStepIndex, true);
            setSession(started.session || null);
          } else if (autoRestoreStepIndex === 5) {
            // Do not auto-call AI on reload; wait for user to start or resume conversation
            setSession(null);
          }
          return detail;
        }
      }

      setActiveStepIndex(null);
      setSession(null);
      return detail;
    },
    [setId, capabilities?.ai.configured, resetAiStepStates],
  );

  const refreshOverviewAndLesson = useCallback(
    async (lessonIdx: number) => {
      const [overview, detail] = await Promise.all([
        api.getLessons(setId),
        api.getLesson(setId, lessonIdx),
      ]);
      setLessons(overview.lessons || []);
      setLesson(detail);
      window.dispatchEvent(new Event('openquiz:srs-updated'));
      return { overview, detail };
    },
    [setId],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const qIdx = path.indexOf('?');
    const queryLesson =
      qIdx >= 0 ? Number(new URLSearchParams(path.slice(qIdx + 1)).get('lesson')) : NaN;
    const persisted = readPersistedStepState();

    Promise.all([
      api.getLessons(setId),
      api.getSet(setId).catch(() => null),
    ])
      .then(async ([overview, setInfo]) => {
        if (!active) return;
        if (setInfo?.title) setSetTitle(setInfo.title);
        const list = overview.lessons || [];
        setLessons(list);

        if (list.length === 0) {
          setLesson(null);
          return;
        }

        let targetLessonIdx = list[0].index;
        if (Number.isInteger(queryLesson) && list.some((l) => l.index === queryLesson)) {
          targetLessonIdx = queryLesson;
        } else if (
          persisted?.lessonIndex &&
          list.some((l) => l.index === persisted.lessonIndex)
        ) {
          targetLessonIdx = persisted.lessonIndex;
        } else {
          const firstIncomplete = list.find((l) => !l.completed);
          if (firstIncomplete) targetLessonIdx = firstIncomplete.index;
        }

        const restoreStep =
          persisted?.lessonIndex === targetLessonIdx ? persisted?.stepIndex : null;
        await loadLessonDetail(targetLessonIdx, restoreStep);
      })
      .catch((e) => {
        if (active) setError((e as Error).message || 'Không thể tải danh sách bài học.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      recognitionCleanup.current?.();
    };
  }, [setId]);

  const handleSelectLesson = async (lessonIdx: number) => {
    setStepBusy(true);
    setError('');
    try {
      savePersistedStepState(lessonIdx, null);
      await loadLessonDetail(lessonIdx, null);
    } catch (e) {
      setError((e as Error).message || 'Không thể mở bài học.');
    } finally {
      setStepBusy(false);
    }
  };

  const handleStartStep = async (step: LessonStepMeta, resume = true) => {
    if (!lesson) return;
    if (step.requires_ai && !step.ai_configured && !capabilities?.ai.configured) {
      setActiveStepIndex(step.index);
      setSession(null);
      savePersistedStepState(lesson.lesson_index, step.index);
      return;
    }

    setStepBusy(true);
    setError('');
    try {
      const started = await api.startLessonStep(setId, lesson.lesson_index, step.index, resume);
      setActiveStepIndex(step.index);
      savePersistedStepState(lesson.lesson_index, step.index);

      if (started.session) {
        setSession(started.session);
      } else {
        setSession(null);
        if (step.index === 5 && !threadId) {
          await initConversationForLesson(lesson.words);
        }
      }
    } catch (e) {
      setError((e as Error).message || 'Không thể khởi động bước học.');
    } finally {
      setStepBusy(false);
    }
  };

  const handleCompleteStudyStep = async (stepIndex: number, completedSession: StudySession) => {
    if (!lesson) return;
    await api.completeLessonStep(setId, lesson.lesson_index, stepIndex, {
      session_id: completedSession.id,
    });
    const { detail } = await refreshOverviewAndLesson(lesson.lesson_index);
    const nextStep = detail.steps.find((s) => s.index === stepIndex + 1);
    if (nextStep && (!nextStep.requires_ai || nextStep.ai_configured || capabilities?.ai.configured)) {
      await handleStartStep(nextStep, true);
    } else {
      setActiveStepIndex(null);
      setSession(null);
      savePersistedStepState(lesson.lesson_index, null);
    }
  };

  // ==========================================
  // STEP 4: SPEAKING AI HANDLERS
  // ==========================================
  const lessonWordIds = useMemo(
    () => (lesson?.words || []).map((w) => w.id),
    [lesson?.words],
  );

  const combinedSpeakingTranscript = useMemo(() => {
    return [...speakingSubmittedTexts, speakingText].join('\n');
  }, [speakingSubmittedTexts, speakingText]);

  const generateSpeakingPrompt = async () => {
    if (!lesson) return;
    setStepBusy(true);
    setError('');
    try {
      const terms = lesson.words.map((w) => w.term).join(', ');
      const res = await api.request<{ id: string; result: { question: string } }>('POST', '/ai/generate', {
        set_id: setId,
        kind: 'speaking_question',
        word_ids: lessonWordIds,
        instruction: `Create one natural English speaking question that encourages the learner to use these words: ${terms}`,
      });
      setSpeakingQuestion(String(res.result?.question || ''));
      setSpeakingQuestionTranslation('');
      setSpeakingHint('');
    } catch (e) {
      setError((e as Error).message || 'Không thể tạo câu hỏi nói bằng AI.');
    } finally {
      setStepBusy(false);
    }
  };

  const requestSpeakingHint = async () => {
    if (!lesson) return;
    setStepBusy(true);
    setError('');
    try {
      const terms = lesson.words.map((w) => w.term).join(', ');
      const res = await api.request<{ id: string; result: { hint: string; example: string } }>('POST', '/ai/generate', {
        set_id: setId,
        kind: 'speaking_hint',
        word_ids: lessonWordIds,
        question: speakingQuestion,
        instruction: `Provide a short English sample answer using all of these words (${terms}) for the question: "${speakingQuestion}"`,
      });
      const hintParts = [res.result?.hint, res.result?.example].filter(Boolean).join('\n');
      setSpeakingHint(hintParts);
    } catch (e) {
      setError((e as Error).message || 'Không thể lấy gợi ý từ AI.');
    } finally {
      setStepBusy(false);
    }
  };

  const translateSpeakingQuestion = async () => {
    if (!speakingQuestion || speakingQuestionTranslation) return;
    setStepBusy(true);
    setError('');
    try {
      const res = await api.request<{ id: string; result: { translation: string } }>('POST', '/ai/generate', {
        set_id: setId,
        kind: 'translation',
        word_ids: lessonWordIds,
        instruction: `Translate this exact question into Vietnamese: ${speakingQuestion}`,
      });
      setSpeakingQuestionTranslation(String(res.result?.translation || ''));
    } catch (e) {
      setError((e as Error).message || 'Không thể dịch câu hỏi.');
    } finally {
      setStepBusy(false);
    }
  };

  const evaluateSpeakingAnswer = async () => {
    if (!lesson || !speakingText.trim()) return;
    setStepBusy(true);
    setError('');
    setSpeakingMissingTerms([]);
    try {
      const submitted = speakingText.trim();
      const terms = lesson.words.map((w) => w.term).join(', ');
      const res = await api.request<{ id: string; result: { feedback: string } }>('POST', '/ai/generate', {
        set_id: setId,
        kind: 'speaking_feedback',
        word_ids: lessonWordIds,
        question: speakingQuestion,
        instruction: `Target words: ${terms}. Question: ${speakingQuestion}`,
        transcript: submitted,
      });
      setSpeakingFeedback(String(res.result?.feedback || ''));
      setFeedbackIds((prev) => (prev.includes(res.id) ? prev : [...prev, res.id]));
      setSpeakingSubmittedTexts((prev) => [...prev, submitted]);
    } catch (e) {
      setError((e as Error).message || 'Không thể chấm nhận xét bài nói.');
    } finally {
      setStepBusy(false);
    }
  };

  const completeSpeakingStep = async () => {
    if (!lesson || feedbackIds.length === 0) return;
    setStepBusy(true);
    setError('');
    setSpeakingMissingTerms([]);
    try {
      await api.completeLessonStep(setId, lesson.lesson_index, 4, {
        feedback_ids: feedbackIds,
      });
      await refreshOverviewAndLesson(lesson.lesson_index);
      setActiveStepIndex(null);
      savePersistedStepState(lesson.lesson_index, null);
    } catch (e) {
      if (e instanceof ApiError && e.error.code === 'TARGET_WORDS_MISSING') {
        const missing =
          (e.error.details as { missing_terms?: string[] })?.missing_terms ||
          lesson.words
            .filter((w) => !hasWholeTerm(combinedSpeakingTranscript, w.term))
            .map((w) => w.term);
        setSpeakingMissingTerms(missing);
      }
      setError((e as Error).message || 'Chưa thể hoàn thành bước Luyện nói AI.');
    } finally {
      setStepBusy(false);
    }
  };

  // ==========================================
  // STEP 5: CONVERSATION AI HANDLERS
  // ==========================================
  const combinedChatUserText = useMemo(() => {
    return chatMessages
      .filter((m) => m.sender === 'user')
      .map((m) => m.content)
      .join('\n');
  }, [chatMessages]);

  const initConversationForLesson = async (words: ApiWord[]) => {
    const ids = words.map((w) => w.id);
    const terms = words.map((w) => w.term).join(', ');
    const created = await api.request<{ id: string }>('POST', '/conversations', {
      set_id: setId,
      title: `Thực hành từ vựng Bài ${lesson?.lesson_index ?? 1}: ${terms}`,
      settings: {
        language: 'en',
        exam: 'none',
        topic: `Thực hành từ vựng Bài ${lesson?.lesson_index ?? 1}: ${terms}`,
        word_ids: ids,
      },
    });
    const started = await api.request<{
      messages: { id: number | string; role: string; content: string }[];
    }>('POST', `/conversations/${created.id}/start`, {});
    setThreadId(created.id);
    setChatMessages(
      (started.messages || []).map((m) => ({
        id: String(m.id),
        sender: m.role === 'user' ? 'user' : 'ai',
        content: m.content,
      })),
    );
    setChatHint('');
    setChatMissingTerms([]);
  };

  const sendConversationMessage = async () => {
    if (!threadId || !chatInput.trim() || stepBusy) return;
    setStepBusy(true);
    setError('');
    setChatMissingTerms([]);
    try {
      const content = chatInput.trim();
      const res = await api.request<{
        messages: { id: number | string; role: string; content: string }[];
      }>('POST', `/conversations/${threadId}/messages`, { message: content });
      setChatMessages(
        (res.messages || []).map((m) => ({
          id: String(m.id),
          sender: m.role === 'user' ? 'user' : 'ai',
          content: m.content,
        })),
      );
      setChatInput('');
      setChatHint('');
    } catch (e) {
      setError((e as Error).message || 'Không thể gửi tin nhắn hội thoại.');
    } finally {
      setStepBusy(false);
    }
  };

  const requestConversationHint = async () => {
    if (!threadId || stepBusy) return;
    setStepBusy(true);
    setError('');
    try {
      const res = await api.request<{ hint: string; example?: string }>('POST', `/conversations/${threadId}/hint`, {});
      setChatHint([res.hint, res.example].filter(Boolean).join(' — '));
    } catch (e) {
      setError((e as Error).message || 'Không thể lấy gợi ý hội thoại.');
    } finally {
      setStepBusy(false);
    }
  };

  const completeConversationStep = async () => {
    if (!lesson || !threadId) return;
    setStepBusy(true);
    setError('');
    setChatMissingTerms([]);
    try {
      await api.completeLessonStep(setId, lesson.lesson_index, 5, {
        conversation_id: threadId,
      });
      await refreshOverviewAndLesson(lesson.lesson_index);
      setActiveStepIndex(null);
      savePersistedStepState(lesson.lesson_index, null);
    } catch (e) {
      if (e instanceof ApiError && e.error.code === 'TARGET_WORDS_MISSING') {
        const missing =
          (e.error.details as { missing_terms?: string[] })?.missing_terms ||
          lesson.words
            .filter((w) => !hasWholeTerm(combinedChatUserText, w.term))
            .map((w) => w.term);
        setChatMissingTerms(missing);
      }
      setError((e as Error).message || 'Chưa thể lưu bước Hội thoại AI.');
    } finally {
      setStepBusy(false);
    }
  };

  const toggleVoiceInput = (target: 'speaking' | 'chat') => {
    const isRec = target === 'speaking' ? speakingRecording : chatRecording;
    if (isRec) {
      recognitionCleanup.current?.();
      recognitionCleanup.current = null;
      setSpeakingRecording(false);
      setChatRecording(false);
      return;
    }
    setError('');
    if (target === 'speaking') setSpeakingRecording(true);
    else setChatRecording(true);
    try {
      recognitionCleanup.current = recognizeSpeech(
        (transcript) => {
          if (target === 'speaking') {
            setSpeakingText((prev) => (prev ? `${prev} ${transcript}` : transcript));
          } else {
            setChatInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
          }
        },
        () => {
          setSpeakingRecording(false);
          setChatRecording(false);
        },
        (msg) => {
          setSpeakingRecording(false);
          setChatRecording(false);
          setError(msg);
        },
        'en-US',
      );
    } catch {
      setSpeakingRecording(false);
      setChatRecording(false);
      setError('Không thể mở micro. Bạn vẫn có thể nhập văn bản.');
    }
  };

  const getStepIcon = (stepIndex: number) => {
    switch (stepIndex) {
      case 1:
        return BookOpen;
      case 2:
        return PenTool;
      case 3:
        return Headphones;
      case 4:
        return Mic;
      case 5:
        return MessageSquare;
      default:
        return BookOpen;
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-8 flex flex-col items-center justify-center min-h-[50vh] text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-xs font-bold">Đang tải cấu trúc Học kết hợp (5 từ × 5 bước)...</p>
      </div>
    );
  }

  const activeStepMeta = lesson?.steps.find((s) => s.index === activeStepIndex) || null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Breadcrumb & Deterministic Back Navigation */}
      <LearningBreadcrumb
        currentLabel="Học kết hợp (5 từ × 5 bước)"
        setId={setId}
        setTitle={setTitle}
      />

      {/* Page Title & Explanation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-2 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Lộ trình chia nhỏ bộ từ • 5 từ mỗi bài • 5 bước mỗi bài
            </span>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              Học kết hợp: {setTitle || `Bộ từ #${setId}`}
            </h1>
          </div>
          <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
            Tổng {lessons.length} bài nhỏ
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Mỗi bài gồm tối đa 5 từ vựng đi qua <strong>5 bước cố định</strong>: (1) Flashcards, (2) Học &amp; gõ từ, (3) Nghe chép từ/cụm từ, (4) Luyện nói AI và (5) Hội thoại AI. Ba bước đầu cập nhật trực tiếp tiến độ nhớ SRS và không cần AI.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center justify-between gap-3"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            className="underline font-bold shrink-0"
          >
            Đóng
          </button>
        </div>
      )}

      {/* 1. LESSON CARDS GRID (Clarifies X/5 bước vs X/Y từ đã luyện vs Z/Y đã nhớ) */}
      <section aria-label="Danh sách bài học nhỏ" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lessons.map((item) => {
          const isCurrent = lesson?.lesson_index === item.index;
          const totalSteps = item.total_steps || 5;
          const totalCoreSteps = item.total_core_steps || 3;
          const completedCoreSteps = item.completed_core_steps ?? Math.min(3, item.completed_steps);
          const coreCompleted = item.core_completed || item.completed || completedCoreSteps >= totalCoreSteps;
          const allStepsCompleted = item.all_steps_completed || item.completed_steps >= totalSteps;
          const wordCount = item.word_count ?? item.word_ids.length;
          const reviewedWords = item.reviewed_words ?? 0;
          const masteredWords = item.mastered_words ?? 0;

          const stateBadge =
            allStepsCompleted
              ? {
                  label: 'Hoàn thành 5/5 bước',
                  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
                }
              : coreCompleted
                ? {
                    label: 'Hoàn thành cốt lõi (3/3)',
                    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
                  }
                : item.state === 'in_progress' || completedCoreSteps > 0 || reviewedWords > 0
                  ? {
                      label: 'Đang học',
                      cls: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
                    }
                  : {
                      label: 'Chưa học',
                      cls: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
                    };

          return (
            <button
              key={item.index}
              type="button"
              data-testid={`lesson-card-${item.index}`}
              onClick={() => void handleSelectLesson(item.index)}
              className={`p-4 rounded-3xl border-2 text-left transition flex flex-col justify-between gap-3 cursor-pointer ${
                isCurrent
                  ? 'border-indigo-600 bg-white dark:bg-slate-900 shadow-md ring-2 ring-indigo-500/15'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
              }`}
            >
              <div className="space-y-2 w-full">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-sm text-slate-900 dark:text-white">
                    Bài {item.index} ({wordCount} từ)
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${stateBadge.cls}`}
                  >
                    {stateBadge.label}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 font-medium">
                  {item.terms.join(', ')}
                </p>
              </div>

              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 w-full flex flex-wrap items-center justify-between gap-1.5 text-[11px] font-bold">
                <span
                  data-testid={`lesson-${item.index}-steps`}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                >
                  Cốt lõi: {completedCoreSteps}/{totalCoreSteps} bước
                  {item.completed_steps > completedCoreSteps && ` (Tổng ${item.completed_steps}/${totalSteps})`}
                </span>
                <span
                  data-testid={`lesson-${item.index}-words`}
                  className="text-slate-500 dark:text-slate-400"
                >
                  đã luyện {reviewedWords}/{wordCount} từ · đã nhớ {masteredWords}/{wordCount}
                </span>
              </div>
            </button>
          );
        })}
      </section>

      {/* 2. SELECTED LESSON WORKSPACE */}
      {lesson && (() => {
        const lessonCoreTotal = lesson.total_core_steps || 3;
        const lessonCoreCompleted = lesson.completed_core_steps ?? Math.min(3, lesson.completed_steps);
        const isCoreDone = lesson.core_completed || lesson.completed || lessonCoreCompleted >= lessonCoreTotal;

        return (
          <div className="space-y-6">
            {/* Lesson Summary & 5 Steps Bar */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    Bài {lesson.lesson_index}: {lesson.words.map((w) => w.term).join(', ')}
                  </h2>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    Tiến độ cốt lõi: <strong>{lessonCoreCompleted}/{lessonCoreTotal} bước</strong> {isCoreDone ? '(Hoàn thành phần cốt lõi)' : ''} • Tổng đã làm: <strong>{lesson.completed_steps}/5 bước</strong> • Đã luyện{' '}
                    <strong>
                      {lesson.reviewed_words}/{lesson.word_count} từ
                    </strong>{' '}
                    • Đã nhớ{' '}
                    <strong>
                      {lesson.mastered_words}/{lesson.word_count} từ
                    </strong>
                  </p>
                </div>

                {activeStepIndex !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStepIndex(null);
                      setSession(null);
                      savePersistedStepState(lesson.lesson_index, null);
                    }}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition self-start sm:self-auto"
                  >
                    Xem danh sách từ của bài
                  </button>
                )}
              </div>

              {isCoreDone && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Hoàn thành phần cốt lõi (3/3 bước)!</strong> Bạn đã hoàn tất các bước ghi nhớ từ vựng cần thiết. Hai bước AI bên dưới là phần <em>Luyện thêm</em> tùy chọn để mở rộng phản xạ.
                  </span>
                </div>
              )}

              {/* 5 Steps Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                {lesson.steps.map((s) => {
                  const Icon = getStepIcon(s.index);
                  const isSelected = activeStepIndex === s.index;
                  const aiReady = !s.requires_ai || s.ai_configured || Boolean(capabilities?.ai.configured);
                  const isCore = s.index <= 3;

                  return (
                    <div
                      key={s.index}
                      data-testid={`lesson-step-${s.index}`}
                      className={`p-3.5 rounded-2xl border transition flex flex-col justify-between gap-2.5 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                          : s.completed
                            ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/60 dark:bg-emerald-950/20'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-slate-700 dark:text-slate-200">
                            <Icon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>Bước {s.index}/5</span>
                          </span>
                          <div className="flex items-center gap-1">
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                              isCore
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                            }`}>
                              {isCore ? 'Cốt lõi' : 'Tùy chọn AI'}
                            </span>
                            {s.completed ? (
                              <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black">
                                Đã xong
                              </span>
                            ) : !aiReady ? (
                              <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-bold">
                                Cần AI
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="font-extrabold text-xs text-slate-900 dark:text-white leading-snug">
                          {s.name}
                        </div>

                        <div className="text-[10px] font-semibold text-slate-400">
                          {isCore ? 'Cập nhật nhớ từ (SRS)' : 'Luyện thêm ngữ cảnh AI'}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        disabled={stepBusy}
                        data-testid={`start-step-${s.index}`}
                        onClick={() => void handleStartStep(s, true)}
                        className={`flex-1 py-2 px-2.5 rounded-xl text-[11px] font-black transition text-center ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : s.completed
                              ? 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                              : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900'
                        }`}
                      >
                        {isSelected ? 'Đang mở' : s.completed ? 'Xem / Tiếp tục' : 'Bắt đầu'}
                      </button>

                      {s.index <= 3 && (s.completed || isSelected) && (
                        <button
                          type="button"
                          disabled={stepBusy}
                          title="Luyện lại bước này từ đầu"
                          data-testid={`restart-step-${s.index}`}
                          onClick={() => void handleStartStep(s, false)}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 3. ACTIVE STEP RUNNER OR TARGET WORDS LIST */}
          {activeStepMeta &&
          activeStepMeta.requires_ai &&
          !activeStepMeta.ai_configured &&
          !capabilities?.ai.configured ? (
            /* AI Not Configured Notice for Step 4 or 5 */
            <section
              data-testid="ai-step-unconfigured"
              className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-3xl p-8 text-center space-y-4 shadow-2xs"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Bước {activeStepMeta.index}: {activeStepMeta.name} cần kết nối AI
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ba bước đầu (Flashcards, Học &amp; gõ từ, Nghe chép từ/cụm từ) hoạt động bình thường không cần AI. Để thực hành {activeStepMeta.name}, hãy kết nối Gemini hoặc Ollama trong Cài đặt AI.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/settings/ai?returnTo=${encodeURIComponent(path)}`)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition"
                >
                  Mở Cài đặt AI
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStepIndex(null)}
                  className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Đóng
                </button>
              </div>
            </section>
          ) : activeStepIndex && activeStepIndex <= 3 && session ? (
            /* Steps 1-3: Unified SessionRunner */
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Đang thực hiện Bước {activeStepIndex}/5: {activeStepMeta?.name}
                </span>
                <button
                  type="button"
                  disabled={stepBusy}
                  onClick={() => activeStepMeta && void handleStartStep(activeStepMeta, false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Luyện lại từ đầu</span>
                </button>
              </div>

              <SessionRunner
                initial={session}
                words={lesson.words}
                stepTitle={activeStepMeta?.name}
                onWordChange={(updated) => {
                  setLesson((prev) =>
                    prev
                      ? {
                          ...prev,
                          words: prev.words.map((w) => (w.id === updated.id ? updated : w)),
                        }
                      : prev,
                  );
                }}
                onFinish={(completedSession) =>
                  handleCompleteStudyStep(activeStepIndex, completedSession)
                }
                onRestart={async () => {
                  if (activeStepMeta) {
                    await handleStartStep(activeStepMeta, false);
                  }
                }}
              />
            </div>
          ) : activeStepIndex === 4 ? (
            /* Step 4: Speaking AI Scoped to Lesson's 5 Words */
            <section
              data-testid="lesson-speaking-step"
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Bước 4/5 • Luyện nói AI (Phạm vi: {lesson.words.length} từ của Bài {lesson.lesson_index})
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                    Đặt câu hoặc trả lời câu hỏi sử dụng đủ {lesson.words.length} từ mục tiêu
                  </h3>
                </div>
                <button
                  type="button"
                  disabled={stepBusy}
                  onClick={() => void generateSpeakingPrompt()}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Tạo câu hỏi gợi ý bằng AI</span>
                </button>
              </div>

              {/* Target Words Usage Checklist */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-500">
                  Từ mục tiêu cần xuất hiện nguyên từ trong câu trả lời của bạn:
                </div>
                <div className="flex flex-wrap gap-2">
                  {lesson.words.map((w) => {
                    const used = hasWholeTerm(combinedSpeakingTranscript, w.term);
                    const isFlaggedMissing = speakingMissingTerms.some(
                      (m) => m.toLowerCase() === w.term.toLowerCase(),
                    );
                    return (
                      <span
                        key={w.id}
                        data-testid={`speaking-target-word-${w.term}`}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 ${
                          used
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800'
                            : isFlaggedMissing
                              ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {used && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        <span>{w.term}</span>
                        <span className="text-[11px] font-normal opacity-75">({w.definition})</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Question Prompt Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                    {speakingQuestion}
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => playAudio(speakingQuestion, 'en-US')}
                      className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-600"
                      title="Nghe câu hỏi"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={stepBusy}
                      onClick={() => void translateSpeakingQuestion()}
                      className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-600"
                      title="Dịch câu hỏi"
                    >
                      <Languages className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={stepBusy}
                      onClick={() => void requestSpeakingHint()}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-bold hover:bg-indigo-100"
                    >
                      Gợi ý câu mẫu
                    </button>
                  </div>
                </div>
                {speakingQuestionTranslation && (
                  <p className="text-xs text-slate-500 italic border-t border-slate-200/60 pt-2">
                    {speakingQuestionTranslation}
                  </p>
                )}
                {speakingHint && (
                  <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                    <div className="font-bold">Gợi ý câu trả lời mẫu:</div>
                    <p>{speakingHint}</p>
                  </div>
                )}
              </div>

              {/* Learner Transcript Input */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nội dung trả lời của bạn (ghi âm hoặc gõ câu tiếng Anh chứa các từ mục tiêu):
                </label>
                <div className="flex gap-2">
                  <textarea
                    aria-label="Bài nói"
                    rows={3}
                    value={speakingText}
                    onChange={(e) => setSpeakingText(e.target.value)}
                    placeholder={`Nhập câu tiếng Anh có chứa: ${lesson.words.map((w) => w.term).join(', ')}...`}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 text-sm font-medium bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                  {speechRecognitionAvailable() && (
                    <button
                      type="button"
                      onClick={() => toggleVoiceInput('speaking')}
                      className={`px-4 rounded-2xl flex items-center justify-center transition shrink-0 ${
                        speakingRecording
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                      }`}
                      title="Ghi âm giọng nói"
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={stepBusy || !speakingText.trim()}
                    data-testid="submit-speaking-ai"
                    onClick={() => void evaluateSpeakingAnswer()}
                    className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black transition inline-flex items-center gap-2 shadow-xs"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{stepBusy ? 'Đang chấm nhận xét...' : 'Nhận xét bài nói bằng AI'}</span>
                  </button>
                </div>
              </div>

              {/* AI Feedback Display — Kept visible until learner clicks Save & Continue */}
              {speakingFeedback && (
                <div
                  data-testid="speaking-ai-feedback"
                  className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                      Nhận xét từ AI
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                      Đã lưu {feedbackIds.length} lượt chấm
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
                    {speakingFeedback}
                  </p>
                </div>
              )}

              {speakingMissingTerms.length > 0 && (
                <div
                  role="alert"
                  data-testid="speaking-missing-terms-alert"
                  className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold space-y-1"
                >
                  <p>
                    Cần sử dụng nguyên từ các từ mục tiêu còn thiếu trước khi hoàn thành bước này:{' '}
                    <strong>{speakingMissingTerms.join(', ')}</strong>
                  </p>
                  <p className="text-[11px] font-normal">
                    Bạn có thể gõ bổ sung câu chứa từ còn thiếu rồi bấm &ldquo;Nhận xét bài nói bằng AI&rdquo; một lần nữa (các lượt chấm trước vẫn được giữ nguyên).
                  </p>
                </div>
              )}

              {feedbackIds.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                  <button
                    type="button"
                    disabled={stepBusy}
                    data-testid="complete-speaking-step"
                    onClick={() => void completeSpeakingStep()}
                    className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-black transition shadow-sm"
                  >
                    Lưu bước học và tiếp tục
                  </button>
                </div>
              )}
            </section>
          ) : activeStepIndex === 5 ? (
            /* Step 5: Conversation AI Scoped to Lesson's 5 Words */
            <section
              data-testid="lesson-conversation-step"
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Bước 5/5 • Hội thoại AI (Phạm vi: {lesson.words.length} từ của Bài {lesson.lesson_index})
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                    Trò chuyện với AI và sử dụng đủ {lesson.words.length} từ mục tiêu trong hội thoại
                  </h3>
                </div>
                {!threadId && (
                  <button
                    type="button"
                    disabled={stepBusy}
                    onClick={() => void initConversationForLesson(lesson.words)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                  >
                    Khởi tạo hội thoại
                  </button>
                )}
              </div>

              {/* Target Words Usage Checklist */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-500">
                  Từ mục tiêu cần dùng trong tin nhắn của bạn:
                </div>
                <div className="flex flex-wrap gap-2">
                  {lesson.words.map((w) => {
                    const used = hasWholeTerm(combinedChatUserText, w.term);
                    const isFlaggedMissing = chatMissingTerms.some(
                      (m) => m.toLowerCase() === w.term.toLowerCase(),
                    );
                    return (
                      <span
                        key={w.id}
                        data-testid={`conversation-target-word-${w.term}`}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 ${
                          used
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800'
                            : isFlaggedMissing
                              ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {used && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        <span>{w.term}</span>
                        <span className="text-[11px] font-normal opacity-75">({w.definition})</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Messages Thread */}
              <div className="space-y-3 max-h-80 overflow-y-auto p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700">
                {chatMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl text-xs md:text-sm font-medium space-y-1 ${
                        m.sender === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase opacity-75">
                          {m.sender === 'user' ? 'Bạn' : 'AI Tutor'}
                        </span>
                        <button
                          type="button"
                          onClick={() => playAudio(m.content, 'en-US')}
                          className="p-1 rounded hover:bg-black/10"
                          title="Nghe tin nhắn"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {chatHint && (
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200">
                  <strong>Gợi ý trả lời:</strong> {chatHint}
                </div>
              )}

              {/* Message Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendConversationMessage();
                }}
                className="flex gap-2"
              >
                <input
                  aria-label="Tin nhắn hội thoại"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={stepBusy || !threadId}
                  placeholder={`Nhập câu trả lời có dùng: ${lesson.words.map((w) => w.term).join(', ')}...`}
                  className="flex-1 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 text-sm font-medium bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
                {speechRecognitionAvailable() && (
                  <button
                    type="button"
                    onClick={() => toggleVoiceInput('chat')}
                    className={`px-3.5 rounded-2xl flex items-center justify-center transition ${
                      chatRecording
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  disabled={stepBusy || !threadId}
                  onClick={() => void requestConversationHint()}
                  className="px-3.5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                >
                  Gợi ý
                </button>
                <button
                  type="submit"
                  disabled={stepBusy || !threadId || !chatInput.trim()}
                  className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi</span>
                </button>
              </form>

              {chatMissingTerms.length > 0 && (
                <div
                  role="alert"
                  data-testid="conversation-missing-terms-alert"
                  className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold"
                >
                  Cần sử dụng nguyên từ các từ mục tiêu còn thiếu trong tin nhắn trước khi hoàn thành:{' '}
                  <strong>{chatMissingTerms.join(', ')}</strong>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                <button
                  type="button"
                  disabled={stepBusy || !threadId}
                  data-testid="complete-conversation-step"
                  onClick={() => void completeConversationStep()}
                  className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-black transition shadow-sm"
                >
                  Hoàn thành bước hội thoại
                </button>
              </div>
            </section>
          ) : (
            /* Default Lesson Words List with WordLearningDetails */
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Danh sách {lesson.words.length} từ vựng của Bài {lesson.lesson_index}
                </h3>
                <span className="text-xs text-slate-400">
                  Chọn một bước ở trên để bắt đầu luyện tập
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {lesson.words.map((w) => (
                  <div key={w.id} className="py-4 first:pt-1 last:pb-1 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-base text-slate-900 dark:text-white">
                            {w.term}
                          </span>
                          {w.phonetic && (
                            <span className="text-xs font-mono text-slate-400">{w.phonetic}</span>
                          )}
                          {w.part_of_speech && (
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500">
                              {w.part_of_speech}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => playAudio(w.term, 'en-US')}
                            className="p-1 rounded-lg text-indigo-600 hover:bg-indigo-50 transition"
                            title={`Nghe từ ${w.term}`}
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-0.5">
                          {w.definition}
                        </p>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          w.status === 'mastered'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : w.status === 'learning'
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {w.status === 'mastered'
                          ? 'Đã nhớ'
                          : w.status === 'learning'
                            ? 'Đang học'
                            : 'Mới'}
                      </span>
                    </div>

                    <WordLearningDetails
                      word={w}
                      variant="list"
                      onChange={(updated) => {
                        setLesson((prev) =>
                          prev
                            ? {
                                ...prev,
                                words: prev.words.map((item) =>
                                  item.id === updated.id ? updated : item,
                                ),
                              }
                            : prev,
                        );
                      }}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
          </div>
        );
      })()}
    </div>
  );
}
