import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  initializeFirestore,
  memoryLocalCache,
  type Firestore,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let db: Firestore;

export function getFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0]!;
  }
  return app;
}

export function getDb(): Firestore {
  if (!db) {
    // Memory cache avoids IndexedDB multi-tab lock errors that break reads.
    db = initializeFirestore(getFirebaseApp(), {
      localCache: memoryLocalCache(),
    });
  }
  return db;
}

export const auth = getAuth(getFirebaseApp());
void setPersistence(auth, browserLocalPersistence).catch(() => {
  // Falls back to in-memory persistence; sign-in still works for the session.
});
export const googleProvider = new GoogleAuthProvider();

export function formatAuthError(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code: string }).code)
      : '';

  if (code === 'auth/unauthorized-domain') {
    return `This site (${window.location.hostname}) is not in Firebase → Authentication → Settings → Authorized domains. Add "${window.location.hostname}" and save.`;
  }

  if (code === 'auth/popup-blocked') {
    return 'Sign-in popup was blocked. Allow popups for this site or try again.';
  }

  if (error instanceof Error) return error.message;
  return 'Sign in failed.';
}

/** Call once on app load to finish a redirect sign-in flow. */
export async function completeRedirectSignIn(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch (error) {
    console.error('Redirect sign-in failed:', error);
    throw error;
  }
}

export async function signInWithGoogle(): Promise<void> {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? (error as { code: string }).code
        : '';

    // Popup blocked or unavailable — fall back to full-page redirect.
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request'
    ) {
      await signInWithRedirect(auth, googleProvider);
      return;
    }

    throw error;
  }
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    import.meta.env.PUBLIC_FIREBASE_API_KEY &&
      import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  );
}
