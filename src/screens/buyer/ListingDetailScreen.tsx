import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useApp } from '../../context/AppContext';
import { colors, spacing, radius, typography, categoryStyle } from '../../theme/theme';
import { BuyerStackParamList } from '../../navigation/types';
import { useBuyerLocation } from '../../hooks/useBuyerLocation';
import { distanceInMeters, formatDistance } from '../../services/locationService';
import { minutesUntilExpiry } from '../../utils/listing';
import { primaryCategory, formatCategories } from '../../utils/restaurant';
import { useNow } from '../../hooks/useNow';

type Props = NativeStackScreenProps<BuyerStackParamList, 'ListingDetail'>;

export default function ListingDetailScreen({ route, navigation }: Props) {
  const { listingId } = route.params;
  const { listings, restaurants, reserveListing } = useApp();
  const { coords } = useBuyerLocation();
  const now = useNow();
  const [quantity, setQuantity] = useState(1);
  const [reserving, setReserving] = useState(false);

  const listing = listings.find((l) => l.listingId === listingId);
  const restaurant = listing
    ? restaurants.find((r) => r.restaurantId === listing.restaurantId)
    : undefined;

  if (!listing || !restaurant) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>상품을 찾을 수 없어요.</Text>
      </SafeAreaView>
    );
  }

  const maxQty = listing.quantityRemaining;
  const totalPrice = listing.discountedPrice * quantity;
  const discountPct = Math.round((1 - listing.discountedPrice / listing.originalPrice) * 100);
  const category = categoryStyle(primaryCategory(restaurant));
  const categoryLabel = formatCategories(restaurant);
  const minutesLeft = minutesUntilExpiry(listing, now);
  const closingSoon = isFinite(minutesLeft) && minutesLeft > 0 && minutesLeft <= 60;

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
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.media, { backgroundColor: category.tint }]}>
          {listing.photoUrl ? (
            <Image source={{ uri: listing.photoUrl }} style={styles.photo} resizeMode="cover" />
          ) : (
            <Ionicons name={category.icon as any} size={56} color={category.ink} />
          )}
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discountPct}% 할인</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.restaurantName}>
            {restaurant.name}
            {categoryLabel ? <Text style={styles.categoryLabel}> · {categoryLabel}</Text> : null}
          </Text>
          <Text style={styles.title}>{listing.title}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>₩{listing.discountedPrice.toLocaleString()}</Text>
            <Text style={styles.originalPrice}>₩{listing.originalPrice.toLocaleString()}</Text>
          </View>

          {closingSoon && (
            <View style={styles.urgencyBanner}>
              <Ionicons name="time-outline" size={15} color={colors.accent} />
              <Text style={styles.urgencyText}>{minutesLeft}분 후 마감돼요</Text>
            </View>
          )}

          {listing.description ? (
            <Text style={styles.description}>{listing.description}</Text>
          ) : null}

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={18} color={colors.textMuted} />
              <Text style={styles.infoText}>
                픽업 {listing.pickupWindowStart} - {listing.pickupWindowEnd}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color={colors.textMuted} />
              <View style={{ flex: 1 }}>
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
                {restaurant.addressDetail ? (
                  <Text style={styles.addressDetail}>{restaurant.addressDetail}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Ionicons name="cube-outline" size={18} color={colors.textMuted} />
              <Text style={styles.infoText}>{listing.quantityRemaining}개 남음</Text>
            </View>
          </View>

          <View style={styles.qtyRow}>
            <Text style={typography.bodyBold}>수량</Text>
            <View style={styles.stepper}>
              <Pressable
                style={[styles.stepperBtn, quantity <= 1 && styles.stepperBtnOff]}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Ionicons
                  name="remove"
                  size={18}
                  color={quantity <= 1 ? colors.textMuted : colors.text}
                />
              </Pressable>
              <Text style={styles.stepperValue}>{quantity}</Text>
              <Pressable
                style={[styles.stepperBtn, quantity >= maxQty && styles.stepperBtnOff]}
                onPress={() => setQuantity((q) => Math.min(maxQty, q + 1))}
              >
                <Ionicons
                  name="add"
                  size={18}
                  color={quantity >= maxQty ? colors.textMuted : colors.text}
                />
              </Pressable>
            </View>
          </View>

          <Text style={styles.paymentNote}>결제는 픽업 시 매장에서 진행돼요 (카드/현금)</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>{quantity}개 · 결제 예정</Text>
          <Text style={styles.footerTotal}>₩{totalPrice.toLocaleString()}</Text>
        </View>
        <Pressable
          style={[styles.reserveBtn, (maxQty === 0 || reserving) && styles.reserveBtnOff]}
          onPress={handleReserve}
          disabled={maxQty === 0 || reserving}
        >
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
  notFound: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },

  media: { height: 240, alignItems: 'center', justifyContent: 'center' },
  photo: { width: '100%', height: '100%' },
  discountBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  discountText: { color: colors.card, fontSize: 13, fontWeight: '700' },

  content: { padding: spacing.md },
  restaurantName: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  categoryLabel: { color: colors.textMuted, fontWeight: '400' },
  title: { ...typography.h2, color: colors.text, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginTop: spacing.sm },
  price: { fontSize: 26, fontWeight: '700', color: colors.text },
  originalPrice: { ...typography.body, color: colors.textMuted, textDecorationLine: 'line-through' },

  urgencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  urgencyText: { ...typography.caption, color: colors.accent, fontWeight: '700' },

  description: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.md,
    lineHeight: 22,
  },

  infoCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md - 2,
  },
  infoText: { ...typography.body, color: colors.text, flexShrink: 1 },
  addressDetail: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSoft },

  qtyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnOff: { backgroundColor: colors.background },
  stepperValue: { ...typography.bodyBold, fontSize: 17, minWidth: 22, textAlign: 'center' },

  paymentNote: { ...typography.caption, color: colors.textMuted, marginTop: spacing.lg },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  footerLabel: { ...typography.caption, color: colors.textMuted },
  footerTotal: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 2 },
  reserveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  reserveBtnOff: { backgroundColor: colors.textMuted },
  reserveBtnText: { color: colors.card, fontWeight: '700', fontSize: 16 },
});
