import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useApp } from '../../context/AppContext';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { SellerStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<SellerStackParamList, 'EditListing'>;

export default function EditListingScreen({ route, navigation }: Props) {
  const { listingId } = route.params;
  const { listings, updateListing } = useApp();
  const listing = listings.find((l) => l.listingId === listingId);

  const [title, setTitle] = useState(listing?.title ?? '');
  const [description, setDescription] = useState(listing?.description ?? '');
  const [originalPrice, setOriginalPrice] = useState(String(listing?.originalPrice ?? ''));
  const [discountedPrice, setDiscountedPrice] = useState(String(listing?.discountedPrice ?? ''));
  const [quantity, setQuantity] = useState(String(listing?.quantityTotal ?? ''));
  const [pickupStart, setPickupStart] = useState(listing?.pickupWindowStart ?? '');
  const [pickupEnd, setPickupEnd] = useState(listing?.pickupWindowEnd ?? '');
  const [saving, setSaving] = useState(false);

  if (!listing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text style={styles.notFound}>상품을 찾을 수 없어요.</Text>
      </SafeAreaView>
    );
  }

  const claimed = listing.quantityTotal - listing.quantityRemaining;

  const handleSave = async () => {
    const original = parseInt(originalPrice, 10);
    const discounted = parseInt(discountedPrice, 10);
    const qty = parseInt(quantity, 10);

    if (!title.trim() || !original || !discounted || !qty) {
      Alert.alert('입력 확인', '상품명, 가격, 수량을 올바르게 입력해주세요.');
      return;
    }
    if (discounted >= original) {
      Alert.alert('가격 확인', '할인가는 정가보다 낮아야 해요.');
      return;
    }

    setSaving(true);
    try {
      await updateListing(listing.listingId, {
        title: title.trim(),
        description: description.trim(),
        originalPrice: original,
        discountedPrice: discounted,
        quantityTotal: qty,
        pickupWindowStart: pickupStart,
        pickupWindowEnd: pickupEnd,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('저장 실패', e?.message ?? '잠시 후 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        {claimed > 0 && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              이미 {claimed}개가 예약됐어요. 수량은 {claimed}개 이상으로만 바꿀 수 있어요.
            </Text>
          </View>
        )}

        <Text style={styles.label}>상품명</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} />

        <Text style={styles.label}>설명</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={styles.label}>정가 (₩)</Text>
            <TextInput
              style={styles.input}
              value={originalPrice}
              onChangeText={setOriginalPrice}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.label}>할인가 (₩)</Text>
            <TextInput
              style={styles.input}
              value={discountedPrice}
              onChangeText={setDiscountedPrice}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <Text style={styles.label}>총 수량</Text>
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="number-pad"
        />

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={styles.label}>픽업 시작</Text>
            <TextInput style={styles.input} value={pickupStart} onChangeText={setPickupStart} />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.label}>픽업 종료</Text>
            <TextInput style={styles.input} value={pickupEnd} onChangeText={setPickupEnd} />
          </View>
        </View>

        <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? '저장 중...' : '저장하기'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  notFound: { ...typography.body, textAlign: 'center', marginTop: spacing.xl, color: colors.textMuted },
  notice: {
    backgroundColor: '#FFF4EC',
    borderRadius: radius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  noticeText: { ...typography.caption, color: colors.text },
  label: { ...typography.bodyBold, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...typography.body,
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: spacing.md },
  flex1: { flex: 1 },
  saveBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  saveBtnText: { color: colors.card, fontWeight: '700', fontSize: 16 },
});
