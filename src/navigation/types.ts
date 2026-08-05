export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
};

export type BuyerStackParamList = {
  BuyerTabs: undefined;
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
