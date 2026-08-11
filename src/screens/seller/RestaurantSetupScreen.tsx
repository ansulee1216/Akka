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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { uploadImage } from '../../services/imageService';
import { isStorageEnabled } from '../../config/firebaseConfig';
import ImagePickerField from '../../components/ImagePickerField';
import {
  requestLocationPermission,
  getCurrentCoords,
  describeCoords,
  type Coords,
} from '../../services/locationService';
import AddressSearchModal from '../../components/AddressSearchModal';
import type { PlaceResult } from '../../services/kakaoService';
import { colors, spacing, radius, typography, CATEGORIES } from '../../theme/theme';

const MAX_CATEGORIES = 2;

export default function RestaurantSetupScreen() {
  const { registerRestaurant } = useApp();
  const [submitting, setSubmitting] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // The shop's position on the map. Buyers can only be shown accurate
  // distances if this is real, so registration blocks until it's set — either
  // from GPS or by looking up the typed address.
  const [coords, setCoords] = useState<Coords | null>(null);
  const [coordsLabel, setCoordsLabel] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const atCategoryLimit = categories.length >= MAX_CATEGORIES;

  const toggleCategory = (value: string) => {
    setCategories((current) => {
      if (current.includes(value)) return current.filter((c) => c !== value);
      if (current.length >= MAX_CATEGORIES) return current; // chips are dimmed at the cap
      return [...current, value];
    });
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const permission = await requestLocationPermission();
      if (permission !== 'granted') {
        Alert.alert(
          '위치 권한이 필요해요',
          '가게 위치를 저장하려면 위치 권한을 허용해주세요. 설정 앱에서 변경할 수 있어요. 대신 주소로 찾기를 사용해도 괜찮아요.'
        );
        return;
      }

      // precise: the owner is pinning an exact storefront, so skip the cache.
      const position = await getCurrentCoords(true);
      if (!position) {
        Alert.alert('위치를 확인할 수 없어요', '실내라면 창가로 이동한 뒤 다시 시도해주세요.');
        return;
      }

      setCoords(position);
      const label = await describeCoords(position);
      setCoordsLabel(label ?? '현재 위치로 설정됨');
      // Fill in the address field too, if it's still empty — saves typing.
      if (!address.trim() && label) setAddress(label);
    } finally {
      setLocating(false);
    }
  };

  const handleSearchSelect = (result: PlaceResult) => {
    setCoords(result.coords);
    setCoordsLabel(result.isPlace ? `${result.title} · ${result.subtitle}` : result.title);
    // Store the full address, not the business name, since buyers need
    // something they can actually navigate to.
    setAddress(result.subtitle || result.title);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !address.trim() || !phoneNumber.trim()) {
      Alert.alert('입력 필요', '가게 이름, 주소, 연락처를 모두 입력해주세요.');
      return;
    }
    if (categories.length === 0) {
      Alert.alert('카테고리를 선택해주세요', '가게에 맞는 카테고리를 1개 이상 골라주세요.');
      return;
    }
    if (!coords) {
      Alert.alert(
        '위치 설정이 필요해요',
        '고객에게 거리를 보여주려면 가게 위치가 필요해요. "현재 위치 사용" 또는 "주소로 찾기"를 눌러주세요.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const photoUrl = photoUri ? await uploadImage(photoUri, 'restaurants') : undefined;

      await registerRestaurant({
        name: name.trim(),
        categories,
        address: address.trim(),
        // Optional — omitted entirely when blank rather than saved as "".
        addressDetail: addressDetail.trim() || undefined,
        phoneNumber: phoneNumber.trim(),
        photoUrl,
        latitude: coords.latitude,
        longitude: coords.longitude,
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
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="예: 연남동 베이커리"
        />

        <Text style={styles.label}>
          카테고리 <Text style={styles.optional}>({categories.length}/{MAX_CATEGORIES})</Text>
        </Text>
        <Text style={styles.hint}>가게에 맞는 카테고리를 최대 2개까지 고를 수 있어요.</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => {
            const selected = categories.includes(c);
            // Once two are picked the rest are dimmed, so it's visible why
            // they stop responding rather than tapping doing nothing.
            const dimmed = !selected && atCategoryLimit;
            return (
              <Pressable
                key={c}
                style={[styles.chip, selected && styles.chipActive, dimmed && styles.chipDimmed]}
                onPress={() => toggleCategory(c)}
                disabled={dimmed}
              >
                <Text
                  style={[
                    styles.chipText,
                    selected && styles.chipTextActive,
                    dimmed && styles.chipTextDimmed,
                  ]}
                >
                  {c}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>주소</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="서울 마포구 ..."
        />

        <Text style={styles.label}>가게 위치</Text>
        <Text style={styles.hint}>
          고객에게 "내 위치에서 몇 m" 를 보여주기 위해 필요해요. 가게에 계신다면 현재 위치를 쓰는 게
          가장 정확해요.
        </Text>

        <View style={styles.locationRow}>
          <Pressable style={styles.locationBtn} onPress={useCurrentLocation} disabled={locating}>
            <Ionicons name="locate-outline" size={16} color={colors.primary} />
            <Text style={styles.locationBtnText}>현재 위치 사용</Text>
          </Pressable>
          <Pressable style={styles.locationBtn} onPress={() => setSearchOpen(true)} disabled={locating}>
            <Ionicons name="search-outline" size={16} color={colors.primary} />
            <Text style={styles.locationBtnText}>주소로 찾기</Text>
          </Pressable>
        </View>

        {locating && (
          <View style={styles.locatingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.hint}>위치 확인 중...</Text>
          </View>
        )}

        {coords && !locating && (
          <View style={styles.coordsCard}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.coordsLabel}>{coordsLabel}</Text>
              <Text style={styles.coordsValue}>
                {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.label}>
          상세 주소 <Text style={styles.optional}>(선택)</Text>
        </Text>
        <Text style={styles.hint}>
          건물명, 층, 호수처럼 지도에 나오지 않는 정보를 적어주세요. 고객이 가게를 찾는 데 도움이 돼요.
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
          placeholder="02-1234-5678"
          keyboardType="phone-pad"
        />

        <Pressable style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.submitBtnText}>
            {submitting ? '등록 중...' : '가게 등록하고 시작하기'}
          </Text>
        </Pressable>
      </ScrollView>

      <AddressSearchModal
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={handleSearchSelect}
        initialQuery={address || name}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  label: { ...typography.bodyBold, marginBottom: spacing.xs, marginTop: spacing.md },
  optional: { ...typography.caption, color: colors.textMuted, fontWeight: '400' },
  hint: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm, lineHeight: 18 },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...typography.body,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipDimmed: { opacity: 0.4 },
  chipText: { ...typography.caption, color: colors.text },
  chipTextActive: { color: colors.card, fontWeight: '700' },
  chipTextDimmed: { color: colors.textMuted },
  locationRow: { flexDirection: 'row', gap: spacing.sm },
  locationBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },
  locationBtnText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  locatingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  coordsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#EAF7EF',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  coordsLabel: { ...typography.caption, color: colors.text, fontWeight: '600' },
  coordsValue: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  submitBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    padding: spacing.md,
    alignItems: 'center',
  },
  submitBtnText: { color: colors.card, fontWeight: '700', fontSize: 16 },
});
