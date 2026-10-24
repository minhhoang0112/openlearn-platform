import { NavSource, isValidInternalPath } from './navigationContext';

export type ReviewScope = 'due' | 'all' | 'mastered';

export interface PracticeLaunchQuery {
  wordIds: number[];
  reviewScope: ReviewScope | null;
  studyMode: 'learn' | 'write' | 'quiz' | null;
  direction: 'en-vi' | 'vi-en' | 'both' | null;
}

export function parsePracticeLaunchQuery(path: string): PracticeLaunchQuery {
  const queryIndex = path.indexOf('?');
  if (queryIndex < 0) {
    return { wordIds: [], reviewScope: null, studyMode: null, direction: null };
  }
  const params = new URLSearchParams(path.slice(queryIndex + 1));
  const rawWordIds = params.get('word_ids') || '';
  const wordIds = Array.from(
    new Set(
      rawWordIds
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0),
    ),
  );
  const rawScope = params.get('review_scope');
  const reviewScope: ReviewScope | null =
    rawScope === 'due' || rawScope === 'all' || rawScope === 'mastered' ? rawScope : null;

  const rawStudyMode = params.get('study_mode') || params.get('mode');
  const studyMode: 'learn' | 'write' | 'quiz' | null =
    rawStudyMode === 'learn' || rawStudyMode === 'write' || rawStudyMode === 'quiz'
      ? rawStudyMode
      : null;

  const rawDirection = params.get('direction');
  const direction: 'en-vi' | 'vi-en' | 'both' | null =
    rawDirection === 'en-vi' || rawDirection === 'vi-en' || rawDirection === 'both'
      ? rawDirection
      : null;

  return { wordIds, reviewScope, studyMode, direction };
}

export interface BuildPracticeRouteOptions {
  wordIds?: number[];
  reviewScope?: ReviewScope | null;
  studyMode?: 'learn' | 'write' | 'quiz' | null;
  direction?: 'en-vi' | 'vi-en' | 'both' | null;
  maxWords?: number;
  source?: NavSource | null;
  from?: string | null;
  pathId?: number | null;
  pathTitle?: string | null;
  setTitle?: string | null;
  practiceMode?: string | null;
  practiceCat?: string | null;
}

export function buildPracticeRoute(
  baseRoute: string,
  options?: BuildPracticeRouteOptions,
): string {
  const [pathname, existingQuery] = baseRoute.split('?');
  const params = new URLSearchParams(existingQuery || '');
  if (options?.studyMode) {
    params.set('study_mode', options.studyMode);
  }
  if (options?.direction) {
    params.set('direction', options.direction);
  }
  if (options?.reviewScope) {
    params.set('review_scope', options.reviewScope);
  }
  if (options?.wordIds && options.wordIds.length > 0) {
    const sliced = options.maxWords ? options.wordIds.slice(0, options.maxWords) : options.wordIds;
    params.set('word_ids', sliced.join(','));
  }
  if (options?.source) {
    params.set('source', options.source);
  }
  if (options?.from && isValidInternalPath(options.from)) {
    params.set('from', options.from.trim());
  }
  if (options?.pathId && Number.isInteger(options.pathId) && options.pathId > 0) {
    params.set('path_id', String(options.pathId));
  }
  if (options?.pathTitle && options.pathTitle.trim()) {
    params.set('path_title', options.pathTitle.trim());
  }
  if (options?.setTitle && options.setTitle.trim()) {
    params.set('set_title', options.setTitle.trim());
  }
  if (options?.practiceMode && options.practiceMode.trim()) {
    params.set('practice_mode', options.practiceMode.trim());
  }
  if (options?.practiceCat && options.practiceCat.trim()) {
    params.set('practice_cat', options.practiceCat.trim());
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function buildScopedSessionStorageKey(
  prefix: string,
  userId: number | string | undefined,
  mode: string,
  setId: number,
  options?: {
    reviewScope?: ReviewScope | null;
    wordIds?: number[];
    studyMode?: string | null;
    direction?: string | null;
  },
): string {
  const scopePart = options?.reviewScope || 'full';
  const idsPart =
    options?.wordIds && options.wordIds.length > 0
      ? [...options.wordIds].sort((a, b) => a - b).join('-')
      : 'all';
  const modePart = options?.studyMode ? `${mode}_${options.studyMode}` : mode;
  const dirPart = options?.direction ? `_${options.direction}` : '';
  return `${prefix}:${userId ?? 'anon'}:${modePart}${dirPart}:${setId}:${scopePart}:${idsPart}`;
}
