/**
 * Compare two progress photos: pre-selected from GalleryScreen or chosen manually.
 * Auto-generates the composite immediately when both dates arrive from route params.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../context/ThemeContext';
import { galleryStorage } from '../services/galleryStorage';
import type { HomeDrawerParamList } from '../navigation/HomeDrawerStack';
import AppLoader from '../components/AppLoader';
import DrawerScreenContainer from '../components/DrawerScreenContainer';
import { useSnackbar } from '../components/Snackbar';
import { TAB_BAR_OVERLAY_PADDING } from '../navigation/tabBarMetrics';
import type { GalleryDayEntry } from '../services/galleryStorage';

type NavProp = StackNavigationProp<HomeDrawerParamList, 'GalleryCompare'>;
type RoutePropType = RouteProp<HomeDrawerParamList, 'GalleryCompare'>;

const ACCENT = '#D4AF37';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COMPOSITE_WIDTH = SCREEN_WIDTH - 32;
const COMPOSITE_ASPECT = 4 / 5;
const EXPORT_WIDTH = 1440;
const EXPORT_HEIGHT = Math.round(EXPORT_WIDTH * COMPOSITE_ASPECT);

function formatDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getPhotoUriOld(entry: GalleryDayEntry | null): string | null {
  if (!entry) return null;
  return entry.beforeUri || entry.afterUri || null;
}

function getPhotoUriNew(entry: GalleryDayEntry | null): string | null {
  if (!entry) return null;
  return entry.afterUri || entry.beforeUri || null;
}

export default function GalleryCompareScreen() {
  const { colors } = useTheme();
  const { showSnackbar } = useSnackbar();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const exportCompositeRef = useRef<View>(null);

  const paramDateA = route.params?.dateA;
  const paramDateB = route.params?.dateB;
  const hasPreselection = !!(paramDateA && paramDateB);

  const [datesWithPhotos, setDatesWithPhotos] = useState<string[]>([]);
  const [dateA, setDateA] = useState<string | null>(paramDateA ?? null);
  const [dateB, setDateB] = useState<string | null>(paramDateB ?? null);
  const [uriA, setUriA] = useState<string | null>(null);
  const [uriB, setUriB] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedUri, setGeneratedUri] = useState<string | null>(null);
  const autoGenTriggered = useRef(false);

  const loadDates = useCallback(async () => {
    setLoading(true);
    const list = await galleryStorage.listDatesWithPhotos();
    setDatesWithPhotos(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDates();
  }, [loadDates]);

  // Only auto-pick dates when no preselection came from route params
  useEffect(() => {
    if (loading || hasPreselection) return;
    if (datesWithPhotos.length < 2) {
      setDateA(null);
      setDateB(null);
      return;
    }
    const oldest = datesWithPhotos[datesWithPhotos.length - 1];
    const newest = datesWithPhotos[0];
    setDateA((prev) => prev ?? oldest);
    setDateB((prev) => prev ?? newest);
  }, [loading, datesWithPhotos, hasPreselection]);

  useEffect(() => {
    if (!dateA) { setUriA(null); return; }
    let cancelled = false;
    galleryStorage.get(dateA).then((e) => {
      if (!cancelled) setUriA(getPhotoUriOld(e));
    });
    return () => { cancelled = true; };
  }, [dateA]);

  useEffect(() => {
    if (!dateB) { setUriB(null); return; }
    let cancelled = false;
    galleryStorage.get(dateB).then((e) => {
      if (!cancelled) setUriB(getPhotoUriNew(e));
    });
    return () => { cancelled = true; };
  }, [dateB]);

  const handleGenerate = useCallback(async () => {
    if (!uriA || !uriB || !exportCompositeRef.current) return;
    setGenerating(true);
    setGeneratedUri(null);
    try {
      const uri = await captureRef(exportCompositeRef, {
        format: 'jpg',
        quality: 1,
        width: EXPORT_WIDTH,
        height: EXPORT_HEIGHT,
        result: 'tmpfile',
      });
      if (uri) setGeneratedUri(uri);
    } catch {
      showSnackbar({ message: "Impossible de générer l'image.", duration: 2600 });
    } finally {
      setGenerating(false);
    }
  }, [uriA, uriB, showSnackbar]);

  // Auto-generate when both URIs are ready (only for preselected dates)
  useEffect(() => {
    if (!hasPreselection || autoGenTriggered.current) return;
    if (uriA && uriB && exportCompositeRef.current) {
      autoGenTriggered.current = true;
      handleGenerate();
    }
  }, [uriA, uriB, hasPreselection, handleGenerate]);

  const handleSave = useCallback(async () => {
    if (!generatedUri) return;
    try {
      const dir = `${FileSystem.documentDirectory}gallery`;
      const exists = await FileSystem.getInfoAsync(dir);
      if (!exists.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const name = `transformation_${Date.now()}.jpg`;
      const dest = `${dir}/${name}`;
      await FileSystem.copyAsync({ from: generatedUri, to: dest });
      showSnackbar({ message: "Image enregistrée dans l'application.", duration: 2200 });
    } catch {
      showSnackbar({ message: "Impossible d'enregistrer l'image.", duration: 2600 });
    }
  }, [generatedUri, showSnackbar]);

  const handleShare = useCallback(async () => {
    if (!generatedUri) return;
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) await Sharing.shareAsync(generatedUri, { mimeType: 'image/jpeg' });
      else showSnackbar({ message: "Le partage n'est pas disponible sur cet appareil.", duration: 2400 });
    } catch {
      showSnackbar({ message: 'Impossible de partager.', duration: 2600 });
    }
  }, [generatedUri, showSnackbar]);

  const hasSelection = dateA && dateB && uriA && uriB;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <StatusBar style="dark" />
        <AppLoader variant="inline" size="lg" label="Chargement…" />
      </View>
    );
  }

  return (
    <DrawerScreenContainer
      title="Comparer"
      backgroundColor={colors.background}
      leftAction={
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      }
    >
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 + TAB_BAR_OVERLAY_PADDING }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Selected dates header */}
        {hasPreselection && dateA && dateB ? (
          <View style={[styles.preselectedHeader, { backgroundColor: colors.cardBackground, borderColor: 'rgba(212,175,55,0.3)' }]}>
            <View style={styles.preselectedDates}>
              <View style={styles.preselectedDate}>
                <View style={[styles.dateBadge, { backgroundColor: ACCENT }]}>
                  <Text style={styles.dateBadgeText}>1</Text>
                </View>
                <Text style={[styles.preselectedDateText, { color: colors.text }]}>
                  {formatDateLabel(dateA)}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
              <View style={styles.preselectedDate}>
                <View style={[styles.dateBadge, { backgroundColor: '#C084FC' }]}>
                  <Text style={styles.dateBadgeText}>2</Text>
                </View>
                <Text style={[styles.preselectedDateText, { color: colors.text }]}>
                  {formatDateLabel(dateB)}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <>
            <Text style={[styles.lead, { color: colors.textSecondary }]}>
              Choisis une date ancienne et une date récente pour générer une image avant/après.
            </Text>

            <View style={[styles.dateBlock, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.blockTitle, { color: colors.text }]}>Plus ancienne</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
                {datesWithPhotos.map((d) => (
                  <TouchableOpacity
                    key={`a-${d}`}
                    style={[
                      styles.dateChip,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      dateA === d && styles.dateChipActive,
                    ]}
                    onPress={() => {
                      if (d === dateB) {
                        showSnackbar({ message: 'Choisis une date différente de la photo récente.', duration: 2200 });
                        return;
                      }
                      setDateA(d);
                      setGeneratedUri(null);
                    }}
                  >
                    <Text style={[styles.dateChipText, { color: dateA === d ? '#000' : colors.text }]} numberOfLines={1}>
                      {formatDateLabel(d)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={[styles.dateBlock, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.blockTitle, { color: colors.text }]}>Plus récente</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
                {datesWithPhotos.map((d) => (
                  <TouchableOpacity
                    key={`b-${d}`}
                    style={[
                      styles.dateChip,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      dateB === d && styles.dateChipActive,
                    ]}
                    onPress={() => {
                      if (d === dateA) {
                        showSnackbar({ message: 'Choisis une date différente de la photo ancienne.', duration: 2200 });
                        return;
                      }
                      setDateB(d);
                      setGeneratedUri(null);
                    }}
                  >
                    <Text style={[styles.dateChipText, { color: dateB === d ? '#000' : colors.text }]} numberOfLines={1}>
                      {formatDateLabel(d)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        )}

        {/* Preview */}
        {uriA && uriB && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Aperçu</Text>
            <View style={styles.compositeContainer}>
              <Text style={styles.compositeTitle}>Transformation</Text>
              <View style={styles.compositeRow}>
                <View style={styles.compositeHalf}>
                  <Image source={{ uri: uriA }} style={styles.compositeImage} resizeMode="contain" />
                  <Text style={styles.compositeDateLabel}>{dateA ? formatDateLabel(dateA) : ''}</Text>
                </View>
                <View style={styles.compositeHalf}>
                  <Image source={{ uri: uriB }} style={styles.compositeImage} resizeMode="contain" />
                  <Text style={styles.compositeDateLabel}>{dateB ? formatDateLabel(dateB) : ''}</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Generate button — only show if not auto-generating */}
        {hasSelection && !generating && !generatedUri && (
          <TouchableOpacity
            style={[styles.generateBtn, { backgroundColor: ACCENT }]}
            onPress={handleGenerate}
          >
            <Ionicons name="git-compare" size={22} color="#000" />
            <Text style={styles.generateBtnText}>Générer la fusion</Text>
          </TouchableOpacity>
        )}

        {/* Generating spinner */}
        {generating && (
          <View style={styles.generatingWrap}>
            <AppLoader variant="inline" size="lg" label="Génération en cours…" />
          </View>
        )}

        {/* Generated result */}
        {generatedUri && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Image fusionnée</Text>
            <Image
              source={{ uri: generatedUri }}
              style={styles.generatedPreview}
              resizeMode="contain"
            />
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                onPress={handleSave}
              >
                <Ionicons name="save-outline" size={22} color={colors.text} />
                <Text style={[styles.actionBtnText, { color: colors.text }]}>Enregistrer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: ACCENT }]} onPress={handleShare}>
                <Ionicons name="share-outline" size={22} color="#000" />
                <Text style={styles.actionBtnTextDark}>Partager</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.regenerateBtn, { borderColor: colors.border }]}
              onPress={() => { setGeneratedUri(null); handleGenerate(); }}
            >
              <Ionicons name="refresh" size={16} color={colors.textSecondary} />
              <Text style={[styles.regenerateBtnText, { color: colors.textSecondary }]}>Regénérer</Text>
            </TouchableOpacity>
          </>
        )}

        {!hasSelection && datesWithPhotos.length < 2 && (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Ajoutez au moins deux photos à des dates différentes pour comparer.
          </Text>
        )}

        {/* Hidden high-resolution export canvas */}
        {uriA && uriB && (
          <View style={styles.exportCanvasWrap} pointerEvents="none">
            <View collapsable={false} ref={exportCompositeRef} style={styles.exportCompositeContainer}>
              <Text style={styles.exportCompositeTitle}>Transformation</Text>
              <View style={styles.exportCompositeRow}>
                <View style={styles.exportCompositeHalf}>
                  <Image source={{ uri: uriA }} style={styles.exportCompositeImage} resizeMode="contain" />
                  <Text style={styles.exportCompositeDateLabel}>{dateA ? formatDateLabel(dateA) : ''}</Text>
                </View>
                <View style={styles.exportCompositeHalf}>
                  <Image source={{ uri: uriB }} style={styles.exportCompositeImage} resizeMode="contain" />
                  <Text style={styles.exportCompositeDateLabel}>{dateB ? formatDateLabel(dateB) : ''}</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </DrawerScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  lead: { fontSize: 13, lineHeight: 19, marginBottom: 16 },

  // Pre-selected header
  preselectedHeader: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  preselectedDates: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  preselectedDate: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  dateBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateBadgeText: { fontSize: 11, fontWeight: '800', color: '#000' },
  preselectedDateText: { flex: 1, fontSize: 14, fontWeight: '600' },

  // Manual date selection
  dateBlock: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  blockTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6, marginBottom: 10, textTransform: 'uppercase' },
  dateScroll: { maxHeight: 44 },
  dateChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  dateChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  dateChipText: { fontSize: 13, fontWeight: '600' },

  sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 4 },

  // Preview composite
  compositeContainer: {
    width: COMPOSITE_WIDTH,
    backgroundColor: '#111',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  compositeTitle: { fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'center', paddingVertical: 12 },
  compositeRow: { flexDirection: 'row', padding: 4, gap: 4 },
  compositeHalf: { flex: 1, alignItems: 'center' },
  compositeImage: {
    width: (COMPOSITE_WIDTH - 16) / 2 - 4,
    height: ((COMPOSITE_WIDTH - 16) / 2 - 4) * COMPOSITE_ASPECT,
    borderRadius: 8,
    backgroundColor: '#222',
  },
  compositeDateLabel: { fontSize: 11, color: 'rgba(255,255,255,0.9)', marginTop: 4, fontWeight: '600' },

  // Generate button
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  generateBtnText: { fontSize: 16, fontWeight: '800', color: '#000' },

  // Generating spinner
  generatingWrap: { alignItems: 'center', paddingVertical: 32 },

  // Generated result
  generatedPreview: {
    width: '100%',
    aspectRatio: COMPOSITE_WIDTH / (COMPOSITE_WIDTH * COMPOSITE_ASPECT),
    borderRadius: 12,
    backgroundColor: '#111',
    marginBottom: 16,
  },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 15, fontWeight: '700' },
  actionBtnTextDark: { fontSize: 15, fontWeight: '700', color: '#000' },
  regenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  regenerateBtnText: { fontSize: 13, fontWeight: '600' },

  hint: { fontSize: 13, textAlign: 'center', marginTop: 16 },

  // Hidden export canvas
  exportCanvasWrap: { position: 'absolute', left: -9999, top: -9999, opacity: 0 },
  exportCompositeContainer: {
    width: EXPORT_WIDTH,
    height: EXPORT_HEIGHT,
    backgroundColor: '#111',
    borderRadius: 24,
    overflow: 'hidden',
  },
  exportCompositeTitle: { fontSize: 54, fontWeight: '800', color: '#fff', textAlign: 'center', paddingVertical: 30 },
  exportCompositeRow: { flexDirection: 'row', paddingHorizontal: 24, paddingBottom: 24, gap: 18, flex: 1 },
  exportCompositeHalf: { flex: 1, alignItems: 'center' },
  exportCompositeImage: { width: '100%', flex: 1, borderRadius: 16, backgroundColor: '#222' },
  exportCompositeDateLabel: { fontSize: 26, color: 'rgba(255,255,255,0.9)', marginTop: 10, fontWeight: '700' },
});
