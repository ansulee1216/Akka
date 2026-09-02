import { Order, Restaurant, Listing } from '../types';
import { toMillis, isListingAvailable } from './listing';

export type FavoriteSort = 'frequent' | 'recent';

export interface FavoriteShop {
  restaurantId: string;
  restaurant?: Restaurant;
  /** How many times this buyer has ordered here. */
  orderCount: number;
  /** Milliseconds of the most recent order. */
  lastOrderedAt: number;
  /** Listings this shop has on sale right now, if any. */
  activeListings: Listing[];
}

/**
 * Which orders count as "having ordered here".
 *
 * Cancelled orders are excluded — a buyer who booked and then cancelled hasn't
 * expressed a preference for the shop, and counting it would put places they
 * actively backed out of at the top of their favourites.
 */
function countsAsVisit(order: Order): boolean {
  return order.status !== 'cancelled';
}

export function buildFavorites(
  orders: Order[],
  restaurants: Restaurant[],
  listings: Listing[],
  now: number = Date.now()
): FavoriteShop[] {
  const byRestaurant = new Map<string, FavoriteShop>();

  for (const order of orders) {
    if (!countsAsVisit(order)) continue;

    const existing = byRestaurant.get(order.restaurantId);
    const orderedAt = toMillis(order.createdAt);

    if (existing) {
      existing.orderCount += 1;
      existing.lastOrderedAt = Math.max(existing.lastOrderedAt, orderedAt);
    } else {
      byRestaurant.set(order.restaurantId, {
        restaurantId: order.restaurantId,
        restaurant: restaurants.find((r) => r.restaurantId === order.restaurantId),
        orderCount: 1,
        lastOrderedAt: orderedAt,
        activeListings: [],
      });
    }
  }

  // Attach whatever each shop currently has available, so the list can show
  // "지금 판매중" rather than being a dead history log.
  for (const shop of byRestaurant.values()) {
    shop.activeListings = listings.filter(
      (l) => l.restaurantId === shop.restaurantId && isListingAvailable(l, now)
    );
  }

  return Array.from(byRestaurant.values());
}

export function sortFavorites(shops: FavoriteShop[], sort: FavoriteSort): FavoriteShop[] {
  return [...shops].sort((a, b) => {
    if (sort === 'frequent') {
      if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
      // Equal counts — the one visited more recently is the better guess.
      return b.lastOrderedAt - a.lastOrderedAt;
    }
    if (b.lastOrderedAt !== a.lastOrderedAt) return b.lastOrderedAt - a.lastOrderedAt;
    return b.orderCount - a.orderCount;
  });
}

/**
 * "3일 전" / "어제" / "오늘" — coarse on purpose; exact dates aren't useful here.
 *
 * Takes the raw value rather than milliseconds, and normalises it. Firestore
 * hands back a Timestamp *object*, and subtracting one of those from a number
 * silently produces nonsense rather than an error — which is how a review
 * posted seconds ago ended up reading "54년 전".
 *
 * A missing timestamp means `serverTimestamp()` hasn't synced back yet, which
 * only happens for something just written — so "방금 전" is both accurate and
 * better than a blank space.
 */
export function relativeDay(value: unknown, now: number = Date.now()): string {
  const timestamp = toMillis(value);
  if (!timestamp) return '방금 전';

  const days = Math.floor((now - timestamp) / (24 * 60 * 60 * 1000));
  if (!Number.isFinite(days)) return '방금 전';

  if (days <= 0) return '오늘';
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  if (days < 365) return `${Math.floor(days / 30)}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
}
