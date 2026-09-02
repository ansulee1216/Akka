import { collection, doc, setDoc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { Review, Order } from '../types';

/**
 * Watches every review.
 *
 * Sorted in JS rather than with orderBy, for the same reason as listings: a
 * document written with serverTimestamp() has a null createdAt until the server
 * value syncs back, and Firestore drops documents missing the orderBy field —
 * which would make a review vanish for a moment right after posting it.
 *
 * Fetching all reviews is fine at this scale and keeps the client simple. If
 * this ever grows large, switch to per-restaurant queries and store a running
 * average on the restaurant document.
 */
export function subscribeToReviews(callback: (reviews: Review[]) => void) {
  return onSnapshot(query(collection(db, 'reviews')), (snap) => {
    const reviews = snap.docs.map((d) => ({ reviewId: d.id, ...d.data() } as Review));
    callback(reviews);
  });
}

/**
 * Writes a review for a completed order.
 *
 * Uses the orderId as the document ID, so re-submitting overwrites rather than
 * duplicating. Only orders the buyer actually collected can be reviewed —
 * rating a shop you never picked up from isn't a real opinion.
 */
export async function submitReview(params: {
  order: Order;
  buyerName: string;
  rating: number;
  comment?: string;
  listingTitle?: string;
}): Promise<void> {
  const { order, buyerName, rating, comment, listingTitle } = params;

  if (order.status !== 'pickedUp') {
    throw new Error('픽업이 완료된 주문만 리뷰를 남길 수 있어요.');
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('별점을 1점에서 5점 사이로 선택해주세요.');
  }

  const trimmed = comment?.trim();

  await setDoc(doc(db, 'reviews', order.orderId), {
    orderId: order.orderId,
    restaurantId: order.restaurantId,
    buyerUid: order.buyerUid,
    buyerName,
    rating,
    // Omitted entirely when blank — Firestore rejects undefined, and an empty
    // string would render as a review with a mysteriously blank body.
    ...(trimmed ? { comment: trimmed } : {}),
    ...(listingTitle ? { listingTitle } : {}),
    createdAt: serverTimestamp(),
  });
}
