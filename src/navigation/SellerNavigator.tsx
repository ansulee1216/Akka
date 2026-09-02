import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/theme';
import { useApp } from '../context/AppContext';
import RestaurantSetupScreen from '../screens/seller/RestaurantSetupScreen';
import SellerDashboardScreen from '../screens/seller/SellerDashboardScreen';
import CreateListingScreen from '../screens/seller/CreateListingScreen';
import SellerOrdersScreen from '../screens/seller/SellerOrdersScreen';
import SellerSettingsScreen from '../screens/seller/SellerSettingsScreen';
import SellerReviewsScreen from '../screens/seller/SellerReviewsScreen';
import EditListingScreen from '../screens/seller/EditListingScreen';
import EditShopScreen from '../screens/seller/EditShopScreen';
import { SellerStackParamList } from './types';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<SellerStackParamList>();

function SellerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Dashboard: 'storefront-outline',
            CreateListing: 'add-circle-outline',
            SellerOrders: 'clipboard-outline',
            SellerReviews: 'star-outline',
            SellerSettings: 'settings-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={SellerDashboardScreen} options={{ title: '대시보드' }} />
      <Tab.Screen name="CreateListing" component={CreateListingScreen} options={{ title: '상품 등록' }} />
      <Tab.Screen name="SellerOrders" component={SellerOrdersScreen} options={{ title: '예약 현황' }} />
      <Tab.Screen name="SellerReviews" component={SellerReviewsScreen} options={{ title: '리뷰' }} />
      <Tab.Screen name="SellerSettings" component={SellerSettingsScreen} options={{ title: '설정' }} />
    </Tab.Navigator>
  );
}

// The tabs sit inside a stack so screens like "edit listing" can be pushed
// on top of them, with a back button, instead of becoming another tab.
export default function SellerNavigator() {
  const { myRestaurant } = useApp();

  if (!myRestaurant) {
    return <RestaurantSetupScreen />;
  }

  return (
    <Stack.Navigator>
      <Stack.Screen name="SellerTabs" component={SellerTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="EditListing"
        component={EditListingScreen}
        options={{ title: '상품 수정', headerBackTitle: '뒤로' }}
      />
      <Stack.Screen
        name="EditShop"
        component={EditShopScreen}
        options={{ title: '가게 정보 수정', headerBackTitle: '뒤로' }}
      />
    </Stack.Navigator>
  );
}
