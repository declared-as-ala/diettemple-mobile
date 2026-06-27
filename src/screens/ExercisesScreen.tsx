/**
 * Lists all exercises from admin (GET /api/home/exercises) with filters:
 * muscle group, equipment, difficulty, search, has video.
 * Tap card -> ExerciseDetailScreen.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { homeService, type Exercise } from '../services/homeService';
import { useExerciseFavoritesStore } from '../store/exerciseFavoritesStore';
import { useSnackbar } from '../components/Snackbar';
import DrawerScreenContainer from '../components/DrawerScreenContainer';

const ACCENT = '#D4AF37';

function ExerciseSkeletonCard({ colors }: { colors: any }) {
  return (
    <View style={[skeletonStyles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={[skeletonStyles.image, { backgroundColor: colors.border }]} />
      <View style={skeletonStyles.body}>
        <View style={[skeletonStyles.line, { width: '70%', backgroundColor: colors.border }]} />
        <View style={[skeletonStyles.line, { width: '45%', backgroundColor: colors.border, marginTop: 6 }]} />
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, marginBottom: 12 },
  image: { width: '100%', aspectRatio: 1 },
  body: { padding: 10 },
  line: { height: 12, borderRadius: 6 },
});
const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const NUM_COLS = 2;
const CARD_WIDTH = (width - CARD_GAP * (NUM_COLS + 1)) / NUM_COLS;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
}

const MUSCLE_OPTIONS = ['Tous', 'chest', 'back', 'legs', 'shoulders', 'arms', 'core'];
const EQUIPMENT_OPTIONS = ['Tous', 'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell'];
const DIFFICULTY_OPTIONS = ['Tous', 'beginner', 'intermediate', 'advanced'];

type TabFilter = 'all' | 'favorites';

export default function ExercisesScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { showSnackbar } = useSnackbar();
  const { favoriteIds, fetchFavorites, toggleFavorite, isFavorited } = useExerciseFavoritesStore();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tabFilter, setTabFilter] = useState<TabFilter>('all');
  const [muscle, setMuscle] = useState('Tous');
  const [equipment, setEquipment] = useState('Tous');
  const [difficulty, setDifficulty] = useState('Tous');
  const [hasVideoOnly, setHasVideoOnly] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const loadExercises = useCallback(async () => {
    setLoading(true);
    try {
      const res = await homeService.getExercises();
      setExercises(res.exercises ?? []);
    } catch {
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  React.useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const safeExercises = exercises ?? [];
  const filtered = useMemo(() => {
    let list = safeExercises;
    if (tabFilter === 'favorites') list = list.filter((e) => (favoriteIds ?? []).includes(e._id));
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      list = list.filter((e) => (e?.name ?? '').toLowerCase().includes(q));
    }
    if (muscle !== 'Tous') list = list.filter((e) => (e?.muscleGroup || '').toLowerCase() === muscle.toLowerCase());
    if (equipment !== 'Tous') list = list.filter((e) => (e?.equipment || '').toLowerCase() === equipment.toLowerCase());
    if (difficulty !== 'Tous') list = list.filter((e) => (e?.difficulty || '').toLowerCase() === difficulty.toLowerCase());
    if (hasVideoOnly) list = list.filter((e) => !!e?.videoUrl);
    return list;
  }, [safeExercises, tabFilter, favoriteIds, debouncedSearch, muscle, equipment, difficulty, hasVideoOnly]);

  const handleFavoritePress = useCallback(
    (e: Exercise, event?: any) => {
      event?.stopPropagation?.();
      toggleFavorite(e._id).then(() => {
        const nowFav = useExerciseFavoritesStore.getState().isFavorited(e._id);
        showSnackbar({
          message: nowFav ? 'Ajouté aux favoris' : 'Retiré des favoris',
          duration: 1800,
        });
      });
    },
    [toggleFavorite, showSnackbar]
  );

  const renderItem = useCallback(
    ({ item }: { item: Exercise }) => (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
        onPress={() => (navigation.getParent() as any)?.getParent()?.navigate('ExerciseDetail', { exerciseId: item._id })}
        activeOpacity={0.85}
      >
        <View style={[styles.thumb, { backgroundColor: colors.border }]}>
          {item.imageUrl ? (
            <Text style={[styles.thumbText, { color: colors.textSecondary }]}>IMG</Text>
          ) : (
            <Ionicons name="barbell-outline" size={32} color={colors.textSecondary} />
          )}
        </View>
        <TouchableOpacity
          style={styles.heartBtn}
          onPress={(ev) => handleFavoritePress(item, ev)}
          hitSlop={12}
        >
          <Ionicons
            name={isFavorited(item._id) ? 'heart' : 'heart-outline'}
            size={22}
            color={isFavorited(item._id) ? '#E879F9' : colors.textSecondary}
          />
        </TouchableOpacity>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.badges}>
          {(item.muscleGroup || item.equipment) && (
            <Text style={[styles.badge, { color: colors.textSecondary }]} numberOfLines={1}>
              {[item.muscleGroup, item.equipment].filter(Boolean).join(' · ')}
            </Text>
          )}
          {item.difficulty && (
            <View style={[styles.diffBadge, { backgroundColor: colors.border }]}>
              <Text style={[styles.diffText, { color: colors.text }]}>{item.difficulty}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    ),
    [colors, navigation, handleFavoritePress, isFavorited]
  );

  const keyExtractor = useCallback((item: Exercise) => item._id, []);

  if (loading) {
    return (
      <DrawerScreenContainer title="Exercices" backgroundColor={colors.background}>
        <StatusBar style="light" />
        <View style={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={{ width: CARD_WIDTH }}>
              <ExerciseSkeletonCard colors={colors} />
            </View>
          ))}
        </View>
      </DrawerScreenContainer>
    );
  }

  return (
    <DrawerScreenContainer
      title="Exercices"
      subtitle={`${filtered.length} exercice${filtered.length !== 1 ? 's' : ''}`}
      backgroundColor={colors.background}
    >
      <StatusBar style="light" />
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabChip, tabFilter === 'all' && styles.tabChipActive, { borderColor: colors.border }]}
          onPress={() => setTabFilter('all')}
        >
          <Text style={[styles.tabChipText, { color: tabFilter === 'all' ? '#000' : colors.text }]}>Tous</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabChip, tabFilter === 'favorites' && styles.tabChipActive, { borderColor: colors.border }]}
          onPress={() => setTabFilter('favorites')}
        >
          <Ionicons name="heart" size={18} color={tabFilter === 'favorites' ? '#000' : colors.textSecondary} />
          <Text style={[styles.tabChipText, { color: tabFilter === 'favorites' ? '#000' : colors.text, marginLeft: 6 }]}>Favoris</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchRow, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            placeholder="Rechercher un exercice…"
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>
      </View>

      <View style={styles.filters}>
        <FlatList
          horizontal
          data={MUSCLE_OPTIONS}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.chipRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, muscle === item && styles.chipActive, { borderColor: colors.border }]}
              onPress={() => setMuscle(item)}
            >
              <Text style={[styles.chipText, { color: muscle === item ? '#000' : colors.text }]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
        <FlatList
          horizontal
          data={EQUIPMENT_OPTIONS}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.chipRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, equipment === item && styles.chipActive, { borderColor: colors.border }]}
              onPress={() => setEquipment(item)}
            >
              <Text style={[styles.chipText, { color: equipment === item ? '#000' : colors.text }]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
        <View style={styles.filterRow}>
          {DIFFICULTY_OPTIONS.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.chip, difficulty === d && styles.chipActive, { borderColor: colors.border }]}
              onPress={() => setDifficulty(d)}
            >
              <Text style={[styles.chipText, { color: difficulty === d ? '#000' : colors.text }]}>{d}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.chip, hasVideoOnly && styles.chipActive, { borderColor: colors.border }]}
            onPress={() => setHasVideoOnly((v) => !v)}
          >
            <Ionicons name="videocam" size={16} color={hasVideoOnly ? '#000' : colors.text} />
            <Text style={[styles.chipText, { color: hasVideoOnly ? '#000' : colors.text, marginLeft: 6 }]}>Vidéo</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={NUM_COLS}
        key="grid"
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="barbell-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucun exercice</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Modifiez les filtres ou la recherche.</Text>
          </View>
        }
      />
    </DrawerScreenContainer>
  );
}

const styles = StyleSheet.create({
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP, padding: CARD_GAP },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: 'transparent' },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabChipActive: { backgroundColor: ACCENT },
  tabChipText: { fontSize: 14, fontWeight: '600' },
  searchRow: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 16 },
  filters: { paddingVertical: 12 },
  chipRow: { paddingHorizontal: 16, gap: 8, flexDirection: 'row', marginBottom: 8 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipActive: { backgroundColor: ACCENT },
  chipText: { fontSize: 14, fontWeight: '600' },
  listContent: { padding: CARD_GAP, paddingBottom: 100 },
  columnWrapper: { gap: CARD_GAP, marginBottom: CARD_GAP },
  card: {
    width: CARD_WIDTH,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    position: 'relative',
  },
  heartBtn: { position: 'absolute', top: 8, right: 8, zIndex: 1, padding: 4 },
  thumb: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  thumbText: { fontSize: 10 },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  badges: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  badge: { fontSize: 11, fontWeight: '600', flex: 1 },
  diffBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  diffText: { fontSize: 10, fontWeight: '700' },
  skeletonWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptySub: { fontSize: 14, marginTop: 8 },
});
