import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image, StatusBar,
} from 'react-native';
import ConfirmDialog from '../components/ConfirmDialog';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../context/ThemeContext';
import { getHistory, deleteScan } from '../services/api';

const STATUS_COLOR = { identified: '#00D68F', low_confidence: '#FFB300', unrecognized: '#FF4757' };
const STATUS_LABEL = { identified: 'Identified', low_confidence: 'Low Confidence', unrecognized: 'Not Recognised' };
const STATUS_ICON  = { identified: 'check', low_confidence: 'alert-triangle', unrecognized: 'x' };

function HistoryCard({ item, theme: t, onPress, onDelete, index }) {
  const op = useSharedValue(0);
  const x  = useSharedValue(30);
  useEffect(() => {
    op.value = withDelay(index * 50, withTiming(1, { duration: 350 }));
    x.value  = withDelay(index * 50, withTiming(0, { duration: 350 }));
  }, []);
  const animStyle = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateX: x.value }] }));

  const name  = item.fish?.name || item.custom_fish?.name || item.predicted_name || 'Unknown Fish';
  const color = STATUS_COLOR[item.status];
  const date  = new Date(item.scanned_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity style={[hc.card, { backgroundColor: t.card, borderColor: t.glassBorder }]} onPress={onPress} activeOpacity={0.85}>
        <View style={hc.thumbWrap}>
          {item.image_url
            ? <Image source={{ uri: item.image_url }} style={hc.thumb} resizeMode="cover" />
            : <View style={[hc.thumb, { backgroundColor: t.surface, justifyContent: 'center', alignItems: 'center' }]}>
                <Feather name="image" size={24} color={t.textMuted} />
              </View>
          }
          <View style={[hc.statusDot, { backgroundColor: color }]}>
            <Feather name={STATUS_ICON[item.status]} size={9} color="#fff" />
          </View>
        </View>

        <View style={hc.info}>
          <Text style={[hc.name, { color: t.text }]} numberOfLines={1}>{name}</Text>
          <Text style={[hc.status, { color }]}>{STATUS_LABEL[item.status]}</Text>
          <View style={hc.metaRow}>
            {item.confidence != null && (
              <View style={[hc.metaChip, { backgroundColor: t.surface }]}>
                <Feather name="target" size={9} color={t.textMuted} />
                <Text style={[hc.metaText, { color: t.textMuted }]}> {item.confidence.toFixed(1)}%</Text>
              </View>
            )}
            {item.location && (
              <View style={[hc.metaChip, { backgroundColor: t.surface }]}>
                <Feather name="map-pin" size={9} color={t.textMuted} />
                <Text style={[hc.metaText, { color: t.textMuted }]} numberOfLines={1}> {item.location}</Text>
              </View>
            )}
          </View>
          <Text style={[hc.date, { color: t.textMuted }]}>{date}</Text>
        </View>

        <TouchableOpacity onPress={onDelete} style={hc.deleteBtn}>
          <Feather name="trash-2" size={16} color={t.error} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HistoryScreen({ navigation }) {
  const { theme: t } = useTheme();
  const [history, setHistory]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting]     = useState(false);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [dialog, setDialog]           = useState({ visible: false });

  const showDialog = (opts) => setDialog({ visible: true, ...opts });
  const hideDialog = () => setDialog({ visible: false });

  const load = useCallback(async (reset = false) => {
    const pg = reset ? 1 : page;
    if (!reset && pg > totalPages) return;
    try {
      const { data } = await getHistory(pg);
      setHistory(prev => reset ? data.history : [...prev, ...data.history]);
      setTotalPages(data.pages);
      setPage(pg + 1);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); setLoadingMore(false); }
  }, [page, totalPages]);

  useEffect(() => { load(true); }, []);

  const handleLoadMore = () => {
    if (!loadingMore && !loading && page <= totalPages) {
      setLoadingMore(true);
      load();
    }
  };

  const handleExport = async () => {
    if (history.length === 0) return Alert.alert('Nothing to export', 'Scan some fish first!');
    setExporting(true);
    try {
      const header = 'Date,Fish Name,Scientific Name,Status,Confidence (%),Location\n';
      const rows = history.map(h => {
        const name = (h.fish?.name || h.predicted_name || 'Unknown').replace(/,/g, ' ');
        const sci  = (h.fish?.scientific_name || '').replace(/,/g, ' ');
        const date = new Date(h.scanned_at).toLocaleDateString('en-GB');
        const conf = h.confidence != null ? h.confidence.toFixed(1) : '';
        const loc  = (h.location || '').replace(/,/g, ' ');
        return `${date},${name},${sci},${h.status},${conf},${loc}`;
      }).join('\n');
      const csv  = header + rows;
      const path = FileSystem.cacheDirectory + 'aqua_lens_history.csv';
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Export Catch History' });
    } catch (e) {
      Alert.alert('Export failed', 'Could not export history.');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = (id) => {
    showDialog({
      title: 'Delete Scan',
      message: 'Remove this scan from your history?',
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => { hideDialog(); await deleteScan(id); setHistory(p => p.filter(h => h.id !== id)); },
      onCancel: hideDialog,
    });
  };

  if (loading) return (
    <View style={[s.center, { backgroundColor: t.bg }]}>
      <ActivityIndicator size="large" color={t.primary} />
    </View>
  );

  return (
    <View style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.statusBar} backgroundColor="transparent" translucent />

      <View style={[s.header, { backgroundColor: t.bg }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: t.text }]}>History</Text>
        </View>
        <View style={[s.countBadge, { backgroundColor: t.primaryLight, borderColor: t.primary + '44', borderWidth: 1 }]}>
          <Text style={[s.countText, { color: t.primary }]}>{history.length} scan{history.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Map')} style={[s.iconBtn, { backgroundColor: t.surface, borderColor: t.border, borderWidth: 1 }]}>
          <Feather name="map" size={16} color={t.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleExport} disabled={exporting} style={[s.iconBtn, { backgroundColor: t.surface, borderColor: t.border, borderWidth: 1 }]}>
          {exporting
            ? <ActivityIndicator size="small" color={t.primary} />
            : <Feather name="download" size={16} color={t.primary} />
          }
        </TouchableOpacity>
      </View>

      <FlatList
        data={history}
        keyExtractor={item => String(item.id)}
        renderItem={({ item, index }) => (
          <HistoryCard
            item={item}
            theme={t}
            index={index}
            onPress={() => item.fish?.id && navigation.navigate('FishDetail', { fishId: item.fish.id })}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        contentContainerStyle={{ padding: 14, paddingBottom: 30 }}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: 16 }} color={t.primary} /> : null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setPage(1); load(true); }} colors={[t.primary]} tintColor={t.primary} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={[s.emptyIconWrap, { backgroundColor: t.primaryLight, borderColor: t.primary + '33', borderWidth: 1 }]}>
              <Feather name="clock" size={40} color={t.primary} />
            </View>
            <Text style={[s.emptyTitle, { color: t.text }]}>No catches yet</Text>
            <Text style={[s.emptySub, { color: t.textMuted }]}>Every fish you identify will be saved here with full details and location</Text>
            <TouchableOpacity
              style={[s.emptyBtn, { backgroundColor: t.primary }]}
              onPress={() => navigation.getParent()?.navigate('Scan')}
            >
              <Feather name="aperture" size={15} color={t.textOnPrimary} />
              <Text style={[s.emptyBtnText, { color: t.textOnPrimary }]}>  Scan Your First Fish</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <ConfirmDialog
        visible={dialog.visible}
        title={dialog.title}
        message={dialog.message}
        confirmText={dialog.confirmText}
        destructive={dialog.destructive}
        onConfirm={dialog.onConfirm}
        onCancel={hideDialog}
      />
    </View>
  );
}

const hc = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, marginBottom: 10, borderWidth: 1, overflow: 'hidden',
  },
  thumbWrap: { position: 'relative' },
  thumb: { width: 84, height: 84 },
  statusDot: {
    position: 'absolute', bottom: 6, right: 6,
    width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(0,0,0,0.3)',
  },
  info: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  name: { fontSize: 15, fontWeight: '800' },
  status: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' },
  metaChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  metaText: { fontSize: 10 },
  date: { fontSize: 10, marginTop: 4 },
  deleteBtn: { padding: 14 },
});

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 28, fontWeight: '900' },
  countBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  countText: { fontSize: 12, fontWeight: '700' },
  iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 36, gap: 10 },
  emptyIconWrap: { width: 90, height: 90, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 22, fontWeight: '900', marginTop: 4 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, marginTop: 6 },
  emptyBtnText: { fontSize: 14, fontWeight: '800' },
});
