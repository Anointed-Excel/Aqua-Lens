import React, { useRef, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Dimensions, StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '🐠',
    color: '#F5C518',
    title: 'Welcome to Aqua Lens',
    sub: 'Your AI-powered pocket fish scientist. Identify any fish species instantly with just a photo.',
  },
  {
    emoji: '📷',
    color: '#00D68F',
    title: 'Snap & Identify',
    sub: 'Point your camera at any fish. Our AI identifies the species in seconds — with 17 detailed data fields.',
  },
  {
    emoji: '🔬',
    color: '#3B82F6',
    title: 'Explore 50+ Species',
    sub: 'Browse our rich fish database — habitat, diet, cooking tips, nutritional info, lifespan and much more.',
  },
  {
    emoji: '📍',
    color: '#FF6B6B',
    title: 'Track Your Journey',
    sub: 'Every scan is saved with location. Favourite fish, share discoveries, and export your catch history.',
  },
];

export default function OnboardingScreen({ navigation }) {
  const listRef = useRef(null);
  const [idx, setIdx] = useState(0);

  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  const press = () => {
    btnScale.value = withSpring(0.95, { duration: 80 }, () => { btnScale.value = withSpring(1); });
  };

  const finish = async () => {
    await AsyncStorage.setItem('onboarding_done', '1');
    navigation.replace('Login');
  };

  const next = () => {
    press();
    if (idx < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: idx + 1, animated: true });
    } else {
      finish();
    }
  };

  const current = SLIDES[idx];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={e =>
          setIdx(Math.round(e.nativeEvent.contentOffset.x / width))
        }
        renderItem={({ item }) => (
          <View style={s.slide}>
            {/* Circle glow behind icon */}
            <View style={s.illustration}>
              <View style={[s.glow, { backgroundColor: item.color + '14', borderColor: item.color + '28' }]} />
              <View style={[s.iconBox, { backgroundColor: item.color + '20', borderColor: item.color + '50', borderWidth: 1.5 }]}>
                <Text style={s.emoji}>{item.emoji}</Text>
              </View>
            </View>

            <Text style={[s.title, { color: item.color }]}>{item.title}</Text>
            <Text style={s.sub}>{item.sub}</Text>
          </View>
        )}
      />

      {/* Progress dots */}
      <View style={s.dotsRow}>
        {SLIDES.map((sl, i) => (
          <View key={i} style={[s.dot, {
            backgroundColor: i === idx ? sl.color : 'rgba(255,255,255,0.18)',
            width: i === idx ? 28 : 8,
          }]} />
        ))}
      </View>

      {/* Buttons */}
      <View style={s.btnRow}>
        {idx < SLIDES.length - 1 ? (
          <>
            <TouchableOpacity onPress={finish} style={s.skipBtn}>
              <Text style={s.skipText}>Skip</Text>
            </TouchableOpacity>
            <Animated.View style={btnStyle}>
              <TouchableOpacity
                onPress={next}
                style={[s.nextBtn, { backgroundColor: current.color }]}
              >
                <Text style={s.nextText}>Next</Text>
                <Feather name="arrow-right" size={16} color="#000" />
              </TouchableOpacity>
            </Animated.View>
          </>
        ) : (
          <Animated.View style={[btnStyle, { flex: 1 }]}>
            <TouchableOpacity
              onPress={next}
              style={[s.startBtn, { backgroundColor: current.color }]}
            >
              <Text style={s.startText}>Get Started</Text>
              <Feather name="arrow-right" size={18} color="#000" />
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070D1A', alignItems: 'center' },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
    paddingBottom: 20,
  },
  illustration: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  glow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 1,
  },
  iconBox: {
    width: 140,
    height: 140,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 68 },
  title: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 18,
    letterSpacing: 0.3,
    lineHeight: 36,
  },
  sub: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.50)',
    textAlign: 'center',
    lineHeight: 27,
    fontWeight: '400',
  },
  dotsRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 28 },
  dot: { height: 8, borderRadius: 4 },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 52,
    width: '100%',
    gap: 12,
  },
  skipBtn: { padding: 16 },
  skipText: { color: 'rgba(255,255,255,0.30)', fontSize: 15, fontWeight: '600' },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 18,
  },
  nextText: { fontSize: 16, fontWeight: '800', color: '#000' },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
    borderRadius: 20,
    width: '100%',
  },
  startText: { fontSize: 18, fontWeight: '900', color: '#000' },
});
