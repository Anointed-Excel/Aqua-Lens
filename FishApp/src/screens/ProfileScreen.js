import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Switch, StatusBar } from 'react-native';
import ConfirmDialog from '../components/ConfirmDialog';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { getMe, listCustomFish, deleteCustomFish, getHistory, listFavourites } from '../services/api';
import { clearAuth } from '../utils/storage';

export default function ProfileScreen({ navigation }) {
  const { theme: t, isDark, toggleTheme } = useTheme();
  const [user, setUser]           = useState(null);
  const [customFish, setCustomFish] = useState([]);
  const [scanCount, setScanCount]   = useState(0);
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [dialog, setDialog]         = useState({ visible: false });

  const showDialog = (opts) => setDialog({ visible: true, ...opts });
  const hideDialog = () => setDialog({ visible: false });

  const avatarScale = useSharedValue(0.5);
  const avatarStyle = useAnimatedStyle(() => ({ transform: [{ scale: avatarScale.value }] }));

  useEffect(() => {
    avatarScale.value = withSpring(1, { damping: 10, stiffness: 100 });
    Promise.all([getMe(), listCustomFish(), getHistory(1), listFavourites()])
      .then(([me, fish, hist, favs]) => {
        setUser(me.data);
        setCustomFish(fish.data);
        setScanCount(hist.data.total);
        setFavourites(favs.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    showDialog({
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      confirmText: 'Logout',
      destructive: true,
      onConfirm: async () => { hideDialog(); await clearAuth(); navigation.replace('Login'); },
      onCancel: hideDialog,
    });
  };

  const handleDelete = (id, name) => {
    showDialog({
      title: 'Delete Fish',
      message: `Remove "${name}" from your entries?`,
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => { hideDialog(); await deleteCustomFish(id); setCustomFish(p => p.filter(f => f.id !== id)); },
      onCancel: hideDialog,
    });
  };

  if (loading) return (
    <View style={[s.center, { backgroundColor: t.bg }]}>
      <ActivityIndicator size="large" color={t.primary} />
    </View>
  );

  const initial = user?.username?.[0]?.toUpperCase() || '?';
  const since = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : '';

  return (
    <View style={[s.root, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.statusBar} backgroundColor="transparent" translucent />
      <ScrollView contentContainerStyle={{ paddingBottom: 50 }} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <LinearGradient colors={['rgba(245,197,24,0.14)', 'transparent']} style={s.hero}>
          <Animated.View style={[s.avatarWrap, { backgroundColor: t.primary, shadowColor: t.primary }, avatarStyle]}>
            <Text style={[s.avatarText, { color: t.textOnPrimary }]}>{initial}</Text>
          </Animated.View>
          <Text style={[s.username, { color: t.text }]}>{user?.username}</Text>
          <Text style={[s.email, { color: t.textSecondary }]}>{user?.email}</Text>
          {since ? <Text style={[s.since, { color: t.textMuted }]}>Member since {since}</Text> : null}
        </LinearGradient>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={[s.statBox, { backgroundColor: t.card, borderColor: t.glassBorder }]}>
            <Text style={[s.statNum, { color: t.primary }]}>{scanCount}</Text>
            <Text style={[s.statLabel, { color: t.textMuted }]}>Total Scans</Text>
          </View>
          <View style={[s.statBox, { backgroundColor: t.card, borderColor: t.glassBorder }]}>
            <Text style={[s.statNum, { color: t.primary }]}>{favourites.length}</Text>
            <Text style={[s.statLabel, { color: t.textMuted }]}>Favourites</Text>
          </View>
          <View style={[s.statBox, { backgroundColor: t.card, borderColor: t.glassBorder }]}>
            <Text style={[s.statNum, { color: t.primary }]}>{customFish.length}</Text>
            <Text style={[s.statLabel, { color: t.textMuted }]}>Fish Added</Text>
          </View>
        </View>

        {/* Settings */}
        <View style={[s.section, { backgroundColor: t.card, borderColor: t.glassBorder }]}>
          <View style={s.sectionTitleRow}>
            <Feather name="settings" size={15} color={t.primary} />
            <Text style={[s.sectionTitle, { color: t.text }]}>  Settings</Text>
          </View>

          <View style={s.settingRow}>
            <View style={s.settingLeft}>
              <View style={[s.settingIconWrap, { backgroundColor: t.primaryLight }]}>
                <Feather name={isDark ? 'moon' : 'sun'} size={16} color={t.primary} />
              </View>
              <View>
                <Text style={[s.settingName, { color: t.text }]}>{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
                <Text style={[s.settingSub, { color: t.textMuted }]}>Gold & {isDark ? 'Navy' : 'White'} theme</Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: t.border, true: t.primaryDark }}
              thumbColor={t.primary}
            />
          </View>
        </View>

        {/* Favourites */}
        {favourites.length > 0 && (
          <View style={[s.section, { backgroundColor: t.card, borderColor: t.glassBorder }]}>
            <View style={s.sectionTitleRow}>
              <Feather name="heart" size={15} color={t.error} />
              <Text style={[s.sectionTitle, { color: t.text }]}>  Favourite Fish</Text>
            </View>
            {favourites.map(f => (
              <TouchableOpacity key={f.id} style={[s.fishRow, { borderBottomColor: t.border }]} onPress={() => navigation.navigate('FishDetail', { fishId: f.id })}>
                <View style={s.fishInfo}>
                  <Text style={[s.fishName, { color: t.text }]}>{f.name}</Text>
                  {f.scientific_name && <Text style={[s.fishSci, { color: t.textMuted }]}>{f.scientific_name}</Text>}
                </View>
                <Feather name="chevron-right" size={16} color={t.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Custom fish */}
        {customFish.length > 0 && (
          <View style={[s.section, { backgroundColor: t.card, borderColor: t.glassBorder }]}>
            <View style={s.sectionTitleRow}>
              <Feather name="list" size={15} color={t.primary} />
              <Text style={[s.sectionTitle, { color: t.text }]}>  My Fish Entries</Text>
            </View>
            {customFish.map(f => (
              <View key={f.id} style={[s.fishRow, { borderBottomColor: t.border }]}>
                <View style={s.fishInfo}>
                  <Text style={[s.fishName, { color: t.text }]}>{f.name}</Text>
                  {f.scientific_name && <Text style={[s.fishSci, { color: t.textMuted }]}>{f.scientific_name}</Text>}
                  <View style={s.fishMeta}>
                    {f.location_caught && (
                      <View style={[s.metaChip, { backgroundColor: t.surface }]}>
                        <Feather name="map-pin" size={9} color={t.textMuted} />
                        <Text style={[s.metaChipText, { color: t.textMuted }]}> {f.location_caught}</Text>
                      </View>
                    )}
                    <View style={[s.edibleBadge, {
                      backgroundColor: f.edible === 'Yes' ? t.successBg : f.edible === 'No' ? t.errorBg : t.warningBg,
                      borderColor: f.edible === 'Yes' ? t.success : f.edible === 'No' ? t.error : t.warning,
                      borderWidth: 1,
                    }]}>
                      <Text style={[s.edibleText, { color: f.edible === 'Yes' ? t.success : f.edible === 'No' ? t.error : t.warning }]}>
                        {f.edible || 'Unknown'}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleDelete(f.id, f.name)} style={s.deleteBtn}>
                  <Feather name="trash-2" size={16} color={t.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Add fish */}
        <TouchableOpacity
          style={[s.addBtn, { backgroundColor: t.primary }]}
          onPress={() => navigation.navigate('ManualEntry', {})}
        >
          <Feather name="plus" size={16} color={t.textOnPrimary} />
          <Text style={[s.addBtnText, { color: t.textOnPrimary }]}>  Add New Fish Manually</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={[s.logoutBtn, { borderColor: t.error + '66', borderWidth: 1, backgroundColor: t.errorBg }]} onPress={handleLogout}>
          <Feather name="log-out" size={15} color={t.error} />
          <Text style={[s.logoutText, { color: t.error }]}>  Logout</Text>
        </TouchableOpacity>

      </ScrollView>

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

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { paddingTop: 70, paddingBottom: 36, alignItems: 'center' },
  avatarWrap: { width: 86, height: 86, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 14, shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 14 },
  avatarText: { fontSize: 36, fontWeight: '900' },
  username: { fontSize: 24, fontWeight: '900' },
  email: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  since: { fontSize: 12, marginTop: 4 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  statBox: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1 },
  statNum: { fontSize: 30, fontWeight: '900' },
  statLabel: { fontSize: 12, marginTop: 4, fontWeight: '600' },
  section: { marginHorizontal: 14, marginBottom: 12, borderRadius: 18, padding: 18, borderWidth: 1 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  settingName: { fontSize: 15, fontWeight: '700' },
  settingSub: { fontSize: 12, marginTop: 2 },
  fishRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  fishInfo: { flex: 1 },
  fishName: { fontSize: 15, fontWeight: '700' },
  fishSci: { fontSize: 12, fontStyle: 'italic', marginTop: 2 },
  fishMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  metaChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  metaChipText: { fontSize: 11 },
  edibleBadge: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  edibleText: { fontSize: 10, fontWeight: '700' },
  deleteBtn: { padding: 10 },
  addBtn: { marginHorizontal: 14, marginBottom: 10, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 15, fontWeight: '800' },
  logoutBtn: { marginHorizontal: 14, marginBottom: 10, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  logoutText: { fontSize: 15, fontWeight: '700' },
});
