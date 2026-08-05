import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useApp } from '../../context/AppContext';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { BuyerStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<BuyerStackParamList, 'ReservationConfirm'>;

export default function ReservationConfirmScreen({ route, navigation }: Props) {
  const { pickupCode, quantity, totalPrice, listingId } = route.params;
  const { listings, restaurants } = useApp();

  const listing = listings.find((l) => l.listingId === listingId);
  const restaurant = listing ? restaurants.find((r) => r.restaurantId === listing.restaurantId) : undefined;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.iconWrap}>
        <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
      </View>
      <Text style={styles.title}>예약이 완료됐어요!</Text>
      <Text style={styles.subtitle}>매장에 도착하면 아래 픽업 코드를 보여주세요</Text>

      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>픽업 코드</Text>
        <Text style={styles.code}>{pickupCode}</Text>
      </View>

      <View style={styles.detailsCard}>
        <Text style={styles.detailRow}>{restaurant?.name} · {listing?.title}</Text>
        <Text style={styles.detailRow}>수량 {quantity}개 · 결제 예정 ₩{totalPrice.toLocaleString()} (픽업 시 결제)</Text>
        {listing ? (
          <Text style={styles.detailRow}>픽업 시간 {listing.pickupWindowStart} - {listing.pickupWindowEnd}</Text>
        ) : null}
      </View>

      <Pressable style={styles.doneBtn} onPress={() => navigation.navigate('BuyerTabs')}>
        <Text style={styles.doneBtnText}>확인</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', padding: spacing.lg },
  iconWrap: { marginTop: spacing.xl },
  title: { ...typography.h1, marginTop: spacing.md },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
  codeCard: {
    marginTop: spacing.xl, backgroundColor: colors.card, borderRadius: radius.lg,
    padding: spacing.lg, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: colors.border,
  },
  codeLabel: { ...typography.caption, color: colors.textMuted },
  code: { fontSize: 48, fontWeight: '800', color: colors.primary, letterSpacing: 8, marginTop: spacing.xs },
  detailsCard: { marginTop: spacing.lg, width: '100%', gap: spacing.xs },
  detailRow: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  doneBtn: {
    marginTop: 'auto', backgroundColor: colors.primary, paddingVertical: spacing.md,
    borderRadius: radius.pill, width: '100%', alignItems: 'center', marginBottom: spacing.md,
  },
  doneBtnText: { color: colors.card, fontWeight: '700', fontSize: 16 },
});
