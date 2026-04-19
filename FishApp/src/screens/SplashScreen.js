import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withSpring, withDelay, withRepeat, withSequence, Easing,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isLoggedIn } from '../utils/storage';

const { width } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const fishX      = useSharedValue(-80);
  const fishY      = useSharedValue(0);
  const titleOp    = useSharedValue(0);
  const titleY     = useSharedValue(30);
  const subtitleOp = useSharedValue(0);
  const logoScale  = useSharedValue(0.4);

  const fishStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: fishX.value }, { translateY: fishY.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOp.value,
    transform: [{ translateY: titleY.value }],
  }));
  const subtitleStyle = useAnimatedStyle(() => ({ opacity: subtitleOp.value }));
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoScale.value,
  }));

  useEffect(() => {
    // Fish swims across
    fishX.value = withTiming(width + 80, { duration: 1800, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
    fishY.value = withRepeat(withSequence(
      withTiming(-12, { duration: 400 }),
      withTiming(12, { duration: 400 }),
    ), 3, true);

    // Logo scale pop
    logoScale.value = withDelay(300, withSpring(1, { damping: 10, stiffness: 120 }));

    // Title fade in
    titleOp.value = withDelay(500, withTiming(1, { duration: 600 }));
    titleY.value  = withDelay(500, withSpring(0, { damping: 14 }));

    // Subtitle
    subtitleOp.value = withDelay(900, withTiming(1, { duration: 500 }));

    // Navigate
    const t = setTimeout(async () => {
      const [ok, seen] = await Promise.all([isLoggedIn(), AsyncStorage.getItem('onboarding_done')]);
      if (!seen) {
        navigation.replace('Onboarding');
      } else {
        navigation.replace(ok ? 'Main' : 'Login');
      }
    }, 2600);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.container}>
      {/* Swimming fish */}
      <Animated.Text style={[styles.fish, fishStyle]}>🐟</Animated.Text>

      {/* Gold glow ring */}
      <Animated.View style={[styles.glowRing, logoStyle]} />

      {/* Logo */}
      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <Text style={styles.logoEmoji}>🐠</Text>
      </Animated.View>

      {/* Title */}
      <Animated.View style={titleStyle}>
        <Text style={styles.title}>Aqua Lens</Text>
      </Animated.View>

      {/* Subtitle */}
      <Animated.View style={subtitleStyle}>
        <Text style={styles.subtitle}>Identify any fish instantly</Text>
      </Animated.View>

      {/* Bottom label */}
      <Animated.View style={[styles.bottom, subtitleStyle]}>
        <Text style={styles.bottomText}>Powered by AI  •  97% Accuracy</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070D1A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fish: {
    position: 'absolute',
    top: '22%',
    fontSize: 36,
  },
  glowRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.20)',
    shadowColor: '#F5C518',
    shadowOpacity: 0.6,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
  },
  logoWrap: {
    width: 110,
    height: 110,
    borderRadius: 30,
    backgroundColor: '#F5C518',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: '#F5C518',
    shadowOpacity: 0.55,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },
  logoEmoji: { fontSize: 55 },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#F5C518',
    letterSpacing: 2,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 10,
    letterSpacing: 1.2,
    textAlign: 'center',
    fontWeight: '500',
  },
  bottom: {
    position: 'absolute',
    bottom: 48,
  },
  bottomText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.20)',
    letterSpacing: 0.8,
    fontWeight: '500',
  },
});
