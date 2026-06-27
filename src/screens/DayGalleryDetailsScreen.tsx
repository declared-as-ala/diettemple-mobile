/**
 * Day Gallery Details: Before/After slots, add/replace/crop/delete, notes, save.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { galleryStorage, type GalleryDayEntry } from '../services/galleryStorage';
import Toast from 'react-native-toast-message';
import type { HomeDrawerParamList } from '../navigation/HomeDrawerStack';
import AppLoader from '../components/AppLoader';
import DrawerScreenContainer from '../components/DrawerScreenContainer';
import { TAB_BAR_OVERLAY_PADDING } from '../navigation/tabBarMetrics';

type Route = RouteProp<HomeDrawerParamList, 'DayGalleryDetails'>;
type NavProp = StackNavigationProp<HomeDrawerParamList, 'DayGalleryDetails'>;

const ACCENT = '#D4AF37';

function formatDateTitle(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function DayGalleryDetailsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<Route>();
  const { date: dateKey } = route.params;

  const [entry, setEntry] = useState<GalleryDayEntry | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  /** split = côte à côte; before | after = une photo plein cadre */
  const [viewMode, setViewMode] = useState<'split' | 'before' | 'after'>('split');

  const load = useCallback(async () => {
    setLoading(true);
    const e = await galleryStorage.get(dateKey);
    setEntry(e ?? null);
    setNotes(e?.notes ?? '');
    setLoading(false);
  }, [dateKey]);

  useEffect(() => {
    load();
  }, [load]);

  const pickImage = useCallback(async (slot: 'before' | 'after') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Autorisez l\'accès aux photos pour ajouter des photos de progression.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const uri = result.assets[0].uri;
    try {
      const persisted = await galleryStorage.persistImage(dateKey, slot, uri);
      const next = await galleryStorage.set(dateKey, { ...entry, [slot === 'before' ? 'beforeUri' : 'afterUri']: persisted });
      setEntry(next);
      Toast.show({
        type: 'success',
        text1: slot === 'before' ? 'Photo avant ajoutée' : 'Photo après ajoutée',
      });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Impossible d\'ajouter la photo' });
    }
  }, [dateKey, entry]);

  const replaceImage = useCallback((slot: 'before' | 'after') => {
    pickImage(slot);
  }, [pickImage]);

  const deleteSlot = useCallback((slot: 'before' | 'after') => {
    Alert.alert(
      'Supprimer la photo',
      `Retirer la photo ${slot === 'before' ? 'avant' : 'après'} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const next = await galleryStorage.clearSlot(dateKey, slot);
            setEntry(next ?? null);
          },
        },
      ]
    );
  }, [dateKey]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await galleryStorage.set(dateKey, { notes });
      Toast.show({ type: 'success', text1: 'Enregistré' });
    } catch {
      Toast.show({ type: 'error', text1: 'Erreur d\'enregistrement' });
    } finally {
      setSaving(false);
    }
  }, [dateKey, notes]);

  const hasBefore = !!entry?.beforeUri;
  const hasAfter = !!entry?.afterUri;
  const hasBoth = hasBefore && hasAfter;

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
      title={formatDateTitle(dateKey)}
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + TAB_BAR_OVERLAY_PADDING }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {hasBoth && (
          <View style={[styles.viewModeBar, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.viewModeChip, viewMode === 'split' && styles.viewModeChipActive]}
              onPress={() => setViewMode('split')}
            >
              <Ionicons name="grid-outline" size={16} color={viewMode === 'split' ? '#000' : colors.text} />
              <Text style={[styles.viewModeChipText, { color: viewMode === 'split' ? '#000' : colors.text }]}>Côte à côte</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewModeChip, viewMode === 'before' && styles.viewModeChipActive]}
              onPress={() => setViewMode('before')}
            >
              <Text style={[styles.viewModeChipText, { color: viewMode === 'before' ? '#000' : colors.text }]}>Avant</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewModeChip, viewMode === 'after' && styles.viewModeChipActive]}
              onPress={() => setViewMode('after')}
            >
              <Text style={[styles.viewModeChipText, { color: viewMode === 'after' ? '#000' : colors.text }]}>Après</Text>
            </TouchableOpacity>
          </View>
        )}

        {hasBoth ? (
          viewMode === 'split' ? (
            <View style={styles.splitRow}>
              <View style={styles.splitHalf}>
                <Text style={[styles.splitLabel, { color: colors.textSecondary }]}>Avant</Text>
                <View style={[styles.splitImageWrap, { borderColor: colors.border }]}>
                  <Image source={{ uri: entry!.beforeUri! }} style={styles.splitImage} resizeMode="contain" />
                </View>
                <View style={styles.splitActions}>
                  <TouchableOpacity onPress={() => replaceImage('before')} style={styles.splitActionBtn}>
                    <Ionicons name="swap-horizontal" size={16} color={ACCENT} />
                    <Text style={[styles.splitActionText, { color: ACCENT }]}>Remplacer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteSlot('before')} style={styles.splitActionBtn}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.splitHalf}>
                <Text style={[styles.splitLabel, { color: colors.textSecondary }]}>Après</Text>
                <View style={[styles.splitImageWrap, { borderColor: colors.border }]}>
                  <Image source={{ uri: entry!.afterUri! }} style={styles.splitImage} resizeMode="contain" />
                </View>
                <View style={styles.splitActions}>
                  <TouchableOpacity onPress={() => replaceImage('after')} style={styles.splitActionBtn}>
                    <Ionicons name="swap-horizontal" size={16} color={ACCENT} />
                    <Text style={[styles.splitActionText, { color: ACCENT }]}>Remplacer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteSlot('after')} style={styles.splitActionBtn}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.singleView}>
              <Image
                source={{ uri: viewMode === 'before' ? entry!.beforeUri! : entry!.afterUri! }}
                style={styles.previewImage}
                resizeMode="contain"
              />
              <View style={styles.singleFullActions}>
                <TouchableOpacity onPress={() => replaceImage(viewMode)} style={styles.singlePhotoBtn}>
                  <Ionicons name="swap-horizontal" size={18} color={ACCENT} />
                  <Text style={[styles.singlePhotoBtnText, { color: ACCENT }]}>Remplacer</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteSlot(viewMode)} style={styles.singlePhotoBtn}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  <Text style={[styles.singlePhotoBtnText, { color: '#EF4444' }]}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        ) : hasBefore || hasAfter ? (
          <View style={styles.singlePhotoSection}>
            <Image
              source={{ uri: (entry!.beforeUri || entry!.afterUri)! }}
              style={styles.previewImage}
              resizeMode="contain"
            />
            <View style={styles.singlePhotoActions}>
              <TouchableOpacity onPress={() => replaceImage(hasBefore ? 'before' : 'after')} style={styles.singlePhotoBtn}>
                <Ionicons name="swap-horizontal" size={18} color={ACCENT} />
                <Text style={[styles.singlePhotoBtnText, { color: ACCENT }]}>Remplacer</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteSlot(hasBefore ? 'before' : 'after')} style={styles.singlePhotoBtn}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                <Text style={[styles.singlePhotoBtnText, { color: '#EF4444' }]}>Supprimer</Text>
              </TouchableOpacity>
            </View>
            {!hasBoth && (
              <TouchableOpacity
                style={[styles.addSecondBtn, { borderColor: colors.border }]}
                onPress={() => pickImage(hasBefore ? 'after' : 'before')}
              >
                <Ionicons name="git-compare" size={22} color={ACCENT} />
                <Text style={[styles.addSecondBtnText, { color: colors.text }]}>
                  Ajouter une deuxième photo pour comparer
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.addSingleBtn, { borderColor: colors.border }]}
            onPress={() => pickImage('before')}
          >
            <Ionicons name="add-circle-outline" size={48} color={ACCENT} />
            <Text style={[styles.addSingleBtnText, { color: colors.text }]}>Ajouter une photo</Text>
            <Text style={[styles.addSingleBtnHint, { color: colors.textSecondary }]}>
              Vous pourrez ajouter une 2ᵉ photo plus tard pour comparer
            </Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Notes / Poids (optionnel)</Text>
        <TextInput
          style={[styles.notesInput, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
          placeholder="ex. 75 kg"
          placeholderTextColor={colors.textSecondary}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <AppLoader variant="button" size="sm" />
          ) : (
            <Text style={styles.saveBtnText}>Enregistrer</Text>
          )}
        </TouchableOpacity>
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
  scrollContent: { padding: 24 },
  viewModeBar: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    padding: 4,
    gap: 4,
  },
  viewModeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
  },
  viewModeChipActive: { backgroundColor: ACCENT },
  viewModeChipText: { fontSize: 12, fontWeight: '700' },
  splitRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  splitHalf: { flex: 1, minWidth: 0 },
  splitLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginBottom: 6, textTransform: 'uppercase' },
  splitImageWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: '#111',
    aspectRatio: 3 / 4,
  },
  splitImage: { width: '100%', height: '100%' },
  splitActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 6 },
  splitActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  splitActionText: { fontSize: 12, fontWeight: '700' },
  singleView: { marginBottom: 16, borderRadius: 12, overflow: 'hidden', backgroundColor: '#111' },
  singleFullActions: { flexDirection: 'row', gap: 16, paddingVertical: 12, justifyContent: 'center' },
  previewImage: { width: '100%', aspectRatio: 4 / 5, borderRadius: 12 },
  singlePhotoSection: { marginBottom: 20 },
  singlePhotoActions: { flexDirection: 'row', gap: 16, marginTop: 12 },
  singlePhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  singlePhotoBtnText: { fontSize: 14, fontWeight: '600' },
  addSecondBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  addSecondBtnText: { fontSize: 15, fontWeight: '600' },
  addSingleBtn: {
    marginBottom: 20,
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  addSingleBtnText: { fontSize: 18, fontWeight: '700' },
  addSingleBtnHint: { fontSize: 13, textAlign: 'center' },
  notesLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  notesInput: {
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 24,
  },
  saveBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#000' },
});
