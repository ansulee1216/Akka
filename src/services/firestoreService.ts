import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  runTransaction,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { Restaurant, Listing, Order, PaymentMethod } from '../types';
import { toMillis } from '../utils/listing';

function generatePickupCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function sortByNewest<T>(items: T[]): T[] {
  return [...items].sort((a: any, b: any) => toMillis(b.createdAt) - toMillis(a.createdAt));
}

/**
 * Removes keys whose value is `undefined`.
 *
 * Firestore rejects `undefined` outright ("Unsupported field value"), but it's
 * the natural result of an optional field that wasn't filled in — e.g.
 * `photoUrl` when no photo was attached. Omitting the key entirely is what we
 * actually mean: the field simply isn't set on the document.
 *
 * Note this is deliberately shallow. `null` is left alone, since that's an
 * explicit "clear this field" and Firestore accepts it.
 */
function stripUndefined<T extends Record<string, any>>(data: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) cleaned[key] = value;
  }
  return cleaned;
}

// ── Restaurants ─────────────────────────────────────────────────────────────

export function subscribeToRestaurants(callback: (restaurants: Restaurant[]) => void) {
  // Sorted in JS rather than with orderBy: a document written with
  // serverTimestamp() has a null createdAt until the server value syncs back,
  // and Firestore drops documents missing the orderBy field from results —
  // which would make a just-created record briefly disappear.
  const q = query(collection(db, 'restaurants'));
  return onSnapshot(q, (snap) => {
    callback(sortByNewest(snap.docs.map((d) => ({ restaurantId: d.id, ...d.data() } as Restaurant))));
  });
}

