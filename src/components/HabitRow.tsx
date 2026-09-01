import { useState } from 'react';
import type { HabitKey, HabitLevel } from '../lib/types';
import { HABIT_LABELS, HABIT_LEVEL_LABELS } from '../lib/constants';
import { useApp } from '../context/AppContext';
import { todayKey } from '../lib/dates';

interface HabitRowProps {
  habitKey: HabitKey;
  value?: HabitLevel;
  yesterdayValue?: HabitLevel;
}

export function HabitRow({ habitKey, value, yesterdayValue }: HabitRowProps) {
  const { activeProfile, upsertHabitDay } = useApp();
  const [saving, setSaving] = useState(false);
  const dayId = todayKey();

  async function setLevel(level: HabitLevel) {
    if (!activeProfile || saving) return;
    setSaving(true);
    try {
      await upsertHabitDay(dayId, {
        [habitKey]: level,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-200">
          {HABIT_LABELS[habitKey]}
        </span>
        {yesterdayValue !== undefined && value === undefined && (
          <button
            type="button"
            onClick={() => setLevel(yesterdayValue)}
            className="cursor-pointer text-xs font-medium text-brand-400 transition hover:text-brand-300"
          >
            Same as yesterday
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {HABIT_LEVEL_LABELS.map((label, index) => {
          const level = index as HabitLevel;
          const active = value === level;
          const isSnacks = habitKey === 'snacks';
          const color =
            active && isSnacks
              ? level === 0
                ? 'bg-brand-500 text-surface-950 shadow-lg shadow-brand-500/25'
                : level === 1
                  ? 'bg-amber-500 text-surface-950 shadow-lg shadow-amber-500/25'
                  : 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
              : active
                ? 'bg-brand-500 text-surface-950 shadow-lg shadow-brand-500/25'
                : 'bg-surface-800 text-slate-300 hover:bg-surface-700 hover:text-slate-100';

          return (
            <button
              key={label}
              type="button"
              disabled={saving}
              onClick={() => setLevel(level)}
              className={`cursor-pointer rounded-lg py-2.5 text-sm font-semibold transition active:scale-[0.97] ${color} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
