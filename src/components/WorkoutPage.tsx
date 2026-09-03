import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { addDays, addWeeks, format, parseISO, startOfWeek } from 'date-fns';
import { useApp } from '../context/AppContext';
import {
  isCustomExerciseId,
  loadExerciseIndex,
  prefetchExerciseDetails,
  type ExerciseCatalogIndex,
  type ExerciseIndexItem,
} from '../lib/exerciseCatalog';
import { formatDayLabel, todayKey } from '../lib/dates';
import {
  MAX_ROUTINES,
  MAX_TEMPLATES,
  dayHasExercises,
  dayProgress,
  daySetCounts,
  emptyLog,
  sanitizeWorkoutEntry,
  type DayProgress,
  type DaySection,
  type ExerciseTemplate,
  type Routine,
  type TemplateKind,
  type WorkoutDay,
  type WorkoutDayInput,
  type WorkoutEntry,
} from '../lib/workoutTypes';
import {
  applyRoutineSections,
  clearRoutineFromPlan,
  clearTemplateFromRoutines,
  cloneEntries,
  recentWorkoutDays,
  resolveDay,
  templateLabel,
  templateNameSuffix,
  toPlannedExercise,
} from '../lib/workoutPlan';
import { WeekStrip } from './WeekStrip';
import { WorkoutExerciseRow } from './WorkoutExerciseRow';
import { ReorderableList } from './ReorderableList';
import { ExercisePicker } from './ExercisePicker';
import {
  ExerciseDetailSheet,
  type ExercisePlanDraft,
} from './ExerciseDetailSheet';
import { CopyWorkoutSheet } from './CopyWorkoutSheet';
import { RoutineEditor } from './RoutineEditor';
import { RoutineSheet, type RoutineLinks } from './RoutineSheet';
import { WeeklyPlanSheet } from './WeeklyPlanSheet';
import { TemplateSheet } from './TemplateSheet';

function newUid(): string {
  return crypto.randomUUID();
}

function makeEntry(ex: ExerciseIndexItem, draft?: ExercisePlanDraft): WorkoutEntry {
  const sets = draft?.sets ?? 3;
  const reps = draft?.reps ?? 10;
  const entry: WorkoutEntry = {
    uid: newUid(),
    exerciseId: ex.id,
    name: ex.name,
    sets,
    reps,
    log: emptyLog(sets),
  };
  if (draft?.weight != null) entry.weight = draft.weight;
  if (draft?.durationSec != null) entry.durationSec = draft.durationSec;
  return entry;
}

function pickerTitle(section: DaySection): string {
  if (section === 'warmup') return 'Add warmup exercises';
  if (section === 'cooldown') return 'Add cool down exercises';
  return 'Add exercises';
}

function addSaveLabel(section: DaySection): string {
  if (section === 'warmup') return 'Add to warmup';
  if (section === 'cooldown') return 'Add to cool down';
  return 'Add to day';
}

