import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  StatusBar, TouchableOpacity, FlatList, Image,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getHistory } from '../services/api';

function parseLatLng(str) {
  if (!str) return null;
  const m = str.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
  if (m) return { latitude: parseFloat(m[1]), longitude: parseFloat(m[2]) };
  return null;
}

const STATUS_COLOR = { identified: '#00D68F', low_confidence: '#FFB300', unrecognized: '#FF4757' };

export default function MapScreen({ navigation }) {
  const { theme: t } = useTheme();
  const [region, setRegion]     = useState(null);
  const [scans, setScans]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [locError, setLocError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Get current location for map center
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.5,
            longitudeDelta: 0.5,
          });
        } else {
          setLocError(true);
          setRegion({ latitude: 6.5244, longitude: 3.3792, latitudeDelta: 5, longitudeDelta: 5 });
        }
      } catch {
        setLocError(true);
        setRegion({ latitude: 6.5244, longitude: 3.3792, latitudeDelta: 5, longitudeDelta: 5 });
      }

      // Load scan history
      try {
        const { data } = await getHistory(1, 50);
        setScans(data.history || []);
      } catch { /* silent */ }

      setLoading(false);
    })();
  }, []);

  const markers = scans.filter(s => parseLatLng(s.location));
  const named   = scans.filter(s => s.location && !parseLatLng(s.location));

  if (loading || !region) return (
    <View style={[s.center, { backgroundColor: t.bg }]}>
      <ActivityIndicator size="large" color={t.primary} />
    </View>
  );

  return (
    <View style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.statusBar} backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={[s.header, { backgroundColor: t.bg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color={t.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: t.text }]}>Catch Map</Text>
        <View style={[s.badge, { backgroundColor: t.primaryLight, borderColor: t.primary + '44', borderWidth: 1 }]}>
          <Text style={[s.badgeText, { color: t.primary }]}>{scans.length} scans</Text>
        </View>
      </View>

      {/* Map */}
      <View style={s.mapWrap}>
        <MapView
          style={s.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={region}
          showsUserLocation
          showsMyLocationButton
        >
          {markers.map((scan, i) => {
            const coords = parseLatLng(scan.location);
            const name = scan.fish?.name || scan.predicted_name || 'Unknown';
            const color = STATUS_COLOR[scan.status] || t.primary;
            return (
              <Marker
                key={scan.id}
                coordinate={coords}
                title={name}
                description={new Date(scan.scanned_at).toLocaleDateString('en-GB')}
                pinColor={color}
              />
            );
          })}
        </MapView>

        {locError && (
          <View style={[s.locWarn, { backgroundColor: t.warningBg }]}>
            <Feather name="map-pin" size={12} color={t.warning} />
            <Text style={[s.locWarnText, { color: t.warning }]}>  Location permission denied — showing default region</Text>
          </View>
        )}
      </View>

      {/* Scan list */}
      <FlatList
        data={scans}
        keyExtractor={item => String(item.id)}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 14 }}
        ListHeaderComponent={
          <Text style={[s.listHead, { color: t.textMuted }]}>
            {markers.length > 0
              ? `${markers.length} scan${markers.length !== 1 ? 's' : ''} with GPS  •  ${named.length} with location name`
              : 'Scan with GPS enabled to see catches on the map'}
          </Text>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Feather name="map" size={48} color={t.textMuted} />
            <Text style={[s.emptyTitle, { color: t.text }]}>No catches yet</Text>
            <Text style={[s.emptySub, { color: t.textMuted }]}>Your scans will appear here once you start identifying fish</Text>
            <TouchableOpacity
              style={[s.emptyBtn, { backgroundColor: t.primary }]}
              onPress={() => navigation.navigate('Scan')}
            >
              <Feather name="aperture" size={15} color={t.textOnPrimary} />
              <Text style={[s.emptyBtnText, { color: t.textOnPrimary }]}>  Start Scanning</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const name = item.fish?.name || item.predicted_name || 'Unknown Fish';
          const color = STATUS_COLOR[item.status] || t.primary;
          const date = new Date(item.scanned_at).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric',
          });
          return (
            <TouchableOpacity
              style={[s.card, { backgroundColor: t.card, borderColor: t.glassBorder }]}
              onPress={() => item.fish?.id && navigation.navigate('FishDetail', { fishId: item.fish.id })}
              activeOpacity={0.8}
            >
              {item.image_url
                ? <Image source={{ uri: item.image_url }} style={s.thumb} resizeMode="cover" />
                : <View style={[s.thumb, { backgroundColor: t.surface, justifyContent: 'center', alignItems: 'center' }]}>
                    <Feather name="aperture" size={20} color={t.textMuted} />
                  </View>
              }
              <View style={s.cardInfo}>
                <Text style={[s.cardName, { color: t.text }]} numberOfLines={1}>{name}</Text>
                <View style={[s.statusDot, { backgroundColor: color + '22', borderColor: color + '55', borderWidth: 1 }]}>
                  <Text style={[s.statusText, { color }]}>{item.status?.replace('_', ' ')}</Text>
                </View>
                <View style={s.metaRow}>
                  <Feather name="calendar" size={10} color={t.textMuted} />
                  <Text style={[s.meta, { color: t.textMuted }]}> {date}</Text>
                  {item.location && (
                    <>
                      <Text style={[s.meta, { color: t.textMuted }]}>  </Text>
                      <Feather name="map-pin" size={10} color={t.textMuted} />
                      <Text style={[s.meta, { color: t.textMuted }]} numberOfLines={1}> {item.location}</Text>
                    </>
                  )}
                </View>
              </View>
              {item.confidence != null && (
                <Text style={[s.conf, { color: t.primary }]}>{item.confidence.toFixed(0)}%</Text>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 22, fontWeight: '900', flex: 1 },
  badge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  mapWrap: { height: 280, position: 'relative' },
  map: { flex: 1 },
  locWarn: {
    position: 'absolute', bottom: 8, left: 16, right: 16,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
    flexDirection: 'row', alignItems: 'center',
  },
  locWarnText: { fontSize: 11, fontWeight: '600' },
  listHead: { fontSize: 12, fontWeight: '600', marginBottom: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, marginBottom: 10, borderWidth: 1, overflow: 'hidden',
  },
  thumb: { width: 70, height: 70 },
  cardInfo: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  cardName: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  statusDot: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 5 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  meta: { fontSize: 10 },
  conf: { paddingRight: 14, fontSize: 14, fontWeight: '900' },
  empty: { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginTop: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', paddingHorizontal: 30, lineHeight: 22 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', marginTop: 8,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '800' },
});
