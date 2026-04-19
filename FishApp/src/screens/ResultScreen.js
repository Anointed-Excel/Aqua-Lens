import React, { useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Share } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withDelay, withSpring, Easing,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const INFO_FIELDS = [
  { label: 'Description',          key: 'description',          icon: 'file-text' },
  { label: 'Characteristics',      key: 'characteristics',       icon: 'sliders' },
  { label: 'Habitat',              key: 'habitat',               icon: 'anchor' },
  { label: 'Diet',                 key: 'diet',                  icon: 'coffee' },
  { label: 'Average Size',         key: 'average_size',          icon: 'minimize-2' },
  { label: 'Max Size',             key: 'max_size',              icon: 'maximize-2' },
  { label: 'Weight Range',         key: 'weight_range',          icon: 'activity' },
  { label: 'Lifespan',             key: 'lifespan',              icon: 'clock' },
  { label: 'Reproduction',         key: 'reproduction',          icon: 'git-branch' },
  { label: 'Conservation Status',  key: 'conservation_status',   icon: 'shield' },
  { label: 'Native Regions',       key: 'native_regions',        icon: 'map' },
  { label: 'Economic Importance',  key: 'economic_importance',   icon: 'trending-up' },
  { label: 'Nutritional Info',     key: 'nutritional_info',      icon: 'heart' },
  { label: 'Cooking Tips',         key: 'cooking_tips',          icon: 'thermometer' },
  { label: 'Fishing Tips',         key: 'fishing_tips',          icon: 'target' },
  { label: 'Similar Species',      key: 'similar_species',       icon: 'copy' },
  { label: 'Fun Facts',            key: 'fun_facts',             icon: 'zap' },
];

function ConfidenceBar({ confidence, color }) {
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withDelay(400, withTiming(confidence, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, []);
  const barStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <View style={cb.wrap}>
      <View style={cb.bg}>
        <Animated.View style={[cb.fill, { backgroundColor: color }, barStyle]} />
      </View>
      <Text style={[cb.pct, { color }]}>{confidence.toFixed(1)}%</Text>
    </View>
  );
}

const cb = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  bg: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 3, overflow: 'hidden', marginRight: 12 },
  fill: { height: '100%', borderRadius: 3 },
  pct: { fontSize: 14, fontWeight: '800', minWidth: 48, textAlign: 'right' },
});

