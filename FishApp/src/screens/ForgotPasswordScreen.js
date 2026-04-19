import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import AnimatedButton from '../components/AnimatedButton';
import { forgotPassword } from '../services/api';

export default function ForgotPasswordScreen({ navigation }) {
  const { theme: t } = useTheme();
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);

  const iconScale = useSharedValue(0);
  const formOp    = useSharedValue(0);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconScale.value }] }));
  const formStyle = useAnimatedStyle(() => ({ opacity: formOp.value }));

  useEffect(() => {
    iconScale.value = withSpring(1, { damping: 10, stiffness: 120 });
    formOp.value    = withDelay(300, withTiming(1, { duration: 500 }));
  }, []);

  const handleSend = async () => {
    if (!email.trim()) return Alert.alert('Required', 'Please enter your email address');
    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      navigation.navigate('VerifyOTP', { email: email.trim().toLowerCase() });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.statusBar} backgroundColor="transparent" translucent />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={s.inner}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
            <Feather name="arrow-left" size={20} color={t.primary} />
            <Text style={[s.backText, { color: t.primary }]}> Back</Text>
          </TouchableOpacity>

          <Animated.View style={[s.iconWrap, { backgroundColor: t.primaryLight, borderColor: t.primary + '44', borderWidth: 1 }, iconStyle]}>
            <Feather name="lock" size={36} color={t.primary} />
          </Animated.View>

          <Text style={[s.title, { color: t.text }]}>Forgot Password?</Text>
          <Text style={[s.sub, { color: t.textSecondary }]}>
            Enter your registered email and we'll send you a 6-digit reset code.
          </Text>

          <Animated.View style={[{ width: '100%' }, formStyle]}>
            <View style={[s.card, { backgroundColor: t.card, borderColor: t.glassBorder }]}>
              <Text style={[s.label, { color: t.textMuted }]}>Email Address</Text>
              <View style={[s.inputWrap, { backgroundColor: t.inputBg, borderColor: t.inputBorder }]}>
                <Feather name="mail" size={16} color={t.textMuted} style={s.inputIcon} />
                <TextInput
                  style={[s.input, { color: t.text }]}
                  placeholder="you@example.com"
                  placeholderTextColor={t.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <AnimatedButton title="Send Reset Code" onPress={handleSend} loading={loading} style={{ marginTop: 4 }} />

              <TouchableOpacity onPress={() => navigation.navigate('Login')} style={s.loginLink}>
                <Text style={[s.loginText, { color: t.textMuted }]}>
                  Remembered it?{'  '}
                  <Text style={{ color: t.primary, fontWeight: '800' }}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  back: { position: 'absolute', top: 54, left: 24, flexDirection: 'row', alignItems: 'center' },
  backText: { fontSize: 15, fontWeight: '700' },
  iconWrap: { width: 96, height: 96, borderRadius: 28, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 24, marginTop: 60 },
  title: { fontSize: 28, fontWeight: '900', textAlign: 'center' },
  sub: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginTop: 10, marginBottom: 28, paddingHorizontal: 10 },
  card: { borderRadius: 20, padding: 22, borderWidth: 1 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, marginBottom: 20 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15 },
  loginLink: { alignItems: 'center', marginTop: 22 },
  loginText: { fontSize: 14 },
});
