import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AuthGate, GuestBanner } from './AuthGate';
import { Onboarding } from './Onboarding';
import { ProfileSwitcher } from './ProfileSwitcher';
import { BottomNav } from './BottomNav';
import type { AppRoute } from './FitApp';

interface AppShellProps {
  title: string;
  route: AppRoute;
  onNavigate: (route: AppRoute) => void;
  children: React.ReactNode;
}

export function AppShell({ title, route, onNavigate, children }: AppShellProps) {
  const { profiles, loading } = useApp();
  const [onboarded, setOnboarded] = useState(false);
  const hasProfiles = profiles.length > 0;
  const needsOnboarding = !loading && !hasProfiles && !onboarded;

  return (
    <AuthGate>
      {needsOnboarding ? (
        <Onboarding onComplete={() => setOnboarded(true)} />
      ) : (
        <div className="mx-auto min-h-screen max-w-lg pb-24">
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
                  Fit
                </p>
                <h1 className="text-xl font-bold text-slate-900">{title}</h1>
              </div>
              <ProfileSwitcher />
            </div>
          </header>
          <main className="px-4 py-6">
            <GuestBanner />
            {children}
          </main>
          <BottomNav route={route} onNavigate={onNavigate} />
        </div>
      )}
    </AuthGate>
  );
}
