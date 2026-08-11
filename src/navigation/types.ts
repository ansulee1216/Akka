export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

export type BuyerStackParamList = {
  BuyerTabs: undefined;
  /** Pushed from the profile screen rather than living in the tab bar. */
  Orders: undefined;
  ListingDetail: { listingId: string };
  ReservationConfirm: {
    orderId: string;
    pickupCode: string;
    quantity: number;
    totalPrice: number;
    listingId: string;
  };
};

export type SellerStackParamList = {
  SellerTabs: undefined;
  EditListing: { listingId: string };
};
