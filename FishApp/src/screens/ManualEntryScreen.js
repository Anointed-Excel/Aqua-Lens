import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Image, StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createCustomFish, uploadImage } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const FIELDS = [
  { key: 'name',            label: 'Fish Name *',             placeholder: 'e.g. Blue Catfish',                        required: true },
  { key: 'scientific_name', label: 'Scientific Name',         placeholder: 'e.g. Ictalurus furcatus' },
  { key: 'characteristics', label: 'Characteristics',         placeholder: 'Describe appearance, markings, fins...',   multiline: true },
  { key: 'habitat',         label: 'Habitat',                 placeholder: 'Where does it live? (rivers, reefs...)' },
  { key: 'diet',            label: 'Diet',                    placeholder: 'What does it eat?' },
  { key: 'average_size',    label: 'Average Size',            placeholder: 'e.g. 30–50 cm' },
  { key: 'weight',          label: 'Weight',                  placeholder: 'e.g. 0.5–3 kg' },
  { key: 'danger_level',    label: 'Danger Level',            placeholder: 'Safe / Mildly Dangerous / Dangerous' },
  { key: 'water_type',      label: 'Water Type',              placeholder: 'Freshwater / Saltwater / Brackish' },
  { key: 'location_caught', label: 'Location Caught',         placeholder: 'e.g. Lake Victoria, Nigeria' },
  { key: 'description',     label: 'Description / Notes',     placeholder: 'Any other information...',                 multiline: true },
  { key: 'additional_info', label: 'Additional Information',  placeholder: 'Conservation, fun facts, cooking tips...', multiline: true },
];

