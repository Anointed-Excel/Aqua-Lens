import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { listSpecies } from '../services/api';
import FishCard from '../components/FishCard';

const WATER  = ['All', 'Freshwater', 'Saltwater', 'Brackish'];
const EDIBLE = ['All', 'Yes', 'No', 'Caution'];

export default function ExploreScreen({ navigation }) {
  const { theme: t } = useTheme();
  const [fish, setFish]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch]   = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [water, setWater]     = useState('All');
  const [edible, setEdible]   = useState('All');
  const [page, setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    const pg = reset ? 1 : page;
    try {
      const { data } = await listSpecies({
        q: debouncedSearch,
        water_type: water === 'All' ? undefined : water,
        edible: edible === 'All' ? undefined : edible,
        page: pg, per_page: 20,
      });
      setFish(reset ? data.fish : prev => {
        const seen = new Set(prev.map(f => f.id));
        return [...prev, ...data.fish.filter(f => !seen.has(f.id))];
      });
      setTotalPages(data.pages);
      setPage(pg + 1);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [debouncedSearch, water, edible, page]);

  useEffect(() => { setPage(1); load(true); }, [debouncedSearch, water, edible]);

  const edibleActive = { All: t.textMuted, Yes: t.success, No: t.error, Caution: t.warning };

  return (
    <View style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.statusBar} backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={[s.header, { backgroundColor: t.bg }]}>
        <Text style={[s.headerTitle, { color: t.text }]}>Explore</Text>

        {/* Search bar */}
        <View style={[s.searchBar, { backgroundColor: t.inputBg, borderColor: t.inputBorder }]}>
          <Feather name="search" size={15} color={t.textMuted} style={{ marginRight: 10 }} />
          <TextInput
            style={[s.searchInput, { color: t.text }]}
            placeholder="Search by name or scientific name..."
            placeholderTextColor={t.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 4 }}>
              <Feather name="x" size={14} color={t.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Water filter */}
      <View style={s.filterSection}>
        <Text style={[s.filterLabel, { color: t.textMuted }]}>Water Type</Text>
        <View style={s.chips}>
          {WATER.map(f => (
            <TouchableOpacity
              key={f}
              style={[s.chip, { backgroundColor: water === f ? t.primary : t.surface, borderColor: water === f ? t.primary : t.border }]}
              onPress={() => setWater(f)}
            >
              <Text style={[s.chipText, { color: water === f ? t.textOnPrimary : t.textSecondary }]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Edible filter */}
      <View style={[s.filterSection, { paddingTop: 0 }]}>
        <Text style={[s.filterLabel, { color: t.textMuted }]}>Edibility</Text>
        <View style={s.chips}>
          {EDIBLE.map(f => (
            <TouchableOpacity
              key={f}
              style={[s.chip, { backgroundColor: edible === f ? edibleActive[f] : t.surface, borderColor: edible === f ? edibleActive[f] : t.border }]}
              onPress={() => setEdible(f)}
            >
              <Text style={[s.chipText, { color: edible === f ? '#fff' : t.textSecondary }]}>{f === 'All' ? 'All' : f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={fish}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <FishCard fish={item} onPress={() => navigation.navigate('FishDetail', { fishId: item.id })} />
        )}
        onEndReached={() => { if (page <= totalPages) load(); }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator style={{ margin: 24 }} color={t.primary} size="large" /> : null}
        ListEmptyComponent={!loading ? (
          <View style={s.empty}>
            <View style={[s.emptyIconWrap, { backgroundColor: t.primaryLight, borderColor: t.primary + '33', borderWidth: 1 }]}>
              <Feather name="compass" size={40} color={t.primary} />
            </View>
            <Text style={[s.emptyText, { color: t.text }]}>
              {search || water !== 'All' || edible !== 'All' ? 'No fish match your search' : 'Database is empty'}
            </Text>
            <Text style={[s.emptySub, { color: t.textMuted }]}>
              {search || water !== 'All' || edible !== 'All'
                ? 'Try clearing your filters or searching a different name'
                : 'Scan fish to start building the database'}
            </Text>
            {(search || water !== 'All' || edible !== 'All') && (
              <TouchableOpacity
                style={[s.clearBtn, { backgroundColor: t.primary }]}
                onPress={() => { setSearch(''); setWater('All'); setEdible('All'); }}
              >
                <Feather name="x" size={14} color={t.textOnPrimary} />
                <Text style={[s.clearBtnText, { color: t.textOnPrimary }]}>  Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
        contentContainerStyle={{ paddingBottom: 24, paddingTop: 4 }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 18 },
  headerTitle: { fontSize: 28, fontWeight: '900', marginBottom: 14 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 2 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14 },
  filterSection: { paddingHorizontal: 14, paddingTop: 12 },
  filterLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 36, gap: 10 },
  emptyIconWrap: { width: 90, height: 90, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyText: { fontSize: 20, fontWeight: '900', marginTop: 4, textAlign: 'center' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, marginTop: 4 },
  clearBtnText: { fontSize: 14, fontWeight: '700' },
});
