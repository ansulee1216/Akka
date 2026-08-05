import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { Order } from '../../types';

const statusLabel: Record<Order['status'], string> = {
  reserved: '픽업 대기중',
  pickedUp: '픽업 완료',
  noShow: '노쇼',
  cancelled: '취소됨',
};

export default function SellerOrdersScreen() {
  const { myRestaurant, sellerOrders, listings, markPickedUp, markNoShow } = useApp();

  // Code entry uses our own modal rather than Alert.prompt, which only exists
  // on iOS — on Android that call silently does nothing, so the old fallback
  // confirmed pickups without ever checking the code.
  const [verifying, setVerifying] = useState<Order | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  if (!myRestaurant) return null;

  const pending = sellerOrders.filter((o) => o.status === 'reserved');
  const past = sellerOrders.filter((o) => o.status !== 'reserved');

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
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={typography.bodyBold}>{listing?.title ?? '(삭제된 상품)'}</Text>
            <Text style={styles.meta}>
              수량 {item.quantity}개 · ₩{item.totalPrice.toLocaleString()}
            </Text>
          </View>
          {item.status !== 'reserved' && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{statusLabel[item.status]}</Text>
            </View>
          )}
        </View>

        {item.status === 'reserved' && (
          <View style={styles.actions}>
            <Pressable style={styles.primaryBtn} onPress={() => openVerify(item)}>
              <Text style={styles.primaryBtnText}>픽업 확인</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={() => handleNoShow(item)}>
              <Text style={styles.secondaryBtnText}>노쇼</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={typography.h1}>예약 현황</Text>
        <Text style={styles.subtitle}>대기중 {pending.length}건</Text>
      </View>

      <FlatList
        data={[...pending, ...past]}
        keyExtractor={(item) => item.orderId}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
        ListEmptyComponent={<Text style={styles.empty}>아직 들어온 예약이 없어요.</Text>}
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
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  statusBadge: {
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusText: { ...typography.caption, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  primaryBtnText: { color: colors.card, fontWeight: '700', fontSize: 14 },
  secondaryBtn: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl, ...typography.body },
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
    borderWidth: 1,
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
