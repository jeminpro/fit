import { useState } from 'react';
import type { ExerciseTemplate, Routine, Weekday, WeeklyPlan } from '../lib/workoutTypes';
import {
  WEEKDAY_LABELS,
  WEEKDAYS,
  emptyWeeklyPlan,
} from '../lib/workoutPlan';

interface WeeklyPlanSheetProps {
  routines: Routine[];
  warmupTemplates: ExerciseTemplate[];
  cooldownTemplates: ExerciseTemplate[];
  weeklyPlan?: WeeklyPlan;
  onSave: (plan: WeeklyPlan) => void;
  onClose: () => void;
}

export function WeeklyPlanSheet({
  routines,
  warmupTemplates,
  cooldownTemplates,
  weeklyPlan,
  onSave,
  onClose,
}: WeeklyPlanSheetProps) {
  const [plan, setPlan] = useState<WeeklyPlan>(
    () => weeklyPlan ?? emptyWeeklyPlan(),
  );

  function setDay(day: Weekday, routineId: string | null) {
    setPlan((prev) => ({ ...prev, [day]: routineId }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-surface-700 bg-surface-900 shadow-2xl shadow-black/50 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-surface-800 px-4 py-3">
          <h2 className="text-lg font-bold text-slate-100">Weekly plan</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-2 py-1 text-sm text-slate-400 transition hover:bg-surface-800 hover:text-slate-200"
          >
            Close
          </button>
        </div>

        <div className="space-y-2 overflow-y-auto px-4 py-4">
          <p className="mb-3 text-sm text-slate-400">
            Assign a routine to each weekday. Empty days stay rest days until you
            plan them. Changing this does not rewrite days you already logged.
          </p>
          {routines.length === 0 && (
            <p className="rounded-xl border border-surface-700 bg-surface-800/60 px-3 py-2 text-sm text-slate-400">
              Save a routine first, then you can repeat it across the week.
            </p>
          )}
          {WEEKDAYS.map((day) => {
            const routineId = plan[day];
            const routine = routines.find((r) => r.id === routineId);
            const warmup = warmupTemplates.find(
              (t) => t.id === routine?.warmupTemplateId,
            );
            const cooldown = cooldownTemplates.find(
              (t) => t.id === routine?.cooldownTemplateId,
            );
            const extras = [warmup?.name, cooldown?.name].filter(Boolean);
            return (
              <label
                key={day}
                className="flex items-center justify-between gap-3 rounded-xl border border-surface-700/60 bg-surface-900/40 px-3 py-2.5"
              >
                <span className="w-10 text-sm font-semibold text-slate-200">
                  {WEEKDAY_LABELS[day]}
                </span>
                <div className="min-w-0 flex-1">
                  <select
                    className="input py-2 text-sm"
                    value={plan[day] ?? ''}
                    onChange={(e) =>
                      setDay(day, e.target.value === '' ? null : e.target.value)
                    }
                  >
                    <option value="">Rest</option>
                    {routines.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  {extras.length > 0 && (
                    <p className="mt-1 truncate text-[11px] text-slate-500">
                      {extras.join(' · ')}
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </div>

        <div className="border-t border-surface-800 px-4 py-3">
          <button
            type="button"
            className="btn-primary w-full px-4 py-2.5 text-sm"
            onClick={() => onSave(plan)}
          >
            Save week plan
          </button>
        </div>
      </div>
    </div>
  );
}
