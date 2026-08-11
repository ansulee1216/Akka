import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import CategoryChips from '../../components/CategoryChips';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { UserRole, MAX_PREFERRED_CATEGORIES } from '../../types';

// Shown when someone is signed in but has no profile document — e.g. their
// sign-up was interrupted, or it happened before Firestore was set up. Rather
// than making them create a whole new account, this finishes the missing step.
export default function CompleteProfileScreen() {
  const { firebaseUser, completeProfile, signOut } = useApp();
  const [displayName, setDisplayName] = useState(firebaseUser?.displayName ?? '');
  const [role, setRole] = useState<UserRole>('buyer');
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }
    if (role === 'buyer' && preferredCategories.length === 0) {
      setError('좋아하는 음식 종류를 1개 이상 골라주세요.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await completeProfile(displayName.trim(), role, preferredCategories);
    } catch (e: any) {
      setError(e?.message ?? '저장에 실패했어요. 다시 시도해주세요.');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={typography.h1}>프로필 완성하기</Text>
          <Text style={styles.subtitle}>
            회원가입이 끝까지 완료되지 않았어요. 아래 정보만 입력하면 바로 시작할 수 있어요.
          </Text>

          <View style={styles.roleRow}>
            <Pressable
              style={[styles.roleBtn, role === 'buyer' && styles.roleBtnActive]}
              onPress={() => setRole('buyer')}
            >
              <Text style={[styles.roleBtnText, role === 'buyer' && styles.roleBtnTextActive]}>고객</Text>
            </Pressable>
            <Pressable
              style={[styles.roleBtn, role === 'seller' && styles.roleBtnActive]}
              onPress={() => setRole('seller')}
            >
              <Text style={[styles.roleBtnText, role === 'seller' && styles.roleBtnTextActive]}>가게</Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.input}
            placeholder="이름"
            value={displayName}
            onChangeText={setDisplayName}
          />

          {role === 'buyer' && (
            <View style={styles.prefBlock}>
              <Text style={styles.prefTitle}>
                좋아하는 음식{' '}
                <Text style={styles.prefCount}>
                  ({preferredCategories.length}/{MAX_PREFERRED_CATEGORIES})
                </Text>
              </Text>
              <CategoryChips
                selected={preferredCategories}
                onChange={setPreferredCategories}
                max={MAX_PREFERRED_CATEGORIES}
              />
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.primaryBtn} onPress={handleSave} disabled={saving}>
            <Text style={styles.primaryBtnText}>{saving ? '저장 중...' : '시작하기'}</Text>
          </Pressable>

          <Pressable style={styles.secondaryBtn} onPress={() => signOut()}>
            <Text style={styles.secondaryBtnText}>다른 계정으로 로그인</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg, lineHeight: 22 },
  roleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  roleBtn: {
    flex: 1, alignItems: 'center', padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
  },
  roleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleBtnText: { ...typography.bodyBold, color: colors.text },
  roleBtnTextActive: { color: colors.card },
  input: {
    backgroundColor: colors.card, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, ...typography.body,
  },
  prefBlock: { marginTop: spacing.md },
  prefTitle: { ...typography.bodyBold, marginBottom: spacing.sm },
  prefCount: { ...typography.caption, color: colors.textMuted, fontWeight: '400' },
  error: { color: colors.danger, ...typography.caption, marginTop: spacing.sm, textAlign: 'center' },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, padding: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  primaryBtnText: { color: colors.card, fontWeight: '700', fontSize: 16 },
  secondaryBtn: { marginTop: spacing.md, padding: spacing.sm, alignItems: 'center' },
  secondaryBtnText: { ...typography.body, color: colors.danger },
});
