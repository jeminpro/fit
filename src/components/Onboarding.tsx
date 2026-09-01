import { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Sex, MeasurementType, UnitSystem } from '../lib/types';
import {
  DEFAULT_ENABLED_MEASUREMENTS,
  OPTIONAL_MEASUREMENTS,
  MEASUREMENT_LABELS,
} from '../lib/constants';
import { toCanonical } from '../lib/units';
import { stripUndefinedDeep } from '../lib/async';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const { user, isGuest, signIn, setupInitialProfile, authError, clearAuthError } = useApp();
  const [step, setStep] = useState(0);
  const [signingIn, setSigningIn] = useState(false);
  const [units, setUnitChoice] = useState<UnitSystem>('metric');
  const [name, setName] = useState('');
  const [sex, setSex] = useState<Sex>('other');
  const [birthDate, setBirthDate] = useState('');
  const [enabled, setEnabled] = useState<MeasurementType[]>([
    ...DEFAULT_ENABLED_MEASUREMENTS,
  ]);
  const [targetWeight, setTargetWeight] = useState('');
  const [targetWaist, setTargetWaist] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function toggleMeasurement(type: MeasurementType) {
    setEnabled((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  async function handleSignIn() {
    setSigningIn(true);
    setError('');
    clearAuthError();
    try {
      await signIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setSigningIn(false);
    }
  }

  async function finish() {
    if (!name.trim() || !birthDate) {
      setError('Name and birth date are required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const goals = stripUndefinedDeep({
        weight: targetWeight
          ? toCanonical('weight', Number(targetWeight), units)
          : undefined,
        waist: targetWaist
          ? toCanonical('waist', Number(targetWaist), units)
          : undefined,
      }) as { weight?: number; waist?: number };

      await setupInitialProfile(
        {
          name: name.trim(),
          sex,
          birthDate,
          enabledMeasurements: enabled,
          goals,
        },
        units,
      );
      onComplete();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save profile.';
      setError(
        message.includes('permission') || message.includes('Permission')
          ? 'Firestore denied the save. Your rules must include profiles, measurements, and habitDays subcollections — see firestore.rules in this repo.'
          : message,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-400">
          Welcome to Fit
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-100">Set up your first profile</h2>
        <p className="mt-1 text-sm text-slate-500">Step {step + 1} of 3</p>
        {!isGuest && user?.email && (
          <p className="mt-2 text-sm text-brand-300">
            Signed in as {user.email}
          </p>
        )}
      </div>

      {isGuest && step === 0 && (
        <div className="mb-6 space-y-4">
          <button
            type="button"
            onClick={handleSignIn}
            disabled={signingIn}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-surface-700 bg-surface-800 py-3 text-sm font-semibold text-slate-100 shadow-sm transition hover:border-slate-500 hover:bg-surface-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <GoogleIcon />
            {signingIn ? 'Redirecting…' : 'Sign in with Google'}
          </button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-surface-950 px-2 text-slate-500">or set up on this device</span>
            </div>
          </div>
        </div>
      )}

      {error && step === 0 && isGuest && (
        <p className="mb-4 text-sm text-rose-400">{error}</p>
      )}
      {authError && step === 0 && (
        <p className="mb-4 text-sm text-rose-400">{authError}</p>
      )}

      {step === 0 && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Units</span>
            <select
              value={units}
              onChange={(e) => setUnitChoice(e.target.value as UnitSystem)}
              className="input mt-1"
            >
              <option value="metric">Metric (kg, cm)</option>
              <option value="imperial">Imperial (lb, in)</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name or child's name"
              className="input mt-1"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Sex</span>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value as Sex)}
              className="input mt-1"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other / prefer not to say</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Birth date</span>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="input mt-1"
            />
            <p className="mt-1 text-xs text-slate-500">
              Used for growth charts — especially useful for kids.
            </p>
          </label>
          <button
            type="button"
            onClick={() => setStep(1)}
            disabled={!name.trim() || !birthDate}
            className="btn-primary w-full py-3 text-sm"
          >
            Continue
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Choose which measurements to track. You can change these later.
          </p>
          <div className="space-y-2">
            {DEFAULT_ENABLED_MEASUREMENTS.map((type) => (
              <label
                key={type}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-surface-700 bg-surface-900/60 px-4 py-3 transition hover:border-brand-500/40 hover:bg-surface-800"
              >
                <input
                  type="checkbox"
                  checked={enabled.includes(type)}
                  onChange={() => toggleMeasurement(type)}
                  className="h-4 w-4 rounded accent-brand-500"
                />
                <span className="text-sm font-medium text-slate-200">{MEASUREMENT_LABELS[type]}</span>
              </label>
            ))}
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Optional
          </p>
          <div className="space-y-2">
            {OPTIONAL_MEASUREMENTS.map((type) => (
              <label
                key={type}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-surface-700 bg-surface-900/60 px-4 py-3 transition hover:border-brand-500/40 hover:bg-surface-800"
              >
                <input
                  type="checkbox"
                  checked={enabled.includes(type)}
                  onChange={() => toggleMeasurement(type)}
                  className="h-4 w-4 rounded accent-brand-500"
                />
                <span className="text-sm font-medium text-slate-200">{MEASUREMENT_LABELS[type]}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="btn-secondary flex-1 py-3 text-sm"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn-primary flex-1 py-3 text-sm"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Optional goals to track progress.</p>
          <label className="block">
            <span className="text-sm font-medium text-slate-300">
              Target weight ({units === 'metric' ? 'kg' : 'lb'})
            </span>
            <input
              type="number"
              step="0.1"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
              className="input mt-1"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-300">
              Target waist ({units === 'metric' ? 'cm' : 'in'})
            </span>
            <input
              type="number"
              step="0.1"
              value={targetWaist}
              onChange={(e) => setTargetWaist(e.target.value)}
              className="input mt-1"
            />
          </label>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-secondary flex-1 py-3 text-sm"
            >
              Back
            </button>
            <button
              type="button"
              onClick={finish}
              disabled={saving}
              className="btn-primary flex-1 py-3 text-sm"
            >
              {saving ? 'Saving…' : 'Get started'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
