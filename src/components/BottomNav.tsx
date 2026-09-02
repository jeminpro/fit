import type { ReactNode } from 'react';
import type { AppRoute } from './FitApp';

interface BottomNavProps {
  route: AppRoute;
  onNavigate: (route: AppRoute) => void;
}

function HomeIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

function WorkoutIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 6.5v11" />
      <path d="M17.5 6.5v11" />
      <path d="M3.5 9.5h3" />
      <path d="M3.5 14.5h3" />
      <path d="M17.5 9.5h3" />
      <path d="M17.5 14.5h3" />
      <path d="M6.5 12h11" />
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
  { route: 'home', label: 'Home', icon: HomeIcon },
  { route: 'workout', label: 'Workout', icon: WorkoutIcon },
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
