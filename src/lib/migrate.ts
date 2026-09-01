import {
  ensureUserPrefs,
  updateUserPrefs,
  createProfile,
  addMeasurementsBatch,
  upsertHabitDay,
} from './db';
import type { LocalStore } from './localDb';
import { clearLocalStore } from './localDb';
import { stripUndefined } from './async';
import type { HabitDayInput } from './types';

export async function migrateLocalToFirebase(
  uid: string,
  store: LocalStore,
): Promise<void> {
  const profileIdMap = new Map<string, string>();

  for (const profile of store.profiles) {
    const newId = await createProfile(uid, {
      name: profile.name,
      sex: profile.sex,
      birthDate: profile.birthDate,
      enabledMeasurements: profile.enabledMeasurements,
      goals: profile.goals,
    });
    profileIdMap.set(profile.id, newId);

    const measurements = store.measurements[profile.id] ?? [];
    if (measurements.length > 0) {
      await addMeasurementsBatch(
        uid,
        newId,
        measurements.map(({ type, value, recordedAt, note }) =>
          stripUndefined({ type, value, recordedAt, note }),
        ),
      );
    }

    const habitDays = store.habitDays[profile.id] ?? [];
    for (const day of habitDays) {
      const habitInput: HabitDayInput = stripUndefined({
        exercise: day.exercise,
        water: day.water,
        sleep: day.sleep,
        meditation: day.meditation,
        snacks: day.snacks,
        note: day.note,
      });
      await upsertHabitDay(uid, newId, day.id, habitInput);
    }
  }

  const activeLocalId = store.prefs.activeProfileId;
  const activeRemoteId = activeLocalId
    ? profileIdMap.get(activeLocalId) ?? null
    : null;

  await ensureUserPrefs(uid);
  await updateUserPrefs(uid, {
    units: store.prefs.units,
    activeProfileId: activeRemoteId,
  });

  clearLocalStore();
}
