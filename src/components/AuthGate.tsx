import { useApp } from '../context/AppContext';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, migrating, firebaseReady } = useApp();

  if (!firebaseReady) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Fit</h1>
        <p className="mt-3 max-w-md text-slate-600">
          Firebase is not configured. Copy <code className="rounded bg-slate-100 px-1">.env.example</code> to{' '}
          <code className="rounded bg-slate-100 px-1">.env</code> and add your Firebase project keys.
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
        <p className="text-sm text-slate-600">Syncing your local data…</p>
      </div>
    );
  }

  return <>{children}</>;
}

export function GuestBanner() {
  const { isGuest, signIn, authError, clearAuthError } = useApp();

  if (!isGuest) return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-sm text-amber-900">
        You&apos;re using Fit locally. Data is saved on this device only.
      </p>
      {authError && (
        <p className="mt-2 text-sm text-red-700">{authError}</p>
      )}
      <button
        type="button"
        onClick={() => {
          clearAuthError();
          void signIn();
        }}
        className="mt-2 text-sm font-semibold text-brand-700 hover:text-brand-800"
      >
        Sign in to back up and sync →
      </button>
    </div>
  );
}
