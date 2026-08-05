import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { signIn } from '../../services/authService';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

function friendlyAuthError(code: string): string {
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return '이메일 또는 비밀번호가 올바르지 않아요.';
  }
  if (code.includes('invalid-email')) return '이메일 형식을 확인해주세요.';
  if (code.includes('network-request-failed')) return '네트워크 연결을 확인해주세요.';
  return '로그인에 실패했어요. 다시 시도해주세요.';
}

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // Auth state listener in AppContext takes it from here.
    } catch (e: any) {
      setError(friendlyAuthError(e?.code ?? ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.content}>
          <Text style={styles.logo}>akka</Text>
          <Text style={styles.subtitle}>로그인하고 계속하기</Text>

          <TextInput
            style={styles.input}
            placeholder="이메일"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="비밀번호"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.primaryBtn} onPress={handleLogin} disabled={loading}>
            <Text style={styles.primaryBtnText}>{loading ? '로그인 중...' : '로그인'}</Text>
          </Pressable>

          <Pressable style={styles.linkBtn} onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.linkText}>계정이 없나요? 회원가입</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  logo: { ...typography.h1, color: colors.primary, fontSize: 40, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.xl },
  input: {
    backgroundColor: colors.card, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, ...typography.body, marginBottom: spacing.sm,
  },
  error: { color: colors.danger, ...typography.caption, marginTop: spacing.xs, marginBottom: spacing.xs, textAlign: 'center' },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, padding: spacing.md, alignItems: 'center', marginTop: spacing.md },
  primaryBtnText: { color: colors.card, fontWeight: '700', fontSize: 16 },
  linkBtn: { marginTop: spacing.lg, alignItems: 'center' },
  linkText: { ...typography.body, color: colors.primary },
});
