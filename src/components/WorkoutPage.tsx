import { useEffect, useMemo, useState } from 'react';
import { addDays, addWeeks, format, parseISO, startOfWeek } from 'date-fns';
import { useApp } from '../context/AppContext';
import {
  loadExerciseIndex,
  prefetchExerciseDetails,
  type ExerciseCatalogIndex,
  type ExerciseIndexItem,
} from '../lib/exerciseCatalog';
import { formatDayLabel, todayKey } from '../lib/dates';
import {
  dayProgress,
  daySetCounts,
  emptyLog,
  type DayProgress,
  type WorkoutEntry,
} from '../lib/workoutTypes';
import { WeekStrip } from './WeekStrip';
import { WorkoutExerciseRow } from './WorkoutExerciseRow';
import { ExercisePicker } from './ExercisePicker';
import {
  ExerciseDetailSheet,
  type ExercisePlanDraft,
} from './ExerciseDetailSheet';

function newUid(): string {
  return crypto.randomUUID();
}

function makeEntry(ex: ExerciseIndexItem, draft?: ExercisePlanDraft): WorkoutEntry {
  const sets = draft?.sets ?? 3;
  const reps = draft?.reps ?? 10;
  return {
    uid: newUid(),
    exerciseId: ex.id,
    name: ex.name,
    sets,
    reps,
    weight: draft?.weight,
    log: emptyLog(sets),
  };
}

