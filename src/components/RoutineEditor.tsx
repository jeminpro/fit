import { useEffect, useMemo, useRef, useState } from 'react';
import { formatLabel, type ExerciseIndexItem } from '../lib/exerciseCatalog';
import { fromCanonical, unitLabel } from '../lib/units';
import type { UnitSystem } from '../lib/types';
import type { ExerciseTemplate, PlannedExercise, Routine } from '../lib/workoutTypes';
import { ExercisePicker } from './ExercisePicker';
import {
  ExerciseDetailSheet,
  type ExercisePlanDraft,
} from './ExerciseDetailSheet';
import { ReorderableList } from './ReorderableList';
import { TemplateSelect } from './RoutineSheet';

interface RoutineEditorProps {
  routine: Routine;
  warmupTemplates: ExerciseTemplate[];
  cooldownTemplates: ExerciseTemplate[];
  exercises: ExerciseIndexItem[];
  sha: string;
  units: UnitSystem;
  favouriteIds: string[];
  recentIds: string[];
  notes: Record<string, string>;
  catalogLoading: boolean;
  onChange: (routine: Routine) => void;
  onCreateCustom: (name: string) => Promise<ExerciseIndexItem>;
  onClose: () => void;
}

function newUid(): string {
  return crypto.randomUUID();
}

function makePlanned(
  ex: ExerciseIndexItem,
  draft?: ExercisePlanDraft,
): PlannedExercise {
  const planned: PlannedExercise = {
    uid: newUid(),
    exerciseId: ex.id,
    name: ex.name,
    sets: draft?.sets ?? 3,
    reps: draft?.reps ?? 10,
  };
  if (draft?.weight != null) planned.weight = draft.weight;
  if (draft?.durationSec != null) planned.durationSec = draft.durationSec;
  return planned;
}

function applyDraft(
  exercise: PlannedExercise,
  draft: ExercisePlanDraft,
): PlannedExercise {
  const next: PlannedExercise = {
    ...exercise,
    sets: draft.sets,
    reps: draft.reps,
  };
  if (draft.weight != null) next.weight = draft.weight;
  else delete next.weight;
  if (draft.durationSec != null) next.durationSec = draft.durationSec;
  else delete next.durationSec;
  return next;
}

