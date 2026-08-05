import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { Listing } from '../../types';
import { effectiveStatus } from '../../utils/listing';
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

  if (!myRestaurant) return null;
  const myListings = listings.filter((l) => l.restaurantId === myRestaurant.restaurantId);
  const pendingCount = sellerOrders.filter((o) => o.status === 'reserved').length;

  const handleDelete = (listing: Listing) => {
    // Deleting a listing someone is still waiting to collect would leave them
    // holding a pickup code for something that no longer exists.
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
    // Once a listing is finished, editing it no longer makes sense — only
    // clearing it away does.
    const canEdit = status === 'active' || status === 'soldOut';

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={typography.bodyBold}>{item.title}</Text>
            <Text style={styles.meta}>
              ₩{item.discountedPrice.toLocaleString()} · {item.quantityRemaining}/{item.quantityTotal}개 남음
            </Text>
            <Text style={styles.meta}>픽업 {item.pickupWindowStart} - {item.pickupWindowEnd}</Text>
          </View>
          <View style={[styles.statusBadge, isLive && styles.statusActive]}>
            <Text style={[styles.statusText, isLive && styles.statusTextActive]}>
              {statusLabel[status]}
            </Text>
          </View>
        </View>

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
      <View style={styles.header}>
        <Text style={typography.h1}>{myRestaurant.name}</Text>
        <Text style={styles.subtitle}>대기중인 픽업 {pendingCount}건</Text>
      </View>
      <FlatList
        data={myListings}
        keyExtractor={(item) => item.listingId}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 100 }}
        ListEmptyComponent={
          <Text style={styles.empty}>아직 등록한 상품이 없어요. 아래 탭에서 새 상품을 등록해보세요.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  statusBadge: {
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusActive: { backgroundColor: '#EAF7EF', borderColor: colors.primary },
  statusText: { ...typography.caption, color: colors.textMuted },
  statusTextActive: { color: colors.primary, fontWeight: '700' },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 6 },
  actionText: { ...typography.caption, color: colors.text, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl, ...typography.body },
});
