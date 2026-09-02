export type UserRole = 'buyer' | 'seller';

export interface AppUser {
  uid: string;
  displayName: string;
  phoneNumber?: string;
  role: UserRole;
  /**
   * Food categories a buyer said they like, up to three, chosen at signup.
   * Drives the 추천 rail on the home screen. Absent for sellers, and for
   * accounts created before this existed.
   */
  preferredCategories?: string[];
}

/** How many favourite categories a buyer may pick. */
export const MAX_PREFERRED_CATEGORIES = 3;

export interface Restaurant {
  restaurantId: string;
  ownerUid: string;
  name: string;
  /** Up to two, chosen at registration. Use `restaurantCategories()` to read. */
  categories?: string[];
  /**
   * @deprecated Single category from before shops could pick two. Still
   * present on older documents, so reads must fall back to it.
   */
  category?: string;
  address: string;
  /**
   * Optional extra detail the map can't provide — floor, unit, building name,
   * "back entrance", and so on. Kept separate from `address` so the searched
   * address stays exactly as Kakao returned it.
   */
  addressDetail?: string;
  latitude: number;
  longitude: number;
  phoneNumber: string;
  photoUrl?: string;
  isVerified: boolean;
  createdAt: number;
}

export type ListingStatus = 'active' | 'soldOut' | 'expired' | 'cancelled';

export interface Listing {
  listingId: string;
  restaurantId: string;
  title: string;
  description: string;
  photoUrl?: string;
  originalPrice: number;
  discountedPrice: number;
  quantityTotal: number;
  quantityRemaining: number;
  pickupWindowStart: string; // "HH:mm"
  pickupWindowEnd: string;   // "HH:mm"
  status: ListingStatus;
  createdAt: number;
}

export type PaymentMethod = 'pickup' | 'toss';
export type OrderStatus = 'reserved' | 'pickedUp' | 'noShow' | 'cancelled';

export interface Order {
  orderId: string;
  listingId: string;
  restaurantId: string;
  buyerUid: string;
  quantity: number;
  totalPrice: number;
  paymentMethod: PaymentMethod;
  pickupCode: string;
  status: OrderStatus;
  createdAt: number;
}

/**
 * A buyer's review of a completed pickup.
 *
 * The document ID *is* the orderId. That's deliberate: it makes one-review-per-
 * order a property of the database rather than something the app has to police,
 * so a double-tap or a retry can't produce two reviews for the same pickup.
 */
export interface Review {
  /** Same value as orderId — see above. */
  reviewId: string;
  orderId: string;
  restaurantId: string;
  buyerUid: string;
  /** Snapshotted so reviews still read correctly if a display name changes. */
  buyerName: string;
  /** Whole stars, 1–5. */
  rating: number;
  /** Optional — plenty of people rate without writing anything. */
  comment?: string;
  /** Snapshotted so a review still makes sense if the listing is deleted. */
  listingTitle?: string;
  createdAt: number;
}

export const MIN_RATING = 1;
export const MAX_RATING = 5;
