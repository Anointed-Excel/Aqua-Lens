import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, TextInput, Alert, Image, StatusBar, Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');
import { Feather } from '@expo/vector-icons';
import { getSpecies, contribute, addFavourite, removeFavourite, getFavouriteStatus } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import ConfirmDialog from '../components/ConfirmDialog';

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

const CONTRIB_FIELDS = ['general', 'habitat', 'diet', 'cooking', 'fishing_tips', 'danger'];

export default function FishDetailScreen({ route, navigation }) {
  const { fishId, scanImageUrl } = route.params;
  const { theme: t } = useTheme();
  const [fish, setFish]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [contribText, setContribText] = useState('');
  const [contribField, setContribField] = useState('general');
  const [submitting, setSubmitting] = useState(false);
  const [favourited, setFavourited] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [wikiImgError, setWikiImgError] = useState(false);
  const [unfavDialog, setUnfavDialog]   = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [{ data }, { data: fav }] = await Promise.all([
          getSpecies(fishId),
          getFavouriteStatus(fishId),
        ]);
        setFish(data);
        setFavourited(fav.favourited);
      } catch {
        Alert.alert('Error', 'Could not load fish details');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [fishId]);

  const toggleFavourite = () => {
    if (favourited) {
      setUnfavDialog(true);
    } else {
      _addFavourite();
    }
  };

  const _addFavourite = async () => {
    setFavLoading(true);
    try { await addFavourite(fishId); setFavourited(true); }
    catch { /* silent */ }
    finally { setFavLoading(false); }
  };

  const _removeFavourite = async () => {
    setUnfavDialog(false);
    setFavLoading(true);
    try { await removeFavourite(fishId); setFavourited(false); }
    catch { /* silent */ }
    finally { setFavLoading(false); }
  };

  const handleContribute = async () => {
    if (!contribText.trim()) return Alert.alert('Error', 'Please write something to contribute');
    if (contribText.trim().length > 2000) return Alert.alert('Error', 'Contribution must be under 2000 characters');
    setSubmitting(true);
    try {
      await contribute({ fish_species_id: fishId, contribution_text: contribText.trim(), field_name: contribField });
      setContribText('');
      Alert.alert('Thank you!', 'Your contribution has been added.');
      const { data } = await getSpecies(fishId);
      setFish(data);
    } catch {
      Alert.alert('Error', 'Could not submit contribution');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <View style={[s.center, { backgroundColor: t.bg }]}>
      <ActivityIndicator size="large" color={t.primary} />
    </View>
  );

  const edibleColor = fish.edible === 'Yes' ? t.success : fish.edible === 'No' ? t.error : t.warning;
  const edibleLabel = fish.edible === 'Yes' ? 'Edible' : fish.edible === 'No' ? 'Not Edible' : 'Caution';

  return (
    <View style={[s.container, { backgroundColor: t.bg }]}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48 }}>
      <StatusBar barStyle={t.statusBar} backgroundColor="transparent" translucent />

      {/* Hero images — scan/species photo + Wikipedia reference */}
      {(() => {
        const primaryImg = fish.image_url || scanImageUrl;
        const wikiImg    = !wikiImgError && fish.wikipedia_image_url;
        if (primaryImg && wikiImg) return (
          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1 }}>
              <Image source={{ uri: primaryImg }} style={[s.heroImage, { width: width / 2 }]} resizeMode="cover" />
              <View style={[s.imgLabel, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
                <Text style={s.imgLabelText}>Your Photo</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Image source={{ uri: wikiImg }} style={[s.heroImage, { width: width / 2 }]} resizeMode="cover"
                onError={() => setWikiImgError(true)} />
              <View style={[s.imgLabel, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
                <Text style={s.imgLabelText}>Reference (Wikipedia)</Text>
              </View>
            </View>
          </View>
        );
        if (wikiImg) return (
          <View>
            <Image source={{ uri: wikiImg }} style={s.heroImage} resizeMode="cover"
              onError={() => setWikiImgError(true)} />
            <View style={[s.imgLabel, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
              <Text style={s.imgLabelText}>Reference (Wikipedia)</Text>
            </View>
          </View>
        );
        if (primaryImg) return (
          <Image source={{ uri: primaryImg }} style={s.heroImage} resizeMode="cover" />
        );
        return (
          <View style={[s.heroPlaceholder, { backgroundColor: t.surface }]}>
            <Feather name="image" size={60} color={t.textMuted} />
          </View>
        );
      })()}

      {/* Header card */}
      <View style={[s.card, { backgroundColor: t.card, borderColor: t.glassBorder }]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Text style={[s.name, { color: t.text, flex: 1, marginRight: 8 }]}>{fish.name}</Text>
          <TouchableOpacity onPress={toggleFavourite} disabled={favLoading} style={{ padding: 4 }}>
            <Feather name="heart" size={24} color={favourited ? t.error : t.textMuted} style={{ opacity: favLoading ? 0.4 : 1 }} />
          </TouchableOpacity>
        </View>
        <Text style={[s.scientific, { color: t.textSecondary }]}>{fish.scientific_name}</Text>
        <Text style={[s.family, { color: t.textMuted }]}>{fish.family} • {fish.water_type}</Text>

        <View style={s.badgeRow}>
          <View style={[s.badge, { backgroundColor: edibleColor + '22', borderColor: edibleColor, borderWidth: 1 }]}>
            <Text style={[s.badgeText, { color: edibleColor }]}>{edibleLabel}</Text>
          </View>
          <View style={[s.badge, { backgroundColor: t.surface, borderColor: t.border, borderWidth: 1 }]}>
            <Text style={[s.badgeText, { color: t.textMuted }]}>{fish.danger_level?.split('(')[0].trim()}</Text>
          </View>
          {fish.in_model && (
            <View style={[s.badge, { backgroundColor: t.primaryLight, borderColor: t.primary + '44', borderWidth: 1 }]}>
              <Feather name="cpu" size={10} color={t.primary} />
              <Text style={[s.badgeText, { color: t.primary }]}> AI Detectable</Text>
            </View>
          )}
        </View>
      </View>

      {/* Info rows */}
      {INFO_FIELDS.map(({ label, key, icon }) =>
        fish[key] ? (
          <View key={key} style={[s.infoRow, { backgroundColor: t.card, borderBottomColor: t.border }]}>
            <View style={s.infoLabelRow}>
              <Feather name={icon} size={12} color={t.primary} />
              <Text style={[s.infoLabel, { color: t.primary }]}>  {label}</Text>
            </View>
            <Text style={[s.infoValue, { color: t.text }]}>{fish[key]}</Text>
          </View>
        ) : null
      )}

      {/* Community contributions */}
      <View style={[s.section, { backgroundColor: t.card, borderColor: t.glassBorder }]}>
        <View style={s.sectionTitleRow}>
          <Feather name="users" size={15} color={t.primary} />
          <Text style={[s.sectionTitle, { color: t.text }]}>  Community Contributions</Text>
        </View>

        {fish.contributions?.length === 0 ? (
          <Text style={[s.noContrib, { color: t.textMuted }]}>No contributions yet — be the first!</Text>
        ) : (
          fish.contributions?.map((c, i) => (
            <View key={i} style={[s.contribCard, { backgroundColor: t.surface, borderColor: t.border, borderWidth: 1 }]}>
              <Text style={[s.contribField, { color: t.primary }]}>{c.field_name}</Text>
              <Text style={[s.contribText, { color: t.text }]}>{c.contribution_text}</Text>
            </View>
          ))
        )}

        <Text style={[s.addContribTitle, { color: t.text }]}>Add Information</Text>
        <Text style={[s.fieldLabel, { color: t.textMuted }]}>Category</Text>
        <View style={s.fieldSelector}>
          {CONTRIB_FIELDS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[s.fieldChip, {
                backgroundColor: contribField === f ? t.primary : t.surface,
                borderColor: contribField === f ? t.primary : t.border,
              }]}
              onPress={() => setContribField(f)}
            >
              <Text style={[s.fieldChipText, { color: contribField === f ? t.textOnPrimary : t.textSecondary }]}>
                {f.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={[s.contribInput, { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.text }]}
          placeholder="Share what you know about this fish..."
          placeholderTextColor={t.textMuted}
          value={contribText}
          onChangeText={setContribText}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={2000}
        />
        <TouchableOpacity style={[s.submitBtn, { backgroundColor: t.primary }]} onPress={handleContribute} disabled={submitting}>
          {submitting
            ? <ActivityIndicator color={t.textOnPrimary} />
            : <>
                <Feather name="send" size={14} color={t.textOnPrimary} />
                <Text style={[s.submitBtnText, { color: t.textOnPrimary }]}>  Submit Contribution</Text>
              </>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>

      <ConfirmDialog
        visible={unfavDialog}
        title="Remove Favourite"
        message={`Remove ${fish?.name} from your favourites?`}
        confirmText="Remove"
        destructive={false}
        onConfirm={_removeFavourite}
        onCancel={() => setUnfavDialog(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroImage: { width: '100%', height: 240 },
  heroPlaceholder: { width: '100%', height: 200, justifyContent: 'center', alignItems: 'center' },
  imgLabel: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 5, paddingHorizontal: 8 },
  imgLabelText: { color: '#fff', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  infoLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  card: { margin: 14, borderRadius: 18, padding: 20, borderWidth: 1 },
  name: { fontSize: 28, fontWeight: '800' },
  scientific: { fontSize: 14, fontStyle: 'italic', marginTop: 4 },
  family: { fontSize: 12, marginTop: 2, marginBottom: 14 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  badgeText: { fontWeight: '700', fontSize: 12 },
  infoRow: { marginHorizontal: 14, marginBottom: 2, padding: 16, borderBottomWidth: 1 },
  infoLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  infoValue: { fontSize: 14, lineHeight: 22 },
  section: { margin: 14, borderRadius: 18, padding: 18, borderWidth: 1 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  noContrib: { fontStyle: 'italic', marginBottom: 16 },
  contribCard: { borderRadius: 12, padding: 12, marginBottom: 8 },
  contribField: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  contribText: { fontSize: 14, lineHeight: 20 },
  addContribTitle: { fontSize: 15, fontWeight: '700', marginTop: 18, marginBottom: 8 },
  fieldLabel: { fontSize: 12, marginBottom: 8 },
  fieldSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  fieldChip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1 },
  fieldChipText: { fontSize: 12, fontWeight: '600' },
  contribInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14, minHeight: 100, marginBottom: 14 },
  submitBtn: { borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { fontWeight: '700', fontSize: 15 },
});
