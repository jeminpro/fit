import type {
  UserPrefs,
  Profile,
  Measurement,
  HabitDay,
  HabitDayInput,
  MeasurementInput,
} from './types';
import type { WorkoutDay, WorkoutDayInput } from './workoutTypes';
import { sanitizeWorkoutDayInput } from './workoutTypes';
import { DEFAULT_ENABLED_MEASUREMENTS } from './constants';

const STORAGE_KEY = 'fit-local-data';

export interface LocalStore {
  prefs: UserPrefs;
  profiles: Profile[];
  measurements: Record<string, Measurement[]>;
  habitDays: Record<string, HabitDay[]>;
  workoutDays: Record<string, WorkoutDay[]>;
}

function emptyStore(): LocalStore {
  return {
    prefs: { units: 'metric', activeProfileId: null, profileOrder: [] },
    profiles: [],
    measurements: {},
    habitDays: {},
    workoutDays: {},
  };
}

export function loadLocalStore(): LocalStore {
  if (typeof window === 'undefined') return emptyStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as LocalStore;
    return {
      prefs: {
        units: parsed.prefs?.units ?? 'metric',
        activeProfileId: parsed.prefs?.activeProfileId ?? null,
        profileOrder: parsed.prefs?.profileOrder ?? [],
      },
      profiles: parsed.profiles ?? [],
      measurements: parsed.measurements ?? {},
      habitDays: parsed.habitDays ?? {},
      workoutDays: parsed.workoutDays ?? {},
    };
  } catch {
    return emptyStore();
  }
}

export function saveLocalStore(store: LocalStore): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function clearLocalStore(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function hasLocalData(): boolean {
  const store = loadLocalStore();
  return store.profiles.length > 0;
}

function newId(): string {
  return `local-${crypto.randomUUID()}`;
}

export function getLocalPrefs(): UserPrefs {
  return loadLocalStore().prefs;
}

export function updateLocalPrefs(updates: Partial<UserPrefs>): UserPrefs {
  const store = loadLocalStore();
  store.prefs = { ...store.prefs, ...updates };
  saveLocalStore(store);
  return store.prefs;
}

export function getLocalProfiles(): Profile[] {
  return loadLocalStore().profiles;
}

export function createLocalProfile(data: Omit<Profile, 'id'>): string {
  const store = loadLocalStore();
  const id = newId();
  const profile: Profile = {
    id,
    name: data.name,
    sex: data.sex,
    birthDate: data.birthDate,
    enabledMeasurements:
      data.enabledMeasurements.length > 0
        ? data.enabledMeasurements
        : DEFAULT_ENABLED_MEASUREMENTS,
    goals: data.goals ?? {},
    recentExerciseIds: data.recentExerciseIds,
    favouriteExerciseIds: data.favouriteExerciseIds,
    customExercises: data.customExercises,
    exerciseNotes: data.exerciseNotes,
    routines: data.routines,
    weeklyPlan: data.weeklyPlan,
    warmupTemplates: data.warmupTemplates,
    cooldownTemplates: data.cooldownTemplates,
  };
  store.profiles.push(profile);
  store.measurements[id] = [];
  store.habitDays[id] = [];
  store.workoutDays[id] = [];
  if (!store.prefs.profileOrder) store.prefs.profileOrder = [];
  if (!store.prefs.profileOrder.includes(id)) {
    store.prefs.profileOrder.push(id);
  }
  if (!store.prefs.activeProfileId) {
    store.prefs.activeProfileId = id;
  }
  saveLocalStore(store);
  return id;
}

export function updateLocalProfile(
  profileId: string,
  updates: Partial<Omit<Profile, 'id'>>,
): void {
  const store = loadLocalStore();
  const index = store.profiles.findIndex((p) => p.id === profileId);
  if (index === -1) return;
  store.profiles[index] = { ...store.profiles[index]!, ...updates };
  saveLocalStore(store);
}

export function deleteLocalProfile(profileId: string): void {
  const store = loadLocalStore();
  store.profiles = store.profiles.filter((p) => p.id !== profileId);
  delete store.measurements[profileId];
  delete store.habitDays[profileId];
  delete store.workoutDays[profileId];
  if (store.prefs.profileOrder) {
    store.prefs.profileOrder = store.prefs.profileOrder.filter(
      (id) => id !== profileId,
    );
  }
  if (store.prefs.activeProfileId === profileId) {
    store.prefs.activeProfileId = store.profiles[0]?.id ?? null;
  }
  saveLocalStore(store);
}

export function getLocalMeasurements(profileId: string): Measurement[] {
  const store = loadLocalStore();
  return (store.measurements[profileId] ?? []).sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
  );
}

export function addLocalMeasurement(
  profileId: string,
  input: MeasurementInput,
): string {
  const store = loadLocalStore();
  if (!store.measurements[profileId]) store.measurements[profileId] = [];
  const id = newId();
  store.measurements[profileId].push({ id, ...input });
  saveLocalStore(store);
  return id;
}

export function addLocalMeasurementsBatch(
  profileId: string,
  inputs: MeasurementInput[],
): void {
  const store = loadLocalStore();
  if (!store.measurements[profileId]) store.measurements[profileId] = [];
  for (const input of inputs) {
    store.measurements[profileId].push({ id: newId(), ...input });
  }
  saveLocalStore(store);
}

export function updateLocalMeasurement(
  profileId: string,
  measurementId: string,
  updates: Partial<MeasurementInput>,
): void {
  const store = loadLocalStore();
  const list = store.measurements[profileId] ?? [];
  const index = list.findIndex((m) => m.id === measurementId);
  if (index === -1) return;
  list[index] = { ...list[index]!, ...updates };
  saveLocalStore(store);
}

