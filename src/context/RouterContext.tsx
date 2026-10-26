import React, { createContext, useContext, useState, useEffect } from 'react';

interface RouterContextType {
  path: string;
  navigate: (to: string, options?: { replace?: boolean }) => void;
  goBack: () => void;
  params: Record<string, string>;
}

const RouterContext = createContext<RouterContextType>({
  path: '/',
  navigate: () => {},
  goBack: () => {},
  params: {}
});

function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('?')[0].split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      const paramName = patternParts[i].slice(1);
      try { params[paramName] = decodeURIComponent(pathParts[i]); } catch { return null; }
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [path, setPath] = useState<string>(() => window.location.pathname + window.location.search);

  useEffect(() => {
    const onPop = () => {
      setPath(window.location.pathname + window.location.search);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (to: string, options?: { replace?: boolean }) => {
    if (to !== path) {
      if (options?.replace) {
        window.history.replaceState({}, '', to);
      } else {
        window.history.pushState({}, '', to);
      }
      setPath(to);
      window.scrollTo(0, 0);
    }
  };

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/', { replace: true });
    }
  };

  // Extract current matched route parameters
  const routes = [
    '/category/:slug',
    '/study-set/:id',
    '/learning-path/:id',
    '/study/:id',
    '/exam/:id',
    '/game/match/:id',
    '/dictation/:id',
    '/comprehensive/:id',
    '/ai-study/:id',
    '/conversation/:id',
    '/grammar/:id',
    '/reading/:id',
    '/courses/:courseId/lesson/:id',
    '/class/:id'
  ];

  let currentParams: Record<string, string> = {};
  for (const r of routes) {
    const matched = matchRoute(r, path);
    if (matched) {
      currentParams = matched;
      break;
    }
  }

  return (
    <RouterContext.Provider value={{ path, navigate, goBack, params: currentParams }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = () => useContext(RouterContext);

