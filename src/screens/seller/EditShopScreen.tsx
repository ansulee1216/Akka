import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import CategoryChips from '../../components/CategoryChips';
import ImagePickerField from '../../components/ImagePickerField';
import AddressSearchModal from '../../components/AddressSearchModal';
import { resolvePhotoUrl } from '../../services/imageService';
import { isStorageEnabled } from '../../config/firebaseConfig';
import type { PlaceResult } from '../../services/kakaoService';
import {
  requestLocationPermission,
  getCurrentCoords,
  describeCoords,
  type Coords,
} from '../../services/locationService';
import { restaurantCategories } from '../../utils/restaurant';
import { colors, spacing, radius, typography } from '../../theme/theme';

const MAX_CATEGORIES = 2;

export default function EditShopScreen({ navigation }: any) {
  const { myRestaurant, updateRestaurant } = useApp();

  const [name, setName] = useState(myRestaurant?.name ?? '');
  const [categories, setCategories] = useState<string[]>(restaurantCategories(myRestaurant));
  const [address, setAddress] = useState(myRestaurant?.address ?? '');
  const [addressDetail, setAddressDetail] = useState(myRestaurant?.addressDetail ?? '');
  const [phoneNumber, setPhoneNumber] = useState(myRestaurant?.phoneNumber ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(myRestaurant?.photoUrl ?? null);

  // Only set when the shop actually relocates — leaving it null means the
  // existing coordinates stay untouched rather than being rewritten.
  const [newCoords, setNewCoords] = useState<Coords | null>(null);
  const [coordsLabel, setCoordsLabel] = useState<string | null>(null);

  const [locating, setLocating] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!myRestaurant) return null;

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const permission = await requestLocationPermission();
      if (permission !== 'granted') {
        Alert.alert('위치 권한이 필요해요', '설정 앱에서 위치 권한을 허용해주세요.');
        return;
      }
      const position = await getCurrentCoords(true);
      if (!position) {
        Alert.alert('위치를 확인할 수 없어요', '실내라면 창가로 이동한 뒤 다시 시도해주세요.');
        return;
      }
      setNewCoords(position);
      const label = await describeCoords(position);
      setCoordsLabel(label ?? '현재 위치');
      if (label) setAddress(label);
    } finally {
      setLocating(false);
    }
  };

  const handleSearchSelect = (result: PlaceResult) => {
    setNewCoords(result.coords);
    setCoordsLabel(result.subtitle || result.title);
    setAddress(result.subtitle || result.title);
  };

  const handleSave = async () => {
    if (!name.trim() || !address.trim() || !phoneNumber.trim()) {
      Alert.alert('입력 필요', '가게 이름, 주소, 연락처를 모두 입력해주세요.');
      return;
    }
    if (categories.length === 0) {
      Alert.alert('카테고리를 선택해주세요', '가게에 맞는 카테고리를 1개 이상 골라주세요.');
      return;
    }

    setSaving(true);
    try {
      const photoUrl = isStorageEnabled
        ? await resolvePhotoUrl(photoUri, myRestaurant.photoUrl, 'restaurants')
        : myRestaurant.photoUrl;

      await updateRestaurant({
        photoUrl,
        name: name.trim(),
        categories,
        address: address.trim(),
        addressDetail: addressDetail.trim() || undefined,
        phoneNumber: phoneNumber.trim(),
        // Coordinates only change when the shop deliberately relocated.
        ...(newCoords ? { latitude: newCoords.latitude, longitude: newCoords.longitude } : {}),
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
          {isStorageEnabled && (
            <ImagePickerField
              value={photoUri}
              onChange={setPhotoUri}
              label="가게 사진"
              busy={saving && !!photoUri}
            />
          )}

          <Text style={styles.label}>가게 이름</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />

          <Text style={styles.label}>
            카테고리 <Text style={styles.optional}>({categories.length}/{MAX_CATEGORIES})</Text>
          </Text>
          <CategoryChips selected={categories} onChange={setCategories} max={MAX_CATEGORIES} />

          <Text style={styles.label}>주소</Text>
          <TextInput style={styles.input} value={address} onChangeText={setAddress} />

          <Text style={styles.hint}>
            가게를 옮겼다면 아래에서 위치를 다시 설정해주세요. 그대로면 기존 위치가 유지돼요.
          </Text>
          <View style={styles.locationRow}>
            <Pressable style={styles.locationBtn} onPress={useCurrentLocation} disabled={locating}>
              <Ionicons name="locate-outline" size={16} color={colors.primary} />
              <Text style={styles.locationBtnText}>현재 위치 사용</Text>
            </Pressable>
            <Pressable
              style={styles.locationBtn}
              onPress={() => setSearchOpen(true)}
              disabled={locating}
            >
              <Ionicons name="search-outline" size={16} color={colors.primary} />
              <Text style={styles.locationBtnText}>주소로 찾기</Text>
            </Pressable>
          </View>

          {locating && <ActivityIndicator size="small" color={colors.primary} />}

          {newCoords && !locating && (
            <View style={styles.coordsCard}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.coordsLabel}>새 위치 · {coordsLabel}</Text>
                <Text style={styles.coordsValue}>
                  {newCoords.latitude.toFixed(5)}, {newCoords.longitude.toFixed(5)}
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.label}>
            상세 주소 <Text style={styles.optional}>(선택)</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={addressDetail}
            onChangeText={setAddressDetail}
            placeholder="예: 2층 201호, 편의점 옆 골목"
          />

          <Text style={styles.label}>연락처</Text>
          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />

          <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? '저장 중...' : '저장하기'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <AddressSearchModal
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={handleSearchSelect}
        initialQuery={address}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  label: { ...typography.bodyBold, marginBottom: spacing.xs, marginTop: spacing.md },
  optional: { ...typography.caption, color: colors.textMuted, fontWeight: '400' },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.sm, lineHeight: 18 },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  locationRow: { flexDirection: 'row', gap: spacing.sm },
  locationBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },
  locationBtnText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  coordsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  coordsLabel: { ...typography.caption, color: colors.text, fontWeight: '600' },
  coordsValue: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  saveBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    padding: spacing.md,
    alignItems: 'center',
  },
  saveBtnText: { color: colors.card, fontWeight: '700', fontSize: 16 },
});
