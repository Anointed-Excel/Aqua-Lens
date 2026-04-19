import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withDelay, withSpring, Easing,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import AnimatedButton from '../components/AnimatedButton';
import { login } from '../services/api';
import { saveAuth } from '../utils/storage';

export default function LoginScreen({ navigation }) {
  const { theme: t } = useTheme();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const logoOp  = useSharedValue(0);
  const logoY   = useSharedValue(-30);
  const formOp  = useSharedValue(0);
  const formY   = useSharedValue(40);

  const logoStyle = useAnimatedStyle(() => ({ opacity: logoOp.value, transform: [{ translateY: logoY.value }] }));
  const formStyle = useAnimatedStyle(() => ({ opacity: formOp.value, transform: [{ translateY: formY.value }] }));

  useEffect(() => {
    logoOp.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    logoY.value  = withSpring(0, { damping: 14 });
    formOp.value = withDelay(300, withTiming(1, { duration: 500 }));
    formY.value  = withDelay(300, withSpring(0, { damping: 16 }));
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) return Alert.alert('Required', 'Please fill in all fields');
    setLoading(true);
    try {
      const { data } = await login(email.trim().toLowerCase(), password);
      await saveAuth(data.access_token, data.refresh_token, data.user);
      navigation.replace('Main');
    } catch (err) {
      Alert.alert('Login Failed', err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.statusBar} backgroundColor="transparent" translucent />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false} showsVerticalScrollIndicator={false}>

          {/* Hero gradient */}
          <LinearGradient
            colors={['rgba(245,197,24,0.15)', 'transparent']}
            style={s.heroGrad}
          >
            <Animated.View style={[s.logoSection, logoStyle]}>
              <View style={[s.logoWrap, { backgroundColor: t.primary, shadowColor: t.primary }]}>
                <Text style={s.logoEmoji}>🐠</Text>
              </View>
              <Text style={[s.appName, { color: t.text }]}>Aqua Lens</Text>
              <Text style={[s.appSub, { color: t.textMuted }]}>Welcome back</Text>
            </Animated.View>
          </LinearGradient>

          {/* Form */}
          <Animated.View style={[s.card, { backgroundColor: t.card, borderColor: t.glassBorder }, formStyle]}>
            <Text style={[s.cardTitle, { color: t.text }]}>Sign In</Text>

            <Text style={[s.label, { color: t.textMuted }]}>Email Address</Text>
            <View style={[s.inputWrap, { backgroundColor: t.inputBg, borderColor: t.inputBorder }]}>
              <Feather name="mail" size={16} color={t.textMuted} style={s.inputIcon} />
              <TextInput
                style={[s.input, { color: t.text }]}
                placeholder="you@example.com"
                placeholderTextColor={t.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <Text style={[s.label, { color: t.textMuted }]}>Password</Text>
            <View style={[s.inputWrap, { backgroundColor: t.inputBg, borderColor: t.inputBorder }]}>
              <Feather name="lock" size={16} color={t.textMuted} style={s.inputIcon} />
              <TextInput
                style={[s.input, { color: t.text }]}
                placeholder="Your password"
                placeholderTextColor={t.textMuted}
                secureTextEntry={!showPass}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPass(p => !p)} style={s.eyeBtn}>
                <Feather name={showPass ? 'eye-off' : 'eye'} size={16} color={t.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={s.forgotWrap}>
              <Text style={[s.forgotText, { color: t.primary }]}>Forgot Password?</Text>
            </TouchableOpacity>

            <AnimatedButton title="Sign In" onPress={handleLogin} loading={loading} style={s.btn} />

            <View style={[s.dividerRow]}>
              <View style={[s.dividerLine, { backgroundColor: t.border }]} />
              <Text style={[s.dividerText, { color: t.textMuted }]}>or</Text>
              <View style={[s.dividerLine, { backgroundColor: t.border }]} />
            </View>

            <TouchableOpacity style={[s.registerBtn, { borderColor: t.border, borderWidth: 1 }]} onPress={() => navigation.navigate('Register')}>
              <Text style={[s.registerText, { color: t.textSecondary }]}>
                New to Aqua Lens?{'  '}
                <Text style={[s.registerBold, { color: t.primary }]}>Create Account</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  heroGrad: { paddingTop: 70, paddingBottom: 32, alignItems: 'center' },
  logoSection: { alignItems: 'center' },
  logoWrap: {
    width: 90, height: 90, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowOpacity: 0.4, shadowRadius: 24, shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  logoEmoji: { fontSize: 46 },
  appName: { fontSize: 34, fontWeight: '900', letterSpacing: 1.5 },
  appSub: { fontSize: 14, marginTop: 4, fontWeight: '500' },
  card: {
    marginHorizontal: 18,
    borderRadius: 24,
    padding: 26,
    borderWidth: 1,
    marginBottom: 32,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', marginBottom: 24, letterSpacing: 0.3 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, marginBottom: 18,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15 },
  eyeBtn: { padding: 4 },
  forgotWrap: { alignSelf: 'flex-end', marginTop: -8, marginBottom: 22 },
  forgotText: { fontWeight: '700', fontSize: 13 },
  btn: { width: '100%' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 22 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 14, fontSize: 13 },
  registerBtn: { alignItems: 'center', paddingVertical: 14, borderRadius: 12 },
  registerText: { fontSize: 14 },
  registerBold: { fontWeight: '800' },
});
