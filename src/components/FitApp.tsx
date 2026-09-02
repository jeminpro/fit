import { useEffect, useState } from 'react';
import { AppProvider } from '../context/AppContext';
import { AppShell } from './AppShell';
import { HomeDashboard } from './HomeDashboard';
import { YouPage } from './YouPage';

export type AppRoute = 'home' | 'you';

const base = import.meta.env.BASE_URL;

const routePaths: Record<AppRoute, string> = {
  home: base.endsWith('/') ? base : `${base}/`,
  you: `${base}you`,
};

export function routeFromPath(path: string): AppRoute {
  if (path.includes('/you')) return 'you';
  return 'home';
}

export default function FitApp() {
  const [route, setRoute] = useState<AppRoute>(() =>
    routeFromPath(window.location.pathname),
  );

  useEffect(() => {
    const onPopState = () => {
      setRoute(routeFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function navigate(next: AppRoute) {
    if (next === route) return;
    window.history.pushState({}, '', routePaths[next]);
    setRoute(next);
  }

  return (
    <AppProvider>
      <AppShell route={route} onNavigate={navigate}>
        {route === 'home' && <HomeDashboard />}
        {route === 'you' && <YouPage />}
      </AppShell>
    </AppProvider>
  );
}
