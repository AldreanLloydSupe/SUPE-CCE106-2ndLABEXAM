import { useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton, Brand } from '@/components/Portal';
import { palette, ui } from '@/constants/portal';
import { IS_TEMPORARY_MOCK_API, login as loginRequest } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

export default function SignInScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const passwordInput = useRef<TextInput>(null);
  const [email, setEmail] = useState(IS_TEMPORARY_MOCK_API ? 'student@example.com' : '');
  const [password, setPassword] = useState(IS_TEMPORARY_MOCK_API ? 'password123' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (loading) return;
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await loginRequest(email.trim(), password);
      await login(result.accessToken, result.user || { email: email.trim() });
      router.replace('/(app)');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return <SafeAreaView style={styles.safe}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.container, { padding: wide ? 48 : 20 }]} keyboardShouldPersistTaps="handled">
        <View style={[styles.layout, wide && { flexDirection: 'row' }]}>
          <View style={[styles.intro, wide && { flex: 1, padding: 44, minHeight: 610 }]}>
            <Brand light />
            <View style={[styles.introCopy, !wide && { marginTop: 30, marginBottom: 0 }]}>
              <Text style={styles.eyebrow}>A SPACE FOR STUDENT LIFE</Text>
              <Text style={[styles.headline, !wide && { fontSize: 30, lineHeight: 36 }]}>{wide ? 'Stay connected.\nKeep moving\nforward.' : 'Your campus.\nAll in one place.'}</Text>
              {wide && <Text style={styles.description}>Your people, your profile, and your campus. One place to bring it all together.</Text>}
            </View>
            {wide && <View style={styles.introFooter}><View style={styles.footerIcon}><Ionicons name="leaf-outline" size={23} color={palette.lime} /></View><Text style={styles.footerText}>Made for your everyday{'\n'}student journey.</Text></View>}
          </View>
          <View style={[styles.form, wide && { flex: 1, padding: 48 }]}>
            <View style={styles.formHeading}>{wide && <View style={styles.welcomeIcon}><Ionicons name="log-in-outline" size={26} color={palette.green} /></View>}<Text style={ui.eyebrow}>LET’S GET YOU SETTLED IN</Text><Text accessibilityRole="header" style={ui.title}>Welcome back</Text><Text style={ui.body}>Sign in to your student service portal.</Text></View>
            <View style={styles.fields}>
              <Text style={styles.label}>Email address</Text>
              <View style={[styles.inputWrap, focused === 'email' && styles.focused]}>
                <Ionicons name="mail-outline" size={19} color={palette.muted} />
                <TextInput style={styles.input} accessibilityLabel="Email" placeholder="you@example.com" placeholderTextColor={palette.muted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" onFocus={() => setFocused('email')} onBlur={() => setFocused('')} returnKeyType="next" onSubmitEditing={() => passwordInput.current?.focus()} />
              </View>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputWrap, focused === 'password' && styles.focused]}>
                <Ionicons name="lock-closed-outline" size={19} color={palette.muted} />
                <TextInput ref={passwordInput} style={styles.input} accessibilityLabel="Password" placeholder="Enter your password" placeholderTextColor={palette.muted} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} autoComplete="current-password" onFocus={() => setFocused('password')} onBlur={() => setFocused('')} returnKeyType="go" onSubmitEditing={handleLogin} />
                <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword(!showPassword)} style={styles.eye}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={palette.muted} /></Pressable>
              </View>
              {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
              <ActionButton title={loading ? 'Signing in…' : 'Sign in'} onPress={handleLogin} loading={loading} />
            </View>
            {IS_TEMPORARY_MOCK_API && <View style={styles.demo}><Ionicons name="information-circle-outline" size={19} color={palette.green} /><View style={ui.grow}><Text style={styles.demoTitle}>Take a look around</Text><Text style={styles.demoText}>Demo access is filled in for you.{'\n'}student@example.com · password123</Text></View></View>}
            <Text style={styles.formFooter}>STUDENT SERVICE PORTAL · CCE106</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  layout: { width: '100%', maxWidth: 1120, borderRadius: 28, overflow: 'hidden', backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
  intro: { backgroundColor: palette.greenDark, padding: 28, justifyContent: 'space-between' },
  introCopy: { gap: 18, marginVertical: 44 },
  eyebrow: { color: palette.lime, fontSize: 10, letterSpacing: 1.6, fontWeight: '700' },
  headline: { color: '#FFFFFF', fontSize: 46, lineHeight: 53, letterSpacing: -1.8, fontWeight: '700' },
  description: { color: '#CDDDD1', fontSize: 15, lineHeight: 24, maxWidth: 330 },
  introFooter: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  footerIcon: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: '#527360', alignItems: 'center', justifyContent: 'center' },
  footerText: { color: '#CDDDD1', fontSize: 12, lineHeight: 19 },
  form: { padding: 26, justifyContent: 'center', gap: 28 },
  formHeading: { gap: 10 },
  welcomeIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.mint, marginBottom: 12 },
  fields: { gap: 12 },
  label: { fontSize: 13, fontWeight: '600', color: palette.ink },
  inputWrap: { minHeight: 54, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: palette.border, backgroundColor: palette.background, borderRadius: 12, paddingLeft: 15, marginBottom: 8, gap: 10 },
  focused: { borderColor: palette.green, backgroundColor: '#FFFFFF' },
  input: { flex: 1, minWidth: 0, color: palette.ink, fontSize: 15, paddingVertical: 16, paddingRight: 12 },
  eye: { minWidth: 46, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  error: { color: palette.danger, backgroundColor: palette.dangerSoft, padding: 12, borderRadius: 8, lineHeight: 20 },
  demo: { backgroundColor: palette.mint, borderRadius: 12, padding: 15, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  demoTitle: { color: palette.green, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  demoText: { color: palette.green, fontSize: 11, lineHeight: 19 },
  formFooter: { textAlign: 'center', color: palette.muted, fontSize: 9, letterSpacing: 1.2 },
});
