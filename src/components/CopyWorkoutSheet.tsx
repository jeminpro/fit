import { format, parseISO } from 'date-fns';
import type { WorkoutDay } from '../lib/workoutTypes';
import { formatDayLabel } from '../lib/dates';

interface CopyWorkoutSheetProps {
  days: WorkoutDay[];
  onCopy: (day: WorkoutDay) => void;
  onClose: () => void;
}

export function CopyWorkoutSheet({ days, onCopy, onClose }: CopyWorkoutSheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-surface-700 bg-surface-900 shadow-2xl shadow-black/50 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-surface-800 px-4 py-3">
          <h2 className="text-lg font-bold text-slate-100">Copy a previous day</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-2 py-1 text-sm text-slate-400 transition hover:bg-surface-800 hover:text-slate-200"
          >
            Close
          </button>
        </div>
        <div className="space-y-2 overflow-y-auto px-4 py-3">
          {days.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No previous workouts to copy yet.
            </p>
          ) : (
            days.map((day, index) => (
              <button
                key={day.id}
                type="button"
                onClick={() => onCopy(day)}
                className="card-interactive w-full px-3 py-3 text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">
                      {index === 0 ? 'Copy last' : formatDayLabel(day.id)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {format(parseISO(day.id), 'EEE, MMM d')}
                      {day.routineName ? ` · ${day.routineName}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {day.entries.length} exercise{day.entries.length === 1 ? '' : 's'}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
