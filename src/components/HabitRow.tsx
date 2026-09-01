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
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-800">
          {HABIT_LABELS[habitKey]}
        </span>
        {yesterdayValue !== undefined && value === undefined && (
          <button
            type="button"
            onClick={() => setLevel(yesterdayValue)}
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
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
                ? 'bg-brand-600 text-white'
                : level === 1
                  ? 'bg-amber-500 text-white'
                  : 'bg-red-500 text-white'
              : active
                ? 'bg-brand-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200';

          return (
            <button
              key={label}
              type="button"
              disabled={saving}
              onClick={() => setLevel(level)}
              className={`rounded-lg py-2.5 text-sm font-semibold transition ${color} disabled:opacity-60`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
