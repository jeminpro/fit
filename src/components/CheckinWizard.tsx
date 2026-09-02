import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { MEASUREMENT_LABELS, MEASUREMENT_TIPS } from '../lib/constants';
import type { MeasurementType } from '../lib/types';
import { toCanonical } from '../lib/units';
import { getLatestByType } from '../lib/derived';
import { formatMeasurementValue } from '../lib/units';

interface CheckinWizardProps {
  onClose: () => void;
}

export function CheckinWizard({ onClose }: CheckinWizardProps) {
  const { activeProfile, measurements, prefs, addMeasurementsBatch } = useApp();
  const units = prefs?.units ?? 'metric';

  const steps = useMemo(() => {
    if (!activeProfile) return [];
    const isKid =
      new Date().getFullYear() -
        new Date(activeProfile.birthDate).getFullYear() <
      18;
    if (isKid) {
      return ['height', 'weight'] as MeasurementType[];
    }
    const enabled = activeProfile.enabledMeasurements.filter(
      (t) => t !== 'height' || enabledHasHeight(activeProfile.enabledMeasurements),
    );
    const ordered = [
      'weight',
      'waist',
      'hips',
      'arm',
      'height',
    ] as MeasurementType[];
    return ordered.filter((t) => enabled.includes(t));
  }, [activeProfile]);

  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const currentType = steps[stepIndex];
  const latest = currentType
    ? getLatestByType(measurements, currentType)
    : null;

  function enabledHasHeight(list: MeasurementType[]) {
    return list.includes('height');
  }

  function skipStep() {
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      setStepIndex(steps.length);
    }
  }

  async function saveAll() {
    if (!activeProfile) return;

    const recordedAt = new Date().toISOString();
    const inputs = Object.entries(values)
      .filter(([, v]) => v.trim() !== '')
      .map(([type, v]) => ({
        type: type as MeasurementType,
        value: toCanonical(type as MeasurementType, Number(v), units),
        recordedAt,
        note: note.trim() || undefined,
      }));

    if (inputs.length === 0) {
      setError('Enter at least one measurement.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await addMeasurementsBatch(inputs);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  if (!activeProfile || steps.length === 0) return null;

  const isReview = stepIndex >= steps.length;
  const progress = Math.min(stepIndex / steps.length, 1) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-surface-700 bg-surface-900 p-6 shadow-2xl shadow-black/50">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100">
            {isReview ? 'Review & save' : 'Check-in'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-2 py-1 text-sm text-slate-400 transition hover:bg-surface-800 hover:text-slate-200"
          >
            Close
          </button>
        </div>

        <div className="mb-4 h-1 overflow-hidden rounded-full bg-surface-800">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-300"
            style={{ width: `${isReview ? 100 : progress}%` }}
          />
        </div>

        {!isReview && currentType && (
          <>
            <p className="text-sm text-slate-500">
              Step {stepIndex + 1} of {steps.length}
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-100">
              {MEASUREMENT_LABELS[currentType]}
            </h3>
            <p className="mt-2 rounded-lg border border-brand-500/20 bg-brand-500/10 p-3 text-sm text-brand-200">
              {MEASUREMENT_TIPS[currentType]}
            </p>
            {latest && (
              <p className="mt-2 text-sm text-slate-400">
                Last: {formatMeasurementValue(currentType, latest.value, units)}
              </p>
            )}
            <input
              type="number"
              step="0.1"
              value={values[currentType] ?? ''}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [currentType]: e.target.value }))
              }
              placeholder={`Enter ${MEASUREMENT_LABELS[currentType].toLowerCase()}`}
              className="input mt-4 px-4 py-3 text-lg"
              autoFocus
            />
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={skipStep}
                className="btn-secondary flex-1 py-3 text-sm"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={() => {
                  if (stepIndex < steps.length - 1) {
                    setStepIndex((i) => i + 1);
                  } else {
                    setStepIndex(steps.length);
                  }
                }}
                className="btn-primary flex-1 py-3 text-sm"
              >
                {stepIndex < steps.length - 1 ? 'Next' : 'Review'}
              </button>
            </div>
          </>
        )}

        {isReview && (
          <>
            <ul className="space-y-2">
              {Object.entries(values)
                .filter(([, v]) => v.trim() !== '')
                .map(([type, v]) => (
                  <li
                    key={type}
                    className="flex justify-between rounded-lg border border-surface-700 bg-surface-800/60 px-3 py-2 text-sm text-slate-200"
                  >
                    <span>{MEASUREMENT_LABELS[type as MeasurementType]}</span>
                    <span className="font-semibold text-slate-100">
                      {v}{' '}
                      {units === 'metric'
                        ? type === 'weight'
                          ? 'kg'
                          : 'cm'
                        : type === 'weight'
                          ? 'lb'
                          : 'in'}
                    </span>
                  </li>
                ))}
            </ul>
            <label className="mt-4 block">
              <span className="text-sm font-medium text-slate-300">
                Note (optional)
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="input mt-1 text-sm"
                placeholder="After illness, new scale, etc."
              />
            </label>
            {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setStepIndex(steps.length - 1)}
                className="btn-secondary flex-1 py-3 text-sm"
              >
                Back
              </button>
              <button
                type="button"
                onClick={saveAll}
                disabled={saving}
                className="btn-primary flex-1 py-3 text-sm"
              >
                {saving ? 'Saving…' : 'Save check-in'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
