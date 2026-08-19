import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { colors, spacing, radius, typography, categoryStyle } from '../../theme/theme';
import { primaryCategory, formatCategories } from '../../utils/restaurant';

export default function SellerSettingsScreen() {
  const { currentUser, myRestaurant, signOut } = useApp();

  const handleSignOut = () => {
    Alert.alert('로그아웃', '정말 로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const category = categoryStyle(primaryCategory(myRestaurant));
  const categoryLabel = formatCategories(myRestaurant);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
        <Text style={typography.h1}>설정</Text>

        <View style={styles.card}>
          <View style={[styles.avatar, { backgroundColor: category.tint }]}>
            <Ionicons name={category.icon as any} size={26} color={category.ink} />
          </View>
          <Text style={styles.shopName}>{myRestaurant?.name}</Text>
          {categoryLabel ? <Text style={styles.category}>{categoryLabel}</Text> : null}
          <Text style={styles.role}>가게 계정 · {currentUser?.displayName}</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color={colors.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoText}>{myRestaurant?.address}</Text>
              {myRestaurant?.addressDetail ? (
                <Text style={styles.infoSub}>{myRestaurant.addressDetail}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color={colors.textMuted} />
            <Text style={styles.infoText}>{myRestaurant?.phoneNumber}</Text>
          </View>
        </View>

        <Text style={styles.note}>
          가게 정보 수정 기능은 곧 추가될 예정이에요. 지금 바꿔야 할 내용이 있다면 알려주세요.
        </Text>

        <Pressable style={styles.logoutBtn} onPress={handleSignOut}>
          <Text style={styles.logoutBtnText}>로그아웃</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 3,
    marginTop: spacing.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  shopName: { ...typography.h2, color: colors.text },
  category: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  role: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  infoCard: {
    marginTop: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md - 2,
  },
  infoText: { ...typography.body, color: colors.text, flexShrink: 1 },
  infoSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSoft },

  note: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
    lineHeight: 18,
  },

  logoutBtn: { marginTop: spacing.lg, padding: spacing.md, alignItems: 'center' },
  logoutBtnText: { ...typography.body, color: colors.danger },
});
