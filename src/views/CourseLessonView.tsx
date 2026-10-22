import React, { useEffect, useState, useRef } from 'react';
import { api, CourseLearningSession, CourseLearningStep } from '../api/client';
import { useRouter } from '../context/RouterContext';
import { playAudio, recognizeSpeech, speechRecognitionAvailable } from '../utils/audio';
import { MascotIllustration } from '../components/MascotIllustration';
import { 
  ArrowLeft, 
  RotateCcw, 
  Mic, 
  MicOff, 
  CheckCircle2, 
  AlertCircle,
  Award,
  ChevronRight,
  Loader2
} from 'lucide-react';

export function CourseLessonView() {
  const { params, navigate } = useRouter();
  const lessonId = Number(params.id);

  const [session, setSession] = useState<CourseLearningSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  // Audio & Animation states
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechSpeed, setSpeechSpeed] = useState<number>(0.9);
  const [showTranslation, setShowTranslation] = useState<boolean>(true);

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const [userSpokenText, setUserSpokenText] = useState('');
  const stopListeningRef = useRef<(() => void) | null>(null);

  // Quiz draft & submission state
  const [answers, setAnswers] = useState<Record<string, { answer?: string; option_id?: string }>>({});
  const draftTimerRef = useRef<number | null>(null);

  // Step feedback message (e.g. speaking match error or result)
  const [stepFeedback, setStepFeedback] = useState<{
    kind: string;
    matched?: boolean;
    skipped?: boolean;
    message?: string;
    transcript?: string;
  } | null>(null);

  // Load or resume session from Backend
  const loadSession = async (resume = true) => {
    setLoading(true);
    setError('');
    setStepFeedback(null);
    try {
      const data = await api.startCourseLessonSession(lessonId, resume);
      setSession(data);
      // Restore quiz draft if present
      if (data.quiz_draft?.length) {
        const restored: Record<string, { answer?: string; option_id?: string }> = {};
        for (const a of data.quiz_draft) {
          restored[a.question_id] = { answer: a.answer, option_id: a.option_id };
        }
        setAnswers(restored);
      }
      if (data.current?.result) {
        setStepFeedback(data.current.result);
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể tải phiên học từ máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!lessonId) return;
    loadSession(true);

    return () => {
      if (stopListeningRef.current) stopListeningRef.current();
      if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);
    };
  }, [lessonId]);

  const currentStep = session?.current;

  // Auto-play audio when step changes to vocab or speaking
  useEffect(() => {
    if (!currentStep || currentStep.type === 'quiz') return;
    setUserSpokenText('');
    setStepFeedback(currentStep.result || null);
    if (currentStep.english) {
      triggerAudio(currentStep.english);
    }
  }, [currentStep?.id]);

  const triggerAudio = (text: string) => {
    if (!text) return;
    setIsPlaying(true);
    playAudio(text, 'en-US', speechSpeed);
    const duration = Math.max(1600, (text.split(' ').length * 550) / speechSpeed);
    setTimeout(() => {
      setIsPlaying(false);
    }, duration);
  };

  const togglePlayback = () => {
    if (isPlaying) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
    } else if (currentStep?.english) {
      triggerAudio(currentStep.english);
    }
  };

  const replayAudio = () => {
    if (currentStep?.english) {
      triggerAudio(currentStep.english);
    }
  };

  const cycleSpeed = () => {
    const speeds = [0.8, 0.9, 1.0, 1.2];
    const nextIdx = (speeds.indexOf(speechSpeed) + 1) % speeds.length;
    setSpeechSpeed(speeds[nextIdx]);
  };

  // Keyboard shortcuts: Standalone Ctrl plays audio; Enter checks/continues
  useEffect(() => {
    let ctrlAlone = false;
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Control' && !e.repeat) {
        ctrlAlone = !e.altKey && !e.shiftKey && !e.metaKey;
        return;
      }
      if (e.ctrlKey) ctrlAlone = false;

      if (e.key === 'Enter' && !e.repeat && !e.isComposing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.closest('button,select,textarea,[role="dialog"]')) return;
        if (actionBusy || !currentStep) return;

        if (currentStep.type === 'vocab') {
          e.preventDefault();
          void handleCompleteVocab();
        } else if (currentStep.type === 'speaking') {
          e.preventDefault();
          if (userSpokenText.trim()) {
            void handleCompleteSpeaking(false);
          }
        }
      }
    };

    const up = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        if (ctrlAlone && currentStep?.english) {
          triggerAudio(currentStep.english);
        }
        ctrlAlone = false;
      }
    };

    const blur = () => { ctrlAlone = false; };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [currentStep, userSpokenText, actionBusy]);

  // Step 1: Complete Vocab Step
  const handleCompleteVocab = async () => {
    if (!session || !currentStep || actionBusy) return;
    setActionBusy(true);
    setError('');
    try {
      const res = await api.completeCourseLessonStep(session.id, currentStep.id, { acknowledged: true });
      setSession(res);
      setStepFeedback(null);
    } catch (err: any) {
      setError(err?.message || 'Không thể chuyển bước học.');
    } finally {
      setActionBusy(false);
    }
  };

  // Step 2: Complete Speaking Step (check or skip)
  const handleCompleteSpeaking = async (skip = false) => {
    if (!session || !currentStep || actionBusy) return;
    if (stopListeningRef.current) stopListeningRef.current();
    setIsListening(false);
    setActionBusy(true);
    setError('');

    const payload = skip ? { skip: true } : { transcript: userSpokenText.trim() };
    try {
      const res = await api.completeCourseLessonStep(session.id, currentStep.id, payload);
      setSession(res);
      if (res.feedback) {
        setStepFeedback(res.feedback);
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể kiểm tra câu nói.');
    } finally {
      setActionBusy(false);
    }
  };

  // Speech Recognition trigger
  const startVoiceInput = () => {
    if (isListening) {
      if (stopListeningRef.current) stopListeningRef.current();
      setIsListening(false);
      return;
    }

    if (!speechRecognitionAvailable()) {
      setError('Trình duyệt chưa hỗ trợ nhận dạng giọng nói. Bạn có thể nhập câu trả lời vào ô.');
      return;
    }

    setIsListening(true);
    setStepFeedback(null);
    setError('');

    stopListeningRef.current = recognizeSpeech(
      (transcript) => {
        setUserSpokenText(transcript);
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      },
      (err) => {
        setIsListening(false);
        setError(err);
      }
    );
  };

  // Handle Quiz Draft autosave
  const handleQuizAnswerChange = (questionId: string, value: { answer?: string; option_id?: string }) => {
    const nextAnswers = { ...answers, [questionId]: value };
    setAnswers(nextAnswers);

    if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);
    draftTimerRef.current = window.setTimeout(async () => {
      if (!session || currentStep?.type !== 'quiz') return;
      try {
        const payload = Object.entries(nextAnswers).map(([qid, val]) => ({
          question_id: qid,
          answer: val.answer,
          option_id: val.option_id,
        }));
        await api.saveCourseQuizDraft(session.id, payload);
      } catch {
        // Quietly persist draft
      }
    }, 600);
  };

  // Submit Quiz Step to Server
  const handleSubmitQuiz = async () => {
    if (!session || !currentStep || currentStep.type !== 'quiz' || actionBusy) return;
    const questions = currentStep.questions || [];
    const formatted = questions.map((q) => ({
      question_id: q.id,
      answer: answers[q.id]?.answer ?? '',
      option_id: answers[q.id]?.option_id,
    }));

    setActionBusy(true);
    setError('');
    try {
      const res = await api.completeCourseLessonStep(session.id, currentStep.id, { answers: formatted });
      setSession(res);
    } catch (err: any) {
      setError(err?.message || 'Không thể nộp bài tập.');
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Đang chuẩn bị phiên học từ máy chủ...</p>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 text-center space-y-4">
        <p className="text-sm font-bold text-rose-600">{error}</p>
        <button
          onClick={() => navigate('/courses')}
          className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          Quay lại danh sách khoá học
        </button>
      </div>
    );
  }

  if (!session) return null;

  const totalSteps = session.total;
  const currentStepNumber = Math.min(session.index + 1, totalSteps);
  const progressPercent = totalSteps > 0 ? Math.round(((session.status === 'completed' ? totalSteps : session.index) / totalSteps) * 100) : 100;

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col justify-between pb-12">
      {/* 1. Header Bar matching Image 2 */}
      <div>
        <header className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/courses')}
              className="p-2 -ml-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              aria-label="Quay lại"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                {session.title}
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                {session.status === 'completed' ? 'Đã hoàn thành bài học' : `Bước ${currentStepNumber} / ${totalSteps}`}
              </p>
            </div>
          </div>

          {/* Progress Badge */}
          <div className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-700 dark:text-slate-300 shadow-xs">
            {currentStepNumber} / {totalSteps}
          </div>
        </header>

        {/* Horizontal Progress Bar matching Image 2 */}
        <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-slate-900 dark:bg-white transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 2. Main Stage */}
      <main className="flex-1 flex flex-col items-center justify-center py-6 px-4">
        {session.status === 'completed' || !currentStep ? (
          /* Lesson Completed Stage */
          <div className="w-full max-w-xl mx-auto text-center space-y-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl p-8">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shadow-xs">
              <Award className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                Chúc mừng bạn đã hoàn thành bài học!
              </h2>
              {session.grade && (
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  Điểm số kiểm tra: {session.grade.score} / {session.grade.total}
                </p>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tiến độ bài học đã được ghi nhận vào hệ thống khoá học cá nhân của bạn.
              </p>
            </div>

            {session.grade?.results && (
              <div className="text-left space-y-3 pt-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Chi tiết câu hỏi:
                </h3>
                {session.grade.results.map((res: any, idx: number) => (
                  <div
                    key={res.question_id || idx}
                    className={`p-3.5 rounded-2xl border text-xs font-medium ${
                      res.correct
                        ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
                        : 'border-rose-200 bg-rose-50/50 text-rose-900 dark:bg-rose-950/30 dark:text-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {res.correct ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>Câu {idx + 1}: {res.correct ? 'Chính xác' : `Cần ôn lại (Đáp án: ${res.expected})`}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={() => navigate('/courses')}
                className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black shadow-sm transition"
              >
                Về lộ trình khoá học
              </button>
              <button
                onClick={() => void loadSession(false)}
                className="px-5 py-3.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition"
              >
                Học lại từ đầu
              </button>
            </div>
          </div>
        ) : currentStep.type !== 'quiz' ? (
          /* Vocab & Speaking Stage matching Image 2 */
          <div className="flex flex-col items-center text-center">
            {/* Mascot Interactive Glowing Aura Orb */}
            <div
              onClick={togglePlayback}
              className="relative w-56 h-56 md:w-64 md:h-64 flex items-center justify-center cursor-pointer group select-none"
            >
              {/* Outer pulsing color waves */}
              <div
                className={`absolute inset-0 rounded-full transition-all duration-700 blur-2xl ${
                  isPlaying
                    ? 'scale-110 opacity-70 bg-gradient-to-tr from-cyan-400 via-indigo-400 to-fuchsia-400 animate-pulse'
                    : 'scale-95 opacity-40 bg-gradient-to-tr from-sky-300 via-indigo-300 to-pink-300 group-hover:scale-100 group-hover:opacity-60'
                }`}
              />

              {/* Concentric subtle outline wave ring */}
              <div
                className={`absolute inset-2 rounded-full border-4 transition-all duration-500 ${
                  isPlaying
                    ? 'border-cyan-300/60 shadow-[0_0_35px_rgba(56,189,248,0.5)] rotate-12 scale-102'
                    : 'border-indigo-200/50 group-hover:border-indigo-400/60'
                }`}
              />

              {/* Inner disc background with mascot */}
              <div className="relative w-44 h-44 md:w-48 md:h-48 rounded-full bg-gradient-to-b from-sky-100/90 to-blue-50/90 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center shadow-inner border border-sky-200/40">
                <MascotIllustration size={115} speaking={isPlaying} />
              </div>
            </div>

            {/* Click to Pause / Resume Caption */}
            <p
              onClick={togglePlayback}
              className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-900 transition"
            >
              {isPlaying ? 'Chạm để tạm dừng' : 'Chạm để nghe lại'}
            </p>

            {/* Skip Button matching Image 2 */}
            {currentStep.type === 'speaking' ? (
              <button
                disabled={actionBusy}
                onClick={() => void handleCompleteSpeaking(true)}
                className="mt-3 px-5 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <span>▷|</span>
                <span>Bỏ qua</span>
              </button>
            ) : (
              <button
                disabled={actionBusy}
                onClick={() => void handleCompleteVocab()}
                className="mt-3 px-5 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <span>Tiếp tục (Enter)</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          /* Step Quiz Header Stage */
          <div className="text-center space-y-3 max-w-lg mb-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shadow-sm">
              <Award className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {currentStep.title || 'Bài tập của bài học'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hoàn thành các câu hỏi để hoàn tất bài học và lưu tiến độ trên máy chủ
            </p>
          </div>
        )}

        {/* 3. Bottom Floating Interaction Card */}
        {session.status !== 'completed' && currentStep && (
          <div className="w-full max-w-xl mx-auto mt-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl p-6 md:p-8 space-y-5">
              {currentStep.type !== 'quiz' ? (
                <>
                  {/* Sentence Display Area */}
                  <div className="text-center space-y-2 min-h-[90px] flex flex-col justify-center">
                    <p className="text-xs uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-400">
                      {currentStep.title}
                    </p>
                    <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                      {currentStep.english}
                    </h2>
                    {showTranslation && currentStep.vietnamese && (
                      <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                        {currentStep.vietnamese}
                      </p>
                    )}
                  </div>

                  {/* Speaking Interaction */}
                  {currentStep.type === 'speaking' && (
                    <div className="pt-2 flex flex-col items-center gap-3">
                      <div className="flex gap-2 items-center w-full">
                        <input
                          type="text"
                          value={userSpokenText}
                          onChange={(e) => setUserSpokenText(e.target.value)}
                          placeholder="Nói hoặc nhập lại câu trên..."
                          className="flex-1 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={startVoiceInput}
                          className={`p-3 rounded-2xl text-xs font-bold transition flex items-center justify-center shrink-0 ${
                            isListening
                              ? 'bg-rose-500 text-white animate-pulse'
                              : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 hover:bg-indigo-100'
                          }`}
                          title="Bật micro để nói"
                        >
                          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </button>
                      </div>

                      {stepFeedback && (
                        <div
                          className={`w-full p-3 rounded-2xl text-xs font-medium text-center ${
                            stepFeedback.matched
                              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                              : 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
                          }`}
                        >
                          {stepFeedback.message || (stepFeedback.matched ? '✓ Nhận dạng khớp câu mẫu!' : 'Chưa khớp câu mẫu. Bạn có thể nghe lại, thử lại hoặc nhấn Bỏ qua.')}
                        </div>
                      )}

                      <div className="flex gap-2 w-full pt-1">
                        <button
                          disabled={actionBusy || !userSpokenText.trim()}
                          onClick={() => void handleCompleteSpeaking(false)}
                          className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-2xl text-xs font-black transition shadow-xs"
                        >
                          {actionBusy ? 'Đang kiểm tra...' : 'Kiểm tra câu nói'}
                        </button>
                        <button
                          disabled={actionBusy}
                          onClick={() => void handleCompleteSpeaking(true)}
                          className="px-4 py-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-bold transition"
                        >
                          Bỏ qua
                        </button>
                      </div>
                    </div>
                  )}

                  {currentStep.type === 'vocab' && (
                    <div className="pt-2">
                      <button
                        disabled={actionBusy}
                        onClick={() => void handleCompleteVocab()}
                        className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-2xl text-xs font-black transition shadow-xs"
                      >
                        {actionBusy ? 'Đang chuyển bước...' : 'Đã hiểu và tiếp tục (Enter)'}
                      </button>
                    </div>
                  )}

                  {/* Pagination indicator dots */}
                  <div className="flex items-center justify-center gap-1.5 py-1">
                    {session.steps.map((s, idx) => (
                      <div
                        key={s.id || idx}
                        className={`transition-all rounded-full ${
                          idx === session.index
                            ? 'w-5 h-1.5 bg-slate-900 dark:bg-white'
                            : s.completed
                            ? 'w-2 h-1.5 bg-emerald-500'
                            : 'w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="h-px bg-slate-100 dark:bg-slate-800" />

                  {/* Toolbar matching Image 2 */}
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 px-1">
                    {/* Speed toggle */}
                    <button
                      onClick={cycleSpeed}
                      className="px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Đổi tốc độ phát âm"
                    >
                      {speechSpeed}x
                    </button>

                    {/* Translation toggle */}
                    <button
                      onClick={() => setShowTranslation(!showTranslation)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <span className="font-mono">文A</span>
                      <span>{showTranslation ? 'Ẩn bản dịch' : 'Hiện bản dịch'}</span>
                    </button>

                    {/* Replay button */}
                    <button
                      onClick={replayAudio}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Nghe lại (Ctrl)</span>
                    </button>
                  </div>
                </>
              ) : (
                /* Quiz Form */
                <div className="space-y-6">
                  {currentStep.questions?.map((q, idx) => (
                    <fieldset
                      key={q.id}
                      disabled={actionBusy}
                      className="space-y-3"
                    >
                      <legend className="text-sm font-bold text-slate-900 dark:text-white">
                        {idx + 1}. {q.prompt}
                      </legend>

                      {q.type === 'choice' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options?.map((opt) => {
                            const isSelected = answers[q.id]?.option_id === opt.id;
                            return (
                              <label
                                key={opt.id}
                                className={`p-3 rounded-2xl border text-xs font-medium cursor-pointer transition flex items-center gap-2.5 ${
                                  isSelected
                                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-500'
                                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`q_${q.id}`}
                                  checked={isSelected}
                                  onChange={() => handleQuizAnswerChange(q.id, { option_id: opt.id })}
                                  className="w-4 h-4 text-indigo-600"
                                />
                                <span>{opt.text}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Nhập câu trả lời bằng tiếng Anh..."
                          value={answers[q.id]?.answer || ''}
                          onChange={(e) => handleQuizAnswerChange(q.id, { answer: e.target.value })}
                          className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      )}
                    </fieldset>
                  ))}

                  {error && <p className="text-xs text-rose-600 font-bold">{error}</p>}

                  <button
                    disabled={
                      actionBusy ||
                      currentStep.questions?.some((q) =>
                        q.type === 'choice' ? !answers[q.id]?.option_id : !answers[q.id]?.answer?.trim()
                      )
                    }
                    onClick={handleSubmitQuiz}
                    className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-2xl text-xs font-black transition shadow-sm"
                  >
                    {actionBusy ? 'Đang chấm điểm trên server...' : 'Nộp bài & Hoàn thành'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
