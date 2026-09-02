import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, FlatList, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { colors, spacing, radius, typography, CATEGORIES } from '../../theme/theme';
import { useNow } from '../../hooks/useNow';
import { useBuyerLocation } from '../../hooks/useBuyerLocation';
import { useRecentSearches } from '../../hooks/useRecentSearches';
import ListingCard from '../../components/ListingCard';
import { buildFeed, matchesQuery, byDistance, byNewest } from '../../utils/sections';
import { summariseByRestaurant, formatRating } from '../../utils/reviews';

export default function SearchScreen({ navigation }: any) {
  const { listings, restaurants, reviews } = useApp();
  const now = useNow();
  const { coords } = useBuyerLocation();
  const { recent, addSearch, removeSearch, clearSearches } = useRecentSearches();

  const [query, setQuery] = useState('');
  // Only what's actually been submitted, so results don't thrash while typing.
  const [submitted, setSubmitted] = useState('');

  const feed = useMemo(
    () => buildFeed(listings, restaurants, coords, now),
    [listings, restaurants, coords, now]
  );
  const ratings = useMemo(() => summariseByRestaurant(reviews), [reviews]);

  const results = useMemo(() => {
    if (!submitted.trim()) return [];
    return feed
      .filter((item) => matchesQuery(item, submitted))
      .sort(coords ? byDistance : byNewest);
  }, [feed, submitted, coords]);

  const runSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setSubmitted(trimmed);
    addSearch(trimmed);
    Keyboard.dismiss();
  };

  const clearQuery = () => {
    setQuery('');
    setSubmitted('');
  };

  const showingResults = submitted.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="가게 이름, 음식, 카테고리 검색"
          returnKeyType="search"
          onSubmitEditing={() => runSearch(query)}
          autoCorrect={false}
        />
        {query.length > 0 && (
          <Pressable onPress={clearQuery} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {showingResults ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.listing.listingId}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              '{submitted}' 검색 결과 {results.length}건
            </Text>
          }
          renderItem={({ item }) => (
            <ListingCard
              listing={item.listing}
              restaurant={item.restaurant}
              distance={item.distance}
              rating={formatRating(ratings.get(item.listing.restaurantId))}
              ratingCount={ratings.get(item.listing.restaurantId)?.count}
              now={now}
              onPress={() =>
                navigation.navigate('ListingDetail', { listingId: item.listing.listingId })
              }
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={30} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>검색 결과가 없어요</Text>
              <Text style={styles.emptyBody}>
                다른 이름으로 찾아보거나, 아래 카테고리를 눌러보세요.
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <>
              {recent.length > 0 && (
                <View style={styles.block}>
                  <View style={styles.blockHeader}>
                    <Text style={styles.blockTitle}>최근 검색</Text>
                    <Pressable onPress={clearSearches} hitSlop={8}>
                      <Text style={styles.clearAll}>전체 삭제</Text>
                    </Pressable>
                  </View>
                  {recent.map((term) => (
                    <Pressable key={term} style={styles.recentRow} onPress={() => runSearch(term)}>
                      <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                      <Text style={styles.recentText} numberOfLines={1}>
                        {term}
                      </Text>
                      <Pressable onPress={() => removeSearch(term)} hitSlop={10}>
                        <Ionicons name="close" size={16} color={colors.textMuted} />
                      </Pressable>
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={styles.block}>
                <Text style={styles.blockTitle}>카테고리로 찾기</Text>
                <View style={styles.chipWrap}>
                  {CATEGORIES.map((category) => (
                    <Pressable
                      key={category}
                      style={styles.chip}
                      onPress={() => runSearch(category)}
                    >
                      <Text style={styles.chipText}>{category}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, ...typography.body, paddingVertical: 2 },

  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  resultCount: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs },

  block: { marginBottom: spacing.lg },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  blockTitle: { ...typography.bodyBold, color: colors.text },
  clearAll: { ...typography.caption, color: colors.textMuted },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSoft,
  },
  recentText: { ...typography.body, color: colors.text, flex: 1 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipText: { ...typography.caption, color: colors.text },

  empty: { alignItems: 'center', paddingTop: spacing.xl, gap: spacing.sm },
  emptyTitle: { ...typography.bodyBold, color: colors.text },
  emptyBody: { ...typography.caption, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
