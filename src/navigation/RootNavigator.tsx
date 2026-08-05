import React from 'react';
import { useApp } from '../context/AppContext';
import LoadingScreen from '../screens/shared/LoadingScreen';
import FirebaseSetupNeededScreen from '../screens/shared/FirebaseSetupNeededScreen';
import ProfileErrorScreen from '../screens/shared/ProfileErrorScreen';
import CompleteProfileScreen from '../screens/shared/CompleteProfileScreen';
import AuthNavigator from './AuthNavigator';
import BuyerNavigator from './BuyerNavigator';
import SellerNavigator from './SellerNavigator';

export default function RootNavigator() {
  const {
    isFirebaseConfigured,
    authLoading,
    profileLoading,
    profileError,
    needsProfileSetup,
    firebaseUser,
    currentUser,
  } = useApp();

  if (!isFirebaseConfigured) return <FirebaseSetupNeededScreen />;
  if (authLoading) return <LoadingScreen label="로그인 확인 중..." />;
  if (!firebaseUser) return <AuthNavigator />;
  // A real failure (offline, permissions) — explain it, offer retry/sign-out.
  if (profileError) return <ProfileErrorScreen />;
  if (profileLoading) return <LoadingScreen label="프로필 불러오는 중..." />;
  // Signed in, but the profile document never got written — let them finish
  // the missing step instead of dead-ending them.
  if (needsProfileSetup || !currentUser) return <CompleteProfileScreen />;

  return currentUser.role === 'buyer' ? <BuyerNavigator /> : <SellerNavigator />;
}
