export type NavSource =
  | 'home'
  | 'today'
  | 'program'
  | 'library'
  | 'practice'
  | 'srs'
  | 'path'
  | 'category'
  | 'explore';

export interface NavigationContext {
  source: NavSource | null;
  from: string | null;
  pathId: number | null;
  pathTitle: string | null;
  setTitle: string | null;
  practiceMode: string | null;
  practiceCat: string | null;
}

const VALID_SOURCES = new Set<NavSource>([
  'home',
  'today',
  'program',
  'library',
  'practice',
  'srs',
  'path',
  'category',
  'explore',
]);

export function sanitizeInternalPath(rawPath?: string | null, fallback = '/'): string {
  if (!rawPath || typeof rawPath !== 'string') return fallback;
  const trimmed = rawPath.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback;
  return trimmed;
}

export function isValidInternalPath(rawPath?: string | null): rawPath is string {
  if (!rawPath || typeof rawPath !== 'string') return false;
  const trimmed = rawPath.trim();
  return trimmed.startsWith('/') && !trimmed.startsWith('//');
}

export function parseNavigationContext(fullPath: string): NavigationContext {
  const qIdx = fullPath.indexOf('?');
  if (qIdx < 0) {
    return {
      source: null,
      from: null,
      pathId: null,
      pathTitle: null,
      setTitle: null,
      practiceMode: null,
      practiceCat: null,
    };
  }
  const params = new URLSearchParams(fullPath.slice(qIdx + 1));
  const rawSource = params.get('source') as NavSource | null;
  const source = rawSource && VALID_SOURCES.has(rawSource) ? rawSource : null;
  const rawFrom = params.get('from');
  const from = isValidInternalPath(rawFrom) ? rawFrom.trim() : null;
  const rawPathId = Number(params.get('path_id'));
  const pathId = Number.isInteger(rawPathId) && rawPathId > 0 ? rawPathId : null;
  const pathTitle = params.get('path_title')?.trim() || null;
  const setTitle = params.get('set_title')?.trim() || null;
  const practiceMode = params.get('practice_mode')?.trim() || null;
  const practiceCat = params.get('practice_cat')?.trim() || null;

  return {
    source,
    from,
    pathId,
    pathTitle,
    setTitle,
    practiceMode,
    practiceCat,
  };
}

