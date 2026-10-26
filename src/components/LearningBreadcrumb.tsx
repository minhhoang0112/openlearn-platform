import React from 'react';
import { ArrowLeft, ChevronRight, FolderOpen } from 'lucide-react';
import { useRouter } from '../context/RouterContext';
import {
  parseNavigationContext,
  sanitizeInternalPath,
  withNavigationContext,
} from '../utils/navigationContext';
import { parsePracticeLaunchQuery } from '../utils/practiceLaunch';

export interface LearningBreadcrumbProps {
  currentLabel: string;
  setId?: number;
  setTitle?: string | null;
  rightSlot?: React.ReactNode;
}

export const LearningBreadcrumb: React.FC<LearningBreadcrumbProps> = ({
  currentLabel,
  setId,
  setTitle,
  rightSlot,
}) => {
  const { path, navigate } = useRouter();
  const currentPathname = path.split('?')[0];
  const ctx = parseNavigationContext(path);
  const launch = parsePracticeLaunchQuery(path);

  const resolvedSetTitle = setTitle?.trim() || ctx.setTitle || (setId ? `Bộ từ #${setId}` : null);
  const isOnStudySetPage = currentPathname.startsWith('/study-set/');

  // Determine root origin
  let rootLabel = 'Thư viện';
  let rootRoute = '/my-created';
  let backButtonLabel = isOnStudySetPage ? 'Về Thư viện' : 'Quay lại bộ từ';
  let backButtonRoute = isOnStudySetPage
    ? '/my-created'
    : setId
      ? withNavigationContext(`/study-set/${setId}`, ctx)
      : '/my-created';

  const isFromPractice =
    ctx.source === 'practice' || (ctx.from !== null && ctx.from.startsWith('/practice'));
  const isFromSrs =
    ctx.source === 'srs' ||
    (ctx.from !== null && ctx.from.startsWith('/repetition-study')) ||
    (!ctx.source && launch.reviewScope !== null);
  const isFromPath =
    ctx.source === 'path' ||
    ctx.pathId !== null ||
    (ctx.from !== null && ctx.from.startsWith('/learning-path/'));
  const isFromExplore =
    ctx.source === 'explore' ||
    (ctx.from !== null && ctx.from.startsWith('/explore'));
  const isFromHome =
    ctx.source === 'home' ||
    ctx.from?.split('?')[0] === '/';
  const isFromToday =
    ctx.source === 'today' ||
    (ctx.from !== null && ctx.from.startsWith('/today'));
  const isFromProgram =
    ctx.source === 'program' || (ctx.from !== null && ctx.from.startsWith('/my-program'));

  const defaultPracticeRoute = (() => {
    const params = new URLSearchParams();
    if (ctx.practiceMode) params.set('mode', ctx.practiceMode);
    if (ctx.practiceCat) params.set('cat', ctx.practiceCat);
    const qs = params.toString();
    return qs ? `/practice?${qs}` : '/practice';
  })();

  if (isFromPractice) {
    rootLabel = 'Luyện tập';
    rootRoute = sanitizeInternalPath(ctx.from, defaultPracticeRoute);
    backButtonLabel = rootRoute.startsWith('/practice/')
      ? 'Trở về chọn bộ từ' : 'Về Luyện tập';
    backButtonRoute = rootRoute;
  } else if (isFromSrs) {
    rootLabel = 'Ôn đến hạn';
    rootRoute = sanitizeInternalPath(ctx.from, '/repetition-study');
    backButtonLabel = 'Về Ôn đến hạn';
    backButtonRoute = rootRoute;
  } else if (isFromExplore) {
    rootLabel = 'Trang chủ';
    rootRoute = sanitizeInternalPath(ctx.from, '/explore');
    backButtonLabel = isOnStudySetPage ? 'Về Trang chủ' : 'Về bộ từ';
    backButtonRoute = isOnStudySetPage
      ? rootRoute
      : setId
        ? withNavigationContext(`/study-set/${setId}`, ctx)
        : rootRoute;
  } else if (isFromPath) {
    const pathRoute = ctx.from?.startsWith('/learning-path/')
      ? sanitizeInternalPath(ctx.from, '/explore')
      : ctx.pathId
      ? `/learning-path/${ctx.pathId}`
      : sanitizeInternalPath(ctx.from, '/explore');
    rootLabel = ctx.pathTitle || 'Lộ trình học';
    rootRoute = pathRoute;
    if (isOnStudySetPage) {
      backButtonLabel = 'Về lộ trình';
      backButtonRoute = pathRoute;
    } else if (setId) {
      backButtonLabel = 'Về bộ từ';
      backButtonRoute = withNavigationContext(`/study-set/${setId}`, {
        source: 'path',
        from: pathRoute,
        pathId: ctx.pathId,
        pathTitle: ctx.pathTitle,
        setTitle: resolvedSetTitle,
      });
    } else {
      backButtonLabel = 'Về lộ trình';
      backButtonRoute = pathRoute;
    }
  } else if (isFromHome || isFromToday) {
    rootLabel = isFromHome ? 'Trang chủ' : 'Học hôm nay';
    rootRoute = sanitizeInternalPath(ctx.from, isFromHome ? '/' : '/today');
    backButtonLabel = isOnStudySetPage ? `Về ${rootLabel}` : 'Về bộ từ';
    backButtonRoute = isOnStudySetPage
      ? rootRoute
      : setId
        ? withNavigationContext(`/study-set/${setId}`, ctx)
        : rootRoute;
  } else if (isFromProgram) {
    rootLabel = 'Lộ trình';
    rootRoute = sanitizeInternalPath(ctx.from, '/my-program');
    backButtonLabel = isOnStudySetPage ? 'Về Lộ trình' : 'Về bộ từ';
    backButtonRoute = isOnStudySetPage
      ? rootRoute
      : setId
        ? withNavigationContext(`/study-set/${setId}`, ctx)
        : rootRoute;
  } else {
    // Deeplink fallback
    if (
      !isOnStudySetPage &&
      !currentPathname.startsWith('/comprehensive/') &&
      (currentPathname.startsWith('/study/') ||
        currentPathname.startsWith('/dictation/') ||
        currentPathname.startsWith('/exam/') ||
        currentPathname.startsWith('/game/match/') ||
        currentPathname.startsWith('/grammar/') ||
        currentPathname.startsWith('/reading/') ||
        currentPathname.startsWith('/ai-study/') ||
        currentPathname.startsWith('/conversation/'))
    ) {
      rootLabel = 'Luyện tập';
      rootRoute = '/practice';
    } else {
      rootLabel = 'Thư viện';
      rootRoute = '/my-created';
    }
    backButtonLabel = isOnStudySetPage ? 'Về Thư viện' : 'Quay lại bộ từ';
    backButtonRoute = isOnStudySetPage
      ? '/my-created'
      : setId
        ? withNavigationContext(`/study-set/${setId}`, ctx)
        : '/my-created';
  }

  const studySetRoute = setId
    ? withNavigationContext(`/study-set/${setId}`, {
        ...ctx,
        setTitle: resolvedSetTitle,
      })
    : null;

  return (
    <div className="space-y-2">
      {/* Breadcrumb trail */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 flex-wrap"
      >
        <button
          type="button"
          onClick={() => navigate(rootRoute)}
          className="hover:text-indigo-600 dark:hover:text-indigo-400 transition truncate max-w-[200px]"
        >
          {rootLabel}
        </button>

        {!isOnStudySetPage && setId && resolvedSetTitle && studySetRoute && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <button
              type="button"
              onClick={() => navigate(studySetRoute)}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition truncate max-w-[220px]"
            >
              {resolvedSetTitle}
            </button>
          </>
        )}

        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="font-extrabold text-slate-900 dark:text-white truncate max-w-[260px]">
          {currentLabel}
        </span>
      </nav>

      {/* Action / Back Header Row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            data-testid="contextual-back-button"
            onClick={() => navigate(backButtonRoute)}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition px-3 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{backButtonLabel}</span>
          </button>

          {!isOnStudySetPage && studySetRoute && backButtonRoute !== studySetRoute && (
            <button
              type="button"
              data-testid="back-to-set-button"
              onClick={() => navigate(studySetRoute)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Về bộ từ</span>
            </button>
          )}
        </div>

        {rightSlot && <div className="flex items-center gap-2 flex-wrap">{rightSlot}</div>}
      </div>
    </div>
  );
};