export default function ManualEntryScreen({ route, navigation }) {
  const { scan_id, prefill } = route.params || {};
  const { theme: t } = useTheme();
  const [form, setForm] = useState({
    name: prefill?.name || '',
    ...Object.fromEntries(FIELDS.filter(f => f.key !== 'name').map(f => [f.key, ''])),
  });
  const [edible, setEdible]             = useState('Unknown');
  const [imageUri, setImageUri]         = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUrl, setImageUrl]         = useState(null);
  const [loading, setLoading]           = useState(false);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const pickImage = async (fromCamera) => {
    const permFn = fromCamera
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync;
    const { status } = await permFn();
    if (status !== 'granted') return Alert.alert('Permission needed', fromCamera ? 'Camera access required.' : 'Gallery access required.');

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });

    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setImageUri(uri);
    setImageUploading(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const { data } = await uploadImage(base64);
      setImageUrl(data.url);
    } catch {
      Alert.alert('Upload failed', 'Could not upload image. You can still save without a photo.');
      setImageUri(null);
    } finally {
      setImageUploading(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert('Add Photo', 'Choose image source', [
      { text: 'Camera', onPress: () => pickImage(true) },
      { text: 'Gallery', onPress: () => pickImage(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return Alert.alert('Required', 'Please enter the fish name');
    if (imageUploading) return Alert.alert('Please wait', 'Image is still uploading...');
    setLoading(true);
    try {
      await createCustomFish({ ...form, edible, image_url: imageUrl, scan_id });
      Alert.alert('Saved!', 'Fish details saved successfully.', [
        { text: 'OK', onPress: () => navigation.popToTop() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Could not save fish');
    } finally {
      setLoading(false);
    }
  };

  const edibleColors = { Yes: t.success, No: t.error, Caution: t.warning, Unknown: t.textMuted };
  const edibleBgs    = { Yes: t.successBg, No: t.errorBg, Caution: t.warningBg, Unknown: t.surface };

  return (
    <ScrollView
      style={[s.container, { backgroundColor: t.bg }]}
      contentContainerStyle={{ paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle={t.statusBar} backgroundColor="transparent" translucent />

      {/* Hero */}
      <LinearGradient colors={['rgba(245,197,24,0.15)', 'transparent']} style={s.hero}>
        <View style={[s.heroIcon, { backgroundColor: t.primaryLight, borderColor: t.primary + '44', borderWidth: 1 }]}>
          <Feather name="edit-3" size={28} color={t.primary} />
        </View>
        <Text style={[s.heroTitle, { color: t.text }]}>Add Fish Details</Text>
        <Text style={[s.heroSub, { color: t.textMuted }]}>Fill in as much as you know</Text>
      </LinearGradient>

      {/* Photo picker */}
      <View style={s.fieldGroup}>
        <Text style={[s.label, { color: t.textMuted }]}>Fish Photo</Text>
        <TouchableOpacity
          style={[s.photoPicker, { borderColor: t.border, backgroundColor: t.card }]}
          onPress={showImageOptions}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={s.photoPreview} resizeMode="cover" />
          ) : (
            <View style={s.photoPlaceholder}>
              <Feather name="camera" size={32} color={t.textMuted} />
              <Text style={[s.photoHint, { color: t.textMuted }]}>Tap to add a photo</Text>
            </View>
          )}
          {imageUploading && (
            <View style={s.photoOverlay}>
              <ActivityIndicator color="#fff" size="large" />
              <Text style={s.photoOverlayText}>Uploading...</Text>
            </View>
          )}
          {imageUrl && !imageUploading && (
            <View style={[s.photoSuccess, { backgroundColor: t.successBg, borderColor: t.success, borderWidth: 1 }]}>
              <Feather name="check" size={11} color={t.success} />
              <Text style={[s.photoSuccessText, { color: t.success }]}> Uploaded</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Form fields */}
      {FIELDS.map(({ key, label, placeholder, required, multiline }) => (
        <View key={key} style={s.fieldGroup}>
          <Text style={[s.label, { color: t.textMuted }]}>{label}</Text>
          <TextInput
            style={[
              s.input,
              { backgroundColor: t.inputBg, borderColor: t.inputBorder, color: t.text },
              multiline && s.multilineInput,
            ]}
            placeholder={placeholder}
            placeholderTextColor={t.textMuted}
            value={form[key]}
            onChangeText={(v) => set(key, v)}
            multiline={multiline}
            textAlignVertical={multiline ? 'top' : 'center'}
            numberOfLines={multiline ? 4 : 1}
          />
        </View>
      ))}

      {/* Edible selector */}
      <View style={s.fieldGroup}>
        <Text style={[s.label, { color: t.textMuted }]}>Is it Edible?</Text>
        <View style={s.edibleRow}>
          {['Yes', 'No', 'Caution', 'Unknown'].map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[s.edibleChip, {
                backgroundColor: edible === opt ? edibleBgs[opt] : t.surface,
                borderColor: edible === opt ? edibleColors[opt] : t.border,
              }]}
              onPress={() => setEdible(opt)}
            >
              <Text style={[s.edibleChipText, { color: edible === opt ? edibleColors[opt] : t.textSecondary }]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[s.submitBtn, { backgroundColor: t.primary }]}
        onPress={handleSubmit}
        disabled={loading || imageUploading}
      >
        {loading
          ? <ActivityIndicator color={t.textOnPrimary} />
          : <>
              <Feather name="save" size={16} color={t.textOnPrimary} />
              <Text style={[s.submitBtnText, { color: t.textOnPrimary }]}>  Save Fish</Text>
            </>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} style={s.cancelBtn}>
        <Text style={[s.cancelBtnText, { color: t.textMuted }]}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingTop: 24, paddingBottom: 28, alignItems: 'center', paddingHorizontal: 20 },
  heroIcon: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heroTitle: { fontSize: 22, fontWeight: '800' },
  heroSub: { fontSize: 13, marginTop: 4 },
  fieldGroup: { marginHorizontal: 16, marginTop: 14 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  photoPicker: {
    height: 180, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1.5, borderStyle: 'dashed',
  },
  photoPreview: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  photoHint: { fontSize: 14 },
  photoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  photoOverlayText: { color: '#fff', marginTop: 8, fontWeight: '600' },
  photoSuccess: { position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  photoSuccessText: { fontSize: 12, fontWeight: '700' },
  input: { borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1 },
  multilineInput: { minHeight: 100, textAlignVertical: 'top' },
  edibleRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  edibleChip: { borderRadius: 20, paddingHorizontal: 18, paddingVertical: 9, borderWidth: 1 },
  edibleChipText: { fontWeight: '700', fontSize: 13 },
  submitBtn: { margin: 16, borderRadius: 14, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  submitBtnText: { fontSize: 16, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', marginBottom: 10 },
  cancelBtnText: { fontSize: 15 },
});
