import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { HABIT_KEYS } from '../lib/constants';
import { todayKey, habitScore, computeHabitStreak } from '../lib/dates';
import { subDays, format } from 'date-fns';
import { HabitRow } from './HabitRow';
import { DerivedMetricCard } from './DerivedMetricCard';
import {
  getLatestByType,
  findMeasurementDaysAgo,
  computeDerivedMetrics,
} from '../lib/derived';
import { formatMeasurementValue, formatDelta } from '../lib/units';
import { daysSince } from '../lib/dates';

const base = import.meta.env.BASE_URL;

export function TodayDashboard() {
  const { activeProfile, measurements, habitDaysMap, prefs } = useApp();
  const units = prefs?.units ?? 'metric';
  const today = todayKey();
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const todayHabits = habitDaysMap.get(today);
  const yesterdayHabits = habitDaysMap.get(yesterday);

  const score = habitScore(todayHabits);
  const streak = computeHabitStreak(habitDaysMap);
  const completedToday = HABIT_KEYS.filter(
    (k) => todayHabits?.[k] !== undefined,
  ).length;

  const latestWeight = getLatestByType(measurements, 'weight');
  const weekAgoWeight = findMeasurementDaysAgo(measurements, 'weight', 7);
  const weightDelta =
    latestWeight && weekAgoWeight
      ? latestWeight.value - weekAgoWeight.value
      : null;

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

  if (!activeProfile) return null;

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
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Streak
          </p>
          <p className="mt-1 text-3xl font-bold text-brand-400">{streak}</p>
          <p className="mt-1 text-xs text-slate-500">days in a row</p>
        </div>
      </section>

      {latestWeight && (
        <section className="card bg-gradient-to-br from-surface-900 to-brand-900/30 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Latest weight
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-100">
                {formatMeasurementValue('weight', latestWeight.value, units)}
              </p>
              {weightDelta !== null && (
                <p className="mt-1 text-sm text-slate-400">
                  {formatDelta('weight', weightDelta, units)} vs 7 days ago
                </p>
              )}
            </div>
            <a
              href={`${base}body`}
              className="btn-primary px-3 py-1.5 text-xs"
            >
              Log measure
            </a>
          </div>
        </section>
      )}

      {!latestWeight && (
        <section className="rounded-2xl border border-dashed border-surface-700 bg-surface-900/50 p-4 text-center">
          <p className="text-sm text-slate-400">No weight logged yet.</p>
          <a
            href={`${base}body`}
            className="mt-2 inline-block text-sm font-semibold text-brand-400 transition hover:text-brand-300"
          >
            Start a body check-in →
          </a>
        </section>
      )}

      {derived.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-300">
            Derived metrics
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {derived.map((d) => (
              <DerivedMetricCard key={d.key} metric={d} />
            ))}
          </div>
        </section>
      )}

      {nudges.length > 0 && (
        <section className="space-y-2">
          {nudges.map((nudge) => (
            <div
              key={nudge}
              className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
            >
              {nudge}
            </div>
          ))}
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300">
            Today&apos;s habits
          </h3>
          <span className="text-xs text-slate-500">{today}</span>
        </div>
        <div className="space-y-3">
          {HABIT_KEYS.map((key) => (
            <HabitRow
              key={key}
              habitKey={key}
              value={todayHabits?.[key]}
              yesterdayValue={yesterdayHabits?.[key]}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
