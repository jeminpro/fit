import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { ExerciseIndexItem } from '../lib/exerciseCatalog';
import type { UnitSystem } from '../lib/types';
import {
  MAX_ROUTINES,
  MAX_TEMPLATES,
  type ExerciseTemplate,
  type Routine,
} from '../lib/workoutTypes';
import {
  clearRoutineFromPlan,
  clearTemplateFromRoutines,
} from '../lib/workoutPlan';
import {
  RoutineEditor,
  type TemplateEditorKind,
} from './RoutineEditor';

interface TemplatesPageProps {
  routines: Routine[];
  warmupTemplates: ExerciseTemplate[];
  cooldownTemplates: ExerciseTemplate[];
  exercises: ExerciseIndexItem[];
  sha: string;
  units: UnitSystem;
  favouriteIds: string[];
  recentIds: string[];
  notes: Record<string, string>;
  catalogLoading: boolean;
  onCreateCustom: (name: string) => Promise<ExerciseIndexItem>;
}

function newUid(): string {
  return crypto.randomUUID();
}

function capFor(kind: TemplateEditorKind): number {
  return kind === 'routine' ? MAX_ROUTINES : MAX_TEMPLATES;
}

function sectionTitle(kind: TemplateEditorKind): string {
  if (kind === 'warmup') return 'Warm ups';
  if (kind === 'cooldown') return 'Cool downs';
  return 'Routines';
}

function kindNoun(kind: TemplateEditorKind): string {
  if (kind === 'warmup') return 'warmup';
  if (kind === 'cooldown') return 'cool down';
  return 'routine';
}

function addPlaceholder(kind: TemplateEditorKind): string {
  if (kind === 'warmup') return 'Name, e.g. Dynamic stretch';
  if (kind === 'cooldown') return 'Name, e.g. Full body stretch';
  return 'Name, e.g. Push';
}

function emptyCopy(kind: TemplateEditorKind): string {
  if (kind === 'routine') {
    return 'No routines yet. Add one to reuse it in the week plan.';
  }
  return `No ${kindNoun(kind)} templates yet. Add one to reuse it with routines and days.`;
}

function exerciseCountLabel(count: number): string {
  return `${count} exercise${count === 1 ? '' : 's'}`;
}

function routineSummary(
  routine: Routine,
  warmupTemplates: ExerciseTemplate[],
  cooldownTemplates: ExerciseTemplate[],
): string {
  const parts = [exerciseCountLabel(routine.exercises.length)];
  const warmup = warmupTemplates.find((t) => t.id === routine.warmupTemplateId);
  const cooldown = cooldownTemplates.find((t) => t.id === routine.cooldownTemplateId);
  if (warmup) parts.push(warmup.name);
  if (cooldown) parts.push(cooldown.name);
  return parts.join(' · ');
}

function upsertById<T extends { id: string }>(list: T[], next: T, cap: number): T[] {
  const index = list.findIndex((item) => item.id === next.id);
  if (index === -1) return [next, ...list].slice(0, cap);
  return list.map((item) => (item.id === next.id ? next : item));
}

