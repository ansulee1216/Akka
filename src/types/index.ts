export type UserRole = 'buyer' | 'seller';

export interface AppUser {
  uid: string;
  displayName: string;
  phoneNumber?: string;
  role: UserRole;
}

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
