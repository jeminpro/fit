import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import {
  subscribeToAuth,
  signInWithGoogle,
  signOut as firebaseSignOut,
  isFirebaseConfigured,
  completeRedirectSignIn,
  formatAuthError,
} from '../lib/firebase';
import {
  subscribeUserPrefs,
  subscribeProfiles,
  subscribeMeasurements,
  subscribeHabitDays,
  updateUserPrefs,
  createProfile as createRemoteProfile,
  updateProfile as updateRemoteProfile,
  deleteProfile as deleteRemoteProfile,
  addMeasurement as addRemoteMeasurement,
  addMeasurementsBatch as addRemoteMeasurementsBatch,
  updateMeasurement as updateRemoteMeasurement,
  deleteMeasurement as deleteRemoteMeasurement,
  upsertHabitDay as upsertRemoteHabitDay,
  exportProfileData,
} from '../lib/db';
import {
  reloadGuestState,
  updateLocalPrefs,
  createLocalProfile,
  updateLocalProfile,
  deleteLocalProfile,
  addLocalMeasurement,
  addLocalMeasurementsBatch,
  updateLocalMeasurement,
  deleteLocalMeasurement,
  upsertLocalHabitDay,
  getLocalProfileData,
  loadLocalStore,
  clearLocalStore,
} from '../lib/localDb';
import { migrateLocalToFirebase } from '../lib/migrate';
import type {
  UserPrefs,
  Profile,
  Measurement,
  HabitDay,
  UnitSystem,
  HabitDayInput,
  MeasurementInput,
} from '../lib/types';

interface AppContextValue {
  user: User | null;
  isGuest: boolean;
  loading: boolean;
  migrating: boolean;
  firebaseReady: boolean;
  prefs: UserPrefs | null;
  profiles: Profile[];
  activeProfile: Profile | null;
  measurements: Measurement[];
  habitDays: HabitDay[];
  habitDaysMap: Map<string, HabitDay>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
  setActiveProfile: (profileId: string) => Promise<void>;
  setUnits: (units: UnitSystem) => Promise<void>;
  refreshPrefs: () => void;
  refreshGuestData: () => void;
  setupInitialProfile: (
    data: Omit<Profile, 'id'>,
    units: UnitSystem,
  ) => Promise<string>;
  createProfile: (data: Omit<Profile, 'id'>) => Promise<string>;
  updateProfile: (
    profileId: string,
    updates: Partial<Omit<Profile, 'id'>>,
  ) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
  addMeasurement: (input: MeasurementInput) => Promise<string>;
  addMeasurementsBatch: (inputs: MeasurementInput[]) => Promise<void>;
  updateMeasurement: (
    measurementId: string,
    updates: Partial<MeasurementInput>,
  ) => Promise<void>;
  deleteMeasurement: (measurementId: string) => Promise<void>;
  upsertHabitDay: (dayId: string, input: HabitDayInput) => Promise<void>;
  getProfileExportData: (
    profile: Profile,
  ) => Promise<{ measurements: Measurement[]; habitDays: HabitDay[] }>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [habitDays, setHabitDays] = useState<HabitDay[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);

  const migrationChecked = useRef(false);

  const firebaseReady = isFirebaseConfigured();
  const isGuest = firebaseReady && !user;
  const loading =
    authLoading ||
    (Boolean(user) && (!prefsLoaded || !profilesLoaded));

  const refreshGuestData = useCallback(() => {
    const state = reloadGuestState();
    setPrefs(state.prefs);
    setProfiles(state.profiles);
    setMeasurements(state.measurements);
    setHabitDays(state.habitDays);
    setPrefsLoaded(true);
    setProfilesLoaded(true);
  }, []);