export function WorkoutPage() {
  const {
    activeProfile,
    prefs,
    workoutDaysMap,
    upsertWorkoutDay,
    pushRecentExercises,
    toggleFavouriteExercise,
    setExerciseNote,
    ensureCustomExercise,
    saveRoutines,
    saveWeeklyPlan,
    saveWarmupTemplates,
    saveCooldownTemplates,
  } = useApp();

  const units = prefs?.units ?? 'metric';
  const today = todayKey();
  const routines = activeProfile?.routines ?? [];
  const weeklyPlan = activeProfile?.weeklyPlan;
  const warmupTemplates = activeProfile?.warmupTemplates ?? [];
  const cooldownTemplates = activeProfile?.cooldownTemplates ?? [];

  const [weekStart, setWeekStart] = useState(() =>
    todayKey(startOfWeek(new Date(), { weekStartsOn: 1 })),
  );
  const [selectedDay, setSelectedDay] = useState(today);
  const [catalog, setCatalog] = useState<ExerciseCatalogIndex | null>(null);
  const [catalogError, setCatalogError] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSection, setPickerSection] = useState<DaySection>('main');
  const [pendingTemplateName, setPendingTemplateName] = useState('');
  const [copyOpen, setCopyOpen] = useState(false);
  const [routineOpen, setRoutineOpen] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [weekPlanOpen, setWeekPlanOpen] = useState(false);
  const [templateKind, setTemplateKind] = useState<TemplateKind | null>(null);
  const [detailExercise, setDetailExercise] = useState<ExerciseIndexItem | null>(null);
  const [editingEntryUid, setEditingEntryUid] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<DaySection>('main');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [optimistic, setOptimistic] = useState<{
    dayKey: string;
    entries: WorkoutEntry[];
    warmupEntries: WorkoutEntry[];
    cooldownEntries: WorkoutEntry[];
  } | null>(null);
  const optimisticRef = useRef(optimistic);
  const writeChainRef = useRef(Promise.resolve());
  const routinesRef = useRef(routines);
  routinesRef.current = routines;
  const templateStartedRef = useRef(false);

  useEffect(() => {
    optimisticRef.current = null;
    setOptimistic(null);
    templateStartedRef.current = false;
  }, [selectedDay]);

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

  const pickerExercises = useMemo(() => {
    const catalogExercises = catalog?.exercises ?? [];
    const custom = activeProfile?.customExercises ?? [];
    if (custom.length === 0) return catalogExercises;
    const seen = new Set(custom.map((ex) => ex.id));
    return [...custom, ...catalogExercises.filter((ex) => !seen.has(ex.id))];
  }, [catalog, activeProfile?.customExercises]);

  const exerciseById = useMemo(() => {
    const map = new Map<string, ExerciseIndexItem>();
    for (const ex of pickerExercises) map.set(ex.id, ex);
    return map;
  }, [pickerExercises]);

  const resolved = useMemo(
    () =>
      resolveDay(
        selectedDay,
        workoutDaysMap.get(selectedDay),
        routines,
        weeklyPlan,
        warmupTemplates,
        cooldownTemplates,
      ),
    [selectedDay, workoutDaysMap, routines, weeklyPlan, warmupTemplates, cooldownTemplates],
  );

  const day = resolved.day;
  const storedEntries = day?.entries ?? [];
  const storedWarmup = day?.warmupEntries ?? [];
  const storedCooldown = day?.cooldownEntries ?? [];
  const entries =
    optimistic?.dayKey === selectedDay ? optimistic.entries : storedEntries;
  const warmupEntries =
    optimistic?.dayKey === selectedDay ? optimistic.warmupEntries : storedWarmup;
  const cooldownEntries =
    optimistic?.dayKey === selectedDay
      ? optimistic.cooldownEntries
      : storedCooldown;
  const previewDay: WorkoutDay | null = day
    ? { ...day, entries, warmupEntries, cooldownEntries }
    : entries.length || warmupEntries.length || cooldownEntries.length
      ? {
          id: selectedDay,
          entries,
          warmupEntries,
          cooldownEntries,
        }
      : null;
  const counts = daySetCounts(previewDay);
  const progress = dayProgress(previewDay);
  const hasMainEntries = entries.length > 0;
  const hasAnyExercises = dayHasExercises(previewDay);

  const previousDays = useMemo(
    () => recentWorkoutDays(workoutDaysMap, selectedDay),
    [workoutDaysMap, selectedDay],
  );

  const progressByDay = useMemo(() => {
    const start = startOfWeek(parseISO(weekStart), { weekStartsOn: 1 });
    const map: Record<string, DayProgress> = {};
    for (let i = 0; i < 7; i++) {
      const key = todayKey(addDays(start, i));
      const resolvedDay = resolveDay(
        key,
        workoutDaysMap.get(key),
        routines,
        weeklyPlan,
        warmupTemplates,
        cooldownTemplates,
      );
      map[key] = dayProgress(resolvedDay.day);
    }
    return map;
  }, [weekStart, workoutDaysMap, routines, weeklyPlan, warmupTemplates, cooldownTemplates]);

  async function persistDay(patch: WorkoutDayInput) {
    if (!activeProfile) return;
    const run = async () => {
      setSaving(true);
      setSaveError('');
      const live = optimisticRef.current?.dayKey === selectedDay
        ? optimisticRef.current
        : {
            dayKey: selectedDay,
            entries: storedEntries,
            warmupEntries: storedWarmup,
            cooldownEntries: storedCooldown,
          };
      const nextEntries = patch.entries ?? live.entries;
      const nextWarmup =
        patch.warmupEntries !== undefined ? patch.warmupEntries : live.warmupEntries;
      const nextCooldown =
        patch.cooldownEntries !== undefined
          ? patch.cooldownEntries
          : live.cooldownEntries;
      const nextLive = {
        dayKey: selectedDay,
        entries: nextEntries,
        warmupEntries: nextWarmup,
        cooldownEntries: nextCooldown,
      };
      optimisticRef.current = nextLive;
      setOptimistic(nextLive);
      const preview: WorkoutDay = {
        id: selectedDay,
        entries: nextEntries,
        warmupEntries: nextWarmup,
        cooldownEntries: nextCooldown,
      };
      const allDone =
        dayHasExercises(preview) && dayProgress(preview) === 'complete';
      try {
        await upsertWorkoutDay(selectedDay, {
          entries: nextEntries,
          warmupEntries: nextWarmup,
          cooldownEntries: nextCooldown,
          completedAt:
            patch.completedAt !== undefined
              ? patch.completedAt
              : allDone
                ? new Date().toISOString()
                : null,
          routineId:
            patch.routineId !== undefined ? patch.routineId : (day?.routineId ?? null),
          routineName:
            patch.routineName !== undefined ? patch.routineName : (day?.routineName ?? null),
          warmupTemplateId:
            patch.warmupTemplateId !== undefined
              ? patch.warmupTemplateId
              : (day?.warmupTemplateId ?? null),
          warmupTemplateName:
            patch.warmupTemplateName !== undefined
              ? patch.warmupTemplateName
              : (day?.warmupTemplateName ?? null),
          cooldownTemplateId:
            patch.cooldownTemplateId !== undefined
              ? patch.cooldownTemplateId
              : (day?.cooldownTemplateId ?? null),
          cooldownTemplateName:
            patch.cooldownTemplateName !== undefined
              ? patch.cooldownTemplateName
              : (day?.cooldownTemplateName ?? null),
        });
      } catch (err) {
        optimisticRef.current = null;
        setOptimistic(null);
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
    };
    const next = writeChainRef.current.then(run, run);
    writeChainRef.current = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  function sectionEntriesFor(section: DaySection): WorkoutEntry[] {
    const live =
      optimisticRef.current?.dayKey === selectedDay
        ? optimisticRef.current
        : { entries, warmupEntries, cooldownEntries };
    if (section === 'warmup') return live.warmupEntries;
    if (section === 'cooldown') return live.cooldownEntries;
    return live.entries;
  }

  function confirmReplace(): boolean {
    if (!hasAnyExercises) return true;
    return confirm('Replace the exercises planned for this day?');
  }

  function confirmReplaceSection(kind: TemplateKind): boolean {
    const current = sectionEntriesFor(kind);
    if (current.length === 0) return true;
    return confirm(`Replace this day's ${templateLabel(kind).toLowerCase()}?`);
  }

  async function persistSection(
    section: DaySection,
    nextEntries: WorkoutEntry[],
    extras?: WorkoutDayInput,
  ) {
    const patch: WorkoutDayInput = { ...extras };
    if (section === 'warmup') {
      patch.warmupEntries = nextEntries;
      if (nextEntries.length === 0) {
        patch.warmupTemplateId = extras?.warmupTemplateId ?? null;
        patch.warmupTemplateName = extras?.warmupTemplateName ?? null;
      }
    } else if (section === 'cooldown') {
      patch.cooldownEntries = nextEntries;
      if (nextEntries.length === 0) {
        patch.cooldownTemplateId = extras?.cooldownTemplateId ?? null;
        patch.cooldownTemplateName = extras?.cooldownTemplateName ?? null;
      }
    } else {
      patch.entries = nextEntries;
    }
    await persistDay(patch);
  }

  async function addExercises(
    selected: ExerciseIndexItem[],
    section: DaySection,
    draft?: ExercisePlanDraft,
  ) {
    try {
      const makingTemplate = Boolean(pendingTemplateName) && section !== 'main';
      if (makingTemplate && !templateStartedRef.current) {
        if (!confirmReplaceSection(section)) return;
        templateStartedRef.current = true;
        const next = selected.map((ex) => makeEntry(ex, draft));
        await persistSection(section, next);
      } else {
        const next = [
          ...sectionEntriesFor(section),
          ...selected.map((ex) => makeEntry(ex, draft)),
        ];
        await persistSection(section, next);
      }
      await pushRecentExercises(selected.map((ex) => ex.id));
    } catch {
      /* keep picker open so the user can retry */
    }
  }

  async function removeExercise(section: DaySection, exerciseId: string) {
    try {
      const current = sectionEntriesFor(section);
      const next = current.filter((entry) => entry.exerciseId !== exerciseId);
      if (next.length === current.length) return;
      await persistSection(section, next);
    } catch {
      /* keep picker open so the user can retry */
    }
  }

  async function applyTemplate(
    kind: TemplateKind,
    template: ExerciseTemplate,
    precloned?: WorkoutEntry[],
  ) {
    if (template.exercises.length === 0) return;
    if (!confirmReplaceSection(kind)) return;
    const cloned = precloned ?? cloneEntries(template.exercises);
    if (kind === 'warmup') {
      await persistSection('warmup', cloned, {
        warmupTemplateId: template.id,
        warmupTemplateName: template.name,
      });
    } else {
      await persistSection('cooldown', cloned, {
        cooldownTemplateId: template.id,
        cooldownTemplateName: template.name,
      });
    }
    setTemplateKind(null);
  }

  async function saveSectionAsTemplate(kind: TemplateKind, name: string) {
    const current = sectionEntriesFor(kind);
    if (current.length === 0) return;
    const template: ExerciseTemplate = {
      id: newUid(),
      name,
      exercises: current.map(toPlannedExercise),
    };
    const list = kind === 'warmup' ? warmupTemplates : cooldownTemplates;
    const nextList = [template, ...list].slice(0, MAX_TEMPLATES);
    if (kind === 'warmup') {
      await saveWarmupTemplates(nextList);
      await persistDay({
        warmupTemplateId: template.id,
        warmupTemplateName: template.name,
      });
    } else {
      await saveCooldownTemplates(nextList);
      await persistDay({
        cooldownTemplateId: template.id,
        cooldownTemplateName: template.name,
      });
    }
  }

  async function renameTemplate(kind: TemplateKind, templateId: string, name: string) {
    const rename = (list: ExerciseTemplate[]) =>
      list.map((template) =>
        template.id === templateId ? { ...template, name } : template,
      );
    if (kind === 'warmup') {
      await saveWarmupTemplates(rename(warmupTemplates));
      if (day?.warmupTemplateId === templateId) {
        await persistDay({ warmupTemplateName: name });
      }
    } else {
      await saveCooldownTemplates(rename(cooldownTemplates));
      if (day?.cooldownTemplateId === templateId) {
        await persistDay({ cooldownTemplateName: name });
      }
    }
  }

  async function deleteTemplate(kind: TemplateKind, templateId: string) {
    if (kind === 'warmup') {
      await saveWarmupTemplates(warmupTemplates.filter((t) => t.id !== templateId));
    } else {
      await saveCooldownTemplates(cooldownTemplates.filter((t) => t.id !== templateId));
    }
    await saveRoutines(clearTemplateFromRoutines(routines, templateId, kind));
  }

  async function copyDay(source: WorkoutDay) {
    if (!confirmReplace()) return;
    try {
      await persistDay({
        entries: cloneEntries(source.entries),
        warmupEntries: cloneEntries(source.warmupEntries ?? []),
        cooldownEntries: cloneEntries(source.cooldownEntries ?? []),
        completedAt: null,
        routineId: source.routineId ?? null,
        routineName: source.routineName ?? null,
        warmupTemplateId: source.warmupTemplateId ?? null,
        warmupTemplateName: source.warmupTemplateName ?? null,
        cooldownTemplateId: source.cooldownTemplateId ?? null,
        cooldownTemplateName: source.cooldownTemplateName ?? null,
      });
      setCopyOpen(false);
    } catch {
      setCopyOpen(false);
    }
  }

  async function applyRoutine(routine: Routine) {
    if (!confirmReplace()) return;
    try {
      const sections = applyRoutineSections(
        selectedDay,
        routine,
        warmupTemplates,
        cooldownTemplates,
      );
      const patch: WorkoutDayInput = {
        entries: cloneEntries(routine.exercises),
        completedAt: null,
        routineId: routine.id,
        routineName: routine.name,
      };
      if (routine.warmupTemplateId) {
        patch.warmupEntries = sections.warmupEntries ?? [];
        patch.warmupTemplateId = sections.warmupTemplateId ?? null;
        patch.warmupTemplateName = sections.warmupTemplateName ?? null;
      }
      if (routine.cooldownTemplateId) {
        patch.cooldownEntries = sections.cooldownEntries ?? [];
        patch.cooldownTemplateId = sections.cooldownTemplateId ?? null;
        patch.cooldownTemplateName = sections.cooldownTemplateName ?? null;
      }
      await persistDay(patch);
      setRoutineOpen(false);
    } catch {
      setRoutineOpen(false);
    }
  }

  async function saveCurrentAsRoutine(name: string, links: RoutineLinks) {
    if (!hasMainEntries) return;
    let warmupId = links.warmupTemplateId || undefined;
    let cooldownId = links.cooldownTemplateId || undefined;
    const templatePatch: WorkoutDayInput = {};

    if (!warmupId && warmupEntries.length > 0) {
      const template: ExerciseTemplate = {
        id: newUid(),
        name: `${name} ${templateNameSuffix('warmup')}`,
        exercises: warmupEntries.map(toPlannedExercise),
      };
      await saveWarmupTemplates(
        [template, ...warmupTemplates].slice(0, MAX_TEMPLATES),
      );
      warmupId = template.id;
      templatePatch.warmupTemplateId = template.id;
      templatePatch.warmupTemplateName = template.name;
    }

    if (!cooldownId && cooldownEntries.length > 0) {
      const template: ExerciseTemplate = {
        id: newUid(),
        name: `${name} ${templateNameSuffix('cooldown')}`,
        exercises: cooldownEntries.map(toPlannedExercise),
      };
      await saveCooldownTemplates(
        [template, ...cooldownTemplates].slice(0, MAX_TEMPLATES),
      );
      cooldownId = template.id;
      templatePatch.cooldownTemplateId = template.id;
      templatePatch.cooldownTemplateName = template.name;
    }

    if (
      templatePatch.warmupTemplateId ||
      templatePatch.cooldownTemplateId
    ) {
      await persistDay(templatePatch);
    }

    const routine: Routine = {
      id: newUid(),
      name,
      exercises: entries.map(toPlannedExercise),
    };
    if (warmupId) routine.warmupTemplateId = warmupId;
    if (cooldownId) routine.cooldownTemplateId = cooldownId;
    await saveRoutines([routine, ...routines].slice(0, MAX_ROUTINES));
  }

  async function renameRoutine(routineId: string, name: string) {
    await saveRoutines(
      routines.map((routine) =>
        routine.id === routineId ? { ...routine, name } : routine,
      ),
    );
  }

  async function updateRoutine(next: Routine) {
    const run = async () => {
      await saveRoutines(
        routinesRef.current.map((routine) =>
          routine.id === next.id ? next : routine,
        ),
      );
    };
    const chained = writeChainRef.current.then(run, run);
    writeChainRef.current = chained.then(
      () => undefined,
      () => undefined,
    );
    return chained;
  }

  async function setRoutineLinks(routineId: string, links: RoutineLinks) {
    await saveRoutines(
      routines.map((routine) => {
        if (routine.id !== routineId) return routine;
        const next: Routine = { ...routine };
        if (links.warmupTemplateId) next.warmupTemplateId = links.warmupTemplateId;
        else delete next.warmupTemplateId;
        if (links.cooldownTemplateId) next.cooldownTemplateId = links.cooldownTemplateId;
        else delete next.cooldownTemplateId;
        return next;
      }),
    );
  }

  async function deleteRoutine(routineId: string) {
    await saveRoutines(routines.filter((routine) => routine.id !== routineId));
    await saveWeeklyPlan(clearRoutineFromPlan(weeklyPlan, routineId));
  }

  async function toggleSet(section: DaySection, entryUid: string, setIndex: number) {
    const next = sectionEntriesFor(section).map((entry) => {
      if (entry.uid !== entryUid) return entry;
      const log = entry.log.length > 0 ? [...entry.log] : emptyLog(entry.sets);
      while (log.length <= setIndex) log.push({ done: false });
      const current = log[setIndex]!;
      log[setIndex] = { ...current, done: !current.done };
      return { ...entry, log };
    });
    await persistSection(section, next);
  }

  async function removeEntry(section: DaySection, entryUid: string) {
    const next = sectionEntriesFor(section).filter((e) => e.uid !== entryUid);
    await persistSection(section, next);
  }

  async function saveEntryPlan(draft: ExercisePlanDraft) {
    if (!detailExercise) return;

    if (editingEntryUid) {
      const next = sectionEntriesFor(editingSection).map((entry) => {
        if (entry.uid !== editingEntryUid) return entry;
        const prevDone = entry.log.filter((s) => s.done).length;
        const log = emptyLog(draft.sets).map((slot, i) => ({
          ...slot,
          done: i < prevDone,
        }));
        return sanitizeWorkoutEntry({
          ...entry,
          sets: draft.sets,
          reps: draft.reps,
          weight: draft.weight,
          durationSec: draft.durationSec,
          log,
        });
      });
      await persistSection(editingSection, next);
    } else {
      await addExercises([detailExercise], pickerSection, draft);
    }

    setDetailExercise(null);
    setEditingEntryUid(null);
  }

  function openEntryDetail(section: DaySection, entry: WorkoutEntry) {
    const catalogItem =
      exerciseById.get(entry.exerciseId) ??
      ({
        id: entry.exerciseId,
        name: entry.name,
        primaryMuscles: [],
        equipment: null,
        category: null,
        level: null,
        hasImages: false,
      } satisfies ExerciseIndexItem);
    setEditingSection(section);
    setEditingEntryUid(entry.uid);
    setDetailExercise(catalogItem);
  }

  function openPicker(section: DaySection) {
    setPendingTemplateName('');
    templateStartedRef.current = false;
    setPickerSection(section);
    setPickerOpen(true);
  }

  function openTemplateSheet(kind: TemplateKind) {
    setTemplateKind(kind);
  }

  function startBuildTemplate(kind: TemplateKind, name: string) {
    setPendingTemplateName(name);
    templateStartedRef.current = false;
    setPickerSection(kind);
    setTemplateKind(null);
    setPickerOpen(true);
  }

  async function closePicker() {
    const name = pendingTemplateName;
    const section = pickerSection;
    const started = templateStartedRef.current;
    setPickerOpen(false);
    setPendingTemplateName('');
    templateStartedRef.current = false;
    if (name && section !== 'main' && started) {
      try {
        await saveSectionAsTemplate(section, name);
      } catch {
        /* template save errors surface via persistDay */
      }
    }
  }

  function catalogItemFor(entry: WorkoutEntry): ExerciseIndexItem | undefined {
    return exerciseById.get(entry.exerciseId);
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
  const exerciseNotes = activeProfile.exerciseNotes ?? {};
  const routineName = day?.routineName;
  const editingRoutine = editingRoutineId
    ? (routines.find((routine) => routine.id === editingRoutineId) ?? null)
    : null;

  let primaryActionLabel = 'Add exercises';
  if (hasMainEntries && progress === 'empty') primaryActionLabel = 'Add exercises';
  else if (progress === 'planned') primaryActionLabel = 'Start logging sets';
  else if (progress === 'partial') primaryActionLabel = `${counts.done} of ${counts.total} sets`;
  else if (progress === 'complete') primaryActionLabel = 'Completed';

  const editingEntry = editingEntryUid
    ? sectionEntriesFor(editingSection).find((e) => e.uid === editingEntryUid)
    : undefined;

  function renderRows(section: DaySection, sectionEntries: WorkoutEntry[]) {
    if (sectionEntries.length === 0) return null;
    return (
      <ReorderableList
        items={sectionEntries}
        getKey={(entry) => entry.uid}
        onReorder={(next) => void persistSection(section, next)}
        renderItem={(entry, dragHandleProps) => {
          const catalogItem = catalogItemFor(entry);
          return (
            <WorkoutExerciseRow
              entry={entry}
              sha={catalog?.sha ?? 'main'}
              units={units}
              primaryMuscle={catalogItem?.primaryMuscles[0]}
              hasImages={
                catalogItem?.hasImages ?? !isCustomExerciseId(entry.exerciseId)
              }
              note={exerciseNotes[entry.exerciseId]}
              dragHandleProps={dragHandleProps}
              onToggleSet={(setIndex) => void toggleSet(section, entry.uid, setIndex)}
              onOpenDetail={() => openEntryDetail(section, entry)}
              onRemove={() => void removeEntry(section, entry.uid)}
            />
          );
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Workout</h2>
          <p className="mt-1 text-sm text-slate-400">
            Plan exercises for any day and tick off sets as you go.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary shrink-0 px-3 py-2 text-xs"
          onClick={() => setWeekPlanOpen(true)}
        >
          Edit week plan
        </button>
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
            <h3 className="text-base font-semibold text-slate-100">
              {dayLabel}
              {routineName ? ` · ${routineName}` : ''}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {format(parseISO(selectedDay), 'EEEE, MMM d')}
              {resolved.derived ? ' · from week plan' : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-brand-400">
              {counts.done}/{counts.total || 0}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">sets</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary flex-1 px-3 py-2.5 text-sm"
            onClick={() => openPicker('main')}
            disabled={catalogLoading}
          >
            {hasMainEntries ? 'Add more' : 'Add exercises'}
          </button>
          {hasAnyExercises && progress === 'complete' && (
            <span className="inline-flex items-center rounded-xl border border-brand-500/40 bg-brand-500/10 px-3 text-xs font-semibold text-brand-300">
              Done
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary flex-1 px-3 py-2 text-xs"
            onClick={() => setCopyOpen(true)}
          >
            Copy previous
          </button>
          <button
            type="button"
            className="btn-secondary flex-1 px-3 py-2 text-xs"
            onClick={() => setRoutineOpen(true)}
          >
            {hasMainEntries ? 'Routines' : 'Use routine'}
          </button>
        </div>
        {saving && (
          <p className="mt-2 text-xs text-slate-500">Saving…</p>
        )}
        {hasAnyExercises && progress !== 'complete' && (
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

      <WorkoutSectionCard
        title="Warm up"
        templateName={day?.warmupTemplateName}
        empty={warmupEntries.length === 0}
        onChange={() => openTemplateSheet('warmup')}
        onAddMore={() => openPicker('warmup')}
        catalogLoading={catalogLoading}
      >
        {renderRows('warmup', warmupEntries)}
      </WorkoutSectionCard>

      {!catalogLoading && !hasAnyExercises && (
        <div className="card p-6 text-center">
          <p className="text-sm text-slate-300">No exercises planned for this day.</p>
          <p className="mt-1 text-xs text-slate-500">
            Add from the catalog, copy a previous day, or apply a routine.
          </p>
        </div>
      )}

      {hasMainEntries && (
        <div className="space-y-3">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Workout
          </p>
          {renderRows('main', entries)}
        </div>
      )}

      <WorkoutSectionCard
        title="Cool down"
        templateName={day?.cooldownTemplateName}
        empty={cooldownEntries.length === 0}
        onChange={() => openTemplateSheet('cooldown')}
        onAddMore={() => openPicker('cooldown')}
        catalogLoading={catalogLoading}
      >
        {renderRows('cooldown', cooldownEntries)}
      </WorkoutSectionCard>

      {pickerOpen && (
        <ExercisePicker
          title={pickerTitle(pickerSection)}
          exercises={pickerExercises}
          sha={catalog?.sha ?? ''}
          favouriteIds={favouriteIds}
          recentIds={recentIds}
          addedIds={sectionEntriesFor(pickerSection).map((entry) => entry.exerciseId)}
          notes={exerciseNotes}
          onAdd={(item) => void addExercises([item], pickerSection)}
          onRemove={(item) => void removeExercise(pickerSection, item.id)}
          onCreateCustom={ensureCustomExercise}
          onClose={() => void closePicker()}
          onOpenDetail={(ex) => {
            setEditingEntryUid(null);
            setDetailExercise(ex);
          }}
        />
      )}

      {copyOpen && (
        <CopyWorkoutSheet
          days={previousDays}
          onCopy={(source) => void copyDay(source)}
          onClose={() => setCopyOpen(false)}
        />
      )}

      {routineOpen && (
        <RoutineSheet
          routines={routines}
          warmupTemplates={warmupTemplates}
          cooldownTemplates={cooldownTemplates}
          canSave={hasMainEntries}
          initialWarmupTemplateId={day?.warmupTemplateId}
          initialCooldownTemplateId={day?.cooldownTemplateId}
          onSave={(name, links) => void saveCurrentAsRoutine(name, links)}
          onApply={(routine) => void applyRoutine(routine)}
          onRename={(id, name) => void renameRoutine(id, name)}
          onDelete={(id) => void deleteRoutine(id)}
          onSetLinks={(id, links) => void setRoutineLinks(id, links)}
          onEdit={(routine) => {
            setPickerOpen(false);
            setRoutineOpen(false);
            setEditingRoutineId(routine.id);
          }}
          onClose={() => setRoutineOpen(false)}
        />
      )}

      {editingRoutine && (
        <RoutineEditor
          routine={editingRoutine}
          warmupTemplates={warmupTemplates}
          cooldownTemplates={cooldownTemplates}
          exercises={pickerExercises}
          sha={catalog?.sha ?? ''}
          units={units}
          favouriteIds={favouriteIds}
          recentIds={recentIds}
          notes={exerciseNotes}
          catalogLoading={catalogLoading}
          onChange={(next) => void updateRoutine(next)}
          onCreateCustom={ensureCustomExercise}
          onClose={() => {
            setEditingRoutineId(null);
            setRoutineOpen(true);
          }}
        />
      )}

      {weekPlanOpen && (
        <WeeklyPlanSheet
          routines={routines}
          warmupTemplates={warmupTemplates}
          cooldownTemplates={cooldownTemplates}
          weeklyPlan={weeklyPlan}
          onSave={(plan) => {
            void saveWeeklyPlan(plan).then(() => setWeekPlanOpen(false));
          }}
          onClose={() => setWeekPlanOpen(false)}
        />
      )}

      {templateKind && (
        <TemplateSheet
          kind={templateKind}
          templates={templateKind === 'warmup' ? warmupTemplates : cooldownTemplates}
          canSave={
            templateKind === 'warmup'
              ? warmupEntries.length > 0
              : cooldownEntries.length > 0
          }
          onSave={(name) => void saveSectionAsTemplate(templateKind, name)}
          onApply={(template) => void applyTemplate(templateKind, template)}
          onRename={(id, name) => void renameTemplate(templateKind, id, name)}
          onDelete={(id) => void deleteTemplate(templateKind, id)}
          onBuildNew={(name) => startBuildTemplate(templateKind, name)}
          onClose={() => setTemplateKind(null)}
        />
      )}

      {detailExercise && (
        <ExerciseDetailSheet
          exercise={detailExercise}
          sha={catalog?.sha ?? ''}
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
          onToggleFavourite={() => void toggleFavouriteExercise(detailExercise.id)}
          note={exerciseNotes[detailExercise.id]}
          onSaveNote={(value) => void setExerciseNote(detailExercise.id, value)}
          onSave={(draft) => void saveEntryPlan(draft)}
          onClose={() => {
            setDetailExercise(null);
            setEditingEntryUid(null);
          }}
          saveLabel={
            editingEntryUid ? 'Update exercise' : addSaveLabel(pickerSection)
          }
        />
      )}
    </div>
  );
}

function WorkoutSectionCard({
  title,
  templateName,
  empty,
  onChange,
  onAddMore,
  catalogLoading,
  children,
}: {
  title: string;
  templateName?: string;
  empty: boolean;
  onChange: () => void;
  onAddMore: () => void;
  catalogLoading: boolean;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {title}
            {templateName ? (
              <span className="font-medium normal-case tracking-normal text-slate-300">
                {' '}
                · {templateName}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className="btn-secondary px-3 py-1.5 text-xs"
            onClick={onChange}
          >
            {empty ? 'Add' : 'Change'}
          </button>
          {!empty && (
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-xs"
              onClick={onAddMore}
              disabled={catalogLoading}
            >
              Add more
            </button>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}
