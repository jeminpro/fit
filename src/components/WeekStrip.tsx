import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import type { DayProgress } from '../lib/workoutTypes';
import { todayKey } from '../lib/dates';

interface WeekStripProps {
  weekStart: string;
  selectedDay: string;
  progressByDay: Record<string, DayProgress>;
  onSelectDay: (dayKey: string) => void;
  onShiftWeek: (delta: number) => void;
}

function progressClass(progress: DayProgress, selected: boolean, isToday: boolean) {
  const base =
    'flex h-11 w-9 flex-col items-center justify-center rounded-xl text-xs font-medium transition';
  if (selected) {
    return `${base} border border-brand-500/60 bg-brand-500/15 text-brand-300`;
  }
  switch (progress) {
    case 'complete':
      return `${base} border border-brand-500/40 bg-brand-500/20 text-brand-300`;
    case 'partial':
      return `${base} border border-brand-500/30 bg-gradient-to-b from-brand-500/25 to-transparent text-brand-200`;
    case 'planned':
      return `${base} border border-brand-500/40 bg-transparent text-slate-200`;
    default:
      return `${base} border border-dashed border-surface-700 text-slate-500 hover:border-slate-500 ${
        isToday ? 'text-slate-300' : ''
      }`;
  }
}

export function WeekStrip({
  weekStart,
  selectedDay,
  progressByDay,
  onSelectDay,
  onShiftWeek,
}: WeekStripProps) {
  const start = startOfWeek(parseISO(weekStart), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    return {
      key: todayKey(date),
      label: format(date, 'EEE'),
      dayNum: format(date, 'd'),
    };
  });
  const today = todayKey();

  return (
    <div className="card p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          className="btn-secondary px-2.5 py-1.5 text-xs"
          onClick={() => onShiftWeek(-1)}
          aria-label="Previous week"
        >
          ←
        </button>
        <p className="text-xs font-medium text-slate-400">
          {format(start, 'MMM d')} – {format(addDays(start, 6), 'MMM d')}
        </p>
        <button
          type="button"
          className="btn-secondary px-2.5 py-1.5 text-xs"
          onClick={() => onShiftWeek(1)}
          aria-label="Next week"
        >
          →
        </button>
      </div>
      <div className="flex justify-between gap-1">
        {days.map((day) => (
          <button
            key={day.key}
            type="button"
            onClick={() => onSelectDay(day.key)}
            className={progressClass(
              progressByDay[day.key] ?? 'empty',
              day.key === selectedDay,
              day.key === today,
            )}
          >
            <span className="text-[10px] uppercase tracking-wide opacity-80">
              {day.label}
            </span>
            <span className="text-sm font-semibold">{day.dayNum}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
