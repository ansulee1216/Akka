import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme/theme';

interface Props {
  /** Local URI of the currently selected image, if any. */
  value: string | null;
  onChange: (uri: string | null) => void;
  label?: string;
  /** Aspect ratio for the cropping window, as [width, height]. */
  aspect?: [number, number];
  /** Shows a spinner and blocks interaction, e.g. while uploading. */
  busy?: boolean;
}

export default function ImagePickerField({
  value,
  onChange,
  label = '사진',
  aspect = [4, 3],
  busy = false,
}: Props) {
  const pickFrom = async (source: 'camera' | 'library') => {
    // Permissions must be requested before opening either picker; if the user
    // declines we explain rather than silently doing nothing.
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        '권한이 필요해요',
        source === 'camera'
          ? '사진을 찍으려면 카메라 권한을 허용해주세요. 설정 앱에서 변경할 수 있어요.'
          : '사진을 선택하려면 사진 접근 권한을 허용해주세요. 설정 앱에서 변경할 수 있어요.'
      );
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect,
      quality: 1, // compression happens later, in imageService
    };

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    if (!result.canceled && result.assets?.length) {
      onChange(result.assets[0].uri);
    }
  };

  const handlePress = () => {
    if (busy) return;
    Alert.alert('사진 추가', '어떻게 추가할까요?', [
      { text: '카메라로 촬영', onPress: () => pickFrom('camera') },
      { text: '갤러리에서 선택', onPress: () => pickFrom('library') },
      { text: '취소', style: 'cancel' },
    ]);
  };

  const handleRemove = () => {
    if (busy) return;
    onChange(null);
  };

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.frame} onPress={handlePress} disabled={busy}>
        {value ? (
          <>
            <Image source={{ uri: value }} style={styles.preview} resizeMode="cover" />
            {!busy && (
              <Pressable style={styles.removeBtn} onPress={handleRemove} hitSlop={8}>
                <Ionicons name="close" size={16} color={colors.card} />
              </Pressable>
            )}
          </>
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="camera-outline" size={28} color={colors.primary} />
            <Text style={styles.placeholderText}>사진 추가하기</Text>
            <Text style={styles.placeholderHint}>사진이 있으면 훨씬 잘 팔려요</Text>
          </View>
        )}

        {busy && (
          <View style={styles.busyOverlay}>
            <ActivityIndicator color={colors.card} />
            <Text style={styles.busyText}>업로드 중...</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.bodyBold, marginBottom: spacing.xs, marginTop: spacing.md },
  frame: {
    height: 180,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  preview: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', gap: 2 },
  placeholderText: { ...typography.bodyBold, color: colors.primary, marginTop: spacing.xs },
  placeholderHint: { ...typography.caption, color: colors.textMuted },
  removeBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  busyText: { ...typography.caption, color: colors.card },
});
