import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  TextInput, Modal, ScrollView, StatusBar, Dimensions, InteractionManager,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withDelay, withSpring, withRepeat, withSequence, Easing,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import { useTheme } from '../context/ThemeContext';
import { predictFish } from '../services/api';
import { getUser } from '../utils/storage';

const { width } = Dimensions.get('window');

const SCAN_MESSAGES = [
  'Capturing your photo...',
  'Analysing with AI...',
  'Identifying the species...',
  'Fetching fish profile...',
  'Almost there...',
];

function PulsingRing({ delay, color }) {
  const scale   = useSharedValue(0.4);
  const opacity = useSharedValue(0.9);
  useEffect(() => {
    scale.value   = withDelay(delay, withRepeat(withTiming(1.9, { duration: 2200, easing: Easing.out(Easing.ease) }), -1, false));
    opacity.value = withDelay(delay, withRepeat(withTiming(0,   { duration: 2200, easing: Easing.out(Easing.ease) }), -1, false));
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return <Animated.View style={[ov.ring, { borderColor: color }, style]} />;
}

function ScanningOverlay({ theme: t }) {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setMsgIdx(i => (i + 1) % SCAN_MESSAGES.length), 2200);
    return () => clearInterval(timer);
  }, []);

  const swimY = useSharedValue(0);
  const swimX = useSharedValue(0);
  useEffect(() => {
    swimY.value = withRepeat(withSequence(
      withTiming(-10, { duration: 600, easing: Easing.inOut(Easing.sin) }),
      withTiming( 10, { duration: 600, easing: Easing.inOut(Easing.sin) }),
    ), -1);
    swimX.value = withRepeat(withSequence(
      withTiming(-4, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      withTiming( 4, { duration: 900, easing: Easing.inOut(Easing.sin) }),
    ), -1);
  }, []);
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: swimY.value }, { translateX: swimX.value }],
  }));

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={ov.backdrop}>
        <View style={[ov.card, { backgroundColor: t.bgSecondary, borderColor: t.primary + '44' }]}>

          {/* Pulsing sonar rings + icon */}
          <View style={ov.ringWrap}>
            <PulsingRing delay={0}    color={t.primary} />
            <PulsingRing delay={700}  color={t.primary} />
            <PulsingRing delay={1400} color={t.primary} />
            <Animated.View style={iconStyle}>
              <View style={[ov.iconCircle, { backgroundColor: t.primary }]}>
                <Text style={{ fontSize: 36 }}>🐠</Text>
              </View>
            </Animated.View>
          </View>

          <Text style={[ov.title, { color: t.text }]}>Identifying Fish</Text>
          <Text style={[ov.msg, { color: t.textSecondary }]}>{SCAN_MESSAGES[msgIdx]}</Text>

          {/* Step dots */}
          <View style={ov.dotsRow}>
            {SCAN_MESSAGES.map((_, i) => (
              <View key={i} style={[ov.dot, {
                backgroundColor: i === msgIdx ? t.primary : t.border,
                width: i === msgIdx ? 22 : 6,
              }]} />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const SCAN_OPTIONS = [
  { key: 'camera',  icon: 'camera',  title: 'Take a Photo',         sub: 'Use your camera live' },
  { key: 'gallery', icon: 'image',   title: 'Choose from Gallery',  sub: 'Upload an existing photo' },
  { key: 'url',     icon: 'link',    title: 'Use Image URL',         sub: 'Paste a link to a fish image' },
  { key: 'explore', icon: 'compass', title: 'Explore Database',      sub: 'Browse all fish species' },
];

function ScanCard({ item, onPress, index, theme: t }) {
  const op = useSharedValue(0);
  const y  = useSharedValue(50);
  useEffect(() => {
    op.value = withDelay(index * 100, withTiming(1, { duration: 400 }));
    y.value  = withDelay(index * 100, withSpring(0, { damping: 16 }));
  }, []);
  const animStyle = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: y.value }] }));

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity style={[sc.card, { backgroundColor: t.card, borderColor: t.glassBorder }]} onPress={onPress} activeOpacity={0.8}>
        <View style={[sc.iconWrap, { backgroundColor: t.primaryLight }]}>
          <Feather name={item.icon} size={22} color={t.primary} />
        </View>
        <View style={sc.textBlock}>
          <Text style={[sc.title, { color: t.text }]}>{item.title}</Text>
          <Text style={[sc.sub, { color: t.textMuted }]}>{item.sub}</Text>
        </View>
        <Feather name="chevron-right" size={18} color={t.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen({ navigation }) {
  const { theme: t } = useTheme();
  const [loading, setLoading]   = useState(false);
  const [urlModal, setUrlModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [user, setUser]         = useState(null);
  const [gpsLocation, setGpsLocation] = useState(null);

  const greetOp = useSharedValue(0);
  const greetY  = useSharedValue(-20);
  const greetStyle = useAnimatedStyle(() => ({ opacity: greetOp.value, transform: [{ translateY: greetY.value }] }));

  useEffect(() => {
    greetOp.value = withTiming(1, { duration: 600 });
    greetY.value  = withSpring(0, { damping: 14 });
    getUser().then(setUser);
    // Silently get GPS for scan tagging — wait for nav animation to finish first
    const task = InteractionManager.runAfterInteractions(async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setGpsLocation(`${loc.coords.latitude.toFixed(5)},${loc.coords.longitude.toFixed(5)}`);
        }
      } catch { /* silent — location is optional */ }
    });
    return () => task.cancel();
  }, []);

  const processImage = async (uri, base64) => {
    setLoading(true);
    try {
      const b64 = base64 || await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const { data } = await predictFish(b64, gpsLocation);
      navigation.navigate('Result', { result: data, imageUri: uri });
    } catch (err) {
      const status = err.response?.status;
      const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
      const msg = status === 429
        ? 'AI quota reached. Please wait a moment and try again.'
        : status === 413
        ? 'Image too large. Please try a smaller photo.'
        : err.response?.data?.error
        ? err.response.data.error
        : isTimeout
        ? 'Analysis is taking too long. Please try again.'
        : !err.response
        ? 'No internet connection. Please check your network.'
        : 'Failed to analyse image. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission needed', 'Camera access is required.');
    const r = await ImagePicker.launchCameraAsync({ quality: 0.4, base64: true });
    if (!r.canceled) processImage(r.assets[0].uri, r.assets[0].base64);
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission needed', 'Gallery access is required.');
    const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.4, base64: true });
    if (!r.canceled) processImage(r.assets[0].uri, r.assets[0].base64);
  };

  const handleUrl = async () => {
    if (!imageUrl.trim()) return Alert.alert('Error', 'Please enter an image URL');
    setUrlModal(false);
    setLoading(true);
    try {
      const dl = await FileSystem.downloadAsync(imageUrl.trim(), FileSystem.cacheDirectory + 'fish_url.jpg');
      processImage(dl.uri);
    } catch {
      setLoading(false);
      Alert.alert('Error', 'Could not load image from that URL.');
    }
    setImageUrl('');
  };

  const handlers = {
    camera: openCamera,
    gallery: openGallery,
    url: () => setUrlModal(true),
    explore: () => navigation.getParent()?.navigate('Explore'),
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.statusBar} backgroundColor="transparent" translucent />

      {/* Header */}
      <LinearGradient
        colors={['rgba(245,197,24,0.12)', 'transparent']}
        style={s.header}
      >
        <Animated.View style={greetStyle}>
          <Text style={[s.greeting, { color: t.textMuted }]}>{greeting}</Text>
          <Text style={[s.headerName, { color: t.text }]}>{user?.username || 'Fisher'}</Text>
          <Text style={[s.headerSub, { color: t.textSecondary }]}>What fish do you want to identify?</Text>
        </Animated.View>
      </LinearGradient>

      {loading && <ScanningOverlay theme={t} />}

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={[s.sectionTitle, { color: t.textMuted }]}>Identification Methods</Text>

        {SCAN_OPTIONS.map((item, i) => (
          <ScanCard key={item.key} item={item} onPress={handlers[item.key]} index={i} theme={t} />
        ))}

        {/* Stats card */}
        <View style={[s.statsCard, { backgroundColor: t.card, borderColor: t.glassBorder }]}>
          <View style={s.statsTitleRow}>
            <Feather name="database" size={14} color={t.primary} />
            <Text style={[s.statsTitle, { color: t.text }]}>  Fish Database</Text>
          </View>
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: t.primary }]}>31</Text>
              <Text style={[s.statLabel, { color: t.textMuted }]}>AI-Detectable{'\n'}Species</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: t.border }]} />
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: t.primary }]}>50+</Text>
              <Text style={[s.statLabel, { color: t.textMuted }]}>Total Species{'\n'}in Database</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: t.border }]} />
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: t.primary }]}>97%</Text>
              <Text style={[s.statLabel, { color: t.textMuted }]}>Model{'\n'}Accuracy</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* URL Modal */}
      <Modal visible={urlModal} transparent animationType="slide">
        <View style={[s.modalOverlay, { backgroundColor: t.overlay }]}>
          <View style={[s.modalBox, { backgroundColor: t.bgSecondary, borderColor: t.glassBorder, borderWidth: 1 }]}>
            <View style={s.modalTitleRow}>
              <Feather name="link" size={18} color={t.primary} />
              <Text style={[s.modalTitle, { color: t.text }]}>  Paste Image URL</Text>
            </View>
            <Text style={[s.modalSub, { color: t.textMuted }]}>Enter a direct link to a fish image</Text>
            <TextInput
              style={[s.urlInput, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.text }]}
              placeholder="https://example.com/fish.jpg"
              placeholderTextColor={t.textMuted}
              value={imageUrl}
              onChangeText={setImageUrl}
              autoCapitalize="none"
              keyboardType="url"
              autoFocus
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={[s.cancelBtn, { backgroundColor: t.surface, borderColor: t.border, borderWidth: 1 }]} onPress={() => setUrlModal(false)}>
                <Text style={[s.cancelText, { color: t.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.confirmBtn, { backgroundColor: t.primary }]} onPress={handleUrl}>
                <Text style={[s.confirmText, { color: t.textOnPrimary }]}>Identify</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const sc = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1,
  },
  iconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  textBlock: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700' },
  sub: { fontSize: 12, marginTop: 2 },
});

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: 22 },
  greeting: { fontSize: 13, fontWeight: '500' },
  headerName: { fontSize: 26, fontWeight: '900', marginTop: 2 },
  headerSub: { fontSize: 13, marginTop: 4 },
  analyzingBadge: { marginTop: 12, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  analyzingText: { fontSize: 12, fontWeight: '600' },
  content: { paddingHorizontal: 18, paddingBottom: 40 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 14, marginTop: 4 },
  statsCard: { borderRadius: 18, padding: 20, marginTop: 6, borderWidth: 1 },
  statsTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  statsTitle: { fontSize: 14, fontWeight: '700' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', flex: 1 },
  statNum: { fontSize: 26, fontWeight: '900' },
  statLabel: { fontSize: 11, textAlign: 'center', marginTop: 4, lineHeight: 16 },
  statDivider: { width: 1, marginHorizontal: 8 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 44, borderTopWidth: 1 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalSub: { fontSize: 13, marginBottom: 20 },
  urlInput: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 14, marginBottom: 18 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
  cancelText: { fontWeight: '700' },
  confirmBtn: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
  confirmText: { fontWeight: '800' },
});

const ov = StyleSheet.create({
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center', alignItems: 'center', zIndex: 999,
  },
  card: {
    borderRadius: 32, padding: 36, alignItems: 'center',
    marginHorizontal: 32, borderWidth: 1, width: width - 64,
  },
  ringWrap: {
    width: 130, height: 130,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 28,
  },
  ring: {
    position: 'absolute',
    width: 120, height: 120,
    borderRadius: 60, borderWidth: 2,
  },
  iconCircle: {
    width: 80, height: 80, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: 0.3, marginBottom: 8 },
  msg: { fontSize: 13, fontWeight: '500', textAlign: 'center', minHeight: 20 },
  dotsRow: { flexDirection: 'row', gap: 6, marginTop: 20, alignItems: 'center' },
  dot: { height: 6, borderRadius: 3 },
  aiTag: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 20, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  aiText: { fontSize: 11, fontWeight: '700' },
});
