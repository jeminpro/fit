import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDb } from './firebase';
import type {
  UserPrefs,
  Profile,
  Measurement,
  HabitDay,
  HabitDayInput,
  MeasurementInput,
  MeasurementType,
  UnitSystem,
  Sex,
} from './types';
import { DEFAULT_ENABLED_MEASUREMENTS } from './constants';
import { stripUndefined, stripUndefinedDeep, withTimeout } from './async';
import { auth } from './firebase';

function userRef(uid: string) {
  return doc(getDb(), 'users', uid);
}

function profilesRef(uid: string) {
  return collection(getDb(), 'users', uid, 'profiles');
}

function profileRef(uid: string, profileId: string) {
  return doc(getDb(), 'users', uid, 'profiles', profileId);
}

function measurementsRef(uid: string, profileId: string) {
  return collection(getDb(), 'users', uid, 'profiles', profileId, 'measurements');
}

function habitDaysRef(uid: string, profileId: string) {
  return collection(getDb(), 'users', uid, 'profiles', profileId, 'habitDays');
}

function parseUserPrefs(data: Record<string, unknown>): UserPrefs {
  return {
    units: (data.units as UnitSystem) ?? 'metric',
    activeProfileId: (data.activeProfileId as string | null) ?? null,
    profileOrder: Array.isArray(data.profileOrder)
      ? (data.profileOrder as string[])
      : undefined,
  };
}

export async function getUserPrefs(uid: string): Promise<UserPrefs | null> {
  const snap = await getDoc(userRef(uid));
  if (!snap.exists()) return null;
  return parseUserPrefs(snap.data());
}

export async function ensureUserPrefs(uid: string): Promise<UserPrefs> {
  const existing = await getUserPrefs(uid);
  if (existing) return existing;

  const prefs: UserPrefs = {
    units: 'metric',
    activeProfileId: null,
    profileOrder: [],
  };
  await setDoc(userRef(uid), prefs, { merge: true });
  return prefs;
}

export async function updateUserPrefs(
  uid: string,
  updates: Partial<UserPrefs>,
): Promise<void> {
  if (auth.currentUser) {
    await auth.currentUser.getIdToken();
  }
  await withTimeout(
    setDoc(userRef(uid), stripUndefined(updates), { merge: true }),
    15000,
    'Failed to save preferences',
  );
}

export function subscribeUserPrefs(
  uid: string,
  callback: (prefs: UserPrefs) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    userRef(uid),
    (snap) => {
      if (snap.exists()) {
        callback(parseUserPrefs(snap.data()));
        return;
      }

      const defaults: UserPrefs = {
        units: 'metric',
        activeProfileId: null,
        profileOrder: [],
      };
      void setDoc(userRef(uid), defaults, { merge: true });
      callback(defaults);
    },
    (error) => {
      console.error('User prefs subscription failed:', error);
      onError?.(error);
    },
  );
}

export async function getProfiles(uid: string): Promise<Profile[]> {
  const snap = await getDocs(profilesRef(uid));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Profile));
}

export function subscribeProfiles(
  uid: string,
  callback: (profiles: Profile[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    profilesRef(uid),
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Profile)));
    },
    (error) => {
      console.error('Profiles subscription failed:', error);
      onError?.(error);
    },
  );
}

export async function createProfile(
  uid: string,
  data: Omit<Profile, 'id'>,
): Promise<string> {
  if (auth.currentUser) {
    await auth.currentUser.getIdToken();
  }

  const ref = doc(profilesRef(uid));
  const profile = stripUndefinedDeep({
    name: data.name,
    sex: data.sex,
    birthDate: data.birthDate,
    enabledMeasurements:
      data.enabledMeasurements.length > 0
        ? data.enabledMeasurements
        : DEFAULT_ENABLED_MEASUREMENTS,
    goals: data.goals ?? {},
  });

  await withTimeout(setDoc(ref, profile), 15000, 'Failed to save profile');
  return ref.id;
}

export async function updateProfile(
  uid: string,
  profileId: string,
  updates: Partial<Omit<Profile, 'id'>>,
): Promise<void> {
  await withTimeout(
    setDoc(profileRef(uid, profileId), stripUndefinedDeep(updates), { merge: true }),
    15000,
    'Failed to update profile',
  );
}

