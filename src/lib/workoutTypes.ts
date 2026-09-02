export interface PlannedExercise {
  uid: string;
  exerciseId: string;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  durationSec?: number;
  restSec?: number;
  note?: string;
}

export interface LoggedSet {
  done: boolean;
  reps?: number;
  weight?: number;
  durationSec?: number;
}

export interface WorkoutEntry extends PlannedExercise {
  log: LoggedSet[];
  skipped?: boolean;
}

export interface WorkoutDay {
  id: string;
  entries: WorkoutEntry[];
  completedAt?: string;
  note?: string;
  routineId?: string;
  routineName?: string;
}

export interface WorkoutDayInput {
  entries?: WorkoutEntry[];
  completedAt?: string | null;
  note?: string | null;
  routineId?: string | null;
  routineName?: string | null;
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Routine {
  id: string;
  name: string;
  exercises: PlannedExercise[];
}

export type WeeklyPlan = Record<Weekday, string | null>;

export const MAX_ROUTINES = 20;

export type DayProgress = 'empty' | 'planned' | 'partial' | 'complete';

export function emptyLog(sets: number): LoggedSet[] {
  return Array.from({ length: Math.max(1, sets) }, () => ({ done: false }));
}

export function dayProgress(day: WorkoutDay | null | undefined): DayProgress {
  if (!day || day.entries.length === 0) return 'empty';
  const active = day.entries.filter((e) => !e.skipped);
  if (active.length === 0) return 'empty';

  let total = 0;
  let done = 0;
  for (const entry of active) {
    const slots = entry.log.length > 0 ? entry.log : emptyLog(entry.sets);
    total += slots.length;
    done += slots.filter((s) => s.done).length;
  }

  if (total === 0) return 'planned';
  if (done === 0) return 'planned';
  if (done >= total) return 'complete';
  return 'partial';
}

export function daySetCounts(day: WorkoutDay | null | undefined): {
  done: number;
  total: number;
} {
  if (!day) return { done: 0, total: 0 };
  let total = 0;
  let done = 0;
  for (const entry of day.entries) {
    if (entry.skipped) continue;
    const slots = entry.log.length > 0 ? entry.log : emptyLog(entry.sets);
    total += slots.length;
    done += slots.filter((s) => s.done).length;
  }
  return { done, total };
}

function cleanLoggedSet(set: LoggedSet): LoggedSet {
  const next: LoggedSet = { done: Boolean(set.done) };
  if (set.reps != null) next.reps = set.reps;
  if (set.weight != null) next.weight = set.weight;
  if (set.durationSec != null) next.durationSec = set.durationSec;
  return next;
}

export function sanitizeWorkoutEntry(entry: WorkoutEntry): WorkoutEntry {
  const next: WorkoutEntry = {
    uid: entry.uid,
    exerciseId: entry.exerciseId,
    name: entry.name,
    sets: entry.sets,
    reps: entry.reps,
    log: (entry.log ?? []).map(cleanLoggedSet),
  };
  if (entry.weight != null) next.weight = entry.weight;
  if (entry.durationSec != null) next.durationSec = entry.durationSec;
  if (entry.restSec != null) next.restSec = entry.restSec;
  if (entry.note) next.note = entry.note;
  if (entry.skipped) next.skipped = true;
  return next;
}

export function sanitizeWorkoutDayInput(input: WorkoutDayInput): WorkoutDayInput {
  const next: WorkoutDayInput = {};
  if (input.entries !== undefined) {
    next.entries = input.entries.map(sanitizeWorkoutEntry);
  }
  if (input.completedAt !== undefined) next.completedAt = input.completedAt;
  if (input.note !== undefined) next.note = input.note;
  if (input.routineId !== undefined) next.routineId = input.routineId;
  if (input.routineName !== undefined) next.routineName = input.routineName;
  return next;
}
