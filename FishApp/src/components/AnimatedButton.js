import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

const AnimTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function AnimatedButton({ title, onPress, loading, variant = 'primary', style, textStyle }) {
  const { theme: t } = useTheme();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn  = () => { scale.value = withSpring(0.96, { damping: 15 }); };
  const onPressOut = () => { scale.value = withSpring(1.00, { damping: 12 }); };

  const bg = variant === 'primary' ? t.primary
    : variant === 'outline' ? 'transparent'
    : t.glass;
  const color = variant === 'outline' ? t.primary : t.textOnPrimary;
  const border = variant === 'outline'
    ? { borderWidth: 1.5, borderColor: t.primary }
    : {};

  return (
    <AnimTouchable
      style={[ss.btn, { backgroundColor: bg }, border, animStyle, style]}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}
      disabled={loading}
    >
      {loading
        ? <ActivityIndicator color={color} />
        : <Text style={[ss.text, { color }, textStyle]}>{title}</Text>
      }
    </AnimTouchable>
  );
}

const ss = StyleSheet.create({
  btn: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 16, fontWeight: '700', letterSpacing: 0.4 },
});
