import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, withSpring, Easing } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import AnimatedButton from '../components/AnimatedButton';
import { register } from '../services/api';
import { saveAuth } from '../utils/storage';

export default function RegisterScreen({ navigation }) {
  const { theme: t } = useTheme();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const logoOp = useSharedValue(0);
  const formOp = useSharedValue(0);
  const formY  = useSharedValue(40);

  useEffect(() => {
    logoOp.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    formOp.value = withDelay(300, withTiming(1, { duration: 500 }));
    formY.value  = withDelay(300, withSpring(0, { damping: 16 }));
  }, []);

  const logoStyle = useAnimatedStyle(() => ({ opacity: logoOp.value }));
  const formStyle = useAnimatedStyle(() => ({ opacity: formOp.value, transform: [{ translateY: formY.value }] }));
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleRegister = async () => {
    if (!form.username.trim() || !form.email.trim() || !form.password || !form.confirm)
      return Alert.alert('Required', 'Please fill in all fields');
    if (form.password !== form.confirm)
      return Alert.alert('Mismatch', 'Passwords do not match');
    if (form.password.length < 6)
      return Alert.alert('Too short', 'Password must be at least 6 characters');

    setLoading(true);
    try {
      const { data } = await register(form.username.trim(), form.email.trim().toLowerCase(), form.password);
      await saveAuth(data.access_token, data.refresh_token, data.user);
      navigation.replace('Main');
    } catch (err) {
      Alert.alert('Failed', err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'username', label: 'Username', icon: 'user', placeholder: 'johndoe', auto: 'none' },
    { key: 'email', label: 'Email Address', icon: 'mail', placeholder: 'you@example.com', keyboard: 'email-address', auto: 'none' },
    { key: 'password', label: 'Password', icon: 'lock', placeholder: 'At least 6 characters', secure: true },
    { key: 'confirm', label: 'Confirm Password', icon: 'lock', placeholder: 'Repeat password', secure: true },
  ];

  return (
    <View style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.statusBar} backgroundColor="transparent" translucent />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false} showsVerticalScrollIndicator={false}>

          <LinearGradient colors={['rgba(245,197,24,0.12)', 'transparent']} style={s.heroGrad}>
            <Animated.View style={[s.logoSection, logoStyle]}>
              <View style={[s.logoWrap, { backgroundColor: t.primary, shadowColor: t.primary }]}>
                <Text style={s.logoEmoji}>🐠</Text>
              </View>
              <Text style={[s.appName, { color: t.text }]}>Create Account</Text>
              <Text style={[s.appSub, { color: t.textMuted }]}>Join Aqua Lens — it's free</Text>
            </Animated.View>
          </LinearGradient>

          <Animated.View style={[s.card, { backgroundColor: t.card, borderColor: t.glassBorder }, formStyle]}>
            {fields.map(({ key, label, icon, placeholder, keyboard, secure, auto }) => (
              <View key={key}>
                <Text style={[s.label, { color: t.textMuted }]}>{label}</Text>
                <View style={[s.inputWrap, { backgroundColor: t.inputBg, borderColor: t.inputBorder }]}>
                  <Feather name={icon} size={16} color={t.textMuted} style={s.inputIcon} />
                  <TextInput
                    style={[s.input, { color: t.text }]}
                    placeholder={placeholder}
                    placeholderTextColor={t.textMuted}
                    keyboardType={keyboard}
                    autoCapitalize={auto || 'sentences'}
                    secureTextEntry={secure && !showPass}
                    value={form[key]}
                    onChangeText={v => set(key, v)}
                  />
                  {secure && (
                    <TouchableOpacity onPress={() => setShowPass(p => !p)} style={s.eyeBtn}>
                      <Feather name={showPass ? 'eye-off' : 'eye'} size={16} color={t.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            <AnimatedButton title="Create Account" onPress={handleRegister} loading={loading} style={[s.btn, { marginTop: 8 }]} />

            <View style={s.dividerRow}>
              <View style={[s.dividerLine, { backgroundColor: t.border }]} />
              <Text style={[s.dividerText, { color: t.textMuted }]}>or</Text>
              <View style={[s.dividerLine, { backgroundColor: t.border }]} />
            </View>

            <TouchableOpacity style={[s.loginBtn, { borderColor: t.border, borderWidth: 1 }]} onPress={() => navigation.navigate('Login')}>
              <Text style={[s.loginText, { color: t.textSecondary }]}>
                Already have an account?{'  '}
                <Text style={[s.loginBold, { color: t.primary }]}>Sign In</Text>
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
  heroGrad: { paddingTop: 70, paddingBottom: 24, alignItems: 'center' },
  logoSection: { alignItems: 'center' },
  logoWrap: {
    width: 80, height: 80, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 14,
  },
  logoEmoji: { fontSize: 40 },
  appName: { fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  appSub: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  card: { marginHorizontal: 18, borderRadius: 24, padding: 26, borderWidth: 1, marginBottom: 32 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, marginBottom: 18,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15 },
  eyeBtn: { padding: 4 },
  btn: { width: '100%' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 22 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 14, fontSize: 13 },
  loginBtn: { alignItems: 'center', paddingVertical: 14, borderRadius: 12 },
  loginText: { fontSize: 14 },
  loginBold: { fontWeight: '800' },
});
