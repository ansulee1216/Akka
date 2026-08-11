import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { signUp } from '../../services/authService';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { AuthStackParamList } from '../../navigation/types';
import { UserRole } from '../../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

function friendlyAuthError(code: string): string {
  if (code.includes('email-already-in-use')) return '이미 가입된 이메일이에요.';
  if (code.includes('weak-password')) return '비밀번호는 6자 이상이어야 해요.';
  if (code.includes('invalid-email')) return '이메일 형식을 확인해주세요.';
  if (code.includes('network-request-failed')) return '네트워크 연결을 확인해주세요.';
  return '회원가입에 실패했어요. 다시 시도해주세요.';
}

export default function SignUpScreen({ navigation }: Props) {
  const [role, setRole] = useState<UserRole>('buyer');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    if (!displayName.trim() || !email.trim() || !password) {
      setError('모든 항목을 입력해주세요.');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 해요.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signUp(email.trim(), password, displayName.trim(), role);
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
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.logo}>akka</Text>
          <Text style={styles.subtitle}>회원가입하고 시작하기</Text>

          <View style={styles.roleRow}>
            <Pressable
              style={[styles.roleBtn, role === 'buyer' && styles.roleBtnActive]}
              onPress={() => setRole('buyer')}
            >
              <Text style={[styles.roleBtnText, role === 'buyer' && styles.roleBtnTextActive]}>고객</Text>
            </Pressable>
            <Pressable
              style={[styles.roleBtn, role === 'seller' && styles.roleBtnActive]}
              onPress={() => setRole('seller')}
            >
              <Text style={[styles.roleBtnText, role === 'seller' && styles.roleBtnTextActive]}>가게</Text>
            </Pressable>
          </View>

          <TextInput style={styles.input} placeholder="이름" value={displayName} onChangeText={setDisplayName} />
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
            placeholder="비밀번호 (6자 이상)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.primaryBtn} onPress={handleSignUp} disabled={loading}>
            <Text style={styles.primaryBtnText}>{loading ? '가입 중...' : '회원가입'}</Text>
          </Pressable>

          <Pressable style={styles.linkBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>이미 계정이 있나요? 로그인</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  logo: { ...typography.h1, color: colors.primary, fontSize: 40, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg },
  roleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  roleBtn: {
    flex: 1, alignItems: 'center', padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
  },
  roleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleBtnText: { ...typography.bodyBold, color: colors.text },
  roleBtnTextActive: { color: colors.card },
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
