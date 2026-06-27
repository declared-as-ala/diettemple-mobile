/**
 * Progress Gallery: month calendar + filter + timeline of photo days.
 * Tap a date WITH a photo to select it for comparison (up to 2).
 * When 2 dates are selected a floating "Comparer" bar appears.
 * Long-press or tap a date WITHOUT a photo to open day details.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { galleryStorage } from '../services/galleryStorage';
import { getLocalDateKey, addDays } from '../utils/date';
import type { HomeDrawerParamList } from '../navigation/HomeDrawerStack';
import AppLoader from '../components/AppLoader';
import DrawerScreenContainer from '../components/DrawerScreenContainer';
import { TAB_BAR_OVERLAY_PADDING } from '../navigation/tabBarMetrics';

type NavProp = StackNavigationProp<HomeDrawerParamList, 'Gallery'>;

const ACCENT = '#D4AF37';
const { width } = Dimensions.get('window');
const CELL_SIZE = (width - 32) / 7;
const MONTH_NAMES_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function getMonthDates(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  const dayOfWeek = start.getDay();
  const padStart = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  start.setDate(start.getDate() - padStart);
  const dates: Date[] = [];
  let d = new Date(start);
  for (let i = 0; i < 42; i++) {
    dates.push(new Date(d));
    d = addDays(d, 1);
  }
  return dates;
}

export default function GalleryScreen() {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const [monthDate, setMonthDate] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [filter, setFilter] = useState<'all' | 'beforeAfter'>('all');
  const [datesWithPhotos, setDatesWithPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [compareBarAnim] = useState(() => new Animated.Value(0));

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const monthDates = getMonthDates(year, month);

  const loadDates = useCallback(async () => {
    setLoading(true);
    const list = await galleryStorage.listDatesWithPhotos();
    setDatesWithPhotos(list);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDates();
      setSelectedDates([]);
    }, [loadDates])
  );

  // Animate compare bar in/out
  useEffect(() => {
    Animated.spring(compareBarAnim, {
      toValue: selectedDates.length === 2 ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [selectedDates.length, compareBarAnim]);

  const goPrevMonth = () => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNextMonth = () => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const hasPhoto = (dateKey: string) => datesWithPhotos.includes(dateKey);
  const isSelected = (dateKey: string) => selectedDates.includes(dateKey);

  const handleCellPress = useCallback((dateKey: string, hasPhotoForDate: boolean) => {
    if (!hasPhotoForDate) {
      navigation.navigate('DayGalleryDetails', { date: dateKey });
      return;
    }
    setSelectedDates((prev) => {
      if (prev.includes(dateKey)) {
        return prev.filter((d) => d !== dateKey);
      }
      if (prev.length < 2) {
        return [...prev, dateKey];
      }
      // Replace the first selected with the new one (FIFO)
      return [prev[1], dateKey];
    });
  }, [navigation]);

  const handleCellLongPress = useCallback((dateKey: string) => {
    navigation.navigate('DayGalleryDetails', { date: dateKey });
  }, [navigation]);

  const handleCompare = useCallback(() => {
    if (selectedDates.length !== 2) return;
    const sorted = [...selectedDates].sort();
    navigation.navigate('GalleryCompare', { dateA: sorted[0], dateB: sorted[1] });
  }, [selectedDates, navigation]);

  const [beforeAfterSet, setBeforeAfterSet] = useState<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const set = new Set<string>();
      for (const d of datesWithPhotos) {
        if (cancelled) return;
        const e = await galleryStorage.get(d);
        if (e?.beforeUri && e?.afterUri) set.add(d);
      }
      if (!cancelled) setBeforeAfterSet(set);
    })();
    return () => { cancelled = true; };
  }, [datesWithPhotos]);

  const filteredTimeline = filter === 'beforeAfter'
    ? datesWithPhotos.filter((d) => beforeAfterSet.has(d))
    : datesWithPhotos;

  const deleteDay = useCallback((dateKey: string) => {
    Alert.alert(
      'Supprimer les photos',
      'Supprimer toutes les photos de ce jour ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await galleryStorage.remove(dateKey);
            setSelectedDates((prev) => prev.filter((d) => d !== dateKey));
            loadDates();
          },
        },
      ]
    );
  }, [loadDates]);

  const isCurrentMonth = (d: Date) => d.getMonth() === month && d.getFullYear() === year;
  const isToday = (d: Date) => getLocalDateKey(d) === getLocalDateKey(new Date());

  const compareBarOpacity = compareBarAnim;

  const formatShortDate = (dateKey: string) => {
    const [y, m, day] = dateKey.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <DrawerScreenContainer
      title="Galerie"
      backgroundColor={colors.background}
      rightNode={
        selectedDates.length > 0 ? (
          <TouchableOpacity style={styles.clearSelectionBtn} onPress={() => setSelectedDates([])}>
            <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : undefined
      }
    >
      <StatusBar style="dark" />
      <ScrollView
        style={styles.pageScroll}
        contentContainerStyle={[styles.pageScrollContent, { paddingBottom: 16 + TAB_BAR_OVERLAY_PADDING }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
          {/* Month navigation */}
          <View style={[styles.monthRow, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={goPrevMonth} style={styles.monthBtn}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.monthTitle, { color: colors.text }]}>
              {MONTH_NAMES_FR[month]} {year}
            </Text>
            <TouchableOpacity onPress={goNextMonth} style={styles.monthBtn}>
              <Ionicons name="chevron-forward" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Compare bar — inline at the top, visible when 2 dates selected */}
          {selectedDates.length === 2 && (
            <Animated.View style={[styles.compareBar, { opacity: compareBarOpacity }]}>
              <View style={styles.compareBarDates}>
                <View style={styles.compareBarDate}>
                  <View style={[styles.compareBadge, styles.badge1]}>
                    <Text style={styles.selectionBadgeText}>1</Text>
                  </View>
                  <Text style={styles.compareBarDateText} numberOfLines={1}>
                    {formatShortDate(selectedDates[0])}
                  </Text>
                </View>
                <Ionicons name="swap-horizontal" size={18} color="rgba(255,255,255,0.5)" />
                <View style={styles.compareBarDate}>
                  <View style={[styles.compareBadge, styles.badge2]}>
                    <Text style={styles.selectionBadgeText}>2</Text>
                  </View>
                  <Text style={styles.compareBarDateText} numberOfLines={1}>
                    {formatShortDate(selectedDates[1])}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.compareBarBtn} onPress={handleCompare} activeOpacity={0.85}>
                <Ionicons name="git-compare" size={18} color="#000" />
                <Text style={styles.compareBarBtnText}>Fusionner</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Compare hint banner */}
          {selectedDates.length === 0 && datesWithPhotos.length >= 2 && (
            <View style={[styles.hintBanner, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Ionicons name="git-compare-outline" size={16} color={ACCENT} />
              <Text style={[styles.hintBannerText, { color: colors.textSecondary }]}>
                Appuie sur 2 photos du calendrier pour les comparer
              </Text>
            </View>
          )}

          {/* Selection status */}
          {selectedDates.length === 1 && (
            <View style={[styles.selectionBanner, { backgroundColor: 'rgba(212,175,55,0.1)', borderColor: 'rgba(212,175,55,0.3)' }]}>
              <Ionicons name="checkmark-circle" size={16} color={ACCENT} />
              <Text style={[styles.selectionBannerText, { color: ACCENT }]}>
                {formatShortDate(selectedDates[0])} sélectionné · Choisis une 2ᵉ date
              </Text>
            </View>
          )}

          {/* Filter chips */}
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, filter === 'all' && styles.filterChipActive, { borderColor: colors.border }]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterChipText, { color: filter === 'all' ? '#000' : colors.text }]}>Tout</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, filter === 'beforeAfter' && styles.filterChipActive, { borderColor: colors.border }]}
              onPress={() => setFilter('beforeAfter')}
            >
              <Text style={[styles.filterChipText, { color: filter === 'beforeAfter' ? '#000' : colors.text }]}>Avant et après</Text>
            </TouchableOpacity>
          </View>

          {/* Weekday labels */}
          <View style={styles.weekdayRow}>
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
              <Text key={day} style={[styles.weekday, { color: colors.textSecondary }]}>{day}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          {loading ? (
            <View style={styles.skeleton}>
              <AppLoader variant="inline" size="lg" label="Chargement…" />
            </View>
          ) : (
            <View style={styles.grid}>
              {monthDates.map((d, i) => {
                const dateKey = getLocalDateKey(d);
                const inMonth = isCurrentMonth(d);
                const isTodayCell = isToday(d);
                const hasDot = hasPhoto(dateKey);
                const hasPair = beforeAfterSet.has(dateKey);
                const showIndicator = filter === 'all' ? hasDot : hasPair;
                const selected = isSelected(dateKey);
                const selectionIndex = selectedDates.indexOf(dateKey);

                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.cell,
                      { backgroundColor: colors.cardBackground, borderColor: colors.border },
                      !inMonth && styles.cellOtherMonth,
                      isTodayCell && styles.cellToday,
                      selected && styles.cellSelected,
                    ]}
                    onPress={() => handleCellPress(dateKey, hasDot)}
                    onLongPress={() => handleCellLongPress(dateKey)}
                    delayLongPress={400}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.cellDay,
                      { color: inMonth ? colors.text : colors.textSecondary },
                      selected && styles.cellDaySelected,
                    ]}>
                      {d.getDate()}
                    </Text>

                    {/* Photo indicator dot or pair icon */}
                    {showIndicator && !selected && (
                      <View style={styles.cellIndicators}>
                        {hasPair
                          ? <Ionicons name="git-compare" size={11} color={ACCENT} />
                          : <View style={[styles.dot, { backgroundColor: ACCENT }]} />
                        }
                      </View>
                    )}

                    {/* Selection badge */}
                    {selected && (
                      <View style={[styles.selectionBadge, selectionIndex === 0 ? styles.badge1 : styles.badge2]}>
                        <Text style={styles.selectionBadgeText}>{selectionIndex + 1}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Timeline */}
          <View style={styles.recentHeader}>
            <Text style={[styles.timelineTitle, { color: colors.text }]}>Récent</Text>
            <Text style={[styles.recentHint, { color: colors.textSecondary }]}>Appui long pour gérer</Text>
          </View>

          {filteredTimeline.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="images-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Aucune photo. Ajoutez votre première photo de progression.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('DayGalleryDetails', { date: getLocalDateKey(new Date()) })}
              >
                <Text style={styles.emptyBtnText}>Ajouter une photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.timelineList}>
              {filteredTimeline.slice(0, 30).map((dateKey) => {
                const [y, m, day] = dateKey.split('-').map(Number);
                const d = new Date(y, m - 1, day);
                const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                const selected = isSelected(dateKey);
                return (
                  <TouchableOpacity
                    key={dateKey}
                    style={[
                      styles.timelineRow,
                      { backgroundColor: colors.cardBackground, borderColor: colors.border },
                      selected && styles.timelineRowSelected,
                    ]}
                    onPress={() => handleCellPress(dateKey, true)}
                    onLongPress={() => deleteDay(dateKey)}
                    delayLongPress={500}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={selected ? 'checkmark-circle' : 'image'} size={20} color={selected ? ACCENT : ACCENT} />
                    <Text style={[styles.timelineLabel, { color: colors.text }]}>{label}</Text>
                    {selected && (
                      <View style={styles.timelineSelectionBadge}>
                        <Text style={styles.timelineSelectionBadgeText}>
                          {selectedDates.indexOf(dateKey) + 1}
                        </Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
      </ScrollView>
    </DrawerScreenContainer>
  );
}

const styles = StyleSheet.create({
  pageScroll: { flex: 1 },
  pageScrollContent: { flexGrow: 1 },
  clearSelectionBtn: { padding: 8 },

  // Month nav
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  monthBtn: { padding: 8 },
  monthTitle: { fontSize: 18, fontWeight: '700' },

  // Banners
  hintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  hintBannerText: { flex: 1, fontSize: 12, fontWeight: '500' },
  selectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectionBannerText: { flex: 1, fontSize: 12, fontWeight: '600' },

  // Filters
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  filterChipText: { fontSize: 14, fontWeight: '600' },

  // Weekday labels
  weekdayRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 4 },
  weekday: { width: CELL_SIZE, fontSize: 11, fontWeight: '600', textAlign: 'center' },

  // Skeleton
  skeleton: { justifyContent: 'center', alignItems: 'center', minHeight: 200, paddingVertical: 24 },

  // Calendar grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 16 },
  cell: {
    width: CELL_SIZE - 2,
    height: CELL_SIZE - 2,
    margin: 1,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellOtherMonth: { opacity: 0.4 },
  cellToday: { borderColor: ACCENT, borderWidth: 2 },
  cellSelected: {
    backgroundColor: 'rgba(212,175,55,0.18)',
    borderColor: ACCENT,
    borderWidth: 2,
  },
  cellDay: { fontSize: 14, fontWeight: '700' },
  cellDaySelected: { color: ACCENT },
  cellIndicators: { position: 'absolute', bottom: 3 },
  dot: { width: 5, height: 5, borderRadius: 3 },

  // Selection badge (number inside cell)
  selectionBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge1: { backgroundColor: ACCENT },
  badge2: { backgroundColor: '#C084FC' },
  selectionBadgeText: { fontSize: 9, fontWeight: '800', color: '#000' },

  // Timeline
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 6,
  },
  recentHint: { fontSize: 11, fontWeight: '600' },
  timelineTitle: { fontSize: 17, fontWeight: '800' },
  timelineList: { paddingHorizontal: 16 },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  timelineRowSelected: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(212,175,55,0.08)',
  },
  timelineLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  timelineSelectionBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineSelectionBadgeText: { fontSize: 12, fontWeight: '800', color: '#000' },

  // Empty state
  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 16 },
  emptyText: { fontSize: 15, marginTop: 12, textAlign: 'center' },
  emptyBtn: {
    marginTop: 16,
    backgroundColor: ACCENT,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#000' },

  // Inline compare bar (appears below month nav when 2 dates are selected)
  compareBar: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 8,
    gap: 12,
  },
  compareBarDates: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compareBarDate: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compareBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compareBarDateText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  compareBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ACCENT,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  compareBarBtnText: { fontSize: 14, fontWeight: '800', color: '#000' },
});
