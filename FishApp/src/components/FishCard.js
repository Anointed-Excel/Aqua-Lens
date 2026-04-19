import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const AnimTouch = Animated.createAnimatedComponent(TouchableOpacity);

export default function FishCard({ fish, onPress }) {
  const { theme: t } = useTheme();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (!fish) return null;

  const edibleColor = { Yes: t.success, No: t.error, Caution: t.warning }[fish.edible] || t.textMuted;
  const edibleLabel = { Yes: 'Edible', No: 'Not Edible', Caution: 'Caution' }[fish.edible] || fish.edible;
  const dangerLevel = fish.danger_level?.split('(')[0].trim() || 'Unknown';

  return (
    <AnimTouch
      style={[s.card(t), animStyle]}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 15 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 12 }); }}
      activeOpacity={1}
    >
      {fish.image_url
        ? <Image source={{ uri: fish.image_url }} style={s.image} resizeMode="cover" />
        : <View style={[s.image, { backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' }]}>
            <Feather name="image" size={28} color={t.textMuted} />
          </View>
      }
      <View style={s.info}>
        <View style={s.nameRow}>
          <Text style={s.name(t)} numberOfLines={1}>{fish.name}</Text>
          {fish.in_model && (
            <View style={[s.aiPill, { backgroundColor: t.primaryLight }]}>
              <Feather name="cpu" size={9} color={t.primary} />
              <Text style={[s.aiText, { color: t.primary }]}>  AI</Text>
            </View>
          )}
        </View>
        <Text style={s.sci(t)} numberOfLines={1}>{fish.scientific_name}</Text>
        <View style={s.badges}>
          <View style={[s.badge, { backgroundColor: edibleColor + '22', borderColor: edibleColor, borderWidth: 1 }]}>
            <Text style={[s.badgeText, { color: edibleColor }]}>{edibleLabel}</Text>
          </View>
          <View style={[s.badge, { backgroundColor: t.surface, borderColor: t.border, borderWidth: 1 }]}>
            <Text style={[s.badgeText, { color: t.textMuted }]}>{dangerLevel}</Text>
          </View>
          {fish.water_type && (
            <View style={[s.badge, { backgroundColor: t.infoBg, borderColor: t.info + '44', borderWidth: 1 }]}>
              <Text style={[s.badgeText, { color: t.info }]}>{fish.water_type}</Text>
            </View>
          )}
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={t.textMuted} style={{ paddingRight: 14 }} />
    </AnimTouch>
  );
}

const s = {
  card: (t) => ({
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.card,
    borderRadius: 16,
    marginVertical: 5,
    marginHorizontal: 14,
    borderWidth: 1,
    borderColor: t.glassBorder,
    overflow: 'hidden',
  }),
  image: { width: 88, height: 88 },
  info: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: (t) => ({ fontSize: 15, fontWeight: '800', color: t.text, flex: 1 }),
  sci: (t) => ({ fontSize: 11, color: t.textMuted, fontStyle: 'italic', marginTop: 2, marginBottom: 8 }),
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  aiPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3 },
  aiText: { fontSize: 10, fontWeight: '700' },
};