  useEffect(() => {
    if (!firebaseReady) {
      setAuthLoading(false);
      setPrefsLoaded(true);
      setProfilesLoaded(true);
      return;
    }

    void completeRedirectSignIn().catch((error) => {
      setAuthError(formatAuthError(error));
    });

    return subscribeToAuth((nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);

      if (!nextUser) {
        setMigrating(false);
        migrationChecked.current = false;
        setPrefsLoaded(false);
        setProfilesLoaded(false);
        refreshGuestData();
      }
    });
  }, [firebaseReady, refreshGuestData]);

  useEffect(() => {
    if (!user) return;

    setPrefsLoaded(false);
    const fallback = setTimeout(() => setPrefsLoaded(true), 8000);

    const unsubscribe = subscribeUserPrefs(
      user.uid,
      (nextPrefs) => {
        setPrefs(nextPrefs);
        setPrefsLoaded(true);
        clearTimeout(fallback);
      },
      () => {
        setPrefs({ units: 'metric', activeProfileId: null });
        setPrefsLoaded(true);
        clearTimeout(fallback);
      },
    );

    return () => {
      clearTimeout(fallback);
      unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    setProfilesLoaded(false);
    const fallback = setTimeout(() => setProfilesLoaded(true), 8000);

    const unsubscribe = subscribeProfiles(
      user.uid,
      (nextProfiles) => {
        setProfiles(nextProfiles);
        setProfilesLoaded(true);
        clearTimeout(fallback);

        if (migrationChecked.current) return;
        migrationChecked.current = true;

        const localStore = loadLocalStore();
        const hasLocalData = localStore.profiles.length > 0;

        if (!hasLocalData) return;

        void (async () => {
          if (nextProfiles.length === 0) {
            setMigrating(true);
            try {
              await migrateLocalToFirebase(user.uid, localStore);
            } catch (error) {
              console.error('Local data migration failed:', error);
            } finally {
              setMigrating(false);
            }
          } else {
            clearLocalStore();
          }
        })();
      },
      () => {
        setProfilesLoaded(true);
        clearTimeout(fallback);
      },
    );

    return () => {
      clearTimeout(fallback);
      unsubscribe();
    };
  }, [user]);

  const activeProfile = useMemo(() => {
    if (!prefs?.activeProfileId) return profiles[0] ?? null;
    return profiles.find((p) => p.id === prefs.activeProfileId) ?? profiles[0] ?? null;
  }, [prefs, profiles]);

  useEffect(() => {
    if (user && activeProfile) {
      const unsubMeasurements = subscribeMeasurements(
        user.uid,
        activeProfile.id,
        setMeasurements,
      );
      const unsubHabits = subscribeHabitDays(
        user.uid,
        activeProfile.id,
        setHabitDays,
      );
      return () => {
        unsubMeasurements();
        unsubHabits();
      };
    }

    if (isGuest && activeProfile) {
      refreshGuestData();
    } else if (isGuest && !activeProfile) {
      setMeasurements([]);
      setHabitDays([]);
    }
  }, [user, isGuest, activeProfile?.id, refreshGuestData]);

  useEffect(() => {
    if (!user || !prefs?.activeProfileId || profiles.length === 0) return;
    const exists = profiles.some((p) => p.id === prefs.activeProfileId);
    if (!exists && profiles[0]) {
      updateUserPrefs(user.uid, { activeProfileId: profiles[0].id }).then(() => {
        setPrefs((prev) =>
          prev ? { ...prev, activeProfileId: profiles[0]!.id } : prev,
        );
      });
    }
  }, [user, prefs?.activeProfileId, profiles]);

  const habitDaysMap = useMemo(
    () => new Map(habitDays.map((d) => [d.id, d])),
    [habitDays],
  );

  async function signIn() {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (error) {
      setAuthError(formatAuthError(error));
      throw error;
    }
  }

  async function signOut() {
    setAuthError(null);
    await firebaseSignOut();
    refreshGuestData();
  }

  function clearAuthError() {
    setAuthError(null);
  }

  async function setActiveProfile(profileId: string) {
    if (user) {
      await updateUserPrefs(user.uid, { activeProfileId: profileId });
      setPrefs((prev) => (prev ? { ...prev, activeProfileId: profileId } : prev));
    } else {
      const next = updateLocalPrefs({ activeProfileId: profileId });
      setPrefs(next);
      refreshGuestData();
    }
  }

  async function setUnits(units: UnitSystem) {
    if (user) {
      await updateUserPrefs(user.uid, { units });
      setPrefs((prev) => (prev ? { ...prev, units } : prev));
    } else {
      const next = updateLocalPrefs({ units });
      setPrefs(next);
    }
  }

  function refreshPrefs() {
    if (!user) refreshGuestData();
  }

  async function setupInitialProfile(
    data: Omit<Profile, 'id'>,
    units: UnitSystem,
  ): Promise<string> {
    if (user) {
      const profileId = await createRemoteProfile(user.uid, data);
      await updateUserPrefs(user.uid, { units, activeProfileId: profileId });
      const profile: Profile = { id: profileId, ...data };
      setProfiles([profile]);
      setPrefs({ units, activeProfileId: profileId });
      return profileId;
    }

    updateLocalPrefs({ units });
    const profileId = createLocalProfile(data);
    updateLocalPrefs({ activeProfileId: profileId });
    refreshGuestData();
    return profileId;
  }

  async function createProfile(data: Omit<Profile, 'id'>) {
    if (user) {
      return createRemoteProfile(user.uid, data);
    }
    const id = createLocalProfile(data);
    refreshGuestData();
    return id;
  }

  async function updateProfile(
    profileId: string,
    updates: Partial<Omit<Profile, 'id'>>,
  ) {
    if (user) {
      await updateRemoteProfile(user.uid, profileId, updates);
    } else {
      updateLocalProfile(profileId, updates);
      refreshGuestData();
    }
  }

  async function deleteProfile(profileId: string) {
    if (user) {
      await deleteRemoteProfile(user.uid, profileId);
    } else {
      deleteLocalProfile(profileId);
      refreshGuestData();
    }
  }

  async function addMeasurement(input: MeasurementInput) {
    if (!activeProfile) throw new Error('No active profile');
    if (user) {
      return addRemoteMeasurement(user.uid, activeProfile.id, input);
    }
    const id = addLocalMeasurement(activeProfile.id, input);
    refreshGuestData();
    return id;
  }

  async function addMeasurementsBatch(inputs: MeasurementInput[]) {
    if (!activeProfile) throw new Error('No active profile');
    if (user) {
      await addRemoteMeasurementsBatch(user.uid, activeProfile.id, inputs);
    } else {
      addLocalMeasurementsBatch(activeProfile.id, inputs);
      refreshGuestData();
    }
  }

  async function updateMeasurement(
    measurementId: string,
    updates: Partial<MeasurementInput>,
  ) {
    if (!activeProfile) throw new Error('No active profile');
    if (user) {
      await updateRemoteMeasurement(
        user.uid,
        activeProfile.id,
        measurementId,
        updates,
      );
    } else {
      updateLocalMeasurement(activeProfile.id, measurementId, updates);
      refreshGuestData();
    }
  }

  async function deleteMeasurement(measurementId: string) {
    if (!activeProfile) throw new Error('No active profile');
    if (user) {
      await deleteRemoteMeasurement(user.uid, activeProfile.id, measurementId);
    } else {
      deleteLocalMeasurement(activeProfile.id, measurementId);
      refreshGuestData();
    }
  }

  async function upsertHabitDay(dayId: string, input: HabitDayInput) {
    if (!activeProfile) throw new Error('No active profile');
    if (user) {
      await upsertRemoteHabitDay(user.uid, activeProfile.id, dayId, input);
    } else {
      upsertLocalHabitDay(activeProfile.id, dayId, input);
      refreshGuestData();
    }
  }

  async function getProfileExportData(profile: Profile) {
    if (user) {
      return exportProfileData(user.uid, profile);
    }
    return getLocalProfileData(profile.id);
  }

  const value: AppContextValue = {
    user,
    isGuest,
    loading,
    migrating,
    firebaseReady,
    prefs,
    profiles,
    activeProfile,
    measurements,
    habitDays,
    habitDaysMap,
    signIn,
    signOut,
    authError,
    clearAuthError,
    setActiveProfile,
    setUnits,
    refreshPrefs,
    refreshGuestData,
    setupInitialProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    addMeasurement,
    addMeasurementsBatch,
    updateMeasurement,
    deleteMeasurement,
    upsertHabitDay,
    getProfileExportData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
