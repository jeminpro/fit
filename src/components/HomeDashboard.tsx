import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { HABIT_KEYS, MEASUREMENT_TIPS } from '../lib/constants';
import {
  todayKey,
  habitScore,
  formatDisplayDate,
  formatDayLabel,
  daysSince,
} from '../lib/dates';
import { subDays, addDays, format, parseISO } from 'date-fns';
import { HabitRow } from './HabitRow';
import { DerivedMetricCard } from './DerivedMetricCard';
import { MetricCard } from './MetricCard';
import { MetricHistory } from './MetricHistory';
import { CheckinWizard } from './CheckinWizard';
import type { MeasurementType } from '../lib/types';
import {
  getLatestByType,
  findMeasurementDaysAgo,
  computeDerivedMetrics,
} from '../lib/derived';
import {
  formatMeasurementValue,
  formatDelta,
  toCanonical,
  unitLabel,
} from '../lib/units';

export function HomeDashboard() {
  const { activeProfile, measurements, habitDaysMap, prefs, addMeasurement } =
    useApp();
  const units = prefs?.units ?? 'metric';
  const today = todayKey();
  const [selectedDay, setSelectedDay] = useState(today);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [showWizard, setShowWizard] = useState(false);
  const [selectedType, setSelectedType] = useState<MeasurementType | null>(null);

  const [weightInput, setWeightInput] = useState('');
  const [weightSaving, setWeightSaving] = useState(false);
  const [weightError, setWeightError] = useState('');

  useEffect(() => {
    setSelectedDay(todayKey());
    setWeightInput('');
    setWeightError('');
  }, [activeProfile?.id]);

  const todayHabits = habitDaysMap.get(today);
  const selectedHabits = habitDaysMap.get(selectedDay);
  const previousDay = format(subDays(parseISO(selectedDay), 1), 'yyyy-MM-dd');
  const previousDayHabits = habitDaysMap.get(previousDay);
  const isToday = selectedDay === today;

  const score = habitScore(todayHabits);
  const completedToday = HABIT_KEYS.filter(
    (k) => todayHabits?.[k] !== undefined,
  ).length;

  const habitsTitle = isToday
    ? "Today's habits"
    : `Habits for ${formatDisplayDate(selectedDay)}`;

  const latestWeight = getLatestByType(measurements, 'weight');
  const weekAgoWeight = findMeasurementDaysAgo(measurements, 'weight', 7);
  const weightDelta =
    latestWeight && weekAgoWeight
      ? latestWeight.value - weekAgoWeight.value
      : null;
  const weightLoggedToday =
    latestWeight !== null && latestWeight.recordedAt.startsWith(today);

  const nudges = useMemo(() => {
    const items: string[] = [];
    const waist = getLatestByType(measurements, 'waist');
    if (!waist) {
      items.push('Log your first waist measurement.');
    } else if (daysSince(waist.recordedAt) >= 7) {
      items.push(
        `Last waist was ${daysSince(waist.recordedAt)} days ago — time for a check-in.`,
      );
    }
    const height = getLatestByType(measurements, 'height');
    if (height && daysSince(height.recordedAt) >= 30) {
      items.push(
        `Height last logged ${daysSince(height.recordedAt)} days ago — update for growth tracking.`,
      );
    }
    return items;
  }, [measurements]);

  const derived = computeDerivedMetrics(
    measurements,
    activeProfile ?? undefined,
  );

  async function logWeight() {
    const parsed = Number(weightInput);
    if (weightInput.trim() === '' || Number.isNaN(parsed) || parsed <= 0) {
      setWeightError('Enter a valid weight.');
      return;
    }
    setWeightSaving(true);
    setWeightError('');
    try {
      await addMeasurement({
        type: 'weight',
        value: toCanonical('weight', parsed, units),
        recordedAt: new Date().toISOString(),
      });
      setWeightInput('');
    } catch (err) {
      setWeightError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setWeightSaving(false);
    }
  }

  function goPrevDay() {
    setSelectedDay(
      format(subDays(parseISO(selectedDay), 1), 'yyyy-MM-dd'),
    );
  }

  function goNextDay() {
    if (isToday) return;
    const next = format(addDays(parseISO(selectedDay), 1), 'yyyy-MM-dd');
    if (next <= today) {
      setSelectedDay(next);
    }
  }

  function openDatePicker() {
    const input = dateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      input.showPicker();
    } else {
      input.click();
    }
  }

  if (!activeProfile) return null;

  const enabled = activeProfile.enabledMeasurements;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Habit score
          </p>
          <p className="mt-1 text-3xl font-bold text-slate-100">
            {score !== null ? `${score}/10` : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {completedToday}/{HABIT_KEYS.length} logged today
          </p>
        </div>
        <div className="card bg-gradient-to-br from-surface-900 to-brand-900/30 p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Weight
            </p>
            {weightLoggedToday && (
              <span
                className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand-400"
                title="Logged today"
                aria-label="Logged today"
              />
            )}
          </div>
          {latestWeight ? (
            <button
              type="button"
              onClick={() => setSelectedType('weight')}
              className="mt-1 cursor-pointer text-left text-3xl font-bold text-slate-100 transition hover:text-brand-300"
            >
              {formatMeasurementValue('weight', latestWeight.value, units)}
            </button>
          ) : (
            <p className="mt-1 text-sm text-slate-400">No weight yet.</p>
          )}
          {weightDelta !== null && (
            <p className="mt-1 text-xs text-slate-500">
              {formatDelta('weight', weightDelta, units)} vs 7 days ago
            </p>
          )}
          <div className="mt-2 flex gap-1.5">
            <div className="relative min-w-0 flex-1">
              <input
                type="number"
                step="0.1"
                min="0"
                inputMode="decimal"
                value={weightInput}
                onChange={(e) => {
                  setWeightInput(e.target.value);
                  if (weightError) setWeightError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void logWeight();
                }}
                placeholder={
                  latestWeight
                    ? `${formatMeasurementValue('weight', latestWeight.value, units).split(' ')[0]}`
                    : 'Log'
                }
                className="input py-2 pr-9 text-sm"
              />
              <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-slate-500">
                {unitLabel('weight', units)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void logWeight()}
              disabled={weightSaving}
              className="btn-primary px-3 py-2 text-sm"
            >
              {weightSaving ? '…' : 'Log'}
            </button>
          </div>
          {weightError && (
            <p className="mt-2 text-xs text-rose-400">{weightError}</p>
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-300">{habitsTitle}</h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={goPrevDay}
              aria-label="Previous day"
              className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition hover:bg-surface-800 hover:text-slate-200"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12.5 15l-5-5 5-5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={openDatePicker}
              className="cursor-pointer rounded-lg px-2 py-1 text-xs font-medium text-slate-300 transition hover:bg-surface-800 hover:text-brand-400"
            >
              {formatDayLabel(selectedDay)}
            </button>
            <input
              ref={dateInputRef}
              type="date"
              value={selectedDay}
              max={today}
              onChange={(e) => {
                if (e.target.value) setSelectedDay(e.target.value);
              }}
              className="pointer-events-none absolute opacity-0"
              tabIndex={-1}
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={goNextDay}
              disabled={isToday}
              aria-label="Next day"
              className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition hover:bg-surface-800 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M7.5 5l5 5-5 5" />
              </svg>
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {HABIT_KEYS.map((key) => (
            <HabitRow
              key={key}
              habitKey={key}
              dayId={selectedDay}
              value={selectedHabits?.[key]}
              previousDayValue={previousDayHabits?.[key]}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-300">Body</h3>
          <button
            type="button"
            onClick={() => setShowWizard(true)}
            className="btn-primary px-3 py-1.5 text-xs"
          >
            Check-in
          </button>
        </div>

        {nudges.length > 0 && (
          <div className="mb-3 space-y-2">
            {nudges.map((nudge) => (
              <div
                key={nudge}
                className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
              >
                {nudge}
              </div>
            ))}
          </div>
        )}

        {derived.length > 0 && (
          <div className="mb-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              Derived metrics
            </p>
            <div className="grid grid-cols-3 gap-2">
              {derived.map((d) => (
                <DerivedMetricCard key={d.key} metric={d} />
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {enabled.map((type) => (
            <MetricCard
              key={type}
              type={type}
              onClick={() => setSelectedType(type)}
            />
          ))}
        </div>
      </section>

      {selectedType && (
        <MetricHistory
          type={selectedType}
          tip={MEASUREMENT_TIPS[selectedType]}
          onClose={() => setSelectedType(null)}
        />
      )}

      {showWizard && (
        <CheckinWizard onClose={() => setShowWizard(false)} />
      )}
    </div>
  );
}
