import { Listing, Restaurant } from '../types';
import { isListingAvailable, toMillis } from './listing';
import { restaurantCategories } from './restaurant';
import { distanceInMeters, type Coords } from '../services/locationService';

/** A listing paired with the context each rail needs to rank and render it. */
export interface FeedItem {
  listing: Listing;
  restaurant?: Restaurant;
  distance: number | null;
}

/** Discount at or above this counts as a 특별 할인. */
export const SPECIAL_DISCOUNT_THRESHOLD = 60;

export function discountPercent(listing: Listing): number {
  if (!listing.originalPrice) return 0;
  return Math.round((1 - listing.discountedPrice / listing.originalPrice) * 100);
}

/** Everything currently buyable, with distance attached where known. */
export function buildFeed(
  listings: Listing[],
  restaurants: Restaurant[],
  coords: Coords | null,
  now: number = Date.now()
): FeedItem[] {
  return listings
    .filter((listing) => isListingAvailable(listing, now))
    .map((listing) => {
      const restaurant = restaurants.find((r) => r.restaurantId === listing.restaurantId);
      const distance =
        coords && restaurant
          ? distanceInMeters(coords, {
              latitude: restaurant.latitude,
              longitude: restaurant.longitude,
            })
          : null;
      return { listing, restaurant, distance };
    });
}

/** Nearest first. Items we can't place go last rather than first. */
export function byDistance(a: FeedItem, b: FeedItem): number {
  if (a.distance === null && b.distance === null) return 0;
  if (a.distance === null) return 1;
  if (b.distance === null) return -1;
  return a.distance - b.distance;
}

export function byNewest(a: FeedItem, b: FeedItem): number {
  return toMillis(b.listing.createdAt) - toMillis(a.listing.createdAt);
}

/**
 * 추천 — a first pass at personalisation.
 *
 * Scores each listing on three things we actually have today: whether the shop
 * matches a category the buyer said they like, how close it is, and how deep
 * the discount is. Preference match dominates, so the rail is visibly *theirs*
 * rather than a reshuffle of 가까운 거리에.
 *
 * This is deliberately a heuristic, not a recommender. Once there are real
 * users there'll be behaviour to learn from — reservations, repeat shops,
 * ratings — and this function is where that goes.
 */
export function recommendationScore(
  item: FeedItem,
  preferredCategories: string[]
): number {
  let score = 0;

  const categories = restaurantCategories(item.restaurant);
  const matches = categories.filter((c) => preferredCategories.includes(c)).length;
  // Matching two of a buyer's picks beats matching one, but with diminishing
  // returns — a shop tagged 한식 + 분식 shouldn't bury a perfect single match.
  if (matches > 0) score += 100 + (matches - 1) * 20;

  // Proximity, tapering to nothing at 5km. Unknown distance scores neutral so
  // a missing location doesn't push a listing to the bottom.
  if (item.distance !== null) {
    score += Math.max(0, 50 - (item.distance / 5000) * 50);
  } else {
    score += 20;
  }

  // A deeper discount is a genuine reason to surface something.
  score += Math.min(discountPercent(item.listing), 80) * 0.4;

  return score;
}

export function rankRecommended(items: FeedItem[], preferredCategories: string[]): FeedItem[] {
  return [...items].sort(
    (a, b) => recommendationScore(b, preferredCategories) - recommendationScore(a, preferredCategories)
  );
}

export function rankNearby(items: FeedItem[]): FeedItem[] {
  return [...items].sort(byDistance);
}

/**
 * 특별 할인 — only the deepest discounts, steepest first.
 *
 * Ties break on the larger cash saving, so between two 75%-off listings the
 * ₩20,000 bag outranks the ₩4,000 one. Same headline percentage, more actually
 * saved.
 */
export function rankSpecialDeals(items: FeedItem[]): FeedItem[] {
  return items
    .filter((item) => discountPercent(item.listing) >= SPECIAL_DISCOUNT_THRESHOLD)
    .sort((a, b) => {
      const byPercent = discountPercent(b.listing) - discountPercent(a.listing);
      if (byPercent !== 0) return byPercent;
      const savingA = a.listing.originalPrice - a.listing.discountedPrice;
      const savingB = b.listing.originalPrice - b.listing.discountedPrice;
      return savingB - savingA;
    });
}

/** Case-insensitive match across listing title, description and shop name. */
export function matchesQuery(item: FeedItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const haystack = [
    item.listing.title,
    item.listing.description,
    item.restaurant?.name,
    ...restaurantCategories(item.restaurant),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}
