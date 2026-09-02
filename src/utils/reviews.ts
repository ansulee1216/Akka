import { Review } from '../types';
import { toMillis } from './listing';

export interface RatingSummary {
  /** Mean rating, or null when there are none. */
  average: number | null;
  count: number;
  /** How many reviews at each star level, indexed 1–5. */
  distribution: Record<number, number>;
}

export const EMPTY_SUMMARY: RatingSummary = {
  average: null,
  count: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

/** Ignores anything outside 1–5 so one malformed document can't skew a score. */
function isValid(review: Review): boolean {
  return Number.isFinite(review.rating) && review.rating >= 1 && review.rating <= 5;
}

export function summariseReviews(reviews: Review[]): RatingSummary {
  const valid = reviews.filter(isValid);
  if (valid.length === 0) return { ...EMPTY_SUMMARY, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;

  for (const review of valid) {
    const star = Math.round(review.rating);
    distribution[star] = (distribution[star] ?? 0) + 1;
    total += review.rating;
  }

  return {
    // One decimal — the precision people actually read ratings at.
    average: Math.round((total / valid.length) * 10) / 10,
    count: valid.length,
    distribution,
  };
}

/** Ratings grouped by restaurant, for showing a score on every card at once. */
export function summariseByRestaurant(reviews: Review[]): Map<string, RatingSummary> {
  const grouped = new Map<string, Review[]>();
  for (const review of reviews) {
    const list = grouped.get(review.restaurantId);
    if (list) list.push(review);
    else grouped.set(review.restaurantId, [review]);
  }

  const summaries = new Map<string, RatingSummary>();
  for (const [restaurantId, list] of grouped) {
    summaries.set(restaurantId, summariseReviews(list));
  }
  return summaries;
}

export function reviewsForRestaurant(reviews: Review[], restaurantId: string): Review[] {
  return reviews
    .filter((r) => r.restaurantId === restaurantId)
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
}

export function hasReviewedOrder(reviews: Review[], orderId: string): boolean {
  return reviews.some((r) => r.orderId === orderId);
}

/** e.g. "4.5" — or null when unrated, so callers can hide the row entirely. */
export function formatRating(summary: RatingSummary | undefined): string | null {
  if (!summary || summary.average === null) return null;
  return summary.average.toFixed(1);
}
