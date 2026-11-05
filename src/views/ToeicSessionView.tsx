import React, { useEffect, useState, useRef } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Volume2,
  Loader2,
  RotateCcw,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Award,
  BookOpen,
  VolumeX
} from 'lucide-react';
import { useRouter } from '../context/RouterContext';
import {
  toeicApi,
  ToeicSessionView as IToeicSessionView,
  ToeicTask,
  ToeicTaskToken
} from '../api/toeicFoundation';
import { playAudio } from '../utils/audio';

export const ToeicSessionView: React.FC = () => {
  const { path, navigate } = useRouter();

  // Extract session id: /courses/toeic/sessions/:id
  const match = path.match(/\/courses\/toeic\/sessions\/([a-zA-Z0-9-]+)/);
  const sessionId = match ? match[1] : '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState<IToeicSessionView | null>(null);

  // Submitting state to prevent double submit
  const [submitting, setSubmitting] = useState(false);
  const [helping, setHelping] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);

  // Task answer inputs
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [textAnswer, setTextAnswer] = useState<string>('');
  const [arrangedTokens, setArrangedTokens] = useState<ToeicTaskToken[]>([]);

  // Speech playback speed (0.75, 0.9, 1.0)
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const mutationInFlight = useRef(false);
  const audioRequest = useRef(0);
  const stopAudio = () => {
    audioRequest.current++;
    window.speechSynthesis?.cancel();
  };

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Cancel speech and invalidate late listen responses on task/session changes.
  useEffect(() => {
    stopAudio();
    return stopAudio;
  }, [sessionId, session?.current?.id]);

  // Fetch session on load
  const loadSession = async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      setError('');
      const data = await toeicApi.getSession(sessionId);
      setSession(data);
      resetTaskInputs(data.current);
    } catch (e: any) {
      setError(e?.message || 'Không thể tải phiên học.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  // Reset inputs when moving to a new task
  const resetTaskInputs = (_task: ToeicTask | null) => {
    setSelectedOptionId('');
    setTextAnswer('');
    setArrangedTokens([]);
  };

  // Keyboard navigation: Enter to submit or continue
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (e.repeat || e.isComposing || submitting || helping) return;
        if (session?.feedback) {
          e.preventDefault();
          handleContinue();
        } else if (e.target instanceof HTMLInputElement && session?.current) {
          e.preventDefault();
          handleSubmitAnswer();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Handle Play Audio via listen endpoint
  const handlePlayAudio = async () => {
    if (!session || !sessionId || audioLoading || mutationInFlight.current) return;
    const request = ++audioRequest.current;
    try {
      if (!('speechSynthesis' in window)) throw new Error('Trình duyệt chưa hỗ trợ đọc tiếng Anh. Hãy thử Chrome hoặc Edge có giọng tiếng Anh.');
      setAudioLoading(true);
      const res = await toeicApi.listenSession(sessionId, session.revision);
      if (res.text && request === audioRequest.current) {
        playAudio(res.text, res.lang || 'en-US', speechRate);
      }
    } catch (e: any) {
      if (e?.error?.code === 'STALE_REVISION') {
        await loadSession();
      } else {
        alert(e?.message || 'Không thể phát âm thanh.');
      }
    } finally {
      setAudioLoading(false);
    }
  };

  // Handle Help Request
  const handleHelp = async () => {
    if (!session || !sessionId || mutationInFlight.current) return;
    mutationInFlight.current = true;
    try {
      setHelping(true);
      const updated = await toeicApi.helpSession(sessionId, session.revision);
      setSession(updated);
    } catch (e: any) {
      if (e?.error?.code === 'STALE_REVISION') {
        await loadSession();
      } else {
        alert(e?.message || 'Không thể nhận trợ giúp lúc này.');
      }
    } finally {
      mutationInFlight.current = false;
      setHelping(false);
    }
  };

  // Handle Answer Submission
  const handleSubmitAnswer = async () => {
    if (!session || !session.current || !sessionId || mutationInFlight.current) return;
    const task = session.current;

    let payload: {
      revision: number;
      option_id?: string;
      answer?: string;
      token_ids?: string[];
    } = { revision: session.revision };

    if (task.options) {
      if (!selectedOptionId) {
        alert('Vui lòng chọn một đáp án.');
        return;
      }
      payload.option_id = selectedOptionId;
    } else if (task.type === 'arrange') {
      if (arrangedTokens.length !== (task.tokens?.length || 0)) {
        alert('Vui lòng xếp đầy đủ các từ trong câu.');
        return;
      }
      payload.token_ids = arrangedTokens.map(t => t.id);
    } else {
      if (!textAnswer.trim()) {
        alert('Vui lòng nhập câu trả lời.');
        return;
      }
      payload.answer = textAnswer.trim();
    }

    mutationInFlight.current = true;
    try {
      setSubmitting(true);
      const updated = await toeicApi.answerSession(sessionId, payload);
      setSession(updated);
    } catch (e: any) {
      if (e?.error?.code === 'STALE_REVISION') {
        await loadSession();
      } else {
        alert(e?.message || 'Không thể gửi câu trả lời.');
      }
    } finally {
      mutationInFlight.current = false;
      setSubmitting(false);
    }
  };

  // Handle Continue to Next Question
  const handleContinue = async () => {
    if (!session || !sessionId || mutationInFlight.current) return;
    mutationInFlight.current = true;
    stopAudio();
    try {
      setSubmitting(true);
      const updated = await toeicApi.answerSession(sessionId, {
        revision: session.revision,
        action: 'continue'
      });
      setSession(updated);
      resetTaskInputs(updated.current);
    } catch (e: any) {
      if (e?.error?.code === 'STALE_REVISION') {
        await loadSession();
      } else {
        alert(e?.message || 'Không thể chuyển câu tiếp theo.');
      }
    } finally {
      mutationInFlight.current = false;
      setSubmitting(false);
    }
  };

  // Handle Retry Checkpoint New Round
  const handleRetryCheckpoint = async () => {
    if (!session) return;
    const week = Number(session.unit_id.split('-')[1]);
    try {
      setSubmitting(true);
      const newSess = await toeicApi.startCheckpointSession(week, { resume: false });
      navigate(`/courses/toeic/sessions/${newSess.id}`);
    } catch (e: any) {
      alert(e?.message || 'Không thể bắt đầu lượt làm mới.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-semibold">Đang tải phiên học TOEIC...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-4">
        <div role="alert" className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-sm">
          {error || 'Không tìm thấy phiên học.'}
        </div>
        <button
          onClick={loadSession}
          className="px-4 py-2 border rounded-xl text-sm font-semibold mr-2"
        >
          Thử tải lại
        </button>
        <button
          onClick={() => navigate('/courses/toeic')}
          className="px-4 py-2 border rounded-xl text-sm font-semibold inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Về khóa TOEIC
        </button>
      </div>
    );
  }

  const isCompleted = session.status === 'passed' || session.status === 'needs_review';
  const isCheckpoint = session.module === 'checkpoint';
  const isReview = session.module === 'review';

  // Format module title
  const moduleLabel =
    session.module === 'grammar' ? 'Ngữ pháp'
    : session.module === 'vocabulary' ? 'Từ vựng'
    : session.module === 'listening' ? 'Nghe hiểu'
    : session.module === 'reading' ? 'Đọc hiểu'
    : session.module === 'pronunciation' ? 'Phát âm'
    : session.module === 'checkpoint' ? `Ôn tập chặng ${session.unit_id.split('-')[1]}`
    : 'Ôn từ đến hạn';

  const exitTarget = isCheckpoint || isReview ? '/courses/toeic' : `/courses/toeic/units/${session.unit_id}`;
  const exitLabel = isCheckpoint || isReview ? 'Về khóa TOEIC' : 'Về bài học';

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 md:py-6 space-y-5 pb-32">
      {/* 1. Header & Navigation */}
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          data-testid="back-to-unit-btn"
          onClick={() => navigate(exitTarget)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" /> {exitLabel}
        </button>

        <div className="text-center">
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
            {moduleLabel}
          </span>
          {!isCompleted && (
            <span className="text-xs text-slate-400">
              Câu {session.index + 1} / {session.total}
            </span>
          )}
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-500 font-semibold">
            Đúng lần đầu: <strong className="text-slate-900 dark:text-white">{session.first_correct}</strong>/{session.base_total}
          </span>
        </div>
      </header>

      {/* 2. Knowledge Progress Bar */}
      {!isCompleted && (
        <div className="space-y-1">
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, (session.completed_questions / Math.max(1, session.base_total)) * 100)}%`
              }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Tiến độ câu hỏi gốc: {session.completed_questions}/{session.base_total}</span>
            {session.total > session.base_total && (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                +{session.total - session.base_total} câu cần ôn lại
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. Completed Screen */}
      {isCompleted ? (
        <div className="p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6 text-center">
          {session.status === 'passed' ? (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                  {isCheckpoint ? 'Chúc mừng bạn đã vượt qua Ôn tập chặng!' : 'Đã hoàn thành phần học này!'}
                </h2>
                <p className="text-xs md:text-sm text-slate-500">
                  Bạn đã hoàn thành các câu hỏi và sửa lỗi trong phiên. Hãy ôn lại theo lịch để ghi nhớ lâu hơn.
                </p>
              </div>

              {/* Statistics Card */}
              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                <div>
                  <span className="text-xs text-slate-400">Đúng ngay lần đầu</span>
                  <p className="text-lg font-black text-emerald-600">
                    {session.first_correct} / {session.base_total}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Tổng số lượt trả lời</span>
                  <p className="text-lg font-black text-slate-800 dark:text-slate-200">
                    {session.attempts}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <button
                  onClick={() => navigate(exitTarget)}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition shadow-sm inline-flex items-center gap-2"
                >
                  {isCheckpoint ? 'Học tiếp chặng mới' : 'Tiếp tục bài học'} <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate('/courses/toeic')}
                  className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm transition"
                >
                  Về danh sách chặng
                </button>
              </div>
            </div>
          ) : (
            // needs_review (Checkpoint failed < 80% first attempt)
            <div className="space-y-4">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                  Cần ôn tập lại chặng này
                </h2>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                  Bạn đạt <strong>{session.first_correct} / {session.base_total}</strong> câu đúng ngay lần đầu (yêu cầu tối thiểu 16/20 - 80%). Các câu sai đã được sửa xong, nhưng để mở chặng tiếp theo bạn cần luyện lại một lượt mới đạt chuẩn.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleRetryCheckpoint}
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm transition shadow-sm inline-flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Luyện lại lượt mới
                </button>
                <button
                  onClick={() => navigate('/courses/toeic')}
                  className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm transition"
                >
                  Xem lại bài học
                </button>
              </div>
            </div>
          )}
        </div>
      ) : session.current ? (
        /* 4. Active Question Area */
        <div className="space-y-5">
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
            {/* Passage (Context) */}
            {session.current.passage && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Đoạn văn ngữ cảnh
                </span>
                <p className="text-sm md:text-base font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                  {session.current.passage}
                </p>
              </div>
            )}

            {/* Prompt & Audio button */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  {session.current.prompt}
                </h3>

                {session.current.can_listen && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Speed selector */}
                    <select
                      value={speechRate}
                      onChange={e => setSpeechRate(Number(e.target.value))}
                      className="text-xs p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                    >
                      <option value={0.75}>0.75x</option>
                      <option value={0.9}>0.9x</option>
                      <option value={1.0}>1.0x</option>
                    </select>

                    <button
                      onClick={handlePlayAudio}
                      disabled={audioLoading}
                      aria-label="Nghe âm thanh tiếng Anh"
                      className="p-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 transition"
                    >
                      {audioLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                  </div>
                )}
              </div>

              {session.current.assisted && (
                <div className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-lg font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Câu có dùng trợ giúp — sẽ tự ôn lại ở cuối phiên
                </div>
              )}
            </div>

            {/* Input by Question Type */}
            {/* Type: choice or listen_choice */}
            {session.current.options && (
              <div className="space-y-2 pt-2">
                {session.current.options.map((opt, idx) => {
                  const isSelected = selectedOptionId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      data-testid={`option-choice-${idx}`}
                      onClick={() => !session.feedback && setSelectedOptionId(opt.id)}
                      disabled={session.feedback !== null}
                      className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between gap-3 text-sm font-semibold ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="break-words">{opt.text}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Type: dictation or vocabulary_write */}
            {!session.current.options && session.current.type !== 'arrange' && (
              <div className="space-y-2 pt-2">
                <input
                  type="text"
                  autoFocus
                  disabled={session.feedback !== null}
                  value={textAnswer}
                  onChange={e => setTextAnswer(e.target.value)}
                  aria-label={session.current.type === 'dictation' ? 'Câu tiếng Anh nghe được' : 'Nghĩa tiếng Việt'}
                  placeholder={
                    session.current.type === 'dictation'
                      ? 'Nhập câu tiếng Anh bạn nghe được...'
                      : 'Nhập nghĩa tiếng Việt...'
                  }
                  className="w-full p-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm md:text-base font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400">
                  {session.current.type === 'dictation'
                    ? 'Bỏ qua khác biệt hoa/thường và dấu câu.'
                    : 'Có thể đổi thứ tự các nghĩa; thiếu dấu thanh sẽ được chấp nhận kèm nhắc nhở.'}
                </p>
              </div>
            )}

            {/* Type: arrange */}
            {session.current.type === 'arrange' && (
              <div className="space-y-4 pt-2">
                {/* Placed tokens area */}
                <div className="min-h-16 p-4 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/10 flex flex-wrap gap-2 items-center">
                  {arrangedTokens.length === 0 ? (
                    <span className="text-xs text-slate-400">Nhấn vào các từ bên dưới theo thứ tự để ghép câu...</span>
                  ) : (
                    arrangedTokens.map((tok, i) => (
                      <button
                        key={`${tok.id}-${i}`}
                        disabled={session.feedback !== null}
                        onClick={() => {
                          if (!session.feedback) {
                            setArrangedTokens(prev => prev.filter((_, idx) => idx !== i));
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs md:text-sm shadow-xs hover:bg-indigo-700 transition"
                      >
                        {tok.text} ✕
                      </button>
                    ))
                  )}
                </div>

                {/* Available tokens bank */}
                <div className="flex flex-wrap gap-2">
                  {session.current.tokens?.map(tok => {
                    const countInPlaced = arrangedTokens.filter(t => t.id === tok.id).length;
                    const isUsed = countInPlaced > 0;
                    return (
                      <button
                        key={tok.id}
                        disabled={isUsed || session.feedback !== null}
                        onClick={() => {
                          if (!isUsed && !session.feedback) {
                            setArrangedTokens(prev => [...prev, tok]);
                          }
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold border transition ${
                          isUsed
                            ? 'opacity-30 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 cursor-not-allowed'
                            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-500 shadow-2xs'
                        }`}
                      >
                        {tok.text}
                      </button>
                    );
                  })}
                  {arrangedTokens.length > 0 && !session.feedback && (
                    <button
                      onClick={() => setArrangedTokens([])}
                      className="px-3 py-1.5 text-xs text-rose-600 hover:underline font-semibold"
                    >
                      Xóa tất cả
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 5. Feedback Box (Persistent until Continue) */}
          {session.feedback && (
            <div
              className={`p-5 rounded-3xl border space-y-3 ${
                session.feedback.verdict === 'close'
                  ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200'
                  : session.feedback.correct
                  ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                  : 'border-rose-300 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {session.feedback.correct ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                )}
                <span className="font-black text-sm md:text-base">
                  {session.feedback.verdict === 'close'
                    ? session.feedback.correct
                      ? 'Đúng nghĩa — chú ý bổ sung dấu tiếng Việt'
                      : 'Gần đúng — cần kiểm tra và nhập lại'
                    : session.feedback.correct
                    ? session.feedback.assisted ? 'Đúng với trợ giúp — cần tự làm lại' : 'Chính xác!'
                    : 'Chưa chính xác'}
                </span>
              </div>

              {session.feedback.expected && (
                <div className="text-xs space-y-0.5">
                  <span className="opacity-75">Đáp án chuẩn:</span>
                  <p className="font-bold text-sm">{session.feedback.expected}</p>
                </div>
              )}

              {session.feedback.explanation && (
                <p className="text-xs leading-relaxed opacity-90 border-t border-current/10 pt-2">
                  {session.feedback.explanation}
                </p>
              )}

              {session.feedback.requires_retry && (
                <p className="text-[11px] font-semibold opacity-75">
                  * Câu hỏi này sẽ xuất hiện lại ở cuối phiên để bạn tự làm lại.
                </p>
              )}
            </div>
          )}

          {/* 6. Help Box (If Help requested) */}
          {session.help && !session.feedback && (
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-indigo-900 dark:text-indigo-200 text-xs space-y-2">
              <span className="font-bold flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                <Sparkles className="w-4 h-4" /> Gợi ý đáp án &amp; giải thích:
              </span>
              <p className="font-semibold text-sm">{session.help.answer}</p>
              <p className="text-slate-600 dark:text-slate-300">{session.help.explanation}</p>
              <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium block">
                Gợi ý đã được ghi nhận. Bạn sẽ cần tự làm lại câu này mà không có trợ giúp để hoàn thành phiên.
              </span>
            </div>
          )}

          {/* 7. Action Footer: Submit / Continue / Help */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            {!session.feedback ? (
              <button
                data-testid="help-btn"
                onClick={handleHelp}
                disabled={helping || submitting}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition"
              >
                {helping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <HelpCircle className="w-3.5 h-3.5" />}
                Cần trợ giúp?
              </button>
            ) : <div />}

            <div className="flex items-center gap-3 ml-auto">
              {session.feedback ? (
                <button
                  data-testid="continue-session-btn"
                  onClick={handleContinue}
                  disabled={submitting || helping}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-md transition flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Tiếp tục câu hỏi <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  data-testid="submit-answer-btn"
                  onClick={handleSubmitAnswer}
                  disabled={submitting || helping}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-md transition flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Kiểm tra đáp án
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