export default function ResultScreen({ route, navigation }) {
  const { theme: t } = useTheme();
  const { result, imageUri } = route.params;
  const { status, confidence, predicted_name, top5, fish, scan_id, image_url } = result;
  const displayImage = image_url || imageUri;

  const isIdentified = status === 'identified';
  const isLow        = status === 'low_confidence';
  const isUnknown    = status === 'unrecognized';

  const statusColor = isIdentified ? t.success : isLow ? t.warning : t.error;
  const statusLabel = isIdentified ? 'Identified' : isLow ? 'Low Confidence' : 'Not Recognised';
  const statusIcon  = isIdentified ? 'check-circle' : isLow ? 'alert-triangle' : 'x-circle';
  const statusBg    = isIdentified ? t.successBg : isLow ? t.warningBg : t.errorBg;

  const cardY  = useSharedValue(60);
  const cardOp = useSharedValue(0);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateY: cardY.value }], opacity: cardOp.value }));

  useEffect(() => {
    cardY.value  = withDelay(200, withSpring(0, { damping: 16 }));
    cardOp.value = withDelay(200, withTiming(1, { duration: 500 }));
  }, []);

  const EDIBLE_COLOR = { Yes: t.success, No: t.error, Caution: t.warning };

  const handleShare = async () => {
    const name = fish?.name || predicted_name || 'Unknown Fish';
    const sci  = fish?.scientific_name ? ` (${fish.scientific_name})` : '';
    const desc = fish?.description ? '\n\n' + fish.description.substring(0, 150) + '...' : '';
    await Share.share({ message: `I identified a ${name}${sci}!${desc}\n\nIdentified with Aqua Lens 🐠` });
  };

  return (
    <View style={[rs.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.statusBar} backgroundColor="transparent" translucent />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} bounces={false}>

        {/* Hero image */}
        <View style={rs.imageWrap}>
          {displayImage
            ? <Image source={{ uri: displayImage }} style={rs.image} resizeMode="cover" />
            : <View style={[rs.image, { backgroundColor: t.surface, justifyContent: 'center', alignItems: 'center' }]}>
                <Feather name="image" size={60} color={t.textMuted} />
              </View>
          }
          <View style={[rs.statusBadge, { backgroundColor: statusBg, borderColor: statusColor, borderWidth: 1 }]}>
            <Feather name={statusIcon} size={13} color={statusColor} />
            <Text style={[rs.statusBadgeText, { color: statusColor }]}>  {statusLabel}</Text>
          </View>
        </View>

        <Animated.View style={cardStyle}>
          {isUnknown ? (
            <View style={[rs.section, { margin: 16, backgroundColor: t.card, borderColor: t.glassBorder }]}>
              <Text style={[rs.bigTitle, { color: t.error }]}>Unrecognised Fish</Text>
              <Text style={[rs.subText, { color: t.textSecondary }]}>
                Our model couldn't identify this fish with enough confidence. You can help by adding its details manually.
              </Text>

              <Text style={[rs.topGuessLabel, { color: t.textMuted }]}>Best guesses</Text>
              {top5?.map((g, i) => (
                <View key={i} style={{ marginTop: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={[rs.guessName, { color: i === 0 ? t.primary : t.text }]}>{g.name}</Text>
                    <Text style={[rs.guessPct, { color: i === 0 ? t.primary : t.textMuted }]}>{(g.confidence * 100).toFixed(1)}%</Text>
                  </View>
                  <View style={[cb.bg, { backgroundColor: t.surface }]}>
                    <View style={[cb.fill, { width: `${(g.confidence * 100).toFixed(0)}%`, backgroundColor: i === 0 ? t.primary : t.border }]} />
                  </View>
                </View>
              ))}

              <TouchableOpacity style={[rs.primaryBtn, { backgroundColor: t.primary, marginTop: 20 }]} onPress={() => navigation.navigate('ManualEntry', { scan_id })}>
                <Feather name="plus" size={15} color={t.textOnPrimary} />
                <Text style={[rs.primaryBtnText, { color: t.textOnPrimary }]}>  Add Fish Details Manually</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={[rs.section, { margin: 16, marginBottom: 8, backgroundColor: t.card, borderColor: t.glassBorder }]}>
                <Text style={[rs.fishName, { color: t.text }]}>{fish?.name || predicted_name}</Text>
                {fish?.scientific_name && <Text style={[rs.scientific, { color: t.textSecondary }]}>{fish.scientific_name}</Text>}
                {fish?.family && <Text style={[rs.family, { color: t.textMuted }]}>{fish.family}  •  {fish?.water_type}</Text>}

                <View style={{ marginBottom: 16 }}>
                  <Text style={[rs.confLabel, { color: t.textMuted }]}>Confidence</Text>
                  <ConfidenceBar confidence={confidence} color={statusColor} />
                </View>

                <View style={rs.badgeRow}>
                  <View style={[rs.badge, { backgroundColor: (EDIBLE_COLOR[fish?.edible] || t.textMuted) + '22', borderColor: EDIBLE_COLOR[fish?.edible] || t.textMuted, borderWidth: 1 }]}>
                    <Text style={[rs.badgeText, { color: EDIBLE_COLOR[fish?.edible] || t.textMuted }]}>
                      {fish?.edible === 'Yes' ? 'Edible' : fish?.edible === 'No' ? 'Not Edible' : 'Caution'}
                    </Text>
                  </View>
                  <View style={[rs.badge, { backgroundColor: t.surface, borderColor: t.border, borderWidth: 1 }]}>
                    <Text style={[rs.badgeText, { color: t.textMuted }]}>{fish?.danger_level?.split('(')[0].trim()}</Text>
                  </View>
                  {fish?.water_type && (
                    <View style={[rs.badge, { backgroundColor: t.infoBg, borderColor: t.info + '44', borderWidth: 1 }]}>
                      <Text style={[rs.badgeText, { color: t.info }]}>{fish.water_type}</Text>
                    </View>
                  )}
                </View>

                {isLow && (
                  <View style={[rs.lowAlert, { backgroundColor: t.warningBg, borderColor: t.warning + '66', borderWidth: 1 }]}>
                    <Feather name="alert-triangle" size={13} color={t.warning} />
                    <Text style={[rs.lowAlertText, { color: t.warning }]}>  Low confidence — result may not be accurate</Text>
                  </View>
                )}
              </View>

              {INFO_FIELDS.map(({ label, key, icon }) =>
                fish?.[key] ? (
                  <View key={key} style={[rs.infoRow, { backgroundColor: t.card, borderBottomColor: t.border }]}>
                    <View style={rs.infoLabelRow}>
                      <Feather name={icon} size={12} color={t.primary} />
                      <Text style={[rs.infoLabel, { color: t.primary }]}>  {label}</Text>
                    </View>
                    <Text style={[rs.infoValue, { color: t.text }]}>{fish[key]}</Text>
                  </View>
                ) : null
              )}

              {top5?.length > 0 && (
                <View style={[rs.section, { margin: 16, marginTop: 8, backgroundColor: t.card, borderColor: t.glassBorder }]}>
                  <Text style={[rs.sectionHead, { color: t.text }]}>Top Predictions</Text>
                  {top5.map((g, i) => (
                    <View key={i} style={{ marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={[rs.guessName, { color: i === 0 ? t.primary : t.text, fontWeight: i === 0 ? '800' : '500' }]}>{g.name}</Text>
                        <Text style={[rs.guessPct, { color: i === 0 ? t.primary : t.textMuted }]}>{(g.confidence * 100).toFixed(1)}%</Text>
                      </View>
                      <View style={[cb.bg, { backgroundColor: t.surface }]}>
                        <View style={[cb.fill, { width: `${Math.min(g.confidence * 100, 100).toFixed(0)}%`, backgroundColor: i === 0 ? t.primary : t.border }]} />
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={{ paddingHorizontal: 16, gap: 10, marginTop: 4 }}>
                {fish?.id && (
                  <TouchableOpacity style={[rs.outlineBtn, { borderColor: t.primary, borderWidth: 1.5 }]} onPress={() => navigation.navigate('FishDetail', { fishId: fish.id, scanImageUrl: image_url || imageUri })}>
                    <Text style={[rs.outlineBtnText, { color: t.primary }]}>View Full Fish Profile</Text>
                    <Feather name="arrow-right" size={15} color={t.primary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[rs.primaryBtn, { backgroundColor: t.primary }]} onPress={() => navigation.navigate('ManualEntry', { scan_id, prefill: { name: fish?.name || predicted_name } })}>
                  <Feather name="plus" size={15} color={t.textOnPrimary} />
                  <Text style={[rs.primaryBtnText, { color: t.textOnPrimary }]}>  Add Extra Information</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginTop: 4 }}>
            <TouchableOpacity style={[rs.outlineBtn, { borderColor: t.border, borderWidth: 1.5, flex: 1 }]} onPress={() => navigation.navigate('Home')}>
              <Feather name="arrow-left" size={15} color={t.textSecondary} />
              <Text style={[rs.outlineBtnText, { color: t.textSecondary }]}>Scan Again</Text>
            </TouchableOpacity>
            {!isUnknown && (
              <TouchableOpacity style={[rs.outlineBtn, { borderColor: t.primary, borderWidth: 1.5, flex: 1 }]} onPress={handleShare}>
                <Feather name="share-2" size={15} color={t.primary} />
                <Text style={[rs.outlineBtnText, { color: t.primary }]}>Share</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const rs = StyleSheet.create({
  root: { flex: 1 },
  imageWrap: { position: 'relative' },
  image: { width: '100%', height: 280 },
  statusBadge: { position: 'absolute', bottom: 16, left: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  statusBadgeText: { fontWeight: '800', fontSize: 13 },
  section: { borderRadius: 18, padding: 20, borderWidth: 1 },
  bigTitle: { fontSize: 24, fontWeight: '800', marginBottom: 10 },
  subText: { fontSize: 14, lineHeight: 22, marginBottom: 8 },
  topGuessLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 14 },
  guessName: { fontSize: 14, fontWeight: '600', flex: 1 },
  guessPct: { fontSize: 13, fontWeight: '700' },
  fishName: { fontSize: 30, fontWeight: '900', letterSpacing: 0.5 },
  scientific: { fontSize: 15, fontStyle: 'italic', marginTop: 4 },
  family: { fontSize: 12, marginTop: 3, marginBottom: 16 },
  confLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  badge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  badgeText: { fontWeight: '700', fontSize: 12 },
  lowAlert: { marginTop: 16, padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  lowAlertText: { fontSize: 13, fontWeight: '600' },
  infoRow: { marginHorizontal: 16, marginBottom: 2, padding: 16, borderBottomWidth: 1 },
  infoLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  infoValue: { fontSize: 14, lineHeight: 22 },
  sectionHead: { fontSize: 15, fontWeight: '800', marginBottom: 14 },
  primaryBtn: { borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { fontSize: 15, fontWeight: '800' },
  outlineBtn: { borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  outlineBtnText: { fontSize: 15, fontWeight: '700' },
  backScan: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, marginTop: 4 },
  backScanText: { fontWeight: '700', fontSize: 15 },
});
