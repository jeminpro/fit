import { exerciseImageUrl, formatLabel } from '../lib/exerciseCatalog';
import { fromCanonical, unitLabel } from '../lib/units';
import type { UnitSystem } from '../lib/types';
import type { WorkoutEntry } from '../lib/workoutTypes';
import { emptyLog } from '../lib/workoutTypes';
import type { DragHandleProps } from './ReorderableList';

interface WorkoutExerciseRowProps {
  entry: WorkoutEntry;
  sha: string;
  units: UnitSystem;
  primaryMuscle?: string;
  dragHandleProps?: DragHandleProps;
  onToggleSet: (setIndex: number) => void;
  onOpenDetail: () => void;
  onRemove: () => void;
}

export function WorkoutExerciseRow({
  entry,
  sha,
  units,
  primaryMuscle,
  dragHandleProps,
  onToggleSet,
  onOpenDetail,
  onRemove,
}: WorkoutExerciseRowProps) {
  const slots = entry.log.length > 0 ? entry.log : emptyLog(entry.sets);
  const durationLabel =
    entry.durationSec != null ? ` · ${entry.durationSec}s` : '';
  const weightLabel =
    entry.weight != null
      ? ` · ${fromCanonical('weight', entry.weight, units)} ${unitLabel('weight', units)}`
      : '';

  return (
    <div className={`card p-3 ${entry.skipped ? 'opacity-50' : ''}`}>
      <div className="flex gap-2 sm:gap-3">
        {dragHandleProps && (
          <button
            type="button"
            className="flex h-11 w-8 shrink-0 cursor-grab touch-none items-center justify-center self-center rounded-md text-slate-500 transition hover:bg-surface-800 hover:text-slate-300 active:cursor-grabbing"
            {...dragHandleProps}
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
              <circle cx="7" cy="5" r="1.6" fill="currentColor" />
              <circle cx="13" cy="5" r="1.6" fill="currentColor" />
              <circle cx="7" cy="10" r="1.6" fill="currentColor" />
              <circle cx="13" cy="10" r="1.6" fill="currentColor" />
              <circle cx="7" cy="15" r="1.6" fill="currentColor" />
              <circle cx="13" cy="15" r="1.6" fill="currentColor" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={onOpenDetail}
          className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-surface-700 bg-surface-800"
        >
          <img
            src={exerciseImageUrl(sha, entry.exerciseId, 0)}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={onOpenDetail}
              className="min-w-0 text-left"
            >
              <p className="truncate text-sm font-semibold text-slate-100">
                {entry.name}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {entry.sets} × {entry.reps}
                {durationLabel}
                {weightLabel}
              </p>
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="cursor-pointer rounded-md px-1.5 py-0.5 text-xs text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"
              aria-label={`Remove ${entry.name}`}
            >
              ✕
            </button>
          </div>

          {primaryMuscle && (
            <span className="mt-1.5 inline-block rounded-full border border-surface-700 bg-surface-800/80 px-2 py-0.5 text-[10px] text-slate-400">
              {formatLabel(primaryMuscle)}
            </span>
          )}

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {slots.map((slot, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onToggleSet(index)}
                className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-xs font-semibold transition ${
                  slot.done
                    ? 'border border-brand-500/60 bg-brand-500/15 text-brand-300'
                    : 'border border-surface-700 bg-surface-900/60 text-slate-400 hover:border-slate-500'
                }`}
                aria-pressed={slot.done}
                aria-label={`Set ${index + 1}${slot.done ? ' done' : ''}`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
