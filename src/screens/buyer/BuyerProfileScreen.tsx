import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import CategoryChips from '../../components/CategoryChips';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { MAX_PREFERRED_CATEGORIES } from '../../types';

export default function BuyerProfileScreen({ navigation }: any) {
  const { currentUser, signOut, savePreferredCategories, buyerOrders } = useApp();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(currentUser?.preferredCategories ?? []);
  const [saving, setSaving] = useState(false);

  // Keep the draft in step if the profile updates from elsewhere.
  useEffect(() => {
    if (!editing) setDraft(currentUser?.preferredCategories ?? []);
  }, [currentUser?.preferredCategories, editing]);

  const handleSignOut = () => {
    Alert.alert('로그아웃', '정말 로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleSave = async () => {
    if (draft.length === 0) {
      Alert.alert('선택 필요', '좋아하는 음식을 1개 이상 골라주세요.');
      return;
    }
    setSaving(true);
    try {
      await savePreferredCategories(draft);
      setEditing(false);
    } catch (e: any) {
      Alert.alert('저장 실패', e?.message ?? '잠시 후 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  const preferred = currentUser?.preferredCategories ?? [];
  // Surfaced on the row so a waiting pickup isn't buried a screen deep.
  const pendingCount = buyerOrders.filter((o) => o.status === 'reserved').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
        <Text style={typography.h1}>프로필</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color={colors.primary} />
          </View>
          <Text style={typography.bodyBold}>{currentUser?.displayName}</Text>
          <Text style={styles.role}>고객 계정</Text>
        </View>

        <Pressable style={styles.navRow} onPress={() => navigation.navigate('Orders')}>
          <Ionicons name="receipt-outline" size={20} color={colors.text} />
          <Text style={styles.navRowText}>내 예약</Text>
          {pendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingCount}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>추천 메뉴 고르기!</Text>
            {!editing && (
              <Pressable onPress={() => setEditing(true)} hitSlop={8}>
                <Text style={styles.action}>수정</Text>
              </Pressable>
            )}
          </View>

          {editing ? (
            <>
              <Text style={styles.hint}>
                더 정확한 추천을 받기 위해 좋아하는 음식 3가지를 골라주세요. ({draft.length}/
                {MAX_PREFERRED_CATEGORIES})
              </Text>
              <CategoryChips
                selected={draft}
                onChange={setDraft}
                max={MAX_PREFERRED_CATEGORIES}
              />
              <View style={styles.editActions}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => {
                    setDraft(preferred);
                    setEditing(false);
                  }}
                >
                  <Text style={styles.cancelText}>취소</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                  <Text style={styles.saveText}>{saving ? '저장 중...' : '저장'}</Text>
                </Pressable>
              </View>
            </>
          ) : preferred.length > 0 ? (
            <View style={styles.tagRow}>
              {preferred.map((c) => (
                <View key={c} style={styles.tag}>
                  <Text style={styles.tagText}>{c}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.hint}>
              더 정확한 추천을 받기 위해 좋아하는 음식 3가지를 골라주세요.
            </Text>
          )}
        </View>

        <Pressable style={styles.logoutBtn} onPress={handleSignOut}>
          <Text style={styles.logoutBtnText}>로그아웃</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  role: { ...typography.caption, color: colors.textMuted },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  navRowText: { ...typography.body, color: colors.text, flex: 1 },
  badge: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
  },
  badgeText: { color: colors.card, fontSize: 12, fontWeight: '700' },
  section: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.bodyBold, color: colors.text },
  action: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  hint: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm, lineHeight: 18 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  tagText: { ...typography.caption, color: colors.primaryDark, fontWeight: '600' },

  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.md },
  cancelBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  cancelText: { ...typography.caption, color: colors.textMuted },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  saveText: { ...typography.caption, color: colors.card, fontWeight: '700' },

  logoutBtn: { marginTop: spacing.lg, padding: spacing.md, alignItems: 'center' },
  logoutBtnText: { ...typography.body, color: colors.danger },
});