export function WorkoutPage() {
  const {
    activeProfile,
    prefs,
    workoutDaysMap,
    upsertWorkoutDay,
    pushRecentExercises,
    toggleFavouriteExercise,
  } = useApp();

  const units = prefs?.units ?? 'metric';
  const today = todayKey();

  const [weekStart, setWeekStart] = useState(() =>
    todayKey(startOfWeek(new Date(), { weekStartsOn: 1 })),
  );
  const [selectedDay, setSelectedDay] = useState(today);
  const [catalog, setCatalog] = useState<ExerciseCatalogIndex | null>(null);
  const [catalogError, setCatalogError] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [detailExercise, setDetailExercise] = useState<ExerciseIndexItem | null>(null);
  const [editingEntryUid, setEditingEntryUid] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    void loadExerciseIndex()
      .then((index) => {
        if (cancelled) return;
        setCatalog(index);
        setCatalogError('');
        prefetchExerciseDetails();
      })
      .catch((err) => {
        if (cancelled) return;
        setCatalogError(err instanceof Error ? err.message : 'Failed to load exercises');
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const exerciseById = useMemo(() => {
    const map = new Map<string, ExerciseIndexItem>();
    for (const ex of catalog?.exercises ?? []) map.set(ex.id, ex);
    return map;
  }, [catalog]);

  const day = workoutDaysMap.get(selectedDay) ?? null;
  const entries = day?.entries ?? [];
  const counts = daySetCounts(day);
  const progress = dayProgress(day);

  const progressByDay = useMemo(() => {
    const start = startOfWeek(parseISO(weekStart), { weekStartsOn: 1 });
    const map: Record<string, DayProgress> = {};
    for (let i = 0; i < 7; i++) {
      const key = todayKey(addDays(start, i));
      map[key] = dayProgress(workoutDaysMap.get(key));
    }
    return map;
  }, [weekStart, workoutDaysMap]);

  async function persistEntries(
    nextEntries: WorkoutEntry[],
    extras?: { completedAt?: string | null },
  ) {
    if (!activeProfile) return;
    setSaving(true);
    setSaveError('');
    try {
      const allDone =
        nextEntries.length > 0 &&
        dayProgress({ id: selectedDay, entries: nextEntries }) === 'complete';
      await upsertWorkoutDay(selectedDay, {
        entries: nextEntries,
        completedAt: extras?.completedAt !== undefined
          ? extras.completedAt
          : allDone
            ? new Date().toISOString()
            : null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save workout.';
      const denied =
        message.toLowerCase().includes('permission') ||
        message.toLowerCase().includes('insufficient');
      setSaveError(
        denied
          ? 'Firestore blocked this save. Deploy the updated firestore.rules (they now include workoutDays) from Firebase Console or run firebase deploy --only firestore:rules.'
          : message,
      );
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function addExercises(selected: ExerciseIndexItem[]) {
    try {
      const next = [...entries, ...selected.map((ex) => makeEntry(ex))];
      await persistEntries(next);
      await pushRecentExercises(selected.map((ex) => ex.id));
      setPickerOpen(false);
    } catch {
      setPickerOpen(false);
    }
  }

  async function toggleSet(entryUid: string, setIndex: number) {
    const next = entries.map((entry) => {
      if (entry.uid !== entryUid) return entry;
      const log = entry.log.length > 0 ? [...entry.log] : emptyLog(entry.sets);
      while (log.length <= setIndex) log.push({ done: false });
      const current = log[setIndex]!;
      log[setIndex] = { ...current, done: !current.done };
      return { ...entry, log };
    });
    await persistEntries(next);
  }

  async function removeEntry(entryUid: string) {
    const next = entries.filter((e) => e.uid !== entryUid);
    await persistEntries(next, {
      completedAt: next.length === 0 ? null : undefined,
    });
  }

  async function saveEntryPlan(draft: ExercisePlanDraft) {
    if (!detailExercise) return;

    if (editingEntryUid) {
      const next = entries.map((entry) => {
        if (entry.uid !== editingEntryUid) return entry;
        const prevDone = entry.log.filter((s) => s.done).length;
        const log = emptyLog(draft.sets).map((slot, i) => ({
          ...slot,
          done: i < prevDone,
        }));
        return {
          ...entry,
          sets: draft.sets,
          reps: draft.reps,
          weight: draft.weight,
          log,
        };
      });
      await persistEntries(next);
    } else {
      const next = [...entries, makeEntry(detailExercise, draft)];
      await persistEntries(next);
      await pushRecentExercises([detailExercise.id]);
      setPickerOpen(false);
    }

    setDetailExercise(null);
    setEditingEntryUid(null);
  }

  function openEntryDetail(entry: WorkoutEntry) {
    const catalogItem =
      exerciseById.get(entry.exerciseId) ??
      ({
        id: entry.exerciseId,
        name: entry.name,
        primaryMuscles: [],
        equipment: null,
        category: null,
        level: null,
        hasImages: true,
      } satisfies ExerciseIndexItem);
    setEditingEntryUid(entry.uid);
    setDetailExercise(catalogItem);
  }

  function shiftWeek(delta: number) {
    const nextStart = todayKey(
      addWeeks(startOfWeek(parseISO(weekStart), { weekStartsOn: 1 }), delta),
    );
    setWeekStart(nextStart);
    const selected = parseISO(selectedDay);
    const shifted = todayKey(addWeeks(selected, delta));
    setSelectedDay(shifted);
  }

  if (!activeProfile) {
    return (
      <div className="card p-6 text-center text-sm text-slate-400">
        Create a profile to plan workouts.
      </div>
    );
  }

  const dayLabel = formatDayLabel(selectedDay);
  const favouriteIds = activeProfile.favouriteExerciseIds ?? [];
  const recentIds = activeProfile.recentExerciseIds ?? [];

  let primaryActionLabel = 'Add exercises';
  if (entries.length > 0 && progress === 'empty') primaryActionLabel = 'Add exercises';
  else if (progress === 'planned') primaryActionLabel = 'Start logging sets';
  else if (progress === 'partial') primaryActionLabel = `${counts.done} of ${counts.total} sets`;
  else if (progress === 'complete') primaryActionLabel = 'Completed';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-100">Workout</h2>
        <p className="mt-1 text-sm text-slate-400">
          Plan exercises for any day and tick off sets as you go.
        </p>
      </div>

      <WeekStrip
        weekStart={weekStart}
        selectedDay={selectedDay}
        progressByDay={progressByDay}
        onSelectDay={setSelectedDay}
        onShiftWeek={shiftWeek}
      />

      <section className="card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-100">{dayLabel}</h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {format(parseISO(selectedDay), 'EEEE, MMM d')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-brand-400">
              {counts.done}/{counts.total || 0}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">sets</p>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="btn-primary flex-1 px-3 py-2.5 text-sm"
            onClick={() => setPickerOpen(true)}
            disabled={catalogLoading || Boolean(catalogError)}
          >
            {entries.length === 0 ? 'Add exercises' : 'Add more'}
          </button>
          {entries.length > 0 && progress === 'complete' && (
            <span className="inline-flex items-center rounded-xl border border-brand-500/40 bg-brand-500/10 px-3 text-xs font-semibold text-brand-300">
              Done
            </span>
          )}
        </div>
        {saving && (
          <p className="mt-2 text-xs text-slate-500">Saving…</p>
        )}
        {entries.length > 0 && progress !== 'complete' && (
          <p className="mt-2 text-xs text-slate-500">{primaryActionLabel}</p>
        )}
      </section>

      {(catalogError || saveError) && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {saveError || catalogError}
        </div>
      )}

      {catalogLoading && (
        <p className="text-center text-sm text-slate-500">Loading exercise catalog…</p>
      )}

      {!catalogLoading && entries.length === 0 && (
        <div className="card p-6 text-center">
          <p className="text-sm text-slate-300">No exercises planned for this day.</p>
          <p className="mt-1 text-xs text-slate-500">
            Tap Add exercises to browse the catalog and set sets & reps.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {entries.map((entry) => (
          <WorkoutExerciseRow
            key={entry.uid}
            entry={entry}
            sha={catalog?.sha ?? 'main'}
            units={units}
            primaryMuscle={exerciseById.get(entry.exerciseId)?.primaryMuscles[0]}
            onToggleSet={(setIndex) => void toggleSet(entry.uid, setIndex)}
            onOpenDetail={() => openEntryDetail(entry)}
            onRemove={() => void removeEntry(entry.uid)}
          />
        ))}
      </div>

      {pickerOpen && catalog && (
        <ExercisePicker
          exercises={catalog.exercises}
          sha={catalog.sha}
          favouriteIds={favouriteIds}
          recentIds={recentIds}
          onAdd={(items) => void addExercises(items)}
          onClose={() => setPickerOpen(false)}
          onOpenDetail={(ex) => {
            setEditingEntryUid(null);
            setDetailExercise(ex);
          }}
        />
      )}

      {detailExercise && catalog && (
        <ExerciseDetailSheet
          exercise={detailExercise}
          sha={catalog.sha}
          units={units}
          initial={
            editingEntryUid
              ? (() => {
                  const entry = entries.find((e) => e.uid === editingEntryUid);
                  return entry
                    ? { sets: entry.sets, reps: entry.reps, weight: entry.weight }
                    : undefined;
                })()
              : undefined
          }
          isFavourite={favouriteIds.includes(detailExercise.id)}
          onToggleFavourite={() => void toggleFavouriteExercise(detailExercise.id)}
          onSave={(draft) => void saveEntryPlan(draft)}
          onClose={() => {
            setDetailExercise(null);
            setEditingEntryUid(null);
          }}
          saveLabel={editingEntryUid ? 'Update exercise' : 'Add to day'}
        />
      )}
    </div>
  );
}
