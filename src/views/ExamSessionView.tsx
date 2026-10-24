import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from '../context/RouterContext';
import { api, StudySession } from '../api/client';
import { parsePracticeLaunchQuery } from '../utils/practiceLaunch';
import { LearningBreadcrumb } from '../components/LearningBreadcrumb';
import { forwardNavigationContext } from '../utils/navigationContext';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  XCircle,
  Trophy,
  ArrowRight,
  RotateCcw,
  Clock,
  Loader2,
  Check
} from 'lucide-react';

interface QuestionItem {
  id: string;
  type: string;
  prompt: string;
  options?: { id: string; text: string }[];
}

interface ExamResult {
  score: number;
  total: number;
  results: { question_id: string; correct: boolean; expected: string }[];
}

export const ExamSessionView: React.FC = () => {
  const { params, path, navigate, goBack } = useRouter();
  const setId = Number(params.id) || 163;
  const launchQuery = useMemo(() => parsePracticeLaunchQuery(path), [path]);

  const [session, setSession] = useState<StudySession | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User answers draft: { [question_id]: { answer: string, option_id?: string } }
  const [answers, setAnswers] = useState<Record<string, { answer: string; option_id?: string }>>({});
  const [examResult, setExamResult] = useState<ExamResult | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const initExam = async () => {
      try {
        const s = await api.startStudy(setId, 'exam', {
          ...(launchQuery.wordIds.length > 0 ? { word_ids: launchQuery.wordIds } : {}),
          ...(launchQuery.reviewScope === 'due' ? { due_only: true } : {}),
        });
        if (!mounted) return;
        setSession(s);

        const qRes = await api.getQuestions(s.id);
        if (!mounted) return;
        setQuestions(qRes.questions || []);
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Không thể tải đề thi.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initExam();
    return () => { mounted = false; };
  }, [setId, launchQuery]);

  const handleSelectOption = (qId: string, opt: { id: string; text: string }) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: { answer: opt.text, option_id: opt.id }
    }));
  };

  const handleInputText = (qId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: { answer: text }
    }));
  };

  const handleSubmitExam = async () => {
    if (!session) return;
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < questions.length) {
      if (!window.confirm(`Bạn mới trả lời ${answeredCount}/${questions.length} câu. Bạn có chắc chắn muốn nộp bài ngay?`)) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = questions.map((q) => {
        const userAns = answers[q.id];
        return {
          question_id: q.id,
          answer: userAns?.answer || '',
          option_id: userAns?.option_id
        };
      });

      const res = await api.submitExam(session.id, payload);
      setExamResult(res);

      try {
        confetti({ particleCount: 90, spread: 60, origin: { y: 0.6 } });
      } catch {}
    } catch (err: any) {
      alert(err?.message || 'Có lỗi khi nộp bài thi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm">Đang tải đề thi từ hệ thống...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-md mx-auto p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
        <p className="text-rose-500 font-semibold mb-3">{error || 'Không thể khởi tạo bài kiểm tra'}</p>
        <button
          onClick={() => goBack()}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold"
        >
          Quay lại bộ từ
        </button>
      </div>
    );
  }

  // 1. Result View after submission
  if (examResult) {
    const scorePercent = examResult.total > 0 ? Math.round((examResult.score / examResult.total) * 100) : 0;
    const isPassed = scorePercent >= 70;

    return (
      <div className="max-w-3xl mx-auto space-y-8 pb-16">
        <LearningBreadcrumb currentLabel="Kiểm tra bộ từ" setId={setId} />
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-sm">
          <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center shadow-lg ${
            isPassed ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
          }`}>
            <Trophy className="w-10 h-10" />
          </div>

          <div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              isPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {isPassed ? 'ĐẠT YÊU CẦU' : 'CẦN ÔN TẬP THÊM'}
            </span>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
              Kết quả bài kiểm tra
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
            <div>
              <div className="text-xs font-bold text-slate-400">Số câu đúng</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                {examResult.score} / {examResult.total}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400">Điểm số</div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                {scorePercent}%
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Làm lại bài thi</span>
            </button>
            <button
              onClick={() => navigate(forwardNavigationContext(`/study-set/${setId}`, path))}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
            >
              Quay về bộ từ
            </button>
          </div>
        </div>

        {/* Breakdown of each question */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white px-1">
            Chi tiết từng câu hỏi ({examResult.results.length} câu)
          </h3>

          {questions.map((q, idx) => {
            const resItem = examResult.results.find((r) => r.question_id === q.id);
            const userAns = answers[q.id]?.answer || '(Bỏ trống)';
            const isCorrect = resItem?.correct;

            return (
              <div
                key={q.id}
                className={`p-5 rounded-2xl border bg-white dark:bg-slate-900 transition ${
                  isCorrect
                    ? 'border-emerald-200 dark:border-emerald-900/60'
                    : 'border-rose-200 dark:border-rose-900/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold flex items-center justify-center text-slate-700 dark:text-slate-300">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {q.prompt}
                    </span>
                  </div>
                  {isCorrect ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" /> Đúng
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                      <XCircle className="w-4 h-4" /> Sai
                    </span>
                  )}
                </div>

                <div className="mt-3 text-xs space-y-1">
                  <div>
                    <span className="text-slate-400">Đáp án của bạn: </span>
                    <span className={`font-semibold ${isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {userAns}
                    </span>
                  </div>
                  {!isCorrect && (
                    <div>
                      <span className="text-slate-400">Đáp án đúng: </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {resItem?.expected}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. Taking the Exam View
  const currentQ = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <LearningBreadcrumb currentLabel="Kiểm tra bộ từ" setId={setId} />
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Bài kiểm tra tổng hợp</h1>
            <p className="text-xs text-slate-400">Đã làm: {answeredCount} / {questions.length} câu</p>
          </div>
        </div>

        <button
          onClick={handleSubmitExam}
          disabled={submitting}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          <span>Nộp bài thi</span>
        </button>
      </div>

      {/* Question Number Pills Navigation */}
      <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
        {questions.map((q, idx) => {
          const isAnswered = !!answers[q.id];
          const isCurrent = idx === currentIdx;
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIdx(idx)}
              className={`w-8 h-8 rounded-xl text-xs font-bold transition flex items-center justify-center ${
                isCurrent
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 ring-2 ring-indigo-500'
                  : isAnswered
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Current Question Container */}
      {currentQ && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Câu hỏi {currentIdx + 1} / {questions.length}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              {currentQ.type === 'choice' ? 'Trắc nghiệm chọn đáp án đúng' : 'Tự luận điền từ'}
            </span>
          </div>

          <div className="py-4">
            <div className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-relaxed">
              {currentQ.prompt}
            </div>
          </div>

          {/* Options or Input */}
          {currentQ.options && currentQ.options.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQ.options.map((opt, oIdx) => {
                const isSelected = answers[currentQ.id]?.option_id === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(currentQ.id, opt)}
                    className={`p-4 rounded-2xl border text-left font-semibold text-sm transition flex items-center gap-3 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <span className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {String.fromCharCode(65 + oIdx)}
                    </span>
                    <span>{opt.text}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <input
                type="text"
                value={answers[currentQ.id]?.answer || ''}
                onChange={(e) => handleInputText(currentQ.id, e.target.value)}
                placeholder="Nhập câu trả lời của bạn..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-base font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Bottom Prev / Next Nav */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              ← Câu trước
            </button>

            {currentIdx < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <span>Câu tiếp theo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleSubmitExam}
                disabled={submitting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <span>Nộp bài ngay</span>
                <Check className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

