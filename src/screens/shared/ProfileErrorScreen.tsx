import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { colors, spacing, radius, typography } from '../../theme/theme';

// Shown when the user is signed in but their profile couldn't be loaded —
// usually a Firestore connectivity problem, or an account whose profile
// document was never written. Without this, the app would sit on a spinner
// forever with no way out.
export default function ProfileErrorScreen() {
  const { profileError, retryProfile, signOut } = useApp();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.danger} />
        <Text style={styles.title}>연결에 문제가 있어요</Text>
        <Text style={styles.body}>{profileError}</Text>

        <Pressable style={styles.primaryBtn} onPress={retryProfile}>
          <Text style={styles.primaryBtnText}>다시 시도</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={() => signOut()}>
          <Text style={styles.secondaryBtnText}>로그아웃</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  title: { ...typography.h2, textAlign: 'center' },
  body: { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: radius.pill,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xl, marginTop: spacing.md,
  },
  primaryBtnText: { color: colors.card, fontWeight: '700', fontSize: 16 },
  secondaryBtn: { padding: spacing.md },
  secondaryBtnText: { ...typography.body, color: colors.danger },
});
