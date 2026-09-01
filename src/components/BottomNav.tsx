import type { ReactNode } from 'react';
import type { AppRoute } from './FitApp';

interface BottomNavProps {
  route: AppRoute;
  onNavigate: (route: AppRoute) => void;
}

function TodayIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function BodyIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12h3l2-7 4 14 3-10 1.5 3H21" />
    </svg>
  );
}

function YouIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </svg>
  );
}

const navItems: { route: AppRoute; label: string; icon: () => ReactNode }[] = [
  { route: 'today', label: 'Today', icon: TodayIcon },
  { route: 'body', label: 'Body', icon: BodyIcon },
  { route: 'you', label: 'You', icon: YouIcon },
];

export function BottomNav({ route, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-surface-800 bg-surface-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const active = route === item.route;
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate(item.route)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 cursor-pointer flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                active
                  ? 'text-brand-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span
                className={`flex h-8 w-14 items-center justify-center rounded-full transition ${
                  active ? 'bg-brand-500/15' : ''
                }`}
              >
                <Icon />
              </span>
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
