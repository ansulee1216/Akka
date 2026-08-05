import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth, type Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig, isFirebaseConfigured } from '../config/firebaseConfig';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// initializeAuth() must only be called once per app instance, and it throws if
// called a second time (e.g. during Fast Refresh in development) — so we fall
// back to getAuth() if it's already been set up.
let auth: Auth;
try {
  auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
} catch (e) {
  // Expected on Fast Refresh (auth already initialized) — falls back silently.
  // If this is actually the *first* init and it still failed, that's worth
  // knowing about, so log it rather than hiding it entirely.
  console.warn('[Akka] initializeAuth() with persistence failed, falling back to getAuth():', e);
  auth = getAuth(app);
}

// React Native's networking layer doesn't always play well with Firestore's
// default connection type — it can incorrectly report "client is offline"
// even with a perfectly good connection. Forcing long-polling is Firebase's
// documented workaround for this on React Native. Same Fast Refresh caveat
// as initializeAuth() above: this throws if called twice, so fall back to
// getFirestore() (which just returns the already-configured instance).
let db: Firestore;
try {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
} catch (e) {
  console.warn('[Akka] initializeFirestore() failed, falling back to getFirestore():', e);
  db = getFirestore(app);
}

// Firebase Storage — holds uploaded food/restaurant photos.
const storage: FirebaseStorage = getStorage(app);

export { app, auth, db, storage, isFirebaseConfigured };