export function withNavigationContext(
  targetRoute: string,
  ctx: Partial<NavigationContext>,
): string {
  const safeTarget = sanitizeInternalPath(targetRoute, '/');
  const [pathname, existingQuery] = safeTarget.split('?');
  const params = new URLSearchParams(existingQuery || '');

  if (ctx.source && VALID_SOURCES.has(ctx.source)) {
    params.set('source', ctx.source);
  }
  if (ctx.from && isValidInternalPath(ctx.from)) {
    params.set('from', ctx.from.trim());
  }
  if (ctx.pathId && Number.isInteger(ctx.pathId) && ctx.pathId > 0) {
    params.set('path_id', String(ctx.pathId));
  }
  if (ctx.pathTitle && ctx.pathTitle.trim()) {
    params.set('path_title', ctx.pathTitle.trim());
  }
  if (ctx.setTitle && ctx.setTitle.trim()) {
    params.set('set_title', ctx.setTitle.trim());
  }
  if (ctx.practiceMode && ctx.practiceMode.trim()) {
    params.set('practice_mode', ctx.practiceMode.trim());
  }
  if (ctx.practiceCat && ctx.practiceCat.trim()) {
    params.set('practice_cat', ctx.practiceCat.trim());
  }

  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function forwardNavigationContext(
  targetRoute: string,
  currentPath: string,
  overrides?: Partial<NavigationContext>,
): string {
  const currentCtx = parseNavigationContext(currentPath);
  return withNavigationContext(targetRoute, {
    ...currentCtx,
    ...overrides,
  });
}

export function resolveSourceSidebarRoute(source: NavSource | null, from?: string | null): string | null {
  if (source === 'home' || source === 'explore' || from?.split('?')[0] === '/' || (from && from.startsWith('/explore'))) return '/';
  if (source === 'library' || (from && from.startsWith('/my-created'))) return '/my-created';
  if (source === 'category' || (from && from.startsWith('/category/'))) return '/my-created';
  if (source === 'today') return '/today';
  if (source === 'program') return '/my-program';
  if (source === 'practice') return '/practice';
  if (source === 'srs') return '/repetition-study';
  if (source === 'path') {
    if (from && (from.startsWith('/my-program') || from.startsWith('/courses'))) return '/my-program';
    if (from?.startsWith('/learning-path/')) {
      const parent = parseNavigationContext(from);
      if (parent.source !== 'path') return resolveSourceSidebarRoute(parent.source, parent.from) || '/my-created';
    }
    return '/my-created';
  }
  if (from) {
    if (from === '/' || from.startsWith('/today')) return '/today';
    if (from.startsWith('/my-program') || from.startsWith('/courses')) return '/my-program';
    if (from.startsWith('/my-created') || from.startsWith('/explore')) return '/my-created';
    if (from.startsWith('/practice')) return '/practice';
    if (from.startsWith('/repetition-study')) return '/repetition-study';
  }
  return null;
}

export function resolveActiveSidebarRoute(fullPath: string): string {
  const currentPath = fullPath.split('?')[0];
  const ctx = parseNavigationContext(fullPath);

  if (currentPath === '/' || currentPath === '/explore' || currentPath.startsWith('/explore/')) return '/';
  if (currentPath === '/today' || currentPath.startsWith('/today/')) {
    return '/today';
  }
  if (currentPath.startsWith('/category/')) {
    return resolveSourceSidebarRoute(ctx.source, ctx.from) || '/my-created';
  }
  if (currentPath.startsWith('/my-program') || currentPath.startsWith('/courses')) {
    return '/my-program';
  }
  if (currentPath === '/my-created' || currentPath.startsWith('/my-created/')) {
    return '/my-created';
  }
  if (currentPath === '/practice' || currentPath.startsWith('/practice/')) {
    return '/practice';
  }
  if (currentPath === '/repetition-study' || currentPath.startsWith('/repetition-study/')) {
    return '/repetition-study';
  }
  if (currentPath === '/mistakes' || currentPath.startsWith('/mistakes/')) {
    return '/mistakes';
  }
  if (currentPath === '/progress' || currentPath.startsWith('/progress/')) {
    return '/progress';
  }

  // Child views: check explicit navigation context first
  const explicitSidebar = resolveSourceSidebarRoute(ctx.source, ctx.from);
  if (explicitSidebar) {
    return explicitSidebar;
  }

  // Check if review_scope is present in query without explicit source
  const qIdx = fullPath.indexOf('?');
  if (qIdx >= 0) {
    const params = new URLSearchParams(fullPath.slice(qIdx + 1));
    if (params.get('review_scope') || params.get('due') === '1') {
      return '/repetition-study';
    }
  }

  // Deeplink fallbacks
  if (currentPath.startsWith('/study-set/') || currentPath.startsWith('/comprehensive/')) {
    return '/my-created';
  }
  if (
    currentPath.startsWith('/study/') ||
    currentPath.startsWith('/dictation/') ||
    currentPath.startsWith('/exam/') ||
    currentPath.startsWith('/game/match/') ||
    currentPath.startsWith('/grammar/') ||
    currentPath.startsWith('/reading/') ||
    currentPath.startsWith('/ai-study/') ||
    currentPath.startsWith('/conversation/') ||
    currentPath.startsWith('/listening') ||
    currentPath.startsWith('/materials')
  ) {
    return '/practice';
  }
  if (currentPath.startsWith('/lesson-run/')) {
    return '/my-program';
  }
  if (currentPath.startsWith('/learning-path/')) {
    return '/my-created';
  }

  return currentPath;
}

export function getSourceLabel(source: NavSource | null, from?: string | null, pathTitle?: string | null): {
  label: string;
  backLabel: string;
  route: string;
} {
  if (source === 'practice' || (from && from.startsWith('/practice'))) {
    return {
      label: 'Luyện tập',
      backLabel: 'Về Luyện tập',
      route: sanitizeInternalPath(from, '/practice'),
    };
  }
  if (source === 'srs' || (from && from.startsWith('/repetition-study'))) {
    return {
      label: 'Ôn đến hạn',
      backLabel: 'Về Ôn đến hạn',
      route: sanitizeInternalPath(from, '/repetition-study'),
    };
  }
  if (source === 'home' || source === 'explore' || from?.split('?')[0] === '/' || (from && from.startsWith('/explore'))) {
    return {
      label: 'Trang chủ',
      backLabel: 'Về Trang chủ',
      route: sanitizeInternalPath(from, '/'),
    };
  }
  if (source === 'today' || (from && from.startsWith('/today'))) {
    return {
      label: 'Học hôm nay',
      backLabel: 'Về Học hôm nay',
      route: sanitizeInternalPath(from, '/today'),
    };
  }
  if (source === 'program' || (from && (from.startsWith('/my-program') || from.startsWith('/courses')))) {
    return {
      label: 'Lộ trình',
      backLabel: 'Về Lộ trình',
      route: sanitizeInternalPath(from, '/my-program'),
    };
  }
  if (source === 'path' || (from && from.startsWith('/learning-path/'))) {
    return {
      label: pathTitle || 'Lộ trình học',
      backLabel: 'Về lộ trình',
      route: sanitizeInternalPath(from, '/explore'),
    };
  }
  if (source === 'library' || (from && from.startsWith('/my-created'))) {
    return {
      label: 'Thư viện',
      backLabel: 'Về Thư viện',
      route: sanitizeInternalPath(from, '/my-created'),
    };
  }
  return {
    label: 'Thư viện',
    backLabel: 'Về Thư viện',
    route: '/my-created',
  };
}
