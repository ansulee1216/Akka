import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { AppUser, Restaurant, Listing, Order, PaymentMethod } from '../types';
import {
  subscribeToAuthChanges,
  subscribeToUserProfile,
  createUserProfile,
  signOutUser,
} from '../services/authService';
import { UserRole } from '../types';
import {
  subscribeToRestaurants,
  subscribeToListings,
  subscribeToOrdersForBuyer,
  subscribeToOrdersForRestaurant,
  createRestaurant,
  createListing as createListingService,
  updateListing as updateListingService,
  deleteListing as deleteListingService,
  setListingStatus as setListingStatusService,
  reserveListing as reserveListingService,
  markPickedUp as markPickedUpService,
  markNoShow as markNoShowService,
  cancelOrder as cancelOrderService,
} from '../services/firestoreService';
import { isFirebaseConfigured } from '../config/firebaseConfig';
import { Restaurant as RestaurantType } from '../types';

interface AppContextValue {
  isFirebaseConfigured: boolean;
  authLoading: boolean;
  profileLoading: boolean;
  profileError: string | null;
  /** Signed in, but no profile document exists — the account needs repairing. */
  needsProfileSetup: boolean;
  completeProfile: (displayName: string, role: UserRole) => Promise<void>;
  retryProfile: () => void;
  firebaseUser: FirebaseUser | null;
  currentUser: AppUser | null;
  signOut: () => Promise<void>;

  restaurants: Restaurant[];
  listings: Listing[];
  myRestaurant: Restaurant | undefined;
  buyerOrders: Order[];
  sellerOrders: Order[];

  registerRestaurant: (
    data: Omit<Restaurant, 'restaurantId' | 'ownerUid' | 'isVerified' | 'createdAt'>
  ) => Promise<void>;
  createListing: (
    data: Omit<Listing, 'listingId' | 'quantityRemaining' | 'status' | 'createdAt'>
  ) => Promise<void>;
  updateListing: (
    listingId: string,
    data: Partial<Omit<Listing, 'listingId' | 'restaurantId' | 'createdAt'>>
  ) => Promise<void>;
  deleteListing: (listingId: string) => Promise<void>;
  setListingStatus: (listingId: string, status: Listing['status']) => Promise<void>;
  reserveListing: (listingId: string, quantity: number, paymentMethod: PaymentMethod) => Promise<Order>;
  markPickedUp: (orderId: string) => Promise<void>;
  markNoShow: (orderId: string) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  getRestaurant: (restaurantId: string) => Restaurant | undefined;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  // Bumping this re-runs the auth/profile effect, which is how "retry" works.
  const [retryCount, setRetryCount] = useState(0);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [buyerOrders, setBuyerOrders] = useState<Order[]>([]);
  const [sellerOrders, setSellerOrders] = useState<Order[]>([]);

