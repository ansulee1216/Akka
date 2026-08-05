import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { uploadImage } from '../../services/imageService';
import { isStorageEnabled } from '../../config/firebaseConfig';
import ImagePickerField from '../../components/ImagePickerField';
import { colors, spacing, radius, typography } from '../../theme/theme';

const CATEGORIES = ['Korean', 'Bakery', 'Cafe', 'Italian', 'Japanese', 'Fast Food', 'Other'];

export default function RestaurantSetupScreen() {
  const { registerRestaurant } = useApp();
  const [submitting, setSubmitting] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleSubmit = async () => {
    if (!name.trim() || !address.trim() || !phoneNumber.trim()) {
      Alert.alert('입력 필요', '가게 이름, 주소, 연락처를 모두 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const photoUrl = photoUri ? await uploadImage(photoUri, 'restaurants') : undefined;

      await registerRestaurant({
        name: name.trim(),
        category,
        address: address.trim(),
        phoneNumber: phoneNumber.trim(),
        photoUrl,
        latitude: 37.5665,
        longitude: 126.978,
      });
    } catch (e: any) {
      Alert.alert('등록 실패', e?.message ?? '잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <Text style={typography.h1}>가게 등록</Text>
        <Text style={styles.subtitle}>마감 할인 판매를 시작하려면 가게 정보를 등록해주세요.</Text>

        {isStorageEnabled && (
          <ImagePickerField
            value={photoUri}
            onChange={setPhotoUri}
            label="가게 사진 (선택)"
            aspect={[16, 9]}
            busy={submitting && !!photoUri}
          />
        )}

        <Text style={styles.label}>가게 이름</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="예: 연남동 베이커리" />

        <Text style={styles.label}>카테고리</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c}
              style={[styles.chip, category === c && styles.chipActive]}
              onPress={() => setCategory(c)}
            >
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>주소</Text>
        <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="서울 마포구 ..." />

        <Text style={styles.label}>연락처</Text>
        <TextInput style={styles.input} value={phoneNumber} onChangeText={setPhoneNumber} placeholder="02-1234-5678" keyboardType="phone-pad" />

        <Pressable style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.submitBtnText}>{submitting ? '등록 중...' : '가게 등록하고 시작하기'}</Text>
        </Pressable>
      </ScrollView>
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.text },
  chipTextActive: { color: colors.card, fontWeight: '700' },
  submitBtn: { marginTop: spacing.xl, backgroundColor: colors.primary, borderRadius: radius.pill, padding: spacing.md, alignItems: 'center' },
  submitBtnText: { color: colors.card, fontWeight: '700', fontSize: 16 },
});
