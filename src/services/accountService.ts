import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
  type User as FirebaseUser,
} from 'firebase/auth';
import { collection, query, where, getDocs, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Order } from '../types';

/** Thrown when Firebase needs a fresh login before it will delete the account. */
export class ReauthRequiredError extends Error {
  constructor() {
    super('보안을 위해 비밀번호를 다시 입력해주세요.');
    this.name = 'ReauthRequiredError';
  }
}

/**
 * Blocks deletion while a pickup is still outstanding.
 *
 * A buyer with a live reservation has food set aside for them; a shop with one
 * owes someone a handover. Letting either vanish mid-transaction strands the
 * other side with a code that will never be honoured, so we ask them to finish
 * or cancel first rather than silently breaking someone else's order.
 */
export function blockingOrders(orders: Order[]): Order[] {
  return orders.filter((o) => o.status === 'reserved');
}

export async function reauthenticate(user: FirebaseUser, password: string): Promise<void> {
  if (!user.email) throw new Error('이메일 정보를 찾을 수 없어요.');
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
}

async function deleteQueryResults(collectionName: string, field: string, value: string) {
  const snap = await getDocs(query(collection(db, collectionName), where(field, '==', value)));
  if (snap.empty) return;

  // Batched so a partial failure doesn't leave half the data behind.
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

/**
 * Deletes the account and the personal data attached to it.
 *
 * Order matters: Firestore documents go first, while the user is still
 * authenticated and the security rules still recognise them as the owner.
 * Deleting the auth account first would leave orphaned data that nobody has
 * permission to remove.
 *
 * Past orders are deliberately kept. They're a shop's transaction record, and
 * in most places business records must survive a customer closing an account.
 * They hold a uid, not a name or email, so nothing personally identifying
 * remains once the profile is gone.
 */
export async function deleteAccount(params: {
  user: FirebaseUser;
  uid: string;
  restaurantId?: string;
  password?: string;
}): Promise<void> {
  const { user, uid, restaurantId, password } = params;

  if (password) {
    await reauthenticate(user, password);
  }

  // Reviews they wrote — these carry their display name, so they go.
  await deleteQueryResults('reviews', 'buyerUid', uid);

  // A shop takes its listings with it, otherwise buyers see food from a
  // storefront that no longer exists.
  if (restaurantId) {
    await deleteQueryResults('listings', 'restaurantId', restaurantId);
    await deleteDoc(doc(db, 'restaurants', restaurantId));
  }

  await deleteDoc(doc(db, 'users', uid));

  try {
    await deleteUser(user);
  } catch (e: any) {
    // Firebase refuses to delete an account whose sign-in is more than a few
    // minutes old. Surfaced distinctly so the UI can ask for the password
    // rather than showing a generic failure.
    if (e?.code === 'auth/requires-recent-login') throw new ReauthRequiredError();
    throw e;
  }
}

export function currentUser(): FirebaseUser | null {
  return auth.currentUser;
}
