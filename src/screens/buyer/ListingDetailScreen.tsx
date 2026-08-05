import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useApp } from '../../context/AppContext';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { BuyerStackParamList } from '../../navigation/types';
import { useBuyerLocation } from '../../hooks/useBuyerLocation';
import { distanceInMeters, formatDistance } from '../../services/locationService';

type Props = NativeStackScreenProps<BuyerStackParamList, 'ListingDetail'>;

export default function ListingDetailScreen({ route, navigation }: Props) {
  const { listingId } = route.params;
  const { listings, restaurants, reserveListing } = useApp();
  const { coords } = useBuyerLocation();
  const [quantity, setQuantity] = useState(1);
  const [reserving, setReserving] = useState(false);

  const listing = listings.find((l) => l.listingId === listingId);
  const restaurant = listing ? restaurants.find((r) => r.restaurantId === listing.restaurantId) : undefined;

  if (!listing || !restaurant) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={typography.body}>상품을 찾을 수 없어요.</Text>
      </SafeAreaView>
    );
  }

  const maxQty = listing.quantityRemaining;
  const totalPrice = listing.discountedPrice * quantity;

  const handleReserve = async () => {
    setReserving(true);
    try {
      const order = await reserveListing(listing.listingId, quantity, 'pickup');
      navigation.replace('ReservationConfirm', {
        orderId: order.orderId,
        pickupCode: order.pickupCode,
        quantity: order.quantity,
        totalPrice: order.totalPrice,
        listingId: order.listingId,
      });
    } catch (e: any) {
      Alert.alert('예약 실패', e?.message ?? '잠시 후 다시 시도해주세요.');
    } finally {
      setReserving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}>
        {listing.photoUrl ? (
          <Image source={{ uri: listing.photoUrl }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="fast-food-outline" size={48} color={colors.primary} />
          </View>
        )}

        <Text style={styles.restaurantName}>{restaurant.name}</Text>
        <Text style={typography.h2}>{listing.title}</Text>
        <Text style={styles.description}>{listing.description}</Text>

        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={18} color={colors.textMuted} />
          <Text style={styles.infoText}>픽업 시간 {listing.pickupWindowStart} - {listing.pickupWindowEnd}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={18} color={colors.textMuted} />
          <Text style={styles.infoText}>
            {restaurant.address}
            {coords
              ? ` · ${formatDistance(
                  distanceInMeters(coords, {
                    latitude: restaurant.latitude,
                    longitude: restaurant.longitude,
                  })
                )}`
              : ''}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="cube-outline" size={18} color={colors.textMuted} />
          <Text style={styles.infoText}>남은 수량 {listing.quantityRemaining}개</Text>
        </View>

        <View style={styles.qtyRow}>
          <Text style={typography.bodyBold}>수량</Text>
          <View style={styles.stepper}>
            <Pressable
              style={styles.stepperBtn}
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Ionicons name="remove" size={18} color={colors.text} />
            </Pressable>
            <Text style={styles.stepperValue}>{quantity}</Text>
            <Pressable
              style={styles.stepperBtn}
              onPress={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            >
              <Ionicons name="add" size={18} color={colors.text} />
            </Pressable>
          </View>
        </View>

        <Text style={styles.paymentNote}>결제는 픽업 시 매장에서 진행돼요 (카드/현금)</Text>
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerOriginal}>₩{listing.originalPrice.toLocaleString()}</Text>
          <Text style={styles.footerTotal}>₩{totalPrice.toLocaleString()}</Text>
        </View>
        <Pressable style={styles.reserveBtn} onPress={handleReserve} disabled={maxQty === 0 || reserving}>
          <Text style={styles.reserveBtnText}>
            {maxQty === 0 ? '품절' : reserving ? '예약 중...' : '예약하기'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  photo: {
    height: 220, borderRadius: radius.lg, marginBottom: spacing.md, backgroundColor: colors.border,
  },
  photoPlaceholder: {
    height: 160, borderRadius: radius.lg, backgroundColor: '#EAF7EF',
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  restaurantName: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  description: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  infoText: { ...typography.body, color: colors.text },
  qtyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepperBtn: {
    width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  stepperValue: { ...typography.bodyBold, minWidth: 20, textAlign: 'center' },
  paymentNote: { ...typography.caption, color: colors.textMuted, marginTop: spacing.lg },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border,
  },
  footerOriginal: { ...typography.caption, color: colors.textMuted, textDecorationLine: 'line-through' },
  footerTotal: { ...typography.h2, color: colors.text },
  reserveBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.pill },
  reserveBtnText: { color: colors.card, fontWeight: '700', fontSize: 16 },
});
