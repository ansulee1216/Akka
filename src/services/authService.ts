import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { AppUser, UserRole } from '../types';

export function subscribeToAuthChanges(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Writes the user's profile document. Split out from signUp() so it can also
 * be used to repair an account whose profile write didn't complete (e.g. the
 * app was closed mid-sign-up, or Firestore wasn't reachable at the time).
 */
export async function createUserProfile(
  uid: string,
  email: string,
  displayName: string,
  role: UserRole,
  preferredCategories: string[] = []
): Promise<void> {
  await setDoc(doc(db, 'users', uid), {
    uid,
    email,
    displayName,
    role,
    // Only meaningful for buyers; sellers get an empty list.
    preferredCategories: role === 'buyer' ? preferredCategories : [],
    createdAt: serverTimestamp(),
  });
}

export async function signUp(
  email: string,
  password: string,
  displayName: string,
  role: UserRole,
  preferredCategories: string[] = []
): Promise<void> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });
  await createUserProfile(credential.user.uid, email, displayName, role, preferredCategories);
}

/** Lets a buyer change their favourites later, from the profile screen. */
export async function updatePreferredCategories(
  uid: string,
  preferredCategories: string[]
): Promise<void> {
  await setDoc(doc(db, 'users', uid), { preferredCategories }, { merge: true });
}

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export async function fetchUserProfile(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid,
    displayName: data.displayName ?? '',
    role: data.role,
    preferredCategories: data.preferredCategories ?? [],
  };
}

/**
 * Watches the user's profile document in real time.
 *
 * This is a live listener rather than a one-time read on purpose: during
 * sign-up, Firebase signs the user in the instant the account is created,
 * which is *before* the profile document finishes being written. A one-time
 * read would race against that write and wrongly conclude the profile is
 * missing. A listener simply fires again the moment the document appears.
 *
 * `onMissing` fires when the user is authenticated but has no profile doc —
 * either the race above (transient) or a genuinely incomplete sign-up.
 */
export function subscribeToUserProfile(
  uid: string,
  onProfile: (profile: AppUser) => void,
  onMissing: () => void,
  onError: (error: Error) => void
) {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists()) {
        onMissing();
        return;
      }
      const data = snap.data();
      onProfile({
        uid,
        displayName: data.displayName ?? '',
        role: data.role,
        preferredCategories: data.preferredCategories ?? [],
      });
    },
    onError
  );
}
