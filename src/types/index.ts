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
  category: string;
  address: string;
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
