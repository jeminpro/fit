import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AuthGate, GuestBanner } from './AuthGate';
import { Onboarding } from './Onboarding';
import { ProfileSwitcher } from './ProfileSwitcher';
import { BottomNav } from './BottomNav';
import type { AppRoute } from './FitApp';

const base = import.meta.env.BASE_URL;

interface AppShellProps {
  route: AppRoute;
  onNavigate: (route: AppRoute) => void;
  children: React.ReactNode;
}

export function AppShell({ route, onNavigate, children }: AppShellProps) {
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
          <header className="sticky top-0 z-40 border-b border-surface-800 bg-surface-950/90 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <img
                  src={`${base}favicon.svg`}
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7"
                />
                <p className="text-lg font-bold uppercase tracking-widest text-brand-400">
                  Fit
                </p>
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
