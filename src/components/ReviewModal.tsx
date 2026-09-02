import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useApp } from '../context/AppContext';
import StarRating from './StarRating';
import { colors, spacing, radius, typography } from '../theme/theme';
import { Order } from '../types';

const RATING_HINTS: Record<number, string> = {
  1: '별로였어요',
  2: '아쉬웠어요',
  3: '괜찮았어요',
  4: '좋았어요',
  5: '최고였어요!',
};

interface Props {
  order: Order | null;
  shopName?: string;
  listingTitle?: string;
  onClose: () => void;
}

export default function ReviewModal({ order, shopName, listingTitle, onClose }: Props) {
  const { submitReview } = useApp();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset each time a different order is opened, so the previous review's
  // stars don't carry over.
  useEffect(() => {
    if (order) {
      setRating(0);
      setComment('');
      setError(null);
    }
  }, [order?.orderId]);

  const handleSubmit = async () => {
    if (!order) return;
    if (rating === 0) {
      setError('별점을 선택해주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await submitReview({ order, rating, comment, listingTitle });
      onClose();
    } catch (e: any) {
      setError(e?.message ?? '리뷰를 저장하지 못했어요. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={!!order} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.sheet}>
          <Text style={styles.title}>{shopName} 어떠셨나요?</Text>
          {listingTitle ? <Text style={styles.subtitle}>{listingTitle}</Text> : null}

          <View style={styles.stars}>
            <StarRating value={rating} onChange={setRating} size={36} />
          </View>
          <Text style={styles.hint}>{rating > 0 ? RATING_HINTS[rating] : '별점을 선택해주세요'}</Text>

          <TextInput
            style={styles.input}
            value={comment}
            onChangeText={setComment}
            placeholder="어떤 점이 좋았나요? (선택)"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={300}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.primaryBtn} onPress={handleSubmit} disabled={saving}>
            <Text style={styles.primaryBtnText}>{saving ? '남기는 중...' : '리뷰 남기기'}</Text>
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>다음에 할게요</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  title: { ...typography.h2, color: colors.text, textAlign: 'center' },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  stars: { marginTop: spacing.lg },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  input: {
    width: '100%',
    minHeight: 90,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
    ...typography.body,
    color: colors.text,
    textAlignVertical: 'top',
  },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.sm },
  primaryBtn: {
    width: '100%',
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryBtnText: { color: colors.card, fontWeight: '700', fontSize: 16 },
  cancelBtn: { paddingVertical: spacing.md },
  cancelText: { ...typography.body, color: colors.textMuted },
});
