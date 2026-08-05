import { Listing } from '../types';

/**
 * `createdAt` comes back from Firestore as a Timestamp object, not a number —
 * and it's briefly null on a document you just wrote, before the server's
 * value syncs back. This normalises all three cases to milliseconds.
 */
export function toMillis(value: any): number {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value.toMillis === 'function') return value.toMillis();
  return 0;
}

function parseHHmm(value: string): { hours: number; minutes: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value?.trim() ?? '');
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

/**
 * When a listing stops being collectable: the end of its pickup window, on the
 * day it was posted.
 *
 * Expiry is computed on the device rather than stored, because flipping a
 * status field on a schedule would need a Cloud Function, which requires a
 * paid Firebase plan. The trade-off is that expiry follows each phone's own
 * clock — fine here, since being a few minutes off just means a listing
 * lingers or vanishes slightly early.
 *
 * Returns Infinity when it can't be determined (e.g. the timestamp hasn't
 * synced from the server yet), so an unknown listing is never hidden.
 */
export function listingExpiresAt(listing: Listing): number {
  const created = toMillis(listing.createdAt);
  if (!created) return Infinity;

  const start = parseHHmm(listing.pickupWindowStart);
  const end = parseHHmm(listing.pickupWindowEnd);
  if (!end) return Infinity;

  const expiry = new Date(created);
  expiry.setHours(end.hours, end.minutes, 0, 0);

  // A window like 23:30–00:30 ends the following day.
  if (start && end.hours * 60 + end.minutes < start.hours * 60 + start.minutes) {
    expiry.setDate(expiry.getDate() + 1);
  }

  // If the computed end is already before the listing was even posted, the
  // seller meant the next day's window.
  if (expiry.getTime() <= created) {
    expiry.setDate(expiry.getDate() + 1);
  }

  return expiry.getTime();
}

export function isListingExpired(listing: Listing, now: number = Date.now()): boolean {
  return now > listingExpiresAt(listing);
}

/** Live on the buyer-facing browse list: active, in stock, and not past pickup. */
export function isListingAvailable(listing: Listing, now: number = Date.now()): boolean {
  return listing.status === 'active' && listing.quantityRemaining > 0 && !isListingExpired(listing, now);
}

/** What the seller sees on their dashboard, expiry included. */
export function effectiveStatus(listing: Listing, now: number = Date.now()): Listing['status'] {
  if (listing.status === 'cancelled') return 'cancelled';
  if (isListingExpired(listing, now)) return 'expired';
  if (listing.quantityRemaining <= 0) return 'soldOut';
  return listing.status;
}

/** Minutes until pickup closes; negative once closed. */
export function minutesUntilExpiry(listing: Listing, now: number = Date.now()): number {
  const expiry = listingExpiresAt(listing);
  if (!isFinite(expiry)) return Infinity;
  return Math.round((expiry - now) / 60000);
}
