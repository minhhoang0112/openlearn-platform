import { SetCard, SetProgressState } from '../api/client';

export interface NormalizedSetProgress {
  totalWords: number;
  reviewedWords: number;
  learningWords: number;
  masteredWords: number;
  dueWords: number;
  state: SetProgressState;
  stateLabel: string;
  stateBadgeClass: string;
  summaryText: string;
  primaryCtaLabel: string;
  percentReviewed: number;
}

export function normalizeSetProgress(set: Partial<SetCard> & { word_count?: number; mastered_count?: number }): NormalizedSetProgress {
  const p = set.progress;
  const totalWords = Number(p?.total_words ?? set.word_count ?? 0);
  const masteredWords = Number(p?.mastered_words ?? set.mastered_count ?? 0);
  const learningWords = Number(p?.learning_words ?? 0);
  const reviewedWords = Number(p?.reviewed_words ?? (masteredWords + learningWords));
  const dueWords = Number(p?.due_words ?? 0);

  let state: SetProgressState = p?.state || 'not_started';
  if (!p?.state) {
    if (totalWords <= 0) state = 'empty';
    else if (masteredWords >= totalWords && totalWords > 0) state = 'mastered';
    else if (reviewedWords > 0) state = 'in_progress';
    else state = 'not_started';
  }

  let stateLabel = 'Chưa học';
  let stateBadgeClass =
    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
  let primaryCtaLabel = 'Học bộ';

  if (state === 'empty') {
    stateLabel = '0 từ';
    stateBadgeClass =
      'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
    primaryCtaLabel = 'Xem bộ';
  } else if (state === 'in_progress') {
    stateLabel = 'Đang học';
    stateBadgeClass =
      'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800';
    primaryCtaLabel = 'Tiếp tục';
  } else if (state === 'mastered') {
    stateLabel = 'Đã thuộc';
    stateBadgeClass =
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
    primaryCtaLabel = 'Ôn lại';
  }

  const summaryText = `${reviewedWords}/${totalWords} từ đã luyện · ${masteredWords} đã nhớ`;
  const percentReviewed =
    totalWords > 0 ? Math.min(100, Math.round((reviewedWords / totalWords) * 100)) : 0;

  return {
    totalWords,
    reviewedWords,
    learningWords,
    masteredWords,
    dueWords,
    state,
    stateLabel,
    stateBadgeClass,
    summaryText,
    primaryCtaLabel,
    percentReviewed,
  };
}

