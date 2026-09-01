import { useEffect, useState } from 'react';
import { AppProvider } from '../context/AppContext';
import { AppShell } from './AppShell';
import { TodayDashboard } from './TodayDashboard';
import { BodyDashboard } from './BodyDashboard';
import { YouPage } from './YouPage';

export type AppRoute = 'today' | 'body' | 'you';

const base = import.meta.env.BASE_URL;

const routePaths: Record<AppRoute, string> = {
  today: base.endsWith('/') ? base : `${base}/`,
  body: `${base}body`,
  you: `${base}you`,
};

const titles: Record<AppRoute, string> = {
  today: 'Today',
  body: 'Body',
  you: 'You',
};

export function routeFromPath(path: string): AppRoute {
  if (path.includes('/body')) return 'body';
  if (path.includes('/you')) return 'you';
  return 'today';
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
      <AppShell title={titles[route]} route={route} onNavigate={navigate}>
        {route === 'today' && <TodayDashboard />}
        {route === 'body' && <BodyDashboard />}
        {route === 'you' && <YouPage />}
      </AppShell>
    </AppProvider>
  );
}
