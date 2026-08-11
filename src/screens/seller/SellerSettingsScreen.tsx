import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { colors, spacing, radius, typography } from '../../theme/theme';

export default function SellerSettingsScreen() {
  const { currentUser, myRestaurant, signOut } = useApp();

  const handleSignOut = () => {
    Alert.alert('로그아웃', '정말 로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={typography.h1}>설정</Text>
      </View>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="storefront" size={28} color={colors.primary} />
        </View>
        <Text style={typography.bodyBold}>{currentUser?.displayName}</Text>
        <Text style={styles.role}>{myRestaurant?.name} · 가게 계정</Text>
      </View>

      <Pressable style={styles.logoutBtn} onPress={handleSignOut}>
        <Text style={styles.logoutBtnText}>로그아웃</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  header: { paddingBottom: spacing.md },
  profileCard: {
    backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg,
    alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#EAF7EF',
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs,
  },
  role: { ...typography.caption, color: colors.textMuted },
  logoutBtn: { marginTop: spacing.md, padding: spacing.md, alignItems: 'center' },
  logoutBtnText: { ...typography.body, color: colors.danger },
});