  // Auth session — skipped entirely until a real Firebase project is configured,
  // so the app doesn't crash before you've pasted your config in.
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthLoading(false);
      return;
    }

    // Safety net: if Firebase never calls us back (bad network, a
    // misconfigured project, or a Firebase/AsyncStorage init issue on
    // device), don't leave the user stuck on a spinner forever. After 10s,
    // fall through to the login screen and log why, so it's visible in the
    // terminal running `npx expo start`.
    const timeoutId = setTimeout(() => {
      console.warn(
        '[Akka] Firebase auth check timed out after 10s — falling back to the login screen. ' +
          'This usually means the device could not reach Firebase, or firebaseConfig.ts has an ' +
          'incorrect value. Check the errors above, and double-check your config values.'
      );
      setAuthLoading(false);
    }, 10000);

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeToAuthChanges((user) => {
        clearTimeout(timeoutId);
        setFirebaseUser(user);
        if (!user) {
          setProfile(null);
          setProfileError(null);
          setNeedsProfileSetup(false);
        }
        setAuthLoading(false);
      });
    } catch (e) {
      console.error('[Akka] Failed to start Firebase auth listener:', e);
      clearTimeout(timeoutId);
      setAuthLoading(false);
    }

    return () => {
      clearTimeout(timeoutId);
      unsubscribe?.();
    };
  }, [retryCount]);

  // Profile document — watched live rather than read once. During sign-up the
  // user becomes authenticated a moment before their profile document finishes
  // being written, so a one-shot read would race that write and wrongly report
  // a missing profile. The listener just fires again once the doc lands.
  useEffect(() => {
    if (!isFirebaseConfigured || !firebaseUser) return;

    setProfileLoading(true);
    setProfileError(null);
    setNeedsProfileSetup(false);

    // If the doc is missing, it might simply not have been written *yet*
    // (sign-up still in flight). Give it a grace period before treating the
    // account as genuinely incomplete.
    let missingTimer: ReturnType<typeof setTimeout> | undefined;

    const unsubscribe = subscribeToUserProfile(
      firebaseUser.uid,
      (p) => {
        if (missingTimer) clearTimeout(missingTimer);
        setProfile(p);
        setNeedsProfileSetup(false);
        setProfileError(null);
        setProfileLoading(false);
      },
      () => {
        if (missingTimer) return; // already waiting out the grace period
        missingTimer = setTimeout(() => {
          setProfile(null);
          setNeedsProfileSetup(true);
          setProfileLoading(false);
        }, 6000);
      },
      (e: any) => {
        if (missingTimer) clearTimeout(missingTimer);
        console.error('[Akka] Failed to load user profile:', e);
        const msg = String(e?.message ?? '');
        setProfileError(
          msg.includes('offline')
            ? '데이터베이스에 연결할 수 없어요. 인터넷 연결을 확인하고, Firebase 콘솔에서 Firestore Database가 생성되어 있는지 확인해주세요.'
            : msg.includes('permission')
              ? '데이터베이스 접근 권한이 없어요. Firebase 콘솔의 Firestore > 규칙(Rules)에 프로젝트의 firestore.rules 내용이 게시되어 있는지 확인해주세요.'
              : '프로필을 불러오지 못했어요. 다시 시도해주세요.'
        );
        setProfileLoading(false);
      }
    );

    return () => {
      if (missingTimer) clearTimeout(missingTimer);
      unsubscribe();
    };
  }, [firebaseUser, retryCount]);

  // Public data — everyone can see restaurants and active listings, logged in or not.
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsubRestaurants = subscribeToRestaurants(setRestaurants);
    const unsubListings = subscribeToListings(setListings);
    return () => {
      unsubRestaurants();
      unsubListings();
    };
  }, []);

  const myRestaurant = useMemo(
    () => (profile ? restaurants.find((r) => r.ownerUid === profile.uid) : undefined),
    [restaurants, profile]
  );

  // Buyer's own orders.
  useEffect(() => {
    if (!isFirebaseConfigured || !profile || profile.role !== 'buyer') {
      setBuyerOrders([]);
      return;
    }
    return subscribeToOrdersForBuyer(profile.uid, setBuyerOrders);
  }, [profile]);

  // Seller's incoming orders, once they've registered a restaurant.
  useEffect(() => {
    if (!isFirebaseConfigured || !myRestaurant) {
      setSellerOrders([]);
      return;
    }
    return subscribeToOrdersForRestaurant(myRestaurant.restaurantId, setSellerOrders);
  }, [myRestaurant]);

  const signOut = useCallback(async () => {
    setProfileError(null);
    await signOutUser();
  }, []);

  const retryProfile = useCallback(() => {
    setProfileError(null);
    setNeedsProfileSetup(false);
    setRetryCount((c) => c + 1);
  }, []);

  // Repairs an account that has auth credentials but no profile document.
  const completeProfile = useCallback(
    async (displayName: string, role: UserRole) => {
      if (!firebaseUser) throw new Error('로그인이 필요해요.');
      await createUserProfile(
        firebaseUser.uid,
        firebaseUser.email ?? '',
        displayName,
        role
      );
      // The live profile listener picks the new document up automatically.
    },
    [firebaseUser]
  );

  const registerRestaurant: AppContextValue['registerRestaurant'] = useCallback(
    async (data) => {
      if (!profile) throw new Error('로그인이 필요해요.');
      await createRestaurant(data, profile.uid);
    },
    [profile]
  );

  const createListing: AppContextValue['createListing'] = useCallback(async (data) => {
    await createListingService(data);
  }, []);

  const reserveListing: AppContextValue['reserveListing'] = useCallback(
    async (listingId, quantity, paymentMethod) => {
      if (!profile) throw new Error('로그인이 필요해요.');
      return reserveListingService(listingId, profile.uid, quantity, paymentMethod);
    },
    [profile]
  );

  const updateListing: AppContextValue['updateListing'] = useCallback(async (listingId, data) => {
    await updateListingService(listingId, data);
  }, []);

  const deleteListing: AppContextValue['deleteListing'] = useCallback(async (listingId) => {
    await deleteListingService(listingId);
  }, []);

  const setListingStatus: AppContextValue['setListingStatus'] = useCallback(
    async (listingId, status) => {
      await setListingStatusService(listingId, status);
    },
    []
  );

  const markPickedUp: AppContextValue['markPickedUp'] = useCallback(async (orderId) => {
    await markPickedUpService(orderId);
  }, []);

  const markNoShow: AppContextValue['markNoShow'] = useCallback(async (orderId) => {
    await markNoShowService(orderId);
  }, []);

  const cancelOrder: AppContextValue['cancelOrder'] = useCallback(async (orderId) => {
    await cancelOrderService(orderId);
  }, []);

  const getRestaurant = useCallback(
    (restaurantId: string): RestaurantType | undefined =>
      restaurants.find((r) => r.restaurantId === restaurantId),
    [restaurants]
  );

  const value: AppContextValue = {
    isFirebaseConfigured,
    authLoading,
    profileLoading,
    profileError,
    needsProfileSetup,
    completeProfile,
    retryProfile,
    firebaseUser,
    currentUser: profile,
    signOut,
    restaurants,
    listings,
    myRestaurant,
    buyerOrders,
    sellerOrders,
    registerRestaurant,
    createListing,
    updateListing,
    deleteListing,
    setListingStatus,
    reserveListing,
    markPickedUp,
    markNoShow,
    cancelOrder,
    getRestaurant,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
