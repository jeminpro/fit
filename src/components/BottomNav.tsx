import type { AppRoute } from './FitApp';

interface BottomNavProps {
  route: AppRoute;
  onNavigate: (route: AppRoute) => void;
}

const navItems: { route: AppRoute; label: string }[] = [
  { route: 'today', label: 'Today' },
  { route: 'body', label: 'Body' },
  { route: 'you', label: 'You' },
];

export function BottomNav({ route, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const active = route === item.route;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate(item.route)}
              className={`flex flex-1 flex-col items-center py-3 text-xs font-medium transition-colors ${
                active
                  ? 'text-brand-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span
                className={`mb-1 h-1 w-8 rounded-full ${
                  active ? 'bg-brand-500' : 'bg-transparent'
                }`}
              />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
