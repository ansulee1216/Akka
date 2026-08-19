import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Pressable,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { Order } from '../../types';
import { toMillis } from '../../utils/listing';

const statusLabel: Record<Order['status'], string> = {
  reserved: '픽업 대기중',
  pickedUp: '픽업 완료',
  noShow: '노쇼',
  cancelled: '취소됨',
};

export default function SellerOrdersScreen() {
  const { myRestaurant, sellerOrders, listings, markPickedUp, markNoShow } = useApp();

  // Code entry uses a custom modal rather than Alert.prompt, which exists only
  // on iOS — on Android that call silently does nothing, and the old fallback
  // confirmed pickups without ever checking the code.
  const [verifying, setVerifying] = useState<Order | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  const sections = useMemo(() => {
    const byNewest = (a: Order, b: Order) => toMillis(b.createdAt) - toMillis(a.createdAt);
    const pending = sellerOrders.filter((o) => o.status === 'reserved').sort(byNewest);
    const done = sellerOrders.filter((o) => o.status !== 'reserved').sort(byNewest);
    return [
      { title: '픽업 대기', data: pending, count: pending.length },
      { title: '완료된 예약', data: done, count: done.length },
    ].filter((s) => s.data.length > 0);
  }, [sellerOrders]);

  if (!myRestaurant) return null;

  const openVerify = (order: Order) => {
    setVerifying(order);
    setCodeInput('');
    setCodeError(null);
  };

  const submitCode = async () => {
    if (!verifying) return;
    if (codeInput.trim() !== verifying.pickupCode) {
      setCodeError('코드가 일치하지 않아요. 다시 확인해주세요.');
      return;
    }
    try {
      await markPickedUp(verifying.orderId);
      setVerifying(null);
    } catch (e: any) {
      setCodeError(e?.message ?? '처리에 실패했어요. 다시 시도해주세요.');
    }
  };

  const handleNoShow = (order: Order) => {
    Alert.alert('노쇼 처리', '손님이 오지 않았나요? 이 예약을 노쇼로 표시할게요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '노쇼 처리',
        style: 'destructive',
        onPress: async () => {
          try {
            await markNoShow(order.orderId);
          } catch (e: any) {
            Alert.alert('처리 실패', e?.message ?? '잠시 후 다시 시도해주세요.');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Order }) => {
    const listing = listings.find((l) => l.listingId === item.listingId);
    const isPending = item.status === 'reserved';

    return (
      <View style={[styles.card, isPending && styles.cardPending]}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {listing?.title ?? '(삭제된 상품)'}
            </Text>
            <Text style={styles.meta}>
              {item.quantity}개 · ₩{item.totalPrice.toLocaleString()} · 픽업 시 결제
            </Text>
          </View>
          {!isPending && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{statusLabel[item.status]}</Text>
            </View>
          )}
        </View>

        {isPending && (
          <>
            {/* Shown so the shop can eyeball the code the buyer holds up,
                without needing to type it for a match. */}
            <View style={styles.codeRow}>
              <Text style={styles.codeLabel}>픽업 코드</Text>
              <Text style={styles.code}>{item.pickupCode}</Text>
            </View>

            <View style={styles.actions}>
              <Pressable style={styles.primaryBtn} onPress={() => openVerify(item)}>
                <Ionicons name="checkmark" size={16} color={colors.card} />
                <Text style={styles.primaryBtnText}>픽업 확인</Text>
              </Pressable>
              <Pressable style={styles.secondaryBtn} onPress={() => handleNoShow(item)}>
                <Text style={styles.secondaryBtnText}>노쇼</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.orderId}
        renderItem={renderItem}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={typography.h1}>예약 현황</Text>
            <Text style={styles.headerSub}>{myRestaurant.name}</Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>
            {section.title} <Text style={styles.sectionCount}>{section.count}</Text>
          </Text>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="clipboard-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>아직 들어온 예약이 없어요</Text>
            <Text style={styles.emptyBody}>
              상품을 올리면 고객이 예약할 수 있어요. 예약이 들어오면 여기에 표시돼요.
            </Text>
          </View>
        }
      />

      <Modal visible={!!verifying} transparent animationType="fade" onRequestClose={() => setVerifying(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <Text style={typography.h2}>픽업 코드 확인</Text>
            <Text style={styles.modalSubtitle}>손님이 보여준 4자리 코드를 입력해주세요.</Text>

            <TextInput
              style={styles.codeInput}
              value={codeInput}
              onChangeText={(t) => {
                setCodeInput(t);
                setCodeError(null);
              }}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="0000"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />

            {codeError ? <Text style={styles.errorText}>{codeError}</Text> : null}

            <Pressable style={styles.modalPrimaryBtn} onPress={submitCode}>
              <Text style={styles.primaryBtnText}>확인</Text>
            </Pressable>
            <Pressable style={styles.modalCancelBtn} onPress={() => setVerifying(null)}>
              <Text style={styles.modalCancelText}>취소</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { marginBottom: spacing.sm },
  headerSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  sectionHeader: {
    ...typography.bodyBold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionCount: { color: colors.textMuted, fontWeight: '400' },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardPending: { borderColor: colors.primary },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.bodyBold, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  statusBadge: {
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  statusText: { ...typography.caption, fontSize: 12, color: colors.textMuted },

  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  codeLabel: { ...typography.caption, color: colors.primaryDark },
  code: { fontSize: 20, fontWeight: '700', color: colors.primaryDark, letterSpacing: 3 },

  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm + 2,
  },
  primaryBtnText: { color: colors.card, fontWeight: '700', fontSize: 14 },
  secondaryBtn: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  secondaryBtnText: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },

  empty: { alignItems: 'center', paddingTop: spacing.xl, gap: spacing.sm },
  emptyTitle: { ...typography.bodyBold, color: colors.text },
  emptyBody: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  codeInput: {
    marginTop: spacing.md,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    width: '70%',
    color: colors.text,
  },
  errorText: { ...typography.caption, color: colors.danger, marginTop: spacing.sm },
  modalPrimaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    width: '100%',
    marginTop: spacing.lg,
  },
  modalCancelBtn: { paddingVertical: spacing.md },
  modalCancelText: { ...typography.body, color: colors.textMuted },
});
