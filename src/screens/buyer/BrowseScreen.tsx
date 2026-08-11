import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { colors, spacing, radius, typography, categoryStyle } from '../../theme/theme';
import { isListingAvailable, minutesUntilExpiry, toMillis } from '../../utils/listing';
import { useNow } from '../../hooks/useNow';
import { useBuyerLocation } from '../../hooks/useBuyerLocation';
import { distanceInMeters, formatDistance } from '../../services/locationService';
import { primaryCategory } from '../../utils/restaurant';

/**
 * Only surfaced in the final hour. Shown constantly it becomes wallpaper and
 * stops meaning anything, so the quiet state is deliberate.
 */
function urgencyLabel(minutes: number): string | null {
  if (!isFinite(minutes) || minutes <= 0) return null;
  if (minutes <= 60) return `${minutes}분 후 마감`;
  return null;
}

export default function BrowseScreen({ navigation }: any) {
  const { listings, restaurants } = useApp();
  const now = useNow();
  const { coords, status, enableLocation } = useBuyerLocation();

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
    const category = categoryStyle(primaryCategory(restaurant));

    return (
      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate('ListingDetail', { listingId: listing.listingId })}
      >
        <View style={[styles.media, { backgroundColor: category.tint }]}>
          {listing.photoUrl ? (
            <Image source={{ uri: listing.photoUrl }} style={styles.photo} resizeMode="cover" />
          ) : (
            <Ionicons name={category.icon as any} size={34} color={category.ink} />
          )}

          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discountPct}% 할인</Text>
          </View>

          {distance !== null && (
            <View style={styles.distanceChip}>
              <Text style={styles.distanceText}>{formatDistance(distance)}</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.restaurantName} numberOfLines={1}>
            {restaurant?.name}
          </Text>
          <Text style={styles.title} numberOfLines={1}>
            {listing.title}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>₩{listing.discountedPrice.toLocaleString()}</Text>
            <Text style={styles.originalPrice}>₩{listing.originalPrice.toLocaleString()}</Text>
          </View>

          <View style={styles.metaRow}>
            {urgency ? (
              <>
                <Ionicons name="time-outline" size={13} color={colors.accent} />
                <Text style={styles.urgency}>{urgency}</Text>
                <Text style={styles.meta}>· {listing.quantityRemaining}개 남음</Text>
              </>
            ) : (
              <Text style={styles.meta}>
                픽업 {listing.pickupWindowStart} - {listing.pickupWindowEnd} ·{' '}
                {listing.quantityRemaining}개 남음
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

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
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
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
          <View style={styles.empty}>
            <Ionicons name="moon-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>지금은 판매 중인 상품이 없어요</Text>
            <Text style={styles.emptyBody}>
              마감 할인은 보통 저녁 시간에 올라와요. 조금 뒤에 다시 확인해보세요.
            </Text>
          </View>
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
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.md,
  },
  locationPromptText: { ...typography.caption, color: colors.text, flex: 1, lineHeight: 18 },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  media: { height: 130, alignItems: 'center', justifyContent: 'center' },
  photo: { width: '100%', height: '100%' },
  discountBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  discountText: { color: colors.card, fontSize: 12, fontWeight: '700' },
  distanceChip: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.overlay,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  distanceText: { color: colors.card, fontSize: 12, fontWeight: '600' },

  body: { padding: spacing.md, paddingTop: spacing.sm + 2 },
  restaurantName: { ...typography.caption, color: colors.textMuted },
  title: { ...typography.bodyBold, fontSize: 16, marginTop: 2, color: colors.text },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginTop: spacing.xs },
  price: { ...typography.price, color: colors.text },
  originalPrice: {
    ...typography.caption,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSoft,
  },
  meta: { ...typography.caption, color: colors.textMuted },
  urgency: { ...typography.caption, color: colors.accent, fontWeight: '700' },

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
