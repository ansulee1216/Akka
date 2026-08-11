import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Listing, Restaurant } from '../types';
import { colors, spacing, radius, typography, categoryStyle } from '../theme/theme';
import { minutesUntilExpiry } from '../utils/listing';
import { primaryCategory } from '../utils/restaurant';
import { formatDistance } from '../services/locationService';

/**
 * Rail cards are sized from the screen rather than fixed, so they stay
 * proportionate from an SE up to a Pro Max.
 *
 * 78% leaves a deliberate sliver of the next card visible at the right edge —
 * that peek is what tells people the row scrolls. Go much wider and the hint
 * disappears; much narrower and the cards stop feeling like the main event.
 */
const SCREEN_WIDTH = Dimensions.get('window').width;
export const COMPACT_CARD_WIDTH = Math.round(Math.min(Math.max(SCREEN_WIDTH * 0.78, 260), 340));

/**
 * Image band height, as a fraction of card width. Slightly shallower than a
 * true 16:9 (0.56) to keep the overall card from getting tall — the height
 * mostly comes from here, so this is the dial to turn.
 */
const COMPACT_MEDIA_HEIGHT = Math.round(COMPACT_CARD_WIDTH * 0.48);

interface Props {
  listing: Listing;
  restaurant?: Restaurant;
  /** Metres from the buyer, when known. */
  distance?: number | null;
  onPress: () => void;
  /** `compact` is the size used inside the home screen's horizontal rails. */
  variant?: 'full' | 'compact';
  now?: number;
}

/**
 * Only surfaced in the final hour — shown constantly it stops registering as
 * urgent at all.
 */
function urgencyLabel(minutes: number): string | null {
  if (!isFinite(minutes) || minutes <= 0) return null;
  return minutes <= 60 ? `${minutes}분 후 마감` : null;
}

export default function ListingCard({
  listing,
  restaurant,
  distance,
  onPress,
  variant = 'full',
  now = Date.now(),
}: Props) {
  const compact = variant === 'compact';
  const discountPct = Math.round((1 - listing.discountedPrice / listing.originalPrice) * 100);
  const urgency = urgencyLabel(minutesUntilExpiry(listing, now));
  const category = categoryStyle(primaryCategory(restaurant));

  return (
    <Pressable style={[styles.card, compact && styles.cardCompact]} onPress={onPress}>
      <View
        style={[styles.media, compact && styles.mediaCompact, { backgroundColor: category.tint }]}
      >
        {listing.photoUrl ? (
          <Image source={{ uri: listing.photoUrl }} style={styles.photo} resizeMode="cover" />
        ) : (
          <Ionicons name={category.icon as any} size={compact ? 32 : 34} color={category.ink} />
        )}

        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>{discountPct}%</Text>
        </View>

        {distance != null && (
          <View style={styles.distanceChip}>
            <Text style={styles.distanceText}>{formatDistance(distance)}</Text>
          </View>
        )}
      </View>

      <View style={[styles.body, compact && styles.bodyCompact]}>
        <Text style={styles.restaurantName} numberOfLines={1}>
          {restaurant?.name}
        </Text>
        <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={1}>
          {listing.title}
        </Text>

        <View style={styles.priceRow}>
          <Text style={[styles.price, compact && styles.priceCompact]}>
            ₩{listing.discountedPrice.toLocaleString()}
          </Text>
          <Text style={styles.originalPrice}>₩{listing.originalPrice.toLocaleString()}</Text>
        </View>

        <View style={[styles.metaRow, compact && styles.metaRowCompact]}>
          {urgency ? (
            <>
              <Ionicons name="time-outline" size={12} color={colors.accent} />
              <Text style={styles.urgency} numberOfLines={1}>
                {urgency}
              </Text>
            </>
          ) : (
            <Text style={styles.meta} numberOfLines={1}>
              픽업 {listing.pickupWindowStart} - {listing.pickupWindowEnd} ·{' '}
              {listing.quantityRemaining}개 남음
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardCompact: { width: COMPACT_CARD_WIDTH },

  media: { height: 130, alignItems: 'center', justifyContent: 'center' },
  mediaCompact: { height: COMPACT_MEDIA_HEIGHT },
  photo: { width: '100%', height: '100%' },

  discountBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  discountText: { color: colors.card, fontSize: 11, fontWeight: '700' },
  distanceChip: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.overlay,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  distanceText: { color: colors.card, fontSize: 11, fontWeight: '600' },

  body: { padding: spacing.md, paddingTop: spacing.sm + 2 },
  bodyCompact: { paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.sm },
  restaurantName: { ...typography.caption, color: colors.textMuted, fontSize: 12 },
  title: { ...typography.bodyBold, fontSize: 16, marginTop: 2, color: colors.text },
  titleCompact: { fontSize: 15 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginTop: spacing.xs },
  price: { ...typography.price, color: colors.text },
  originalPrice: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  priceCompact: { fontSize: 17 },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSoft,
  },
  metaRowCompact: { marginTop: spacing.xs, paddingTop: spacing.xs },
  meta: { ...typography.caption, fontSize: 12, color: colors.textMuted, flexShrink: 1 },
  urgency: { ...typography.caption, fontSize: 12, color: colors.accent, fontWeight: '700' },
});
