import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { searchKakao, type PlaceResult } from '../services/kakaoService';
import { isKakaoConfigured } from '../config/kakaoConfig';
import { geocodeAddress } from '../services/locationService';
import { colors, spacing, radius, typography } from '../theme/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (result: PlaceResult) => void;
  /** Prefills the search box, e.g. with whatever was typed in the address field. */
  initialQuery?: string;
}

export default function AddressSearchModal({ visible, onClose, onSelect, initialQuery = '' }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Guards against an earlier, slower request overwriting a newer one's results.
  const requestId = useRef(0);

  useEffect(() => {
    if (visible) {
      setQuery(initialQuery);
      setResults([]);
      setError(null);
      setHasSearched(false);
    }
  }, [visible, initialQuery]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    // Debounced so we search when typing pauses, not on every keystroke —
    // both to stay well inside the API quota and to avoid flickering results.
    const currentRequest = ++requestId.current;
    const timer = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        let found: PlaceResult[];

        if (isKakaoConfigured) {
          found = await searchKakao(trimmed);
        } else {
          // No Kakao key yet — fall back to the phone's geocoder so the
          // feature still does something, just less reliably.
          const coords = await geocodeAddress(trimmed);
          found = coords
            ? [{ id: 'builtin', title: trimmed, subtitle: '기기 검색 결과', coords, isPlace: false }]
            : [];
        }

        if (currentRequest !== requestId.current) return; // superseded
        setResults(found);
        setHasSearched(true);
      } catch (e: any) {
        if (currentRequest !== requestId.current) return;
        setError(e?.message ?? '검색에 실패했어요.');
        setResults([]);
        setHasSearched(true);
      } finally {
        if (currentRequest === requestId.current) setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const renderItem = ({ item }: { item: PlaceResult }) => (
    <Pressable
      style={styles.row}
      onPress={() => {
        onSelect(item);
        onClose();
      }}
    >
      <Ionicons
        name={item.isPlace ? 'storefront-outline' : 'location-outline'}
        size={18}
        color={colors.primary}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {item.subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>주소 검색</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="가게 이름 또는 주소 (예: 방배로 26길)"
              autoFocus
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          {!isKakaoConfigured && (
            <Text style={styles.notice}>
              Kakao 주소 검색이 아직 설정되지 않아 기기 검색을 사용해요. 결과가 정확하지 않다면
              "현재 위치 사용"을 이용해주세요.
            </Text>
          )}

          {searching && (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}

          {!searching && error && (
            <View style={styles.centered}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {!searching && !error && (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: spacing.md }}
              ListEmptyComponent={
                <Text style={styles.hint}>
                  {query.trim().length < 2
                    ? '가게 이름이나 주소를 두 글자 이상 입력해주세요.'
                    : hasSearched
                      ? '검색 결과가 없어요. 조금 더 간단하게 입력해보세요.'
                      : ''}
                </Text>
              }
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: { ...typography.bodyBold },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, ...typography.body, paddingVertical: 4 },
  notice: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  centered: { padding: spacing.xl, alignItems: 'center' },
  errorText: { ...typography.body, color: colors.danger, textAlign: 'center' },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowTitle: { ...typography.bodyBold },
  rowSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});
