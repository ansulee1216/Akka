import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../theme/theme';

// Shown instead of crashing when src/config/firebaseConfig.ts still has the
// placeholder "REPLACE_ME" values. See the comments in that file, or
// README.md, for how to get real values from the Firebase console.
export default function FirebaseSetupNeededScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Ionicons name="construct-outline" size={48} color={colors.primary} />
        <Text style={styles.title}>Firebase 설정이 필요해요</Text>
        <Text style={styles.body}>
          이 앱은 로그인과 데이터 저장을 위해 Firebase 프로젝트가 필요해요.{'\n\n'}
          `src/config/firebaseConfig.ts` 파일을 열어 안내에 따라 본인의 Firebase 프로젝트 정보를 붙여넣어 주세요.
          자세한 단계는 README.md의 "Firebase 연결하기" 항목에도 있어요.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  title: { ...typography.h2, textAlign: 'center' },
  body: { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
});