export function deleteLocalMeasurement(
  profileId: string,
  measurementId: string,
): void {
  const store = loadLocalStore();
  store.measurements[profileId] = (store.measurements[profileId] ?? []).filter(
    (m) => m.id !== measurementId,
  );
  saveLocalStore(store);
}

export function getLocalHabitDays(profileId: string): HabitDay[] {
  return loadLocalStore().habitDays[profileId] ?? [];
}

export function upsertLocalHabitDay(
  profileId: string,
  dayId: string,
  input: HabitDayInput,
): void {
  const store = loadLocalStore();
  if (!store.habitDays[profileId]) store.habitDays[profileId] = [];
  const existing = store.habitDays[profileId].find((d) => d.id === dayId);
  if (existing) {
    Object.assign(existing, input);
  } else {
    store.habitDays[profileId].push({ id: dayId, ...input } as HabitDay);
  }
  saveLocalStore(store);
}

export function getLocalWorkoutDays(profileId: string): WorkoutDay[] {
  return loadLocalStore().workoutDays[profileId] ?? [];
}

function applyOptionalDayField(
  day: WorkoutDay,
  key:
    | 'completedAt'
    | 'note'
    | 'routineId'
    | 'routineName'
    | 'warmupTemplateId'
    | 'warmupTemplateName'
    | 'cooldownTemplateId'
    | 'cooldownTemplateName',
  value: string | null | undefined,
): void {
  if (value === null) delete day[key];
  else if (value !== undefined) day[key] = value;
}

export function upsertLocalWorkoutDay(
  profileId: string,
  dayId: string,
  input: WorkoutDayInput,
): void {
  const store = loadLocalStore();
  if (!store.workoutDays[profileId]) store.workoutDays[profileId] = [];
  const cleaned = sanitizeWorkoutDayInput(input);
  const existing = store.workoutDays[profileId].find((d) => d.id === dayId);
  if (existing) {
    if (cleaned.entries !== undefined) existing.entries = cleaned.entries;
    if (cleaned.warmupEntries !== undefined) existing.warmupEntries = cleaned.warmupEntries;
    if (cleaned.cooldownEntries !== undefined) existing.cooldownEntries = cleaned.cooldownEntries;
    applyOptionalDayField(existing, 'completedAt', cleaned.completedAt);
    applyOptionalDayField(existing, 'note', cleaned.note);
    applyOptionalDayField(existing, 'routineId', cleaned.routineId);
    applyOptionalDayField(existing, 'routineName', cleaned.routineName);
    applyOptionalDayField(existing, 'warmupTemplateId', cleaned.warmupTemplateId);
    applyOptionalDayField(existing, 'warmupTemplateName', cleaned.warmupTemplateName);
    applyOptionalDayField(existing, 'cooldownTemplateId', cleaned.cooldownTemplateId);
    applyOptionalDayField(existing, 'cooldownTemplateName', cleaned.cooldownTemplateName);
  } else {
    const day: WorkoutDay = {
      id: dayId,
      entries: cleaned.entries ?? [],
    };
    if (cleaned.warmupEntries) day.warmupEntries = cleaned.warmupEntries;
    if (cleaned.cooldownEntries) day.cooldownEntries = cleaned.cooldownEntries;
    if (cleaned.completedAt) day.completedAt = cleaned.completedAt;
    if (cleaned.note) day.note = cleaned.note;
    if (cleaned.routineId) day.routineId = cleaned.routineId;
    if (cleaned.routineName) day.routineName = cleaned.routineName;
    if (cleaned.warmupTemplateId) day.warmupTemplateId = cleaned.warmupTemplateId;
    if (cleaned.warmupTemplateName) day.warmupTemplateName = cleaned.warmupTemplateName;
    if (cleaned.cooldownTemplateId) day.cooldownTemplateId = cleaned.cooldownTemplateId;
    if (cleaned.cooldownTemplateName) day.cooldownTemplateName = cleaned.cooldownTemplateName;
    store.workoutDays[profileId].push(day);
  }
  saveLocalStore(store);
}

export function deleteLocalWorkoutDay(profileId: string, dayId: string): void {
  const store = loadLocalStore();
  store.workoutDays[profileId] = (store.workoutDays[profileId] ?? []).filter(
    (d) => d.id !== dayId,
  );
  saveLocalStore(store);
}

export function getLocalProfileData(profileId: string): {
  measurements: Measurement[];
  habitDays: HabitDay[];
  workoutDays: WorkoutDay[];
} {
  return {
    measurements: getLocalMeasurements(profileId),
    habitDays: getLocalHabitDays(profileId),
    workoutDays: getLocalWorkoutDays(profileId),
  };
}

export function reloadGuestState(): {
  prefs: UserPrefs;
  profiles: Profile[];
  measurements: Measurement[];
  habitDays: HabitDay[];
  workoutDays: WorkoutDay[];
} {
  const store = loadLocalStore();
  const activeId =
    store.prefs.activeProfileId ?? store.profiles[0]?.id ?? null;
  return {
    prefs: { ...store.prefs, activeProfileId: activeId },
    profiles: store.profiles,
    measurements: activeId ? getLocalMeasurements(activeId) : [],
    habitDays: activeId ? getLocalHabitDays(activeId) : [],
    workoutDays: activeId ? getLocalWorkoutDays(activeId) : [],
  };
}
