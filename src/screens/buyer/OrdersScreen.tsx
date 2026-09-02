import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { Order } from '../../types';
import { isListingExpired } from '../../utils/listing';
import { hasReviewedOrder } from '../../utils/reviews';
import { useNow } from '../../hooks/useNow';
import ReviewModal from '../../components/ReviewModal';
import StarRating from '../../components/StarRating';

const statusLabel: Record<Order['status'], string> = {
  reserved: '픽업 대기중',
  pickedUp: '픽업 완료',
  noShow: '노쇼',
  cancelled: '취소됨',
};

export default function OrdersScreen() {
  const { buyerOrders, restaurants, listings, cancelOrder, reviews } = useApp();
  const now = useNow();
  const [reviewing, setReviewing] = useState<Order | null>(null);

  const reviewingShop = reviewing
    ? restaurants.find((r) => r.restaurantId === reviewing.restaurantId)
    : undefined;
  const reviewingListing = reviewing
    ? listings.find((l) => l.listingId === reviewing.listingId)
    : undefined;

  const handleCancel = (order: Order) => {
    Alert.alert('예약 취소', '예약을 취소할까요? 취소한 상품은 다른 사람이 가져갈 수 있어요.', [
      { text: '돌아가기', style: 'cancel' },
      {
        text: '예약 취소',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelOrder(order.orderId);
          } catch (e: any) {
            Alert.alert('취소 실패', e?.message ?? '잠시 후 다시 시도해주세요.');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Order }) => {
    const restaurant = restaurants.find((r) => r.restaurantId === item.restaurantId);
    const listing = listings.find((l) => l.listingId === item.listingId);
    // Cancelling is only offered while the pickup window is still open — after
    // that the restaurant has already set the food aside, so the honest action
    // is to go collect it (or be marked a no-show).
    const canCancel = item.status === 'reserved' && (!listing || !isListingExpired(listing, now));

    // Only collected orders can be reviewed, and only once.
    const existingReview = reviews.find((r) => r.orderId === item.orderId);
    const canReview = item.status === 'pickedUp' && !hasReviewedOrder(reviews, item.orderId);

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.restaurantName}>{restaurant?.name}</Text>
            <Text style={typography.bodyBold}>{listing?.title}</Text>
            <Text style={styles.meta}>
              수량 {item.quantity}개 · ₩{item.totalPrice.toLocaleString()}
            </Text>
            {item.status === 'reserved' && (
              <Text style={styles.code}>픽업 코드 {item.pickupCode}</Text>
            )}
          </View>
          <View style={[styles.statusBadge, item.status === 'pickedUp' && styles.statusDone]}>
            <Text style={[styles.statusText, item.status === 'pickedUp' && styles.statusTextDone]}>
              {statusLabel[item.status]}
            </Text>
          </View>
        </View>

        {canCancel && (
          <Pressable style={styles.cancelBtn} onPress={() => handleCancel(item)}>
            <Text style={styles.cancelText}>예약 취소</Text>
          </Pressable>
        )}

        {canReview && (
          <Pressable style={styles.reviewBtn} onPress={() => setReviewing(item)}>
            <Ionicons name="star-outline" size={16} color={colors.primary} />
            <Text style={styles.reviewBtnText}>리뷰 남기기</Text>
          </Pressable>
        )}

        {existingReview && (
          <View style={styles.myReview}>
            <StarRating value={existingReview.rating} size={14} />
            <Text style={styles.myReviewText} numberOfLines={1}>
              {existingReview.comment || '리뷰를 남겼어요'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    // No top edge or inline title — this screen is pushed with a navigation
    // header now, so both would duplicate it.
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={buyerOrders}
        keyExtractor={(item) => item.orderId}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyBlock}>
            <Ionicons name="receipt-outline" size={30} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>아직 예약한 상품이 없어요</Text>
            <Text style={styles.empty}>홈에서 마음에 드는 상품을 예약해보세요.</Text>
          </View>
        }
      />

      <ReviewModal
        order={reviewing}
        shopName={reviewingShop?.name}
        listingTitle={reviewingListing?.title}
        onClose={() => setReviewing(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  restaurantName: { ...typography.caption, color: colors.textMuted },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  code: { ...typography.caption, color: colors.primary, fontWeight: '700', marginTop: 2 },
  statusBadge: {
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusDone: { backgroundColor: '#EAF7EF', borderColor: colors.primary },
  statusText: { ...typography.caption, color: colors.textMuted },
  statusTextDone: { color: colors.primary, fontWeight: '700' },
  cancelBtn: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  cancelText: { ...typography.caption, color: colors.danger, fontWeight: '600' },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSoft,
  },
  reviewBtnText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  myReview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSoft,
  },
  myReviewText: { ...typography.caption, color: colors.textMuted, flex: 1 },
  emptyBlock: { alignItems: 'center', paddingTop: spacing.xl, gap: spacing.sm },
  emptyTitle: { ...typography.bodyBold, color: colors.text },
  empty: { textAlign: 'center', color: colors.textMuted, ...typography.caption },
});
