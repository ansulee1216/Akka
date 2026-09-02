import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { deleteAccount, blockingOrders, ReauthRequiredError } from '../services/accountService';
import { colors, spacing, radius, typography } from '../theme/theme';

/**
 * Account deletion, required by App Store guideline 5.1.1(v) for any app that
 * offers sign-up. It has to be reachable from inside the app — pointing people
 * at a support email doesn't satisfy it.
 */
export default function DeleteAccountSection() {
  const { firebaseUser, currentUser, myRestaurant, buyerOrders, sellerOrders } = useApp();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSeller = currentUser?.role === 'seller';
  const outstanding = blockingOrders(isSeller ? sellerOrders : buyerOrders);

  const start = () => {
    if (outstanding.length > 0) {
      Alert.alert(
        '아직 진행 중인 예약이 있어요',
        isSeller
          ? `픽업하지 않은 예약이 ${outstanding.length}건 있어요. 모두 처리한 뒤에 탈퇴할 수 있어요.`
          : `픽업하지 않은 예약이 ${outstanding.length}건 있어요. 픽업하거나 취소한 뒤에 탈퇴할 수 있어요.`
      );
      return;
    }
    setPassword('');
    setError(null);
    setOpen(true);
  };

  const confirm = async () => {
    if (!firebaseUser || !currentUser) return;
    if (!password) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await deleteAccount({
        user: firebaseUser,
        uid: currentUser.uid,
        restaurantId: myRestaurant?.restaurantId,
        password,
      });
      // No navigation needed — the auth listener drops us back to the login
      // screen the moment the account is gone.
    } catch (e: any) {
      if (e instanceof ReauthRequiredError) {
        setError(e.message);
      } else if (e?.code === 'auth/wrong-password' || e?.code === 'auth/invalid-credential') {
        setError('비밀번호가 올바르지 않아요.');
      } else if (e?.code === 'auth/too-many-requests') {
        setError('시도가 너무 많아요. 잠시 후 다시 시도해주세요.');
      } else {
        setError(e?.message ?? '탈퇴에 실패했어요. 잠시 후 다시 시도해주세요.');
      }
      setDeleting(false);
    }
  };

  return (
    <>
      <Pressable style={styles.trigger} onPress={start}>
        <Text style={styles.triggerText}>회원 탈퇴</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.backdrop}
        >
          <View style={styles.card}>
            <Text style={styles.title}>정말 탈퇴하시겠어요?</Text>

            <Text style={styles.body}>탈퇴하면 아래 정보가 삭제되고 되돌릴 수 없어요.</Text>
            <View style={styles.list}>
              <Text style={styles.listItem}>· 계정 정보와 프로필</Text>
              <Text style={styles.listItem}>· 작성한 리뷰</Text>
              {isSeller && <Text style={styles.listItem}>· 가게 정보와 등록한 상품</Text>}
            </View>
            <Text style={styles.note}>
              지난 거래 내역은 가게의 판매 기록으로 남지만, 이름과 연락처 등 개인정보는 남지 않아요.
            </Text>

            <TextInput
              style={styles.input}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setError(null);
              }}
              placeholder="비밀번호 확인"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable style={styles.dangerBtn} onPress={confirm} disabled={deleting}>
              <Text style={styles.dangerBtnText}>{deleting ? '탈퇴 중...' : '탈퇴하기'}</Text>
            </Pressable>
            <Pressable
              style={styles.cancelBtn}
              onPress={() => setOpen(false)}
              disabled={deleting}
            >
              <Text style={styles.cancelText}>취소</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { padding: spacing.md, alignItems: 'center' },
  triggerText: { ...typography.caption, color: colors.textMuted, textDecorationLine: 'underline' },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, width: '100%' },
  title: { ...typography.h2, color: colors.text },
  body: { ...typography.body, color: colors.text, marginTop: spacing.sm },
  list: { marginTop: spacing.sm, gap: 3 },
  listItem: { ...typography.caption, color: colors.textMuted },
  note: { ...typography.caption, color: colors.textMuted, marginTop: spacing.md, lineHeight: 18 },
  input: {
    marginTop: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.sm },
  dangerBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.danger,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  dangerBtnText: { color: colors.card, fontWeight: '700', fontSize: 16 },
  cancelBtn: { paddingVertical: spacing.md, alignItems: 'center' },
  cancelText: { ...typography.body, color: colors.textMuted },
});
