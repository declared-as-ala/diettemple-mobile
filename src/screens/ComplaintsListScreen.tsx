import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND_YELLOW } from '../constants/brand';
import { useTheme } from '../context/ThemeContext';
import { subscribeToComplaintUpdated } from '../services/realtimeSocket';
import { complaintErrorMessage, complaintsService, type ComplaintStatus, type ComplaintSummary } from '../services/complaintsService';

const ACCENT = BRAND_YELLOW;

export const STATUS_COLORS: Record<ComplaintStatus, string> = {
  new: '#38BDF8',
  in_progress: '#F59E0B',
  waiting_client: '#A78BFA',
  resolved: '#22C55E',
  closed: '#9CA3AF',
};

const relativeDate = (iso: string) => {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "À l'instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Il y a ${h} h`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
};

export default function ComplaintsListScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ComplaintSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh' | 'silent' = 'silent') => {
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    try {
      setItems(await complaintsService.list());
      setError(null);
    } catch (e) {
      if (mode !== 'silent') setError(complaintErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload every time the screen comes back (e.g. after reading or creating a complaint).
  useFocusEffect(useCallback(() => { void load(items.length === 0 ? 'initial' : 'silent'); }, [load, items.length]));
  // A reply or status change arrives in real time.
  useEffect(() => subscribeToComplaintUpdated(() => void load('silent')), [load]);

  const renderItem = ({ item }: { item: ComplaintSummary }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: item.unread > 0 ? ACCENT : colors.border }]}
      onPress={() => navigation.navigate('ComplaintDetail', { id: item.id })}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Réclamation ${item.subject}, ${item.statusLabel}${item.unread ? `, ${item.unread} nouvelle réponse` : ''}`}
    >
      <View style={styles.cardTop}>
        <Text style={[styles.subject, { color: colors.text }]} numberOfLines={1}>{item.subject}</Text>
        {item.unread > 0 ? <View style={styles.unreadBadge}><Text style={styles.unreadText}>{item.unread}</Text></View> : null}
      </View>
      <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>{item.categoryLabel} · {item.reference}</Text>
      {item.lastMessagePreview ? <Text style={[styles.preview, { color: colors.textSecondary }]} numberOfLines={2}>{item.lastMessagePreview}</Text> : null}
      <View style={styles.cardBottom}>
        <View style={[styles.statusPill, { borderColor: STATUS_COLORS[item.status] }]}>
          <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] }]} />
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>{item.statusLabel}</Text>
        </View>
        <Text style={[styles.date, { color: colors.textSecondary }]}>{relativeDate(item.lastMessageAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 28 : 44) + 6 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} accessibilityRole="button" accessibilityLabel="Retour" hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Réclamations et assistance</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Une question, un problème ? Notre équipe vous répond ici.</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={ACCENT} /></View>
      ) : error && items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Chargement impossible</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => void load('initial')} accessibilityRole="button"><Text style={styles.retryText}>Réessayer</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 110 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load('refresh')} tintColor={ACCENT} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <View style={styles.emptyIcon}><Ionicons name="chatbubbles-outline" size={34} color={ACCENT} /></View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucune réclamation</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Si vous rencontrez un souci avec l'application, votre programme, un paiement ou une commande, écrivez-nous.</Text>
            </View>
          }
        />
      )}

      <View style={[styles.fabWrap, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('NewComplaint')} activeOpacity={0.88} accessibilityRole="button" accessibilityLabel="Nouvelle réclamation">
          <Ionicons name="add" size={22} color="#1A1405" />
          <Text style={styles.fabText}>Nouvelle réclamation</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 12 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 2 },
  list: { paddingHorizontal: 16, paddingTop: 4, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingTop: 60, gap: 8 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subject: { flex: 1, fontSize: 16, fontWeight: '700' },
  unreadBadge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadText: { color: '#1A1405', fontSize: 12, fontWeight: '800' },
  meta: { fontSize: 12, marginTop: 3 },
  preview: { fontSize: 13, lineHeight: 18, marginTop: 8 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  date: { fontSize: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(201,164,92,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  retry: { marginTop: 10, borderWidth: 1, borderColor: ACCENT, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  retryText: { color: ACCENT, fontWeight: '700' },
  fabWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 8 },
  fab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, borderRadius: 16, backgroundColor: ACCENT, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  fabText: { color: '#1A1405', fontSize: 15, fontWeight: '800' },
});