export async function deleteProfile(
  uid: string,
  profileId: string,
): Promise<void> {
  const measurements = await getDocs(measurementsRef(uid, profileId));
  const habits = await getDocs(habitDaysRef(uid, profileId));
  const batch = writeBatch(getDb());

  measurements.docs.forEach((d) => batch.delete(d.ref));
  habits.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(profileRef(uid, profileId));
  await batch.commit();
}

export async function getMeasurements(
  uid: string,
  profileId: string,
): Promise<Measurement[]> {
  const q = query(measurementsRef(uid, profileId), orderBy('recordedAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Measurement));
}

export function subscribeMeasurements(
  uid: string,
  profileId: string,
  callback: (measurements: Measurement[]) => void,
): Unsubscribe {
  const q = query(measurementsRef(uid, profileId), orderBy('recordedAt', 'asc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Measurement)));
  });
}

export async function getMeasurementsByType(
  uid: string,
  profileId: string,
  type: MeasurementType,
): Promise<Measurement[]> {
  const q = query(
    measurementsRef(uid, profileId),
    where('type', '==', type),
    orderBy('recordedAt', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Measurement));
}

export async function addMeasurement(
  uid: string,
  profileId: string,
  input: MeasurementInput,
): Promise<string> {
  const ref = doc(measurementsRef(uid, profileId));
  await setDoc(ref, stripUndefined(input));
  return ref.id;
}

export async function addMeasurementsBatch(
  uid: string,
  profileId: string,
  inputs: MeasurementInput[],
): Promise<void> {
  const batch = writeBatch(getDb());
  for (const input of inputs) {
    const ref = doc(measurementsRef(uid, profileId));
    batch.set(ref, stripUndefined(input));
  }
  await batch.commit();
}

export async function updateMeasurement(
  uid: string,
  profileId: string,
  measurementId: string,
  updates: Partial<MeasurementInput>,
): Promise<void> {
  await setDoc(
    doc(getDb(), 'users', uid, 'profiles', profileId, 'measurements', measurementId),
    stripUndefined(updates),
    { merge: true },
  );
}

export async function deleteMeasurement(
  uid: string,
  profileId: string,
  measurementId: string,
): Promise<void> {
  await deleteDoc(
    doc(getDb(), 'users', uid, 'profiles', profileId, 'measurements', measurementId),
  );
}

export async function getHabitDays(
  uid: string,
  profileId: string,
): Promise<HabitDay[]> {
  const snap = await getDocs(habitDaysRef(uid, profileId));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as HabitDay));
}

export function subscribeHabitDays(
  uid: string,
  profileId: string,
  callback: (days: HabitDay[]) => void,
): Unsubscribe {
  return onSnapshot(habitDaysRef(uid, profileId), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as HabitDay)));
  });
}

export async function getHabitDay(
  uid: string,
  profileId: string,
  dayId: string,
): Promise<HabitDay | null> {
  const snap = await getDoc(doc(habitDaysRef(uid, profileId), dayId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as HabitDay;
}

export async function upsertHabitDay(
  uid: string,
  profileId: string,
  dayId: string,
  input: HabitDayInput,
): Promise<void> {
  const ref = doc(habitDaysRef(uid, profileId), dayId);
  await setDoc(ref, stripUndefined(input), { merge: true });
}

export async function deleteHabitDay(
  uid: string,
  profileId: string,
  dayId: string,
): Promise<void> {
  await deleteDoc(doc(habitDaysRef(uid, profileId), dayId));
}

export function buildProfileInput(
  name: string,
  sex: Sex,
  birthDate: string,
  enabledMeasurements: MeasurementType[],
  goals: Profile['goals'],
): Omit<Profile, 'id'> {
  return {
    name,
    sex,
    birthDate,
    enabledMeasurements,
    goals,
  };
}

export async function exportProfileData(
  uid: string,
  profile: Profile,
): Promise<{ measurements: Measurement[]; habitDays: HabitDay[] }> {
  const [measurements, habitDays] = await Promise.all([
    getMeasurements(uid, profile.id),
    getHabitDays(uid, profile.id),
  ]);
  return { measurements, habitDays };
}
