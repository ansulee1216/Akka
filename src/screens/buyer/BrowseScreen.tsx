import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { Listing } from '../../types';
import { isListingAvailable, minutesUntilExpiry, toMillis } from '../../utils/listing';
import { useNow } from '../../hooks/useNow';
import { useBuyerLocation } from '../../hooks/useBuyerLocation';
import { distanceInMeters, formatDistance } from '../../services/locationService';

function urgencyLabel(minutes: number): string | null {
  if (!isFinite(minutes) || minutes <= 0) return null;
  if (minutes <= 60) return `${minutes}분 후 마감`;
  return null;
}

export default function BrowseScreen({ navigation }: any) {
  const { listings, restaurants } = useApp();
  const now = useNow();
  const { coords, status, enableLocation } = useBuyerLocation();

  // Each listing paired with the distance to its restaurant, sorted nearest
  // first when we know where the buyer is, newest first otherwise.
  const rows = useMemo(() => {
    const available = listings.filter((l) => isListingAvailable(l, now));

    const withDistance = available.map((listing) => {
      const restaurant = restaurants.find((r) => r.restaurantId === listing.restaurantId);
      const distance =
        coords && restaurant
          ? distanceInMeters(coords, {
              latitude: restaurant.latitude,
              longitude: restaurant.longitude,
            })
          : null;
      return { listing, restaurant, distance };
    });

    if (coords) {
      // Listings whose restaurant we can't place go last rather than first,
      // which is what sorting nulls naively would do.
      return withDistance.sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    }

    return withDistance.sort(
      (a, b) => toMillis(b.listing.createdAt) - toMillis(a.listing.createdAt)
    );
  }, [listings, restaurants, coords, now]);

  const renderItem = ({ item }: { item: (typeof rows)[number] }) => {
    const { listing, restaurant, distance } = item;
    const discountPct = Math.round((1 - listing.discountedPrice / listing.originalPrice) * 100);
    const urgency = urgencyLabel(minutesUntilExpiry(listing, now));

    return (
      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate('ListingDetail', { listingId: listing.listingId })}
      >
        {listing.photoUrl ? (
          <Image source={{ uri: listing.photoUrl }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={styles.thumb}>
            <Ionicons name="fast-food-outline" size={28} color={colors.primary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.restaurantName} numberOfLines={1}>
              {restaurant?.name}
            </Text>
            {distance !== null && (
              <View style={styles.distanceChip}>
                <Ionicons name="location-outline" size={11} color={colors.primary} />
                <Text style={styles.distanceText}>{formatDistance(distance)}</Text>
              </View>
            )}
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {listing.title}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.originalPrice}>₩{listing.originalPrice.toLocaleString()}</Text>
            <Text style={styles.discountedPrice}>₩{listing.discountedPrice.toLocaleString()}</Text>
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discountPct}% ↓</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.pickupWindow}>
              픽업 {listing.pickupWindowStart} - {listing.pickupWindowEnd} · 남은 수량{' '}
              {listing.quantityRemaining}개
            </Text>
            {urgency ? <Text style={styles.urgency}>{urgency}</Text> : null}
          </View>
        </View>
      </Pressable>
    );
  };

  // Only offered when location hasn't been granted yet. If it was actively
  // denied, iOS won't show the dialog again anyway, so we point at Settings.
  const showLocationPrompt = !coords;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={typography.h1}>오늘의 마감할인</Text>
        <Text style={styles.headerSubtitle}>
          {coords ? '가까운 순 · ' : ''}
          {rows.length}건 판매중
        </Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.listing.listingId}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
        ListHeaderComponent={
          showLocationPrompt ? (
            <Pressable
              style={styles.locationPrompt}
              onPress={status === 'denied' ? undefined : enableLocation}
              disabled={status === 'denied'}
            >
              <Ionicons name="location-outline" size={18} color={colors.primary} />
              <Text style={styles.locationPromptText}>
                {status === 'denied'
                  ? '설정 앱에서 위치 권한을 허용하면 가까운 순으로 볼 수 있어요.'
                  : '위치를 켜면 가까운 가게부터 보여드릴게요.'}
              </Text>
              {status !== 'denied' && (
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              )}
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            지금은 판매 중인 마감 상품이 없어요. 나중에 다시 확인해주세요!
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  headerSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  locationPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#EAF7EF',
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: spacing.md,
  },
  locationPromptText: { ...typography.caption, color: colors.text, flex: 1, lineHeight: 18 },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: '#EAF7EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  restaurantName: { ...typography.caption, color: colors.textMuted, flexShrink: 1 },
  distanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#EAF7EF',
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  distanceText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  title: { ...typography.bodyBold, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  originalPrice: { ...typography.caption, color: colors.textMuted, textDecorationLine: 'line-through' },
  discountedPrice: { ...typography.bodyBold, color: colors.primary },
  discountBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  discountText: { color: colors.card, fontSize: 11, fontWeight: '700' },
  metaRow: { marginTop: spacing.xs, gap: 2 },
  pickupWindow: { ...typography.caption, color: colors.textMuted },
  urgency: { ...typography.caption, color: colors.accent, fontWeight: '700' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl, ...typography.body },
});