export function RoutineEditor({
  routine,
  warmupTemplates,
  cooldownTemplates,
  exercises,
  sha,
  units,
  favouriteIds,
  recentIds,
  notes,
  catalogLoading,
  onChange,
  onCreateCustom,
  onClose,
}: RoutineEditorProps) {
  const [draft, setDraft] = useState(routine);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const [name, setName] = useState(routine.name);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [detailExercise, setDetailExercise] = useState<ExerciseIndexItem | null>(
    null,
  );
  const [editingUid, setEditingUid] = useState<string | null>(null);

  useEffect(() => {
    draftRef.current = routine;
    setDraft(routine);
    setName(routine.name);
  }, [routine.id]);

  const exerciseById = useMemo(() => {
    const map = new Map<string, ExerciseIndexItem>();
    for (const ex of exercises) map.set(ex.id, ex);
    return map;
  }, [exercises]);

  const editingEntry = editingUid
    ? draft.exercises.find((ex) => ex.uid === editingUid)
    : undefined;

  function commit(updater: (prev: Routine) => Routine) {
    const next = updater(draftRef.current);
    if (next === draftRef.current) return;
    draftRef.current = next;
    setDraft(next);
    onChange(next);
  }

  function commitName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === draft.name) {
      setName(draft.name);
      return;
    }
    commit((prev) => ({ ...prev, name: trimmed }));
  }

  function setLinks(warmupTemplateId: string, cooldownTemplateId: string) {
    commit((prev) => {
      const next: Routine = { ...prev };
      if (warmupTemplateId) next.warmupTemplateId = warmupTemplateId;
      else delete next.warmupTemplateId;
      if (cooldownTemplateId) next.cooldownTemplateId = cooldownTemplateId;
      else delete next.cooldownTemplateId;
      return next;
    });
  }

  function addExercises(selected: ExerciseIndexItem[], plan?: ExercisePlanDraft) {
    commit((prev) => ({
      ...prev,
      exercises: [
        ...prev.exercises,
        ...selected.map((ex) => makePlanned(ex, plan)),
      ],
    }));
  }

  function removeByExerciseId(exerciseId: string) {
    commit((prev) => {
      const exercises = prev.exercises.filter((ex) => ex.exerciseId !== exerciseId);
      if (exercises.length === prev.exercises.length) return prev;
      return { ...prev, exercises };
    });
  }

  function removeByUid(uid: string) {
    commit((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((ex) => ex.uid !== uid),
    }));
  }

  function savePlan(plan: ExercisePlanDraft) {
    if (!detailExercise) return;
    if (editingUid) {
      commit((prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.uid === editingUid ? applyDraft(ex, plan) : ex,
        ),
      }));
    } else {
      addExercises([detailExercise], plan);
    }
    setDetailExercise(null);
    setEditingUid(null);
  }

  function openEntryDetail(exercise: PlannedExercise) {
    const catalogItem =
      exerciseById.get(exercise.exerciseId) ??
      ({
        id: exercise.exerciseId,
        name: exercise.name,
        primaryMuscles: [],
        equipment: null,
        category: null,
        level: null,
        hasImages: false,
      } satisfies ExerciseIndexItem);
    setEditingUid(exercise.uid);
    setDetailExercise(catalogItem);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-surface-700 bg-surface-900 shadow-2xl shadow-black/50 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-surface-800 px-4 py-3">
          <h2 className="text-lg font-bold text-slate-100">Edit routine</h2>
          <button
            type="button"
            onClick={() => {
              commitName();
              onClose();
            }}
            className="cursor-pointer rounded-lg px-2 py-1 text-sm text-slate-400 transition hover:bg-surface-800 hover:text-slate-200"
          >
            Done
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Name
            </span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
            />
          </label>

          <div className="flex flex-col gap-1.5 sm:flex-row">
            <TemplateSelect
              label="No warmup"
              value={draft.warmupTemplateId ?? ''}
              templates={warmupTemplates}
              onChange={(id) => setLinks(id, draft.cooldownTemplateId ?? '')}
            />
            <TemplateSelect
              label="No cool down"
              value={draft.cooldownTemplateId ?? ''}
              templates={cooldownTemplates}
              onChange={(id) => setLinks(draft.warmupTemplateId ?? '', id)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Exercises
              </p>
              <button
                type="button"
                className="btn-secondary px-3 py-1.5 text-xs"
                onClick={() => setPickerOpen(true)}
                disabled={catalogLoading}
              >
                {draft.exercises.length > 0 ? 'Add or remove' : 'Add exercises'}
              </button>
            </div>

            {draft.exercises.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No exercises in this routine yet.
              </p>
            ) : (
              <ReorderableList
                items={draft.exercises}
                getKey={(exercise) => exercise.uid}
                onReorder={(exercises) => commit((prev) => ({ ...prev, exercises }))}
                renderItem={(exercise, dragHandleProps) => {
                  const catalogItem = exerciseById.get(exercise.exerciseId);
                  const durationLabel =
                    exercise.durationSec != null
                      ? ` · ${exercise.durationSec}s`
                      : '';
                  const weightLabel =
                    exercise.weight != null
                      ? ` · ${fromCanonical('weight', exercise.weight, units)} ${unitLabel('weight', units)}`
                      : '';
                  return (
                    <div className="flex items-center gap-2 rounded-xl border border-surface-700/60 bg-surface-900/40 px-2 py-2">
                      <button
                        type="button"
                        className={`flex h-11 w-8 shrink-0 touch-none items-center justify-center rounded-md transition ${
                          dragHandleProps['aria-grabbed']
                            ? 'bg-brand-500/20 text-brand-300'
                            : 'text-slate-500 hover:bg-surface-800 hover:text-slate-300'
                        }`}
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
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => openEntryDetail(exercise)}
                      >
                        <p className="truncate text-sm font-medium text-slate-100">
                          {exercise.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {exercise.sets} × {exercise.reps}
                          {durationLabel}
                          {weightLabel}
                          {catalogItem?.primaryMuscles[0]
                            ? ` · ${formatLabel(catalogItem.primaryMuscles[0])}`
                            : ''}
                        </p>
                      </button>
                      <button
                        type="button"
                        className="cursor-pointer rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"
                        onClick={() => removeByUid(exercise.uid)}
                        aria-label={`Remove ${exercise.name}`}
                      >
                        Remove
                      </button>
                    </div>
                  );
                }}
              />
            )}
            <p className="text-xs text-slate-500">
              Changes update this routine. Days you already logged keep their
              current exercises.
            </p>
          </div>
        </div>
      </div>

      {pickerOpen && (
        <ExercisePicker
          title="Edit routine exercises"
          overlayClassName="z-[55]"
          exercises={exercises}
          sha={sha}
          favouriteIds={favouriteIds}
          recentIds={recentIds}
          addedIds={draft.exercises.map((ex) => ex.exerciseId)}
          notes={notes}
          onAdd={(item) => addExercises([item])}
          onRemove={(item) => removeByExerciseId(item.id)}
          onCreateCustom={onCreateCustom}
          onClose={() => setPickerOpen(false)}
          onOpenDetail={(ex) => {
            setEditingUid(null);
            setDetailExercise(ex);
          }}
        />
      )}

      {detailExercise && (
        <ExerciseDetailSheet
          exercise={detailExercise}
          sha={sha}
          units={units}
          initial={
            editingEntry
              ? {
                  sets: editingEntry.sets,
                  reps: editingEntry.reps,
                  durationSec: editingEntry.durationSec,
                  weight: editingEntry.weight,
                }
              : undefined
          }
          isFavourite={favouriteIds.includes(detailExercise.id)}
          note={notes[detailExercise.id]}
          onSave={(plan) => savePlan(plan)}
          onClose={() => {
            setDetailExercise(null);
            setEditingUid(null);
          }}
          saveLabel={editingUid ? 'Update exercise' : 'Add to routine'}
        />
      )}
    </div>
  );
}
