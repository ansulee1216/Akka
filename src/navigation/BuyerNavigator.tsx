import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/theme';
import BrowseScreen from '../screens/buyer/BrowseScreen';
import OrdersScreen from '../screens/buyer/OrdersScreen';
import BuyerProfileScreen from '../screens/buyer/BuyerProfileScreen';
import ListingDetailScreen from '../screens/buyer/ListingDetailScreen';
import ReservationConfirmScreen from '../screens/buyer/ReservationConfirmScreen';
import { BuyerStackParamList } from './types';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<BuyerStackParamList>();

function BuyerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Browse: 'search-outline',
            Orders: 'receipt-outline',
            Profile: 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Browse" component={BrowseScreen} options={{ title: '둘러보기' }} />
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ title: '내 예약' }} />
      <Tab.Screen name="Profile" component={BuyerProfileScreen} options={{ title: '프로필' }} />
    </Tab.Navigator>
  );
}

export default function BuyerNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BuyerTabs" component={BuyerTabs} />
      <Stack.Screen
        name="ListingDetail"
        component={ListingDetailScreen}
        options={{ headerShown: true, title: '상품 상세', headerBackTitle: '뒤로' }}
      />
      <Stack.Screen name="ReservationConfirm" component={ReservationConfirmScreen} />
    </Stack.Navigator>
  );
}
