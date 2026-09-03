import { getISODay, parseISO } from 'date-fns';
import {
  allDayEntries,
  emptyLog,
  type ExerciseTemplate,
  type PlannedExercise,
  type Routine,
  type TemplateKind,
  type Weekday,
  type WeeklyPlan,
  type WorkoutDay,
  type WorkoutEntry,
} from './workoutTypes';

export const WEEKDAY_LABELS = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
] as const;

export const WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export function emptyWeeklyPlan(): WeeklyPlan {
  return { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
}

export function weekdayFromDayKey(dayKey: string): Weekday {
  return (getISODay(parseISO(dayKey)) - 1) as Weekday;
}

export function toPlannedExercise(
  exercise: PlannedExercise | WorkoutEntry,
): PlannedExercise {
  const planned: PlannedExercise = {
    uid: exercise.uid,
    exerciseId: exercise.exerciseId,
    name: exercise.name,
    sets: exercise.sets,
    reps: exercise.reps,
  };
  if (exercise.weight != null) planned.weight = exercise.weight;
  if (exercise.durationSec != null) planned.durationSec = exercise.durationSec;
  if (exercise.restSec != null) planned.restSec = exercise.restSec;
  if (exercise.note) planned.note = exercise.note;
  return planned;
}

export function cloneEntries(
  exercises: Array<PlannedExercise | WorkoutEntry>,
  uidFor?: (exercise: PlannedExercise | WorkoutEntry, index: number) => string,
): WorkoutEntry[] {
  return exercises.map((ex, index) => {
    const entry: WorkoutEntry = {
      uid: uidFor?.(ex, index) ?? crypto.randomUUID(),
      exerciseId: ex.exerciseId,
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      log: emptyLog(ex.sets),
    };
    if (ex.weight != null) entry.weight = ex.weight;
    if (ex.durationSec != null) entry.durationSec = ex.durationSec;
    if (ex.restSec != null) entry.restSec = ex.restSec;
    if (ex.note) entry.note = ex.note;
    return entry;
  });
}

export function findTemplate(
  templates: ExerciseTemplate[] | undefined,
  id: string | undefined | null,
): ExerciseTemplate | undefined {
  if (!id) return undefined;
  return (templates ?? []).find((template) => template.id === id);
}

export function applyRoutineSections(
  dayKey: string,
  routine: Routine,
  warmupTemplates?: ExerciseTemplate[],
  cooldownTemplates?: ExerciseTemplate[],
): Pick<
  WorkoutDay,
  | 'entries'
  | 'warmupEntries'
  | 'cooldownEntries'
  | 'routineId'
  | 'routineName'
  | 'warmupTemplateId'
  | 'warmupTemplateName'
  | 'cooldownTemplateId'
  | 'cooldownTemplateName'
> {
  const next: Pick<
    WorkoutDay,
    | 'entries'
    | 'warmupEntries'
    | 'cooldownEntries'
    | 'routineId'
    | 'routineName'
    | 'warmupTemplateId'
    | 'warmupTemplateName'
    | 'cooldownTemplateId'
    | 'cooldownTemplateName'
  > = {
    entries: cloneEntries(
      routine.exercises,
      (ex, index) => `${dayKey}:${ex.uid}:${index}`,
    ),
    routineId: routine.id,
    routineName: routine.name,
  };

  const warmup = findTemplate(warmupTemplates, routine.warmupTemplateId);
  if (warmup && warmup.exercises.length > 0) {
    next.warmupEntries = cloneEntries(
      warmup.exercises,
      (ex, index) => `${dayKey}:wu:${ex.uid}:${index}`,
    );
    next.warmupTemplateId = warmup.id;
    next.warmupTemplateName = warmup.name;
  }

  const cooldown = findTemplate(cooldownTemplates, routine.cooldownTemplateId);
  if (cooldown && cooldown.exercises.length > 0) {
    next.cooldownEntries = cloneEntries(
      cooldown.exercises,
      (ex, index) => `${dayKey}:cd:${ex.uid}:${index}`,
    );
    next.cooldownTemplateId = cooldown.id;
    next.cooldownTemplateName = cooldown.name;
  }

  return next;
}

export interface ResolvedWorkoutDay {
  day: WorkoutDay | null;
  derived: boolean;
}

export function resolveDay(
  dayKey: string,
  stored: WorkoutDay | undefined,
  routines: Routine[] | undefined,
  weeklyPlan: WeeklyPlan | undefined,
  warmupTemplates?: ExerciseTemplate[],
  cooldownTemplates?: ExerciseTemplate[],
): ResolvedWorkoutDay {
  if (stored) return { day: stored, derived: false };

  const routineId = weeklyPlan?.[weekdayFromDayKey(dayKey)];
  if (!routineId) return { day: null, derived: false };

  const routine = (routines ?? []).find((r) => r.id === routineId);
  if (!routine || routine.exercises.length === 0) {
    return { day: null, derived: false };
  }

  return {
    day: {
      id: dayKey,
      ...applyRoutineSections(dayKey, routine, warmupTemplates, cooldownTemplates),
    },
    derived: true,
  };
}

export function recentWorkoutDays(
  map: Map<string, WorkoutDay>,
  beforeKey: string,
  limit = 8,
): WorkoutDay[] {
  return [...map.values()]
    .filter((d) => d.id < beforeKey && allDayEntries(d).length > 0)
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, limit);
}

export function clearRoutineFromPlan(
  plan: WeeklyPlan | undefined,
  routineId: string,
): WeeklyPlan {
  const next = { ...(plan ?? emptyWeeklyPlan()) };
  for (const day of WEEKDAYS) {
    if (next[day] === routineId) next[day] = null;
  }
  return next;
}

export function clearTemplateFromRoutines(
  routines: Routine[],
  templateId: string,
  kind: TemplateKind,
): Routine[] {
  return routines.map((routine) => {
    if (kind === 'warmup' && routine.warmupTemplateId === templateId) {
      const next = { ...routine };
      delete next.warmupTemplateId;
      return next;
    }
    if (kind === 'cooldown' && routine.cooldownTemplateId === templateId) {
      const next = { ...routine };
      delete next.cooldownTemplateId;
      return next;
    }
    return routine;
  });
}

export function templateLabel(kind: TemplateKind): string {
  return kind === 'warmup' ? 'Warm up' : 'Cool down';
}

export function templateNameSuffix(kind: TemplateKind): string {
  return kind === 'warmup' ? 'warmup' : 'cool down';
}
