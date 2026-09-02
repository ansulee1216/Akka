import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { colors, spacing, radius, typography } from '../../theme/theme';
import StarRating from '../../components/StarRating';
import { summariseReviews, reviewsForRestaurant } from '../../utils/reviews';
import { relativeDay } from '../../utils/favorites';
import { useNow } from '../../hooks/useNow';
import { Review } from '../../types';

export default function SellerReviewsScreen() {
  const { myRestaurant, reviews } = useApp();
  const now = useNow();

  const myReviews = useMemo(
    () => (myRestaurant ? reviewsForRestaurant(reviews, myRestaurant.restaurantId) : []),
    [reviews, myRestaurant]
  );
  const summary = useMemo(() => summariseReviews(myReviews), [myReviews]);

  if (!myRestaurant) return null;

  const renderItem = ({ item }: { item: Review }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <StarRating value={item.rating} size={14} />
        <Text style={styles.reviewer} numberOfLines={1}>
          {item.buyerName}
        </Text>
        <Text style={styles.date}>{relativeDay(item.createdAt, now)}</Text>
      </View>
      {item.listingTitle ? <Text style={styles.listingTitle}>{item.listingTitle}</Text> : null}
      {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={myReviews}
        keyExtractor={(item) => item.reviewId}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Text style={typography.h1}>리뷰</Text>
            <Text style={styles.headerSub}>{myRestaurant.name}</Text>

            {summary.average !== null ? (
              <View style={styles.summaryCard}>
                <View style={styles.summaryLeft}>
                  <Text style={styles.bigAverage}>{summary.average.toFixed(1)}</Text>
                  <StarRating value={summary.average} size={15} allowHalf />
                  <Text style={styles.summaryCount}>리뷰 {summary.count}개</Text>
                </View>

                {/* Distribution matters more than the average for a shop owner —
                    a 4.2 made of 5s and 1s is a very different problem from a
                    4.2 made of consistent 4s. */}
                <View style={styles.bars}>
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = summary.distribution[star] ?? 0;
                    const ratio = summary.count > 0 ? count / summary.count : 0;
                    return (
                      <View key={star} style={styles.barRow}>
                        <Text style={styles.barLabel}>{star}</Text>
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, { width: `${Math.round(ratio * 100)}%` }]} />
                        </View>
                        <Text style={styles.barCount}>{count}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="star-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>아직 받은 리뷰가 없어요</Text>
            <Text style={styles.emptyBody}>
              고객이 픽업을 완료하면 리뷰를 남길 수 있어요. 리뷰가 쌓이면 고객이 가게를 더 쉽게
              선택해요.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  headerSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  summaryCard: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  summaryLeft: { alignItems: 'center', justifyContent: 'center', gap: 4, minWidth: 96 },
  bigAverage: { fontSize: 34, fontWeight: '700', color: colors.text },
  summaryCount: { ...typography.caption, color: colors.textMuted },

  bars: { flex: 1, justifyContent: 'center', gap: 5 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { ...typography.caption, fontSize: 12, color: colors.textMuted, width: 10 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.borderSoft, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, backgroundColor: colors.accent },
  barCount: { ...typography.caption, fontSize: 12, color: colors.textMuted, width: 18, textAlign: 'right' },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reviewer: { ...typography.caption, color: colors.text, fontWeight: '600', flex: 1 },
  date: { ...typography.caption, fontSize: 12, color: colors.textMuted },
  listingTitle: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  comment: { ...typography.body, color: colors.text, marginTop: spacing.sm, lineHeight: 21 },

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