export function TemplatesPage({
  routines,
  warmupTemplates,
  cooldownTemplates,
  exercises,
  sha,
  units,
  favouriteIds,
  recentIds,
  notes,
  catalogLoading,
  onCreateCustom,
}: TemplatesPageProps) {
  const {
    saveRoutines,
    saveWeeklyPlan,
    saveWarmupTemplates,
    saveCooldownTemplates,
    setExerciseNote,
    activeProfile,
  } = useApp();

  const weeklyPlan = activeProfile?.weeklyPlan;
  const routinesRef = useRef(routines);
  routinesRef.current = routines;
  const warmupRef = useRef(warmupTemplates);
  warmupRef.current = warmupTemplates;
  const cooldownRef = useRef(cooldownTemplates);
  cooldownRef.current = cooldownTemplates;
  const writeChainRef = useRef(Promise.resolve());

  const [addingKind, setAddingKind] = useState<TemplateEditorKind | null>(null);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<{
    kind: TemplateEditorKind;
    template: ExerciseTemplate | Routine;
  } | null>(null);

  function enqueueWrite(run: () => Promise<void>) {
    const chained = writeChainRef.current.then(run, run);
    writeChainRef.current = chained.then(
      () => undefined,
      () => undefined,
    );
    return chained;
  }

  async function persistRoutine(next: Routine) {
    const list = upsertById(routinesRef.current, next, MAX_ROUTINES);
    routinesRef.current = list;
    await saveRoutines(list);
  }

  async function persistWarmup(next: ExerciseTemplate) {
    const list = upsertById(warmupRef.current, next, MAX_TEMPLATES);
    warmupRef.current = list;
    await saveWarmupTemplates(list);
  }

  async function persistCooldown(next: ExerciseTemplate) {
    const list = upsertById(cooldownRef.current, next, MAX_TEMPLATES);
    cooldownRef.current = list;
    await saveCooldownTemplates(list);
  }

  function persistTemplate(
    kind: TemplateEditorKind,
    next: ExerciseTemplate | Routine,
  ) {
    return enqueueWrite(async () => {
      if (kind === 'routine') {
        await persistRoutine(next as Routine);
        return;
      }
      const template: ExerciseTemplate = {
        id: next.id,
        name: next.name,
        exercises: next.exercises,
      };
      if (kind === 'warmup') await persistWarmup(template);
      else await persistCooldown(template);
    });
  }

  async function createTemplate(kind: TemplateEditorKind, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const items = itemsFor(kind);
    if (items.length >= capFor(kind)) return;

    const template: ExerciseTemplate | Routine = {
      id: newUid(),
      name: trimmed,
      exercises: [],
    };
    await persistTemplate(kind, template);
    setAddingKind(null);
    setNewName('');
    setEditing({ kind, template });
  }

  async function deleteTemplate(kind: TemplateEditorKind, id: string) {
    await enqueueWrite(async () => {
      if (kind === 'routine') {
        const next = routinesRef.current.filter((item) => item.id !== id);
        routinesRef.current = next;
        await saveRoutines(next);
        await saveWeeklyPlan(clearRoutineFromPlan(weeklyPlan, id));
        return;
      }
      if (kind === 'warmup') {
        const next = warmupRef.current.filter((item) => item.id !== id);
        warmupRef.current = next;
        await saveWarmupTemplates(next);
      } else {
        const next = cooldownRef.current.filter((item) => item.id !== id);
        cooldownRef.current = next;
        await saveCooldownTemplates(next);
      }
      const routinesNext = clearTemplateFromRoutines(
        routinesRef.current,
        id,
        kind,
      );
      routinesRef.current = routinesNext;
      await saveRoutines(routinesNext);
    });
    if (editing?.template.id === id) setEditing(null);
  }

  function itemsFor(kind: TemplateEditorKind): Array<ExerciseTemplate | Routine> {
    if (kind === 'routine') return routinesRef.current;
    if (kind === 'warmup') return warmupRef.current;
    return cooldownRef.current;
  }

  function startAdd(kind: TemplateEditorKind) {
    setAddingKind(kind);
    setNewName('');
  }

  function summaryFor(kind: TemplateEditorKind, item: ExerciseTemplate | Routine) {
    if (kind === 'routine') {
      return routineSummary(item as Routine, warmupTemplates, cooldownTemplates);
    }
    return exerciseCountLabel(item.exercises.length);
  }

  function renderSection(kind: TemplateEditorKind) {
    const items = kind === 'routine'
      ? routines
      : kind === 'warmup'
        ? warmupTemplates
        : cooldownTemplates;
    const atCap = items.length >= capFor(kind);
    const noun = kindNoun(kind);

    return (
      <section key={kind} className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-300">
            {sectionTitle(kind)}
            <span className="ml-2 font-medium text-slate-500">
              {items.length}/{capFor(kind)}
            </span>
          </h3>
          <button
            type="button"
            className="btn-secondary px-3 py-1.5 text-xs"
            disabled={atCap}
            onClick={() => startAdd(kind)}
          >
            Add
          </button>
        </div>

        {atCap && (
          <p className="text-xs text-slate-500">
            You already have {capFor(kind)}{' '}
            {kind === 'routine' ? `${noun}s` : `${noun} templates`}. Delete one
            to add another.
          </p>
        )}

        {addingKind === kind && !atCap && (
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void createTemplate(kind, newName);
            }}
          >
            <input
              className="input flex-1"
              placeholder={addPlaceholder(kind)}
              value={newName}
              autoFocus
              onChange={(e) => setNewName(e.target.value)}
            />
            <button
              type="submit"
              className="btn-primary px-3 py-2 text-sm"
              disabled={!newName.trim()}
            >
              Create
            </button>
            <button
              type="button"
              className="btn-secondary px-3 py-2 text-sm"
              onClick={() => {
                setAddingKind(null);
                setNewName('');
              }}
            >
              Cancel
            </button>
          </form>
        )}

        {items.length === 0 && addingKind !== kind && (
          <p className="rounded-xl border border-surface-800 bg-surface-900/40 px-4 py-6 text-center text-sm text-slate-500">
            {emptyCopy(kind)}
          </p>
        )}

        {items.length > 0 && (
          <div className="space-y-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full cursor-pointer rounded-xl border border-surface-700/60 bg-surface-900/40 px-3 py-2.5 text-left transition hover:border-slate-500"
                onClick={() => setEditing({ kind, template: item })}
              >
                <p className="truncate text-sm font-medium text-slate-100">
                  {item.name}
                </p>
                <p className="text-xs text-slate-400">
                  {summaryFor(kind, item)}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {renderSection('routine')}
      {renderSection('warmup')}
      {renderSection('cooldown')}

      {editing && (
        <RoutineEditor
          kind={editing.kind}
          template={editing.template}
          warmupTemplates={warmupTemplates}
          cooldownTemplates={cooldownTemplates}
          exercises={exercises}
          sha={sha}
          units={units}
          favouriteIds={favouriteIds}
          recentIds={recentIds}
          notes={notes}
          catalogLoading={catalogLoading}
          onChange={(next) => {
            setEditing((prev) =>
              prev ? { ...prev, template: next } : prev,
            );
            void persistTemplate(editing.kind, next);
          }}
          onCreateCustom={onCreateCustom}
          onSaveNote={(id, note) => void setExerciseNote(id, note)}
          onDelete={() => void deleteTemplate(editing.kind, editing.template.id)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
