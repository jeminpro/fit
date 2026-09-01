import { useApp } from '../context/AppContext';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, migrating, firebaseReady } = useApp();

  if (!firebaseReady) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold text-slate-100">Fit</h1>
        <p className="mt-3 max-w-md text-slate-400">
          Firebase is not configured. Copy <code className="rounded bg-surface-800 px-1 text-slate-300">.env.example</code> to{' '}
          <code className="rounded bg-surface-800 px-1 text-slate-300">.env</code> and add your Firebase project keys.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (migrating) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        <p className="text-sm text-slate-400">Syncing your local data…</p>
      </div>
    );
  }

  return <>{children}</>;
}

export function GuestBanner() {
  const { isGuest, signIn, authError, clearAuthError } = useApp();

  if (!isGuest) return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <p className="text-sm text-amber-200">
        You&apos;re using Fit locally. Data is saved on this device only.
      </p>
      {authError && (
        <p className="mt-2 text-sm text-rose-400">{authError}</p>
      )}
      <button
        type="button"
        onClick={() => {
          clearAuthError();
          void signIn();
        }}
        className="mt-2 cursor-pointer text-sm font-semibold text-brand-400 transition hover:text-brand-300"
      >
        Sign in to back up and sync →
      </button>
    </div>
  );
}
