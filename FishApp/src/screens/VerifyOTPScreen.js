import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { verifyOTP, resetPassword, forgotPassword } from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function VerifyOTPScreen({ route, navigation }) {
  const { email } = route.params;
  const { theme: t } = useTheme();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState('otp'); // 'otp' | 'password'
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const inputs = useRef([]);

  const handleOTPChange = (val, index) => {
    const cleaned = val.replace(/[^0-9]/g, '').slice(-1);
    const updated = [...otp];
    updated[index] = cleaned;
    setOtp(updated);
    if (cleaned && index < 5) inputs.current[index + 1]?.focus();
    if (!cleaned && index > 0) inputs.current[index - 1]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) return Alert.alert('Error', 'Please enter the full 6-digit code');
    setLoading(true);
    try {
      await verifyOTP(email, code);
      setStep('password');
    } catch (err) {
      Alert.alert('Invalid Code', err.response?.data?.error || 'OTP is wrong or expired');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!newPassword || !confirmPassword) return Alert.alert('Error', 'Please fill in both password fields');
    if (newPassword !== confirmPassword) return Alert.alert('Error', 'Passwords do not match');
    if (newPassword.length < 6) return Alert.alert('Error', 'Password must be at least 6 characters');
    const code = otp.join('');
    setLoading(true);
    try {
      await resetPassword(email, code, newPassword);
      Alert.alert('Success!', 'Your password has been reset. Please login.', [
        { text: 'Login', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await forgotPassword(email);
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
      Alert.alert('Sent!', 'A new code has been sent to your email.');
    } catch {
      Alert.alert('Error', 'Could not resend code. Try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={[s.container, { backgroundColor: t.bg }]}>
        <StatusBar barStyle={t.statusBar} backgroundColor="transparent" translucent />

        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Feather name="arrow-left" size={20} color={t.primary} />
          <Text style={[s.backText, { color: t.primary }]}> Back</Text>
        </TouchableOpacity>

        {step === 'otp' ? (
          <>
            <View style={[s.iconWrap, { backgroundColor: t.primaryLight, borderColor: t.primary + '44', borderWidth: 1 }]}>
              <Feather name="mail" size={34} color={t.primary} />
            </View>
            <Text style={[s.title, { color: t.text }]}>Check Your Email</Text>
            <Text style={[s.subtitle, { color: t.textSecondary }]}>
              We sent a 6-digit code to{'\n'}
              <Text style={[s.emailHighlight, { color: t.primary }]}>{email}</Text>
            </Text>

            <View style={s.otpRow}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={ref => inputs.current[i] = ref}
                  style={[
                    s.otpBox,
                    { backgroundColor: digit ? t.primaryLight : t.inputBg, borderColor: digit ? t.primary : t.inputBorder, color: t.text },
                  ]}
                  value={digit}
                  onChangeText={val => handleOTPChange(val, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            <TouchableOpacity
              style={[s.btn, { backgroundColor: t.primary }]}
              onPress={handleVerify}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={t.textOnPrimary} />
                : <Text style={[s.btnText, { color: t.textOnPrimary }]}>Verify Code</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={handleResend} disabled={resending} style={s.resendBtn}>
              {resending
                ? <ActivityIndicator color={t.primary} size="small" />
                : <Text style={[s.resendText, { color: t.textMuted }]}>
                    Didn't get it?{'  '}
                    <Text style={[s.resendBold, { color: t.primary }]}>Resend</Text>
                  </Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={[s.iconWrap, { backgroundColor: t.primaryLight, borderColor: t.primary + '44', borderWidth: 1 }]}>
              <Feather name="shield" size={34} color={t.primary} />
            </View>
            <Text style={[s.title, { color: t.text }]}>New Password</Text>
            <Text style={[s.subtitle, { color: t.textSecondary }]}>Code verified! Set your new password below.</Text>

            <View style={[s.card, { backgroundColor: t.card, borderColor: t.glassBorder }]}>
              <Text style={[s.label, { color: t.textMuted }]}>New Password</Text>
              <View style={[s.inputWrap, { backgroundColor: t.inputBg, borderColor: t.inputBorder }]}>
                <Feather name="lock" size={15} color={t.textMuted} style={{ marginRight: 10 }} />
                <TextInput
                  style={[s.input, { color: t.text }]}
                  placeholder="At least 6 characters"
                  placeholderTextColor={t.textMuted}
                  secureTextEntry={!showPass}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  autoFocus
                />
              </View>

              <Text style={[s.label, { color: t.textMuted, marginTop: 4 }]}>Confirm Password</Text>
              <View style={[s.inputWrap, { backgroundColor: t.inputBg, borderColor: t.inputBorder }]}>
                <Feather name="lock" size={15} color={t.textMuted} style={{ marginRight: 10 }} />
                <TextInput
                  style={[s.input, { color: t.text }]}
                  placeholder="Repeat new password"
                  placeholderTextColor={t.textMuted}
                  secureTextEntry={!showPass}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowPass(p => !p)} style={{ padding: 4 }}>
                  <Feather name={showPass ? 'eye-off' : 'eye'} size={15} color={t.textMuted} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[s.btn, { backgroundColor: t.primary }]}
                onPress={handleReset}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color={t.textOnPrimary} />
                  : <Text style={[s.btnText, { color: t.textOnPrimary }]}>Reset Password</Text>
                }
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 54, left: 24, flexDirection: 'row', alignItems: 'center' },
  backText: { fontSize: 15, fontWeight: '700' },
  iconWrap: { width: 90, height: 90, borderRadius: 26, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 22 },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: 10, marginBottom: 28, lineHeight: 22 },
  emailHighlight: { fontWeight: '700' },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 28 },
  otpBox: { width: 48, height: 58, borderRadius: 14, borderWidth: 2, textAlign: 'center', fontSize: 24, fontWeight: '800' },
  btn: { borderRadius: 14, padding: 16, alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '700' },
  resendBtn: { alignItems: 'center', marginTop: 22 },
  resendText: { fontSize: 14 },
  resendBold: { fontWeight: '700' },
  card: { borderRadius: 20, padding: 20, borderWidth: 1, gap: 4 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, marginBottom: 16 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15 },
});
