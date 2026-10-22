import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from '../context/RouterContext';
import { api, ReadingFullPageQuestion, ReadingFullPageResponse } from '../api/client';
import { playAudio } from '../utils/audio';
import { useControlAudio } from '../utils/useControlAudio';
import { 
  ArrowLeft, 
  Volume2, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  History as HistoryIcon,
  Settings,
  Languages,
  Sparkles
} from 'lucide-react';

interface AttemptHistory {
  id: string;
  kind: string;
  saved: boolean;
  completed: boolean;
  index: number;
  correct: number;
  created_at: string;
}

export function ReadingExercise() {
  const { params, navigate } = useRouter();
  const setId = Number(params.id) || 163;

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [passage, setPassage] = useState<string>('');
  const [questions, setQuestions] = useState<ReadingFullPageQuestion[]>([]);
  const [completed, setCompleted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Selections state: map question_id -> option_id (e.g. 'bank:0' or '1')
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeGapNumber, setActiveGapNumber] = useState<number | null>(1);

  // Settings & Audio
  const [audioSpeed, setAudioSpeed] = useState<number>(0.9);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<AttemptHistory[]>([]);

  // Translations visibility for individual question explanations
  const [showExplanation, setShowExplanation] = useState<Record<string, boolean>>({});

  const savingRef = useRef<Promise<unknown>>(Promise.resolve());
  const draftTimerRef = useRef<number | null>(null);

  const loadHistory = async () => {
    try {
      const res = await api.request<{ items: AttemptHistory[] }>('GET', `/exercise-attempts?kind=reading&set_id=${setId}`);
      setHistory(res.items || []);
    } catch {
      // Quiet fail for history
    }
  };

  // Initialize or resume attempt
  const initAttempt = async (resume = true) => {
    setLoading(true);
    setError('');
    setShowExplanation({});
    try {
      const attemptRes = await api.request<{ id: string }>('POST', '/exercise-attempts', {
        set_id: setId,
        kind: 'reading',
        resume,
        difficulty,
      });

      setAttemptId(attemptRes.id);
      await fetchQuestions(attemptRes.id);
      await loadHistory();
    } catch (err: any) {
      setError(err?.message || 'Không thể tạo bài đọc hiểu.');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async (id: string) => {
    const res = await api.getReadingQuestions(id);
    setPassage(res.passage);
    setCompleted(res.completed);
    setQuestions(res.questions);

    // Populate initial drafts
    const initial: Record<string, string> = {};
    for (const q of res.questions) {
      if (q.draft) initial[q.id] = q.draft;
      if (q.feedback?.answer) initial[q.id] = q.feedback.answer;
    }
    setAnswers(initial);

    // Default active gap to first cloze question
    const firstCloze = res.questions.find((q) => q.type === 'cloze');
    if (firstCloze && firstCloze.gap_number) {
      setActiveGapNumber(firstCloze.gap_number);
    }
  };

  useEffect(() => {
    initAttempt(true);
    return () => {
      if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);
    };
  }, [setId]);

  // Audio speech via Ctrl key
  useControlAudio(() => {
    if (passage) playAudio(passage, 'en-US', audioSpeed);
  });

  // Handle Cloze gap slotting
  const clozeQuestions = questions.filter((q) => q.type === 'cloze');
  const choiceQuestions = questions.filter((q) => q.type === 'choice');

  // Unified word bank options from cloze questions
  const wordBank = clozeQuestions.length > 0 ? clozeQuestions[0].options || [] : [];

  const handleSelectBankWord = (optionId: string) => {
    if (completed || !activeGapNumber) return;
    const targetQ = clozeQuestions.find((q) => q.gap_number === activeGapNumber);
    if (!targetQ) return;

    // If already slotted to this gap, toggle off
    const nextVal = answers[targetQ.id] === optionId ? '' : optionId;
    updateAnswer(targetQ.id, nextVal);

    // Auto-advance active gap to next unselected cloze gap
    if (nextVal !== '') {
      const remaining = clozeQuestions.find(
        (q) => q.gap_number !== activeGapNumber && !answers[q.id]
      );
      if (remaining && remaining.gap_number) {
        setActiveGapNumber(remaining.gap_number);
      }
    }
  };

  const updateAnswer = (questionId: string, value: string) => {
    const nextAnswers = { ...answers };
    if (!value) delete nextAnswers[questionId];
    else nextAnswers[questionId] = value;
    setAnswers(nextAnswers);

    // Debounced PUT /exercise-attempts/:id/drafts
    if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);
    draftTimerRef.current = window.setTimeout(async () => {
      if (!attemptId || completed) return;
      try {
        await api.saveReadingDrafts(attemptId, [
          { question_id: questionId, answer: value || null },
        ]);
      } catch {
        // Quiet persist
      }
    }, 400);
  };

  // Submit whole reading comprehension page
  const handleSubmitAll = async () => {
    if (!attemptId || busy) return;
    setBusy(true);
    setError('');

    try {
      const payloadAnswers = questions.map((q) => {
        const val = answers[q.id];
        if (!val) return { question_id: q.id, skip: true };
        return { question_id: q.id, answer: val };
      });

      const graded = await api.submitReading(attemptId, payloadAnswers);
      setPassage(graded.passage);
      setCompleted(true);
      setQuestions(graded.questions);

      const feedbackAnswers: Record<string, string> = {};
      for (const res of graded.results || []) {
        if (res.answer) feedbackAnswers[res.question_id] = res.answer;
      }
      setAnswers(feedbackAnswers);
      await loadHistory();
    } catch (err: any) {
      setError(err?.message || 'Không thể nộp bài đọc hiểu.');
    } finally {
      setBusy(false);
    }
  };

  // Render text passage with interactive blanks
  const renderPassageWithGaps = () => {
    const parts = passage.split(/(__\[\d+\]__)/g);

    return parts.map((part, index) => {
      const match = part.match(/__\[(\d+)\]__/);
      if (match) {
        const gapNum = Number(match[1]);
        const clozeQ = clozeQuestions.find((q) => q.gap_number === gapNum);
        const selectedOptId = clozeQ ? answers[clozeQ.id] : undefined;
        const selectedOpt = selectedOptId
          ? wordBank.find((w) => w.id === selectedOptId)
          : null;
        const feedback = clozeQ?.feedback;
        const isActive = activeGapNumber === gapNum;

        return (
          <button
            key={index}
            type="button"
            disabled={completed}
            onClick={() => setActiveGapNumber(gapNum)}
            className={`inline-flex items-center gap-1 px-3 py-1 mx-1.5 rounded-xl text-xs font-black transition ${
              completed
                ? feedback?.correct
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-400'
                  : 'bg-rose-100 text-rose-900 border border-rose-400 line-through'
                : isActive
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-sm'
                : selectedOpt
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400'
            }`}
          >
            <span>[{gapNum}]</span>
            <span>{selectedOpt ? selectedOpt.text : '...'}</span>
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const correctCount = questions.filter((q) => q.feedback?.correct).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* 1. Header Toolbar matching source-reading.png */}
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
          {/* Audio listen for whole passage */}
          <button
            type="button"
            onClick={() => playAudio(passage, 'en-US', audioSpeed)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 transition"
            title="Nghe toàn bộ bài đọc (Ctrl)"
          >
            <Volume2 className="w-4 h-4 text-indigo-600" />
            <span>Nghe bài đọc</span>
          </button>

          {/* Speed Toggle */}
          <button
            type="button"
            onClick={() => setAudioSpeed(audioSpeed === 0.9 ? 0.8 : audioSpeed === 0.8 ? 1.0 : 0.9)}
            className="px-2.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 shadow-2xs"
          >
            {audioSpeed}×
          </button>

          {/* History */}
          <button
            type="button"
            onClick={() => setHistoryOpen(!historyOpen)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 transition"
          >
            <HistoryIcon className="w-4 h-4 text-slate-500" />
            <span>Lịch sử ({history.length})</span>
          </button>

          {/* Settings */}
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

      {/* Settings Panel */}
      {settingsOpen && (
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Cài đặt bài đọc hiểu
            </h3>
            <button
              onClick={() => setSettingsOpen(false)}
              className="text-xs text-slate-400 font-bold hover:text-slate-600"
            >
              Đóng
            </button>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Độ khó bài đọc:</span>
            {(['easy', 'medium', 'hard'] as const).map((lvl) => (
              <label key={lvl} className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                <input
                  type="radio"
                  name="reading_difficulty"
                  value={lvl}
                  checked={difficulty === lvl}
                  onChange={() => setDifficulty(lvl)}
                  className="w-4 h-4 text-indigo-600"
                />
                <span className="capitalize">{lvl === 'easy' ? 'Dễ (A1-A2)' : lvl === 'medium' ? 'Vừa (A2-B1)' : 'Khó (B2-C1)'}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setSettingsOpen(false);
              void initAttempt(false);
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-xs transition"
          >
            Tạo bài mới với độ khó đã chọn
          </button>
        </div>
      )}

      {/* History Panel */}
      {historyOpen && (
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Lịch sử các bài đọc hiểu
            </h3>
            <button
              onClick={() => setHistoryOpen(false)}
              className="text-xs text-slate-400 font-bold hover:text-slate-600"
            >
              Đóng
            </button>
          </div>
          {history.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Chưa có bài đọc nào được lưu.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {history.map((h) => (
                <button
                  key={h.id}
                  onClick={async () => {
                    setAttemptId(h.id);
                    setHistoryOpen(false);
                    setLoading(true);
                    try {
                      await fetchQuestions(h.id);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className={`w-full p-2.5 rounded-xl border text-left text-xs font-medium flex items-center justify-between transition ${
                    attemptId === h.id
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                      : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>{new Date(h.created_at).toLocaleString('vi-VN')}</span>
                  <span>{h.completed ? `Đúng ${h.correct} câu` : 'Chưa nộp'}</span>
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
            onClick={() => void initAttempt(false)}
            className="underline font-bold text-rose-900"
          >
            Tạo bài khác
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-3 text-slate-500 text-xs font-semibold">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span>Đang tạo đoạn văn bản và ngân hàng câu hỏi...</span>
        </div>
      ) : (
        <>
          {/* 2. Main Passage Card matching source-reading.png */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Bài đọc hiểu (Reading Passage)
              </span>
              {completed && (
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  🎉 Kết quả: {correctCount} / {questions.length} câu đúng
                </span>
              )}
            </div>

            {/* Passage Text with Cloze gaps */}
            <div className="text-sm md:text-base leading-relaxed md:leading-loose font-serif text-slate-800 dark:text-slate-200 whitespace-pre-wrap select-text">
              {renderPassageWithGaps()}
            </div>
          </section>

          {/* 3. Word Bank (Ngân hàng từ) matching source-reading.png */}
          {clozeQuestions.length > 0 && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Ngân hàng từ (Word Bank)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {completed
                      ? 'Bài tập đã hoàn thành'
                      : activeGapNumber
                      ? `Chọn từ để điền vào ô [${activeGapNumber}] (nhấp ô trên bài để đổi)`
                      : 'Nhấp vào một ô trống ở trên để bắt đầu điền'}
                  </p>
                </div>

                {activeGapNumber && !completed && (
                  <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 text-xs font-black">
                    Đang chọn ô: [{activeGapNumber}]
                  </span>
                )}
              </div>

              {/* Word Bank Cards */}
              <div className="flex flex-wrap gap-2">
                {wordBank.map((word) => {
                  // Check if this bank word is slotted into any gap
                  const slottedToQ = clozeQuestions.find((q) => answers[q.id] === word.id);
                  const isCurrentGapSelection =
                    activeGapNumber &&
                    clozeQuestions.find((q) => q.gap_number === activeGapNumber)?.id &&
                    answers[clozeQuestions.find((q) => q.gap_number === activeGapNumber)!.id] === word.id;

                  return (
                    <button
                      key={word.id}
                      type="button"
                      disabled={completed}
                      onClick={() => handleSelectBankWord(word.id)}
                      className={`px-3.5 py-2 rounded-2xl border text-xs font-bold transition flex items-center gap-2 ${
                        isCurrentGapSelection
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                          : slottedToQ
                          ? 'border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                          : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span>{word.text}</span>
                      {slottedToQ && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                            isCurrentGapSelection
                              ? 'bg-indigo-700 text-white'
                              : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                          }`}
                        >
                          [{slottedToQ.gap_number}]
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* 4. Comprehension Questions (MCQ) matching source-reading.png */}
          {choiceQuestions.length > 0 && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Câu hỏi đọc hiểu ({choiceQuestions.length} câu)
                </h3>
              </div>

              <div className="space-y-6">
                {choiceQuestions.map((q, idx) => {
                  const currentAnswer = answers[q.id];
                  const feedback = q.feedback;

                  return (
                    <fieldset
                      key={q.id}
                      disabled={completed}
                      className="space-y-3 pt-2"
                    >
                      <legend className="text-xs md:text-sm font-black text-slate-900 dark:text-white leading-normal">
                        {idx + 1}. {q.prompt}
                      </legend>

                      {/* Options A, B, C, D */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options?.map((opt, optIdx) => {
                          const optionLetter = String.fromCharCode(65 + optIdx);
                          const isSelected = currentAnswer === opt.id;
                          const isExpected = feedback && feedback.expected === opt.text;

                          let optionStyle =
                            'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-400';
                          if (isSelected) {
                            optionStyle =
                              'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-500 font-bold';
                          }
                          if (completed && feedback) {
                            if (isExpected) {
                              optionStyle =
                                'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 font-bold ring-1 ring-emerald-500';
                            } else if (isSelected && !feedback.correct) {
                              optionStyle =
                                'border-rose-400 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200 line-through';
                            }
                          }

                          return (
                            <label
                              key={opt.id}
                              className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition flex items-center gap-3 ${optionStyle}`}
                            >
                              <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black flex items-center justify-center shrink-0">
                                {optionLetter}
                              </span>
                              <input
                                type="radio"
                                name={`q_${q.id}`}
                                checked={isSelected}
                                onChange={() => updateAnswer(q.id, opt.id)}
                                className="sr-only"
                              />
                              <span className="leading-snug">{opt.text}</span>
                            </label>
                          );
                        })}
                      </div>

                      {/* Graded Feedback for this question */}
                      {feedback && (
                        <div
                          className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                            feedback.correct
                              ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200'
                              : 'border-rose-200 bg-rose-50/50 text-rose-900 dark:bg-rose-950/20 dark:text-rose-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold flex items-center gap-1.5">
                              {feedback.correct ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-rose-600" />
                              )}
                              <span>{feedback.correct ? 'Chính xác!' : `Đáp án đúng: ${feedback.expected}`}</span>
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => playAudio(q.prompt, 'en-US', audioSpeed)}
                                className="p-1 rounded hover:bg-slate-200/50 text-slate-600"
                                title="Nghe câu hỏi"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                              {feedback.explanation && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowExplanation((prev) => ({
                                      ...prev,
                                      [q.id]: !prev[q.id],
                                    }))
                                  }
                                  className="text-[11px] underline font-semibold text-indigo-700"
                                >
                                  {showExplanation[q.id] ? 'Ẩn giải thích' : 'Giải thích'}
                                </button>
                              )}
                            </div>
                          </div>

                          {showExplanation[q.id] && feedback.explanation && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 pt-1 leading-relaxed">
                              {feedback.explanation}
                            </p>
                          )}
                        </div>
                      )}
                    </fieldset>
                  );
                })}
              </div>
            </section>
          )}

          {/* 5. Bottom Action Bar */}
          <div className="pt-2">
            {completed ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => void initAttempt(false)}
                  className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black shadow-sm transition flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Luyện bài đọc mới</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/study-set/${setId}`)}
                  className="px-6 py-4 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold hover:bg-slate-50 transition"
                >
                  Quay lại bộ từ
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={handleSubmitAll}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-2xl text-xs font-black shadow-md transition"
              >
                {busy ? 'Đang chấm bài trên máy chủ...' : 'Kiểm tra đáp án'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

