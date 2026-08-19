import { Order, Listing } from '../types';
import { toMillis, isListingAvailable } from './listing';

export interface SellerStats {
  /** Reserved but not yet collected — what the shop needs to hand over. */
  pending: number;
  /** Collected today. */
  collected: number;
  /** Won from collected orders today. Reserved orders aren't counted — the
   *  money isn't real until someone walks in and pays at pickup. */
  revenueToday: number;
  /** Booked but never collected today. */
  noShows: number;
  /** Listings currently on sale. */
  activeListings: number;
  /** Portions still unsold across those listings. */
  unsoldPortions: number;
}

/** Midnight this morning, in local time. */
export function startOfDay(now: number = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function computeSellerStats(
  orders: Order[],
  listings: Listing[],
  now: number = Date.now()
): SellerStats {
  const dayStart = startOfDay(now);
  // An order with no synced timestamp yet was created moments ago, so treat it
  // as today's rather than dropping it from the count.
  const isToday = (order: Order) => {
    const created = toMillis(order.createdAt);
    return created === 0 || created >= dayStart;
  };

  const todays = orders.filter(isToday);
  const active = listings.filter((l) => isListingAvailable(l, now));

  return {
    // Pending isn't limited to today: an order placed late last night that
    // nobody collected is still outstanding and shouldn't silently vanish.
    pending: orders.filter((o) => o.status === 'reserved').length,
    collected: todays.filter((o) => o.status === 'pickedUp').length,
    revenueToday: todays
      .filter((o) => o.status === 'pickedUp')
      .reduce((sum, o) => sum + (o.totalPrice ?? 0), 0),
    noShows: todays.filter((o) => o.status === 'noShow').length,
    activeListings: active.length,
    unsoldPortions: active.reduce((sum, l) => sum + (l.quantityRemaining ?? 0), 0),
  };
}
