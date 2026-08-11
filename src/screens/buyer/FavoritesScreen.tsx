import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { colors, spacing, radius, typography, categoryStyle } from '../../theme/theme';
import { useNow } from '../../hooks/useNow';
import { useBuyerLocation } from '../../hooks/useBuyerLocation';
import { primaryCategory, formatCategories } from '../../utils/restaurant';
import { distanceInMeters, formatDistance } from '../../services/locationService';
import {
  buildFavorites,
  sortFavorites,
  relativeDay,
  type FavoriteSort,
  type FavoriteShop,
} from '../../utils/favorites';

const SORTS: { key: FavoriteSort; label: string }[] = [
  { key: 'frequent', label: '자주 주문' },
  { key: 'recent', label: '최근 주문' },
];

export default function FavoritesScreen({ navigation }: any) {
  const { buyerOrders, restaurants, listings } = useApp();
  const now = useNow();
  const { coords } = useBuyerLocation();
  const [sort, setSort] = useState<FavoriteSort>('frequent');

  const shops = useMemo(
    () => sortFavorites(buildFavorites(buyerOrders, restaurants, listings, now), sort),
    [buyerOrders, restaurants, listings, now, sort]
  );

  const renderItem = ({ item }: { item: FavoriteShop }) => {
    const category = categoryStyle(primaryCategory(item.restaurant));
    const categoryLabel = formatCategories(item.restaurant);
    const available = item.activeListings.length;
    const distance =
      coords && item.restaurant
        ? distanceInMeters(coords, {
            latitude: item.restaurant.latitude,
            longitude: item.restaurant.longitude,
          })
        : null;

    // Tapping a shop that's selling right now goes straight to the listing;
    // otherwise there's nothing to open, so the row stays inert.
    const openable = available > 0;

    return (
      <Pressable
        style={styles.row}
        disabled={!openable}
        onPress={() =>
          navigation.navigate('ListingDetail', { listingId: item.activeListings[0].listingId })
        }
      >
        <View style={[styles.avatar, { backgroundColor: category.tint }]}>
          <Ionicons name={category.icon as any} size={22} color={category.ink} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.shopName} numberOfLines={1}>
            {item.restaurant?.name ?? '(삭제된 가게)'}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {categoryLabel ? `${categoryLabel} · ` : ''}
            {sort === 'frequent'
              ? `${item.orderCount}번 주문`
              : relativeDay(item.lastOrderedAt, now)}
            {distance !== null ? ` · ${formatDistance(distance)}` : ''}
          </Text>

          {available > 0 ? (
            <View style={styles.liveRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>지금 {available}건 판매중</Text>
            </View>
          ) : null}
        </View>

        {openable && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={typography.h1}>즐겨찾기</Text>
        <Text style={styles.headerSub}>주문했던 가게를 다시 찾아보세요</Text>
      </View>

      <View style={styles.segment}>
        {SORTS.map((option) => {
          const active = sort === option.key;
          return (
            <Pressable
              key={option.key}
              style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              onPress={() => setSort(option.key)}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={shops}
        keyExtractor={(item) => item.restaurantId}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>아직 주문한 가게가 없어요</Text>
            <Text style={styles.emptyBody}>
              한 번 주문하면 여기에 모아서 보여드릴게요. 다시 찾기 편해져요.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  headerSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  segment: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  segmentBtnActive: { backgroundColor: colors.primary },
  segmentText: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  segmentTextActive: { color: colors.card, fontWeight: '700' },

  list: { padding: spacing.md, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopName: { ...typography.bodyBold, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  liveText: { ...typography.caption, color: colors.primary, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: spacing.xl * 2, gap: spacing.sm },
  emptyTitle: { ...typography.bodyBold, color: colors.text },
  emptyBody: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },
});
