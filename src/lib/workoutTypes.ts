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
  warmupEntries?: WorkoutEntry[];
  cooldownEntries?: WorkoutEntry[];
  completedAt?: string;
  note?: string;
  routineId?: string;
  routineName?: string;
  warmupTemplateId?: string;
  warmupTemplateName?: string;
  cooldownTemplateId?: string;
  cooldownTemplateName?: string;
}

export interface WorkoutDayInput {
  entries?: WorkoutEntry[];
  warmupEntries?: WorkoutEntry[];
  cooldownEntries?: WorkoutEntry[];
  completedAt?: string | null;
  note?: string | null;
  routineId?: string | null;
  routineName?: string | null;
  warmupTemplateId?: string | null;
  warmupTemplateName?: string | null;
  cooldownTemplateId?: string | null;
  cooldownTemplateName?: string | null;
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ExerciseTemplate {
  id: string;
  name: string;
  exercises: PlannedExercise[];
}

export interface Routine extends ExerciseTemplate {
  warmupTemplateId?: string;
  cooldownTemplateId?: string;
}

export type TemplateKind = 'warmup' | 'cooldown';

export type DaySection = 'main' | 'warmup' | 'cooldown';

export type WeeklyPlan = Record<Weekday, string | null>;

export const MAX_ROUTINES = 20;
export const MAX_TEMPLATES = 20;

export type DayProgress = 'empty' | 'planned' | 'partial' | 'complete';

export function emptyLog(sets: number): LoggedSet[] {
  return Array.from({ length: Math.max(1, sets) }, () => ({ done: false }));
}

export function allDayEntries(day: WorkoutDay | null | undefined): WorkoutEntry[] {
  if (!day) return [];
  return [
    ...(day.warmupEntries ?? []),
    ...day.entries,
    ...(day.cooldownEntries ?? []),
  ];
}

export function sectionEntries(
  day: WorkoutDay | null | undefined,
  section: DaySection,
): WorkoutEntry[] {
  if (!day) return [];
  if (section === 'warmup') return day.warmupEntries ?? [];
  if (section === 'cooldown') return day.cooldownEntries ?? [];
  return day.entries;
}

export function dayHasExercises(day: WorkoutDay | null | undefined): boolean {
  return allDayEntries(day).length > 0;
}

export function dayProgress(day: WorkoutDay | null | undefined): DayProgress {
  const entries = allDayEntries(day);
  if (entries.length === 0) return 'empty';
  const active = entries.filter((e) => !e.skipped);
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
  for (const entry of allDayEntries(day)) {
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
  if (input.warmupEntries !== undefined) {
    next.warmupEntries = input.warmupEntries.map(sanitizeWorkoutEntry);
  }
  if (input.cooldownEntries !== undefined) {
    next.cooldownEntries = input.cooldownEntries.map(sanitizeWorkoutEntry);
  }
  if (input.completedAt !== undefined) next.completedAt = input.completedAt;
  if (input.note !== undefined) next.note = input.note;
  if (input.routineId !== undefined) next.routineId = input.routineId;
  if (input.routineName !== undefined) next.routineName = input.routineName;
  if (input.warmupTemplateId !== undefined) next.warmupTemplateId = input.warmupTemplateId;
  if (input.warmupTemplateName !== undefined) {
    next.warmupTemplateName = input.warmupTemplateName;
  }
  if (input.cooldownTemplateId !== undefined) {
    next.cooldownTemplateId = input.cooldownTemplateId;
  }
  if (input.cooldownTemplateName !== undefined) {
    next.cooldownTemplateName = input.cooldownTemplateName;
  }
  return next;
}
