import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { colors, spacing, radius, typography, categoryStyle } from '../../theme/theme';
import { Listing } from '../../types';
import { effectiveStatus, minutesUntilExpiry } from '../../utils/listing';
import { primaryCategory } from '../../utils/restaurant';
import { computeSellerStats } from '../../utils/sellerStats';
import { useNow } from '../../hooks/useNow';

const statusLabel: Record<Listing['status'], string> = {
  active: '판매중',
  soldOut: '품절',
  expired: '마감',
  cancelled: '판매 중지',
};

export default function SellerDashboardScreen({ navigation }: any) {
  const { myRestaurant, listings, sellerOrders, deleteListing, setListingStatus } = useApp();
  const now = useNow();

  const myListings = useMemo(
    () =>
      myRestaurant
        ? listings.filter((l) => l.restaurantId === myRestaurant.restaurantId)
        : [],
    [listings, myRestaurant]
  );

  const stats = useMemo(
    () => computeSellerStats(sellerOrders, myListings, now),
    [sellerOrders, myListings, now]
  );

  if (!myRestaurant) return null;

  const category = categoryStyle(primaryCategory(myRestaurant));

  const handleDelete = (listing: Listing) => {
    // Deleting something a buyer is still waiting to collect would leave them
    // holding a pickup code for a listing that no longer exists.
    const outstanding = sellerOrders.filter(
      (o) => o.listingId === listing.listingId && o.status === 'reserved'
    ).length;

    if (outstanding > 0) {
      Alert.alert(
        '삭제할 수 없어요',
        `아직 픽업하지 않은 예약이 ${outstanding}건 있어요. 대신 '판매 중지'를 사용하면 새 예약만 막을 수 있어요.`
      );
      return;
    }

    Alert.alert('상품 삭제', `'${listing.title}'을(를) 삭제할까요? 되돌릴 수 없어요.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteListing(listing.listingId);
          } catch (e: any) {
            Alert.alert('삭제할 수 없어요', e?.message ?? '잠시 후 다시 시도해주세요.');
          }
        },
      },
    ]);
  };

  const handleToggleStatus = async (listing: Listing, status: Listing['status']) => {
    try {
      await setListingStatus(listing.listingId, status);
    } catch (e: any) {
      Alert.alert('변경 실패', e?.message ?? '잠시 후 다시 시도해주세요.');
    }
  };

  const renderItem = ({ item }: { item: Listing }) => {
    const status = effectiveStatus(item, now);
    const isLive = status === 'active';
    const canEdit = status === 'active' || status === 'soldOut';
    const sold = item.quantityTotal - item.quantityRemaining;
    const progress = item.quantityTotal > 0 ? sold / item.quantityTotal : 0;
    const minutesLeft = minutesUntilExpiry(item, now);
    const closingSoon = isLive && isFinite(minutesLeft) && minutesLeft > 0 && minutesLeft <= 60;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.cardMeta}>
              ₩{item.discountedPrice.toLocaleString()} · 픽업 {item.pickupWindowStart} -{' '}
              {item.pickupWindowEnd}
            </Text>
          </View>
          <View style={[styles.statusBadge, isLive && styles.statusActive]}>
            <Text style={[styles.statusText, isLive && styles.statusTextActive]}>
              {statusLabel[status]}
            </Text>
          </View>
        </View>

        {/* Sold-vs-remaining at a glance: the number a shop owner actually
            watches during the pickup window. */}
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {sold}/{item.quantityTotal}개 판매
          </Text>
        </View>

        {closingSoon && (
          <View style={styles.closingRow}>
            <Ionicons name="time-outline" size={13} color={colors.accent} />
            <Text style={styles.closingText}>{minutesLeft}분 후 마감</Text>
          </View>
        )}

        <View style={styles.actions}>
          {canEdit && (
            <Pressable
              style={styles.actionBtn}
              onPress={() => navigation.navigate('EditListing', { listingId: item.listingId })}
            >
              <Ionicons name="create-outline" size={16} color={colors.text} />
              <Text style={styles.actionText}>수정</Text>
            </Pressable>
          )}
          {status === 'active' && (
            <Pressable style={styles.actionBtn} onPress={() => handleToggleStatus(item, 'cancelled')}>
              <Ionicons name="pause-outline" size={16} color={colors.text} />
              <Text style={styles.actionText}>판매 중지</Text>
            </Pressable>
          )}
          {status === 'cancelled' && (
            <Pressable style={styles.actionBtn} onPress={() => handleToggleStatus(item, 'active')}>
              <Ionicons name="play-outline" size={16} color={colors.text} />
              <Text style={styles.actionText}>다시 판매</Text>
            </Pressable>
          )}
          <Pressable style={styles.actionBtn} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
            <Text style={[styles.actionText, { color: colors.danger }]}>삭제</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={myListings}
        keyExtractor={(item) => item.listingId}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.shopRow}>
              <View style={[styles.shopAvatar, { backgroundColor: category.tint }]}>
                <Ionicons name={category.icon as any} size={22} color={category.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.shopName} numberOfLines={1}>
                  {myRestaurant.name}
                </Text>
                <Text style={styles.shopMeta}>
                  {stats.activeListings > 0
                    ? `판매중 ${stats.activeListings}건 · ${stats.unsoldPortions}개 남음`
                    : '판매중인 상품 없음'}
                </Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <Pressable
                style={[styles.statCard, stats.pending > 0 && styles.statCardAlert]}
                onPress={() => navigation.navigate('SellerOrders')}
              >
                <Text style={[styles.statValue, stats.pending > 0 && styles.statValueAlert]}>
                  {stats.pending}
                </Text>
                <Text style={styles.statLabel}>픽업 대기</Text>
              </Pressable>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.collected}</Text>
                <Text style={styles.statLabel}>오늘 픽업 완료</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>₩{stats.revenueToday.toLocaleString()}</Text>
                <Text style={styles.statLabel}>오늘 매출</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>내 상품</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="add-circle-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>아직 등록한 상품이 없어요</Text>
            <Text style={styles.emptyBody}>
              아래 '상품 등록' 탭에서 오늘 남은 음식을 올려보세요.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },

  shopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  shopAvatar: {
    width: 46,
    height: 46,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopName: { ...typography.h2, color: colors.text },
  shopMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  statRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  statCardAlert: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  statValue: { ...typography.h2, color: colors.text },
  statValueAlert: { color: colors.accent },
  statLabel: { ...typography.caption, fontSize: 12, color: colors.textMuted, textAlign: 'center' },

  sectionTitle: { ...typography.bodyBold, color: colors.text, marginTop: spacing.lg },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { ...typography.bodyBold, fontSize: 16, color: colors.text },
  cardMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  statusBadge: {
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  statusActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  statusText: { ...typography.caption, fontSize: 12, color: colors.textMuted },
  statusTextActive: { color: colors.primary, fontWeight: '700' },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderSoft,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
  progressLabel: { ...typography.caption, fontSize: 12, color: colors.textMuted },

  closingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  closingText: { ...typography.caption, fontSize: 12, color: colors.accent, fontWeight: '700' },

  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSoft,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 6 },
  actionText: { ...typography.caption, color: colors.text, fontWeight: '600' },

  empty: { alignItems: 'center', paddingTop: spacing.xl, gap: spacing.sm },
  emptyTitle: { ...typography.bodyBold, color: colors.text },
  emptyBody: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },
});
