import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronDown, Loader2 } from 'lucide-react';
import { api, LearningSession, LearningSupport } from '../api/client';

export function LessonSupportPanel({session, onSessionChange, disabled = false}: {
  session: LearningSession; onSessionChange: (session: LearningSession) => void; disabled?: boolean;
}) {
  const [support, setSupport] = useState<LearningSupport | null>(null);
  const [open, setOpen] = useState(false), [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0), stepId = session.current?.id, type = session.current?.type;
  useEffect(() => {
    request.current++; setSupport(null); setOpen(false); setError(null); setLoading(false);
    return () => { request.current++; };
  }, [session.id, stepId]);
  if (!session.learning_support?.available || !stepId) return null;
  const toggle = async () => {
    if (loading || disabled) return;
    if (support) { setOpen(!open); return; }
    const sequence = ++request.current; setLoading(true); setError(null);
    try {
      const result = await api.openLearningSupport(session.id, stepId);
      if (sequence !== request.current) return;
      setSupport(result.support); setOpen(true); onSessionChange(result.session);
    } catch (err) {
      if (sequence === request.current) setError((err as Error).message || 'Chưa mở được kiến thức hỗ trợ. Hãy thử lại; bài đang nhập vẫn được giữ.');
    } finally { if (sequence === request.current) setLoading(false); }
  };
  const detailClass = 'rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3';
  const summaryClass = 'cursor-pointer font-bold text-sm text-slate-800 dark:text-slate-100';
  return <section aria-label="Kiến thức hỗ trợ bài học" className="rounded-2xl border border-indigo-100 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 p-4 space-y-3">
    <button type="button" aria-expanded={open} aria-controls="lesson-learning-support" disabled={loading || disabled} onClick={() => void toggle()} className="flex w-full items-center gap-2 text-left text-sm font-bold text-indigo-700 dark:text-indigo-300 disabled:opacity-60">
      {loading ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : <BookOpen className="w-4 h-4 shrink-0" />}
      <span className="flex-1">{open ? 'Đóng kiến thức cho bài này' : 'Kiến thức cho bài này'}</span><ChevronDown className={`w-4 h-4 shrink-0 ${open ? 'rotate-180' : ''}`} />
    </button>
    <p className="text-xs text-slate-600 dark:text-slate-400">{session.current?.feedback ? 'Ôn lại từ, mẫu câu và cách dùng trong bài vừa làm.' : 'Từ có nghĩa, ngữ pháp và câu mẫu có sẵn. Xem trước khi nộp sẽ được ghi nhận là có trợ giúp.'}</p>
    {error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}
    {open && support && <div id="lesson-learning-support" data-testid="lesson-learning-support" className="space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
      <h3 className="font-bold text-slate-900 dark:text-white">{support.title}</h3><p>{support.summary}</p>
      <details className={detailClass} open={type === 'vocabulary_in_context'}><summary className={summaryClass}>Từ và cụm trong bài</summary>
        <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">{support.vocabulary.map(word => <div key={word.term} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 space-y-1 min-w-0">
          <dt className="font-bold" lang="en">{word.term}</dt><dd><span className="text-xs text-slate-500">{word.word_type}</span> · {word.meaning}</dd><dd lang="en" className="italic">{word.example}</dd><dd>{word.translation}</dd>
        </div>)}</dl>
      </details>
      <details className={detailClass} open={type === 'grammar_practice'}><summary className={summaryClass}>Ngữ pháp dễ hiểu</summary>
        <div className="mt-3 space-y-4">{support.grammar.map(rule => <div key={rule.title} className="space-y-2"><h4 className="font-bold">{rule.title}</h4><p className="rounded-lg bg-indigo-50 dark:bg-indigo-950 p-2 break-words">{rule.pattern}</p><p>{rule.explanation}</p>{rule.examples.map(example => <div key={example.en}><p lang="en" className="italic">{example.en}</p><p className="text-slate-500">{example.vi}</p></div>)}</div>)}</div>
      </details>
      <details className={detailClass}><summary className={summaryClass}>Lỗi thường gặp và cách sửa</summary>
        <div className="mt-3 space-y-3">{support.common_errors.map(item => <div key={item.incorrect} className="space-y-1"><p><strong>Chưa đúng: </strong><span lang="en">{item.incorrect}</span></p><p><strong>Sửa lại: </strong><span lang="en">{item.correct}</span></p><p>{item.reason}</p></div>)}</div>
      </details>
      <details className={detailClass} open={['listen_comprehension','reading_comprehension','pronunciation_practice'].includes(type || '')}><summary className={summaryClass}>Cách nghe và nói lại</summary>
        <ul className="mt-3 list-disc pl-5 space-y-2">{[...support.listening_tips,...support.pronunciation_tips].map(tip => <li key={tip}>{tip}</li>)}</ul>
      </details>
      <details className={detailClass} open={type === 'speaking_task' || type === 'writing_task'}><summary className={summaryClass}>Mẫu nói và viết có dịch</summary>
        <div className="mt-3 space-y-4">{support.practice.map(task => <div key={task.type} className="space-y-2"><h4 className="font-bold">{task.type === 'speaking' ? 'Luyện nói' : 'Luyện viết'}</h4><p>{task.instruction}</p><p className="italic" lang="en">{task.model}</p><p>{task.translation}</p></div>)}</div>
      </details>
    </div>}
  </section>;
}
