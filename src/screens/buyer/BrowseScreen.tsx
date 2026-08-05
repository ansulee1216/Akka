import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { Listing } from '../../types';
import { isListingAvailable, minutesUntilExpiry } from '../../utils/listing';
import { useNow } from '../../hooks/useNow';

function urgencyLabel(minutes: number): string | null {
  if (!isFinite(minutes) || minutes <= 0) return null;
  if (minutes <= 60) return `${minutes}분 후 마감`;
  return null;
}

export default function BrowseScreen({ navigation }: any) {
  const { listings, restaurants } = useApp();
  const now = useNow();
  const activeListings = listings.filter((l) => isListingAvailable(l, now));

  const renderItem = ({ item }: { item: Listing }) => {
    const restaurant = restaurants.find((r) => r.restaurantId === item.restaurantId);
    const discountPct = Math.round((1 - item.discountedPrice / item.originalPrice) * 100);
    const urgency = urgencyLabel(minutesUntilExpiry(item, now));
    return (
      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate('ListingDetail', { listingId: item.listingId })}
      >
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={styles.thumb}>
            <Ionicons name="fast-food-outline" size={28} color={colors.primary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.restaurantName}>{restaurant?.name}</Text>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.originalPrice}>₩{item.originalPrice.toLocaleString()}</Text>
            <Text style={styles.discountedPrice}>₩{item.discountedPrice.toLocaleString()}</Text>
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discountPct}% ↓</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.pickupWindow}>
              픽업 {item.pickupWindowStart} - {item.pickupWindowEnd} · 남은 수량 {item.quantityRemaining}개
            </Text>
            {urgency ? <Text style={styles.urgency}>{urgency}</Text> : null}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={typography.h1}>오늘의 마감할인</Text>
        <Text style={styles.headerSubtitle}>내 주변 {activeListings.length}건 남음</Text>
      </View>
      <FlatList
        data={activeListings}
        keyExtractor={(item) => item.listingId}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
        ListEmptyComponent={
          <Text style={styles.empty}>지금은 판매 중인 마감 상품이 없어요. 나중에 다시 확인해주세요!</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  headerSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
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
    width: 56, height: 56, borderRadius: radius.sm,
    backgroundColor: '#EAF7EF', alignItems: 'center', justifyContent: 'center',
  },
  restaurantName: { ...typography.caption, color: colors.textMuted },
  title: { ...typography.bodyBold, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  originalPrice: { ...typography.caption, color: colors.textMuted, textDecorationLine: 'line-through' },
  discountedPrice: { ...typography.bodyBold, color: colors.primary },
  discountBadge: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  discountText: { color: colors.card, fontSize: 11, fontWeight: '700' },
  metaRow: { marginTop: spacing.xs, gap: 2 },
  pickupWindow: { ...typography.caption, color: colors.textMuted },
  urgency: { ...typography.caption, color: colors.accent, fontWeight: '700' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl, ...typography.body },
});
