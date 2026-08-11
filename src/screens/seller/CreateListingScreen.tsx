import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { uploadImage } from '../../services/imageService';
import { isStorageEnabled } from '../../config/firebaseConfig';
import ImagePickerField from '../../components/ImagePickerField';
import TimePickerField from '../../components/TimePickerField';
import { describeWindow, windowLengthMinutes } from '../../utils/time';
import { colors, spacing, radius, typography } from '../../theme/theme';

export default function CreateListingScreen({ navigation }: any) {
  const { myRestaurant, createListing } = useApp();
  const [submitting, setSubmitting] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [discountedPrice, setDiscountedPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [pickupStart, setPickupStart] = useState('21:00');
  const [pickupEnd, setPickupEnd] = useState('21:30');

  if (!myRestaurant) return null;

  const handleSubmit = async () => {
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
    const windowLength = windowLengthMinutes(pickupStart, pickupEnd);
    if (!windowLength || windowLength < 5) {
      Alert.alert('픽업 시간 확인', '픽업 종료 시간은 시작 시간보다 뒤여야 해요.');
      return;
    }

    setSubmitting(true);
    try {
      // Upload first, so the listing is only created once we have a usable URL.
      const photoUrl = photoUri ? await uploadImage(photoUri, 'listings') : undefined;

      await createListing({
        restaurantId: myRestaurant.restaurantId,
        title: title.trim(),
        description: description.trim(),
        photoUrl,
        originalPrice: original,
        discountedPrice: discounted,
        quantityTotal: qty,
        pickupWindowStart: pickupStart,
        pickupWindowEnd: pickupEnd,
      });

      setTitle('');
      setDescription('');
      setOriginalPrice('');
      setDiscountedPrice('');
      setQuantity('');
      setPhotoUri(null);
      Alert.alert('등록 완료', '상품이 등록됐어요! 대시보드에서 확인해보세요.');
      navigation.navigate('Dashboard');
    } catch (e: any) {
      Alert.alert('등록 실패', e?.message ?? '잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Without this the keyboard sits on top of whichever field is focused
          near the bottom of the form. `automaticallyAdjustKeyboardInsets`
          handles it on iOS; KeyboardAvoidingView covers Android. */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? undefined : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
        <Text style={typography.h1}>새 상품 등록</Text>
        <Text style={styles.subtitle}>오늘 남은 음식을 마감 할인으로 올려보세요.</Text>

        {isStorageEnabled && (
          <ImagePickerField
            value={photoUri}
            onChange={setPhotoUri}
            label="상품 사진"
            busy={submitting && !!photoUri}
          />
        )}

        <Text style={styles.label}>상품명</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="예: 마감 베이커리 서프라이즈백" />

        <Text style={styles.label}>설명</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="구성품을 간단히 설명해주세요"
          multiline
        />

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={styles.label}>정가 (₩)</Text>
            <TextInput style={styles.input} value={originalPrice} onChangeText={setOriginalPrice} keyboardType="number-pad" placeholder="15000" />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.label}>할인가 (₩)</Text>
            <TextInput style={styles.input} value={discountedPrice} onChangeText={setDiscountedPrice} keyboardType="number-pad" placeholder="5000" />
          </View>
        </View>

        <Text style={styles.label}>수량</Text>
        <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="number-pad" placeholder="5" />

        <View style={styles.row}>
          <View style={styles.flex1}>
            <TimePickerField label="픽업 시작" value={pickupStart} onChange={setPickupStart} />
          </View>
          <View style={styles.flex1}>
            <TimePickerField label="픽업 종료" value={pickupEnd} onChange={setPickupEnd} />
          </View>
        </View>
        <Text style={styles.windowHint}>픽업 가능 시간 {describeWindow(pickupStart, pickupEnd)}</Text>

        <Pressable style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.submitBtnText}>{submitting ? '등록 중...' : '상품 등록하기'}</Text>
        </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  label: { ...typography.bodyBold, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    backgroundColor: colors.card, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, ...typography.body,
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: spacing.md },
  windowHint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  flex1: { flex: 1 },
  submitBtn: { marginTop: spacing.xl, backgroundColor: colors.primary, borderRadius: radius.pill, padding: spacing.md, alignItems: 'center', marginBottom: spacing.xl },
  submitBtnText: { color: colors.card, fontWeight: '700', fontSize: 16 },
});
