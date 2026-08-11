import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { useNow } from '../../hooks/useNow';
import { useBuyerLocation } from '../../hooks/useBuyerLocation';
import ListingCard, { COMPACT_CARD_WIDTH } from '../../components/ListingCard';
import AddressSearchModal from '../../components/AddressSearchModal';
import type { PlaceResult } from '../../services/kakaoService';
import {
  buildFeed,
  rankRecommended,
  rankNearby,
  rankSpecialDeals,
  byNewest,
  type FeedItem,
} from '../../utils/sections';

/** How many cards each horizontal rail shows before "전체 보기". */
const RAIL_LIMIT = 10;

interface RailProps {
  title: string;
  subtitle?: string;
  items: FeedItem[];
  now: number;
  onPressItem: (listingId: string) => void;
}

function Rail({ title, subtitle, items, now, onPressItem }: RailProps) {
  // An empty rail is worse than no rail — it reads as something broken.
  if (items.length === 0) return null;

  return (
    <View style={styles.rail}>
      <View style={styles.railHeader}>
        <Text style={styles.railTitle}>{title}</Text>
        {subtitle ? <Text style={styles.railSubtitle}>{subtitle}</Text> : null}
      </View>
      <FlatList
        data={items.slice(0, RAIL_LIMIT)}
        keyExtractor={(item) => item.listing.listingId}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railContent}
        snapToInterval={COMPACT_CARD_WIDTH + spacing.sm}
        decelerationRate="fast"
        renderItem={({ item }) => (
          <ListingCard
            listing={item.listing}
            restaurant={item.restaurant}
            distance={item.distance}
            variant="compact"
            now={now}
            onPress={() => onPressItem(item.listing.listingId)}
          />
        )}
      />
    </View>
  );
}

export default function HomeScreen({ navigation }: any) {
  const { listings, restaurants, currentUser } = useApp();
  const now = useNow();
  const { coords, label, status, useCurrentLocation, setManualLocation } = useBuyerLocation();
  const [locationSearchOpen, setLocationSearchOpen] = useState(false);

  const preferred = currentUser?.preferredCategories ?? [];

  const feed = useMemo(
    () => buildFeed(listings, restaurants, coords, now),
    [listings, restaurants, coords, now]
  );

  const recommended = useMemo(() => rankRecommended(feed, preferred), [feed, preferred]);
  const nearby = useMemo(() => (coords ? rankNearby(feed) : []), [feed, coords]);
  const specials = useMemo(() => rankSpecialDeals(feed), [feed]);
  const newest = useMemo(() => [...feed].sort(byNewest), [feed]);

  const openListing = (listingId: string) => navigation.navigate('ListingDetail', { listingId });

  const handleUseGps = async () => {
    const result = await useCurrentLocation();
    if (result === 'denied') {
      Alert.alert(
        '위치 권한이 꺼져 있어요',
        '설정 앱에서 위치 권한을 허용하거나, 주소를 직접 검색해서 위치를 정할 수 있어요.'
      );
    }
  };

  const handlePickLocation = (result: PlaceResult) => {
    setManualLocation(result.coords, result.subtitle || result.title);
  };

  const chooseLocation = () => {
    Alert.alert('위치 설정', '어떻게 위치를 정할까요?', [
      { text: '현재 위치 사용', onPress: handleUseGps },
      { text: '주소로 검색', onPress: () => setLocationSearchOpen(true) },
      { text: '취소', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Pressable style={styles.locationBar} onPress={chooseLocation}>
          <Ionicons name="location" size={16} color={colors.primary} />
          <Text style={styles.locationText} numberOfLines={1}>
            {label ?? '위치를 설정해주세요'}
          </Text>
          <Ionicons name="chevron-down" size={15} color={colors.textMuted} />
        </Pressable>

        <View style={styles.header}>
          <Text style={typography.h1}>
            {currentUser?.displayName ? `${currentUser.displayName}님,` : '안녕하세요,'}
          </Text>
          <Text style={styles.headerSub}>오늘 구할 수 있는 마감 할인 {feed.length}건</Text>
        </View>

        {feed.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="moon-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>지금은 판매 중인 상품이 없어요</Text>
            <Text style={styles.emptyBody}>
              마감 할인은 보통 저녁 시간에 올라와요. 조금 뒤에 다시 확인해보세요.
            </Text>
          </View>
        ) : (
          <>
            <Rail
              title="추천"
              subtitle={
                preferred.length
                  ? `${preferred.join(' · ')} 좋아하시죠?`
                  : '프로필에서 좋아하는 음식을 고르면 더 정확해져요'
              }
              items={recommended}
              now={now}
              onPressItem={openListing}
            />

            <Rail
              title="가까운 거리에"
              subtitle={coords ? '내 위치에서 가까운 순' : undefined}
              items={nearby}
              now={now}
              onPressItem={openListing}
            />

            {!coords && (
              <Pressable style={styles.locationPrompt} onPress={chooseLocation}>
                <Ionicons name="navigate-outline" size={18} color={colors.primary} />
                <Text style={styles.locationPromptText}>
                  위치를 설정하면 가까운 가게를 보여드릴게요.
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            )}

            <Rail
              title="특별 할인"
              subtitle="60% 이상 할인"
              items={specials}
              now={now}
              onPressItem={openListing}
            />

            <Rail title="새로 올라온" items={newest} now={now} onPressItem={openListing} />
          </>
        )}
      </ScrollView>

      <AddressSearchModal
        visible={locationSearchOpen}
        onClose={() => setLocationSearchOpen(false)}
        onSelect={handlePickLocation}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  locationText: { ...typography.caption, color: colors.text, fontWeight: '600', flexShrink: 1 },

  header: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  headerSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  rail: { marginTop: spacing.lg },
  railHeader: { paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  railTitle: { ...typography.h2, color: colors.text },
  railSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  railContent: { paddingHorizontal: spacing.md, gap: spacing.sm },

  locationPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  locationPromptText: { ...typography.caption, color: colors.text, flex: 1, lineHeight: 18 },

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
