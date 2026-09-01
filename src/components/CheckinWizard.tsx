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
      'chest',
      'thigh',
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {isReview ? 'Review & save' : 'Check-in'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Close
          </button>
        </div>

        {!isReview && currentType && (
          <>
            <p className="text-sm text-slate-500">
              Step {stepIndex + 1} of {steps.length}
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">
              {MEASUREMENT_LABELS[currentType]}
            </h3>
            <p className="mt-2 rounded-lg bg-brand-50 p-3 text-sm text-brand-900">
              {MEASUREMENT_TIPS[currentType]}
            </p>
            {latest && (
              <p className="mt-2 text-sm text-slate-500">
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
              className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-lg"
              autoFocus
            />
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={skipStep}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600"
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
                className="flex-1 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white"
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
                    className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span>{MEASUREMENT_LABELS[type as MeasurementType]}</span>
                    <span className="font-semibold">
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
              <span className="text-sm font-medium text-slate-700">
                Note (optional)
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="After illness, new scale, etc."
              />
            </label>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setStepIndex(steps.length - 1)}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600"
              >
                Back
              </button>
              <button
                type="button"
                onClick={saveAll}
                disabled={saving}
                className="flex-1 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
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
