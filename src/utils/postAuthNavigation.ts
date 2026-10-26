import { sanitizeInternalPath } from './navigationContext';

export function postAuthDestination(fullPath: string): string {
  const safePath = sanitizeInternalPath(fullPath, '/');
  const [pathname, query = ''] = safePath.split('?');
  // On a real deep link, `from` belongs to the Back button. It is not the
  // destination of authentication, and must stay on the original URL.
  if (!['/', '/login', '/auth'].includes(pathname)) return safePath;
  const params = new URLSearchParams(query);
  return sanitizeInternalPath(params.get('returnTo') || params.get('from'), pathname === '/' ? safePath : '/');
}