export async function createRestaurant(
  data: Omit<Restaurant, 'restaurantId' | 'ownerUid' | 'isVerified' | 'createdAt'>,
  ownerUid: string
): Promise<string> {
  const ref = await addDoc(collection(db, 'restaurants'), {
    ...stripUndefined(data),
    ownerUid,
    isVerified: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function findRestaurantByOwner(ownerUid: string): Promise<Restaurant | null> {
  const q = query(collection(db, 'restaurants'), where('ownerUid', '==', ownerUid));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { restaurantId: d.id, ...d.data() } as Restaurant;
}

// ── Listings ────────────────────────────────────────────────────────────────

export function subscribeToListings(callback: (listings: Listing[]) => void) {
  // Sorted in JS — see the note on subscribeToRestaurants above.
  const q = query(collection(db, 'listings'));
  return onSnapshot(q, (snap) => {
    callback(sortByNewest(snap.docs.map((d) => ({ listingId: d.id, ...d.data() } as Listing))));
  });
}

export async function createListing(
  data: Omit<Listing, 'listingId' | 'quantityRemaining' | 'status' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'listings'), {
    ...stripUndefined(data),
    quantityRemaining: data.quantityTotal,
    status: 'active',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Edits a listing's details. Changing quantityTotal adjusts quantityRemaining
 * by the same delta inside a transaction, so edits can't silently wipe out
 * reservations that were made in the meantime.
 */
export async function updateListing(
  listingId: string,
  data: Partial<Omit<Listing, 'listingId' | 'restaurantId' | 'createdAt'>>
): Promise<void> {
  const listingRef = doc(db, 'listings', listingId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(listingRef);
    if (!snap.exists()) throw new Error('상품을 찾을 수 없어요.');
    const current = snap.data() as Listing;

    const patch: Record<string, any> = stripUndefined(data);

    if (typeof data.quantityTotal === 'number' && data.quantityTotal !== current.quantityTotal) {
      const claimed = current.quantityTotal - current.quantityRemaining;
      if (data.quantityTotal < claimed) {
        throw new Error(`이미 ${claimed}개가 예약됐어요. 수량을 그보다 적게 바꿀 수 없어요.`);
      }
      patch.quantityRemaining = data.quantityTotal - claimed;
      patch.status = patch.quantityRemaining === 0 ? 'soldOut' : 'active';
    }

    transaction.update(listingRef, patch);
  });
}

export async function setListingStatus(listingId: string, status: Listing['status']): Promise<void> {
  await updateDoc(doc(db, 'listings', listingId), { status });
}

/**
 * Deletes a listing.
 *
 * The caller is responsible for checking there are no outstanding
 * reservations first — otherwise a buyer turns up holding a pickup code for
 * something that no longer exists. That check lives in the UI, which already
 * has the restaurant's orders subscribed, rather than here: querying orders
 * by listingId would need a query shape that Firestore's security rules
 * can't verify, and would be rejected.
 */
export async function deleteListing(listingId: string): Promise<void> {
  await deleteDoc(doc(db, 'listings', listingId));
}

// ── Orders ──────────────────────────────────────────────────────────────────

// Note: these two deliberately filter in Firestore but sort in JS. Combining
// a `where` with an `orderBy` on a different field requires a hand-created
// composite index in the Firebase console, which is friction we don't need at
// this scale — one user's orders, or one restaurant's, is a small list. If
// order volume ever grows large enough to need pagination, switch these back
// to `orderBy` + `limit` and create the matching indexes.
export function subscribeToOrdersForRestaurant(restaurantId: string, callback: (orders: Order[]) => void) {
  const q = query(collection(db, 'orders'), where('restaurantId', '==', restaurantId));
  return onSnapshot(q, (snap) => {
    callback(sortByNewest(snap.docs.map((d) => ({ orderId: d.id, ...d.data() } as Order))));
  });
}

export function subscribeToOrdersForBuyer(buyerUid: string, callback: (orders: Order[]) => void) {
  const q = query(collection(db, 'orders'), where('buyerUid', '==', buyerUid));
  return onSnapshot(q, (snap) => {
    callback(sortByNewest(snap.docs.map((d) => ({ orderId: d.id, ...d.data() } as Order))));
  });
}

// Reserving a listing has to be a transaction: two buyers could tap "reserve"
// at nearly the same moment, and we must never let quantityRemaining go
// negative. runTransaction re-reads the listing right before committing and
// retries automatically if another reservation snuck in first.
export async function reserveListing(
  listingId: string,
  buyerUid: string,
  quantity: number,
  paymentMethod: PaymentMethod
): Promise<Order> {
  const listingRef = doc(db, 'listings', listingId);
  const orderRef = doc(collection(db, 'orders'));

  const result = await runTransaction(db, async (transaction) => {
    const listingSnap = await transaction.get(listingRef);
    if (!listingSnap.exists()) throw new Error('상품을 찾을 수 없어요.');
    const listing = listingSnap.data() as Listing;

    if (listing.quantityRemaining < quantity) {
      throw new Error('수량이 부족해요. 다른 고객이 먼저 예약했을 수 있어요.');
    }

    const remaining = listing.quantityRemaining - quantity;
    transaction.update(listingRef, {
      quantityRemaining: remaining,
      status: remaining === 0 ? 'soldOut' : listing.status,
    });

    const pickupCode = generatePickupCode();
    const orderData = {
      listingId,
      restaurantId: listing.restaurantId,
      buyerUid,
      quantity,
      totalPrice: listing.discountedPrice * quantity,
      paymentMethod,
      pickupCode,
      status: 'reserved' as const,
      createdAt: serverTimestamp(),
    };
    transaction.set(orderRef, orderData);

    return { orderId: orderRef.id, ...orderData, createdAt: Date.now() } as Order;
  });

  return result;
}

export async function markPickedUp(orderId: string): Promise<void> {
  await updateDoc(doc(db, 'orders', orderId), { status: 'pickedUp' });
}

/**
 * Buyer never turned up. Unlike a cancellation, the quantity is not returned
 * to the listing — by this point the pickup window has closed, so putting it
 * back on sale would be misleading.
 */
export async function markNoShow(orderId: string): Promise<void> {
  await updateDoc(doc(db, 'orders', orderId), { status: 'noShow' });
}

export async function cancelOrder(orderId: string): Promise<void> {
  const orderRef = doc(db, 'orders', orderId);
  await runTransaction(db, async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) return;
    const order = orderSnap.data() as Order;
    if (order.status !== 'reserved') return;

    const listingRef = doc(db, 'listings', order.listingId);
    const listingSnap = await transaction.get(listingRef);
    if (listingSnap.exists()) {
      const listing = listingSnap.data() as Listing;
      transaction.update(listingRef, {
        quantityRemaining: listing.quantityRemaining + order.quantity,
        status: 'active',
      });
    }
    transaction.update(orderRef, { status: 'cancelled' });
  });
}
