/**
 * Scanner mon repas (IA): capture → analyse → vérifier (grams, remplacer, ajouter) → confirmer.
 * French UI, premium UX. AI never auto-commits; user must confirm.
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types';
import { getLocalDateKey } from '../utils/date';
import { meService } from '../services/meService';
import type { FoodSearchItem } from '../services/meService';
import AppBackground from '../components/AppBackground';
import { useMealScanStore, getItemMacros, type DraftItem } from '../store/mealScanStore';
import FoodSearchModal from '../components/FoodSearchModal';

type NavProp = StackNavigationProp<RootStackParamList, 'MealScan'>;

const ACCENT = '#D4AF37';
const PRESETS = [50, 100, 150, 200];
const ANALYSIS_TIMEOUT_MS = 10000;

// ── Confidence helpers ──────────────────────────────────────────────────────

function confidenceLabel(c: number): string {
  if (c >= 0.75) return 'Élevée';
  if (c >= 0.5) return 'Moyenne';
  return 'Faible';
}

function confidenceColor(c: number): string {
  if (c >= 0.75) return '#22c55e';
  if (c >= 0.5) return '#f59e0b';
  return '#ef4444';
}

// ── ReviewCard component ────────────────────────────────────────────────────

function ReviewCard({
  item,
  colors,
  onUpdateName,
  onUpdateGrams,
  onRemove,
  onReplace,
}: {
  item: DraftItem;
  colors: any;
  onUpdateName: (name: string) => void;
  onUpdateGrams: (grams: number) => void;
  onRemove: () => void;
  onReplace: () => void;
}) {
  const macros = getItemMacros(item);
  const hasMacros = item.selectedFood?.macrosPer100g != null;
  const confColor = confidenceColor(item.confidence);
  const isLowConfidence = item.confidence < 0.5;

  return (
    <View style={[card.wrap, isLowConfidence && { borderColor: '#D97706' }]}>
      {/* Top bar: confidence accent */}
      <View style={[card.accentBar, { backgroundColor: confColor }]} />

      <View style={card.inner}>
        {/* Name row */}
        <View style={card.nameRow}>
          <TextInput
            style={card.name}
            value={item.name}
            onChangeText={onUpdateName}
            placeholder="Nom de l'aliment"
            placeholderTextColor="rgba(255,255,255,0.3)"
          />
          <View style={[card.confBadge, { backgroundColor: confColor + '22', borderColor: confColor + '55' }]}>
            <View style={[card.confDot, { backgroundColor: confColor }]} />
            <Text style={[card.confText, { color: confColor }]}>{confidenceLabel(item.confidence)}</Text>
          </View>
        </View>

        {/* Gram stepper */}
        <View style={card.stepperRow}>
          <TouchableOpacity
            style={card.stepBtn}
            onPress={() => onUpdateGrams(Math.max(0, item.grams - 10))}
            activeOpacity={0.75}
          >
            <Ionicons name="remove" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={card.gramsBox}>
            <TextInput
              style={card.gramsInput}
              value={String(item.grams)}
              onChangeText={(t) => onUpdateGrams(Math.max(0, parseInt(t, 10) || 0))}
              keyboardType="number-pad"
              selectTextOnFocus
            />
            <Text style={card.gramsUnit}>g</Text>
          </View>
          <TouchableOpacity
            style={card.stepBtn}
            onPress={() => onUpdateGrams(item.grams + 10)}
            activeOpacity={0.75}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Preset chips */}
        <View style={card.presets}>
          {PRESETS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[card.preset, item.grams === p && card.presetActive]}
              onPress={() => onUpdateGrams(p)}
              activeOpacity={0.75}
            >
              <Text style={[card.presetText, item.grams === p && card.presetTextActive]}>{p}g</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Macros grid */}
        {hasMacros ? (
          <View style={card.macroGrid}>
            <View style={[card.macroCell, { backgroundColor: 'rgba(251,146,60,0.12)' }]}>
              <Ionicons name="flame" size={14} color="#FB923C" />
              <Text style={[card.macroCellVal, { color: '#FB923C' }]}>{macros.kcal}</Text>
              <Text style={card.macroCellLbl}>kcal</Text>
            </View>
            <View style={[card.macroCell, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
              <Text style={[card.macroCellVal, { color: '#22c55e' }]}>{macros.protein}g</Text>
              <Text style={card.macroCellLbl}>Protéines</Text>
            </View>
            <View style={[card.macroCell, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
              <Text style={[card.macroCellVal, { color: '#60a5fa' }]}>{macros.carbs}g</Text>
              <Text style={card.macroCellLbl}>Glucides</Text>
            </View>
            <View style={[card.macroCell, { backgroundColor: 'rgba(168,85,247,0.12)' }]}>
              <Text style={[card.macroCellVal, { color: '#c084fc' }]}>{macros.fat}g</Text>
              <Text style={card.macroCellLbl}>Lipides</Text>
            </View>
          </View>
        ) : (
          <View style={card.noMacrosBanner}>
            <Ionicons name="warning-outline" size={15} color="#EAB308" />
            <Text style={card.noMacrosText}>Macros indisponibles — remplacez cet aliment</Text>
          </View>
        )}

        {/* Actions */}
        <View style={card.actions}>
          <TouchableOpacity style={card.actionBtn} onPress={onReplace} activeOpacity={0.75}>
            <Ionicons name="swap-horizontal" size={14} color={ACCENT} />
            <Text style={[card.actionText, { color: ACCENT }]}>Remplacer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[card.actionBtn, card.removeBtn]} onPress={onRemove} activeOpacity={0.75}>
            <Ionicons name="trash-outline" size={14} color="#F87171" />
            <Text style={[card.actionText, { color: '#F87171' }]}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const card = StyleSheet.create({
  wrap: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#18181B',
    marginBottom: 14,
    overflow: 'hidden',
  },
  accentBar: { height: 3, width: '100%' },
  inner: { padding: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 10 },
  name: { flex: 1, fontSize: 16, fontWeight: '800', color: '#fff' },
  confBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  confDot: { width: 6, height: 6, borderRadius: 3 },
  confText: { fontSize: 11, fontWeight: '700' },

  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 },
  stepBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  gramsBox: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  gramsInput: {
    fontSize: 32, fontWeight: '900', color: '#fff',
    minWidth: 72, textAlign: 'center',
    letterSpacing: -1,
  },
  gramsUnit: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },

  presets: { flexDirection: 'row', gap: 8, marginBottom: 14, justifyContent: 'center' },
  preset: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  presetActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  presetText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.55)' },
  presetTextActive: { color: '#000' },

  macroGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  macroCell: {
    flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', gap: 2,
  },
  macroCellVal: { fontSize: 15, fontWeight: '900', letterSpacing: -0.5 },
  macroCellLbl: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.3 },

  noMacrosBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.4)',
    backgroundColor: 'rgba(251,191,36,0.1)',
    marginBottom: 14,
  },
  noMacrosText: { fontSize: 12, fontWeight: '600', color: '#EAB308', flex: 1 },

  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  removeBtn: { marginLeft: 'auto' as any },
  actionText: { fontSize: 12, fontWeight: '700' },
});

// ── Main screen ─────────────────────────────────────────────────────────────

export default function MealScanScreen() {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const [step, setStep] = useState<'capture' | 'analysing' | 'review'>('capture');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisTimeout, setAnalysisTimeout] = useState(false);
  const [adding, setAdding] = useState(false);
  const [replaceItemId, setReplaceItemId] = useState<string | null>(null);
  const [showAddFood, setShowAddFood] = useState(false);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [selectedDateKey] = useState<string>(() => getLocalDateKey(new Date()));
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    items,
    setPhotoUri: setStorePhoto,
    setScanResult,
    updateItem,
    removeItem,
    addManualItem,
    clearDraft,
    getTotals,
  } = useMealScanStore();

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }, [])
  );

  const pickImage = async (useCamera: boolean) => {
    const { status } = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "Autorisez l'accès à la caméra ou aux photos pour scanner un repas.");
      return;
    }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.6 });
    if (result.canceled || !result.assets?.[0]) return;
    const uri = result.assets[0].uri;
    const base64 = (result.assets[0] as any).base64 ?? null;
    setPhotoUri(uri);
    setPhotoBase64(base64);
    setStorePhoto(uri);
    setStep('capture');
  };

  const handleAnalyser = async () => {
    if (!photoBase64 && !photoUri) return;
    setStep('analysing');
    setAnalyzing(true);
    setAnalysisTimeout(false);
    setServiceUnavailable(false);
    timeoutRef.current = setTimeout(() => setAnalysisTimeout(true), ANALYSIS_TIMEOUT_MS);
    try {
      let base64 = photoBase64 || '';
      if (!base64 && photoUri) {
        try {
          base64 = await FileSystem.readAsStringAsync(photoUri, { encoding: 'base64' });
          setPhotoBase64(base64);
        } catch (readErr: any) {
          Alert.alert('Erreur', 'Impossible de lire la photo. Réessaie ou choisis une autre image.');
          setAnalyzing(false);
          setAnalysisTimeout(false);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
          return;
        }
      }
      if (!base64) {
        Alert.alert('Erreur', 'Image manquante. Prends une nouvelle photo ou en choisis une dans la galerie.');
        setAnalyzing(false);
        setAnalysisTimeout(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        return;
      }
      const result = await meService.scanMeal(base64);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      const scannedItems = result?.items ?? [];
      setScanResult(scannedItems);
      setStep('review');
    } catch (e: any) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      const status = e?.response?.status;
      const data = e?.response?.data;
      const serverMessage = data?.message;
      const is503 = status === 503 || data?.code === 'provider_error';
      if (is503) setServiceUnavailable(true);
      else {
        const message =
          typeof serverMessage === 'string' && serverMessage
            ? serverMessage
            : "Impossible d'analyser l'image. Réessayez.";
        Alert.alert('Erreur', message);
        setStep('capture');
      }
    } finally {
      setAnalyzing(false);
      setAnalysisTimeout(false);
    }
  };

  const handleReplace = (itemId: string) => setReplaceItemId(itemId);
  const handleSelectFoodReplace = (food: FoodSearchItem) => {
    if (replaceItemId) {
      updateItem(replaceItemId, {
        name: food.name,
        selectedFood: { foodId: food.foodId, name: food.name, macrosPer100g: food.macrosPer100g },
      });
      setReplaceItemId(null);
    }
  };
  const handleAddFoodSelect = (food: FoodSearchItem) => {
    addManualItem(food);
    setShowAddFood(false);
  };

  const confirmAddToDay = async () => {
    const payloadItems = items
      .filter((i) => i.grams > 0 && i.selectedFood?.macrosPer100g)
      .map((i) => {
        const m = getItemMacros(i);
        return {
          foodId: i.selectedFood!.foodId,
          name: i.name,
          grams: i.grams,
          kcal: m.kcal,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
        };
      });
    if (payloadItems.length === 0) {
      Alert.alert('Quantités requises', 'Saisis les grammes pour au moins un aliment.');
      return;
    }
    setAdding(true);
    try {
      await meService.postNutritionLogEntry(selectedDateKey, { items: payloadItems });
      clearDraft();
      setPhotoUri(null);
      setStep('capture');
      Toast.show({ type: 'success', text1: 'Repas ajouté ✅', visibilityTime: 2500 });
      navigation.goBack();
    } catch {
      Alert.alert('Erreur', "Impossible d'ajouter le repas. Réessayez.");
    } finally {
      setAdding(false);
    }
  };

  const totals = getTotals();

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <AppBackground>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 'review' ? 'Vérifier le repas' : 'Scanner mon repas'}
        </Text>
        {step === 'review' && (
          <TouchableOpacity
            style={styles.rescanTopBtn}
            onPress={() => { setStep('capture'); setPhotoUri(null); setPhotoBase64(null); setStorePhoto(null); setScanResult([]); }}
            activeOpacity={0.75}
          >
            <Ionicons name="camera-reverse-outline" size={20} color={ACCENT} />
          </TouchableOpacity>
        )}
        {step !== 'review' && <View style={{ width: 44 }} />}
      </View>

      {/* ── Capture step ─────────────────────────────────────────────────── */}
      {step === 'capture' && (
        <View style={styles.captureWrap}>
          {photoUri ? (
            <>
              <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
              <TouchableOpacity style={styles.analyseCta} onPress={handleAnalyser} activeOpacity={0.85}>
                <LinearGradient
                  colors={['#D4AF37', '#C19B28']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.analyseCtaGradient}
                >
                  <Ionicons name="flash" size={22} color="#000" />
                  <Text style={styles.analyseCtaText}>Analyser avec l'IA</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.changePhoto} onPress={() => { setPhotoUri(null); setStorePhoto(null); }} activeOpacity={0.75}>
                <Ionicons name="refresh-outline" size={16} color="rgba(255,255,255,0.6)" />
                <Text style={styles.changePhotoText}>Changer la photo</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.pickIconWrap}>
                <Ionicons name="camera" size={48} color={ACCENT} />
              </View>
              <Text style={styles.pickTitle}>Photographiez votre repas</Text>
              <Text style={styles.pickSub}>
                L'IA détecte les aliments et leurs macros.{'\n'}Vous ajustez les quantités avant de confirmer.
              </Text>
              <TouchableOpacity style={styles.pickBtn} onPress={() => pickImage(true)} activeOpacity={0.85}>
                <LinearGradient
                  colors={['#D4AF37', '#C19B28']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.pickBtnGradient}
                >
                  <Ionicons name="camera" size={24} color="#000" />
                  <Text style={styles.pickBtnText}>Ouvrir la caméra</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickBtnOutline} onPress={() => pickImage(false)} activeOpacity={0.85}>
                <Ionicons name="images-outline" size={22} color="#fff" />
                <Text style={styles.pickBtnOutlineText}>Choisir depuis la galerie</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* ── Analysing step ───────────────────────────────────────────────── */}
      {step === 'analysing' && (
        <View style={styles.analyzingBox}>
          {photoUri && (
            <Image source={{ uri: photoUri }} style={styles.analysingThumb} resizeMode="cover" />
          )}
          <ActivityIndicator size="large" color={ACCENT} style={{ marginBottom: 16 }} />
          <Text style={styles.analyzingLabel}>Analyse en cours…</Text>
          <Text style={styles.analyzingSubLabel}>L'IA identifie les aliments dans votre photo</Text>
          {analysisTimeout && (
            <>
              <Text style={styles.timeoutLabel}>Toujours en cours… quelques secondes</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => { setAnalyzing(false); setStep('capture'); }}>
                <Text style={styles.retryBtnText}>Annuler</Text>
              </TouchableOpacity>
            </>
          )}
          {serviceUnavailable && (
            <View style={styles.serviceUnavailableBox}>
              <Ionicons name="warning" size={24} color="#f59e0b" />
              <Text style={styles.serviceUnavailableText}>Service IA temporairement indisponible</Text>
              <View style={styles.serviceUnavailableBtns}>
                <TouchableOpacity
                  style={[styles.retryBtn, { marginTop: 0 }]}
                  onPress={() => { setServiceUnavailable(false); setStep('review'); setScanResult([]); setShowAddFood(true); }}
                >
                  <Text style={styles.retryBtnText}>Saisir manuellement</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.retryBtn, { marginTop: 0 }]}
                  onPress={() => { setServiceUnavailable(false); setStep('capture'); }}
                >
                  <Text style={styles.retryBtnText}>Retour</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ── Review step ──────────────────────────────────────────────────── */}
      {step === 'review' && (
        <ScrollView style={styles.reviewScroll} contentContainerStyle={styles.reviewContent} showsVerticalScrollIndicator={false}>

          {/* Photo + date header */}
          <View style={styles.reviewPhotoRow}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.reviewThumb} resizeMode="cover" />
            ) : (
              <View style={[styles.reviewThumb, styles.reviewThumbFallback]}>
                <Ionicons name="camera" size={28} color="rgba(255,255,255,0.3)" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.reviewPhotoLabel}>Photo analysée</Text>
              <Text style={styles.reviewDateLabel}>
                Journal du {selectedDateKey.split('-').reverse().join('/')}
              </Text>
              <View style={styles.reviewItemCount}>
                <Ionicons name="restaurant" size={13} color={ACCENT} />
                <Text style={styles.reviewItemCountText}>{items.length} aliment{items.length > 1 ? 's' : ''} détecté{items.length > 1 ? 's' : ''}</Text>
              </View>
            </View>
          </View>

          {/* Section label */}
          <Text style={styles.sectionLabel}>ALIMENTS DÉTECTÉS</Text>

          {/* Food item cards */}
          {items.map((item) => (
            <ReviewCard
              key={item.id}
              item={item}
              colors={colors}
              onUpdateName={(name) => updateItem(item.id, { name })}
              onUpdateGrams={(grams) => updateItem(item.id, { grams })}
              onRemove={() => removeItem(item.id)}
              onReplace={() => handleReplace(item.id)}
            />
          ))}

          {/* Add food button */}
          <TouchableOpacity style={styles.addFoodBtn} onPress={() => setShowAddFood(true)} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={20} color={ACCENT} />
            <Text style={styles.addFoodBtnText}>Ajouter un aliment</Text>
          </TouchableOpacity>

          {/* Totals card */}
          <View style={styles.totalsCard}>
            <View style={styles.totalsHeader}>
              <Ionicons name="nutrition" size={16} color={ACCENT} />
              <Text style={styles.totalsTitle}>Total du repas</Text>
            </View>
            <View style={styles.totalsGrid}>
              <View style={[styles.totalCell, { backgroundColor: 'rgba(251,146,60,0.12)' }]}>
                <Ionicons name="flame" size={18} color="#FB923C" />
                <Text style={[styles.totalCellVal, { color: '#FB923C' }]}>{totals.kcal}</Text>
                <Text style={styles.totalCellLbl}>kcal</Text>
              </View>
              <View style={[styles.totalCell, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
                <Text style={[styles.totalCellVal, { color: '#22c55e' }]}>{totals.protein.toFixed(0)}g</Text>
                <Text style={styles.totalCellLbl}>Protéines</Text>
              </View>
              <View style={[styles.totalCell, { backgroundColor: 'rgba(96,165,250,0.12)' }]}>
                <Text style={[styles.totalCellVal, { color: '#60a5fa' }]}>{totals.carbs.toFixed(0)}g</Text>
                <Text style={styles.totalCellLbl}>Glucides</Text>
              </View>
              <View style={[styles.totalCell, { backgroundColor: 'rgba(192,132,252,0.12)' }]}>
                <Text style={[styles.totalCellVal, { color: '#c084fc' }]}>{totals.fat.toFixed(0)}g</Text>
                <Text style={styles.totalCellLbl}>Lipides</Text>
              </View>
            </View>
          </View>

          {/* Add to day */}
          <TouchableOpacity
            style={[styles.addToDayBtn, adding && { opacity: 0.7 }]}
            onPress={confirmAddToDay}
            disabled={adding}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#D4AF37', '#C19B28']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.addToDayGradient}
            >
              {adding ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#000" />
                  <Text style={styles.addToDayText}>Ajouter à ma journée</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
            <Text style={styles.cancelBtnText}>Annuler</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <FoodSearchModal
        visible={replaceItemId !== null}
        onClose={() => setReplaceItemId(null)}
        onSelect={handleSelectFoodReplace}
        title="Remplacer par"
      />
      <FoodSearchModal
        visible={showAddFood}
        onClose={() => setShowAddFood(false)}
        onSelect={handleAddFoodSelect}
        title="Ajouter un aliment"
      />
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 19, fontWeight: '800', color: '#fff' },
  rescanTopBtn: { padding: 8 },

  // Capture
  captureWrap: { flex: 1, padding: 24, justifyContent: 'center' },
  preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: 18, backgroundColor: '#111', marginBottom: 20 },
  analyseCta: { borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  analyseCtaGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, gap: 10,
  },
  analyseCtaText: { fontSize: 18, fontWeight: '800', color: '#000' },
  changePhoto: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  changePhotoText: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },

  pickIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderWidth: 2, borderColor: 'rgba(212,175,55,0.3)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 24,
  },
  pickTitle: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 10 },
  pickSub: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 21, marginBottom: 36 },
  pickBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  pickBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, gap: 10,
  },
  pickBtnText: { fontSize: 17, fontWeight: '800', color: '#000' },
  pickBtnOutline: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 16,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
    gap: 10,
  },
  pickBtnOutlineText: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },

  // Analysing
  analyzingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 8 },
  analysingThumb: {
    width: 120, height: 90, borderRadius: 14,
    marginBottom: 24, opacity: 0.7,
  },
  analyzingLabel: { fontSize: 20, fontWeight: '800', color: '#fff' },
  analyzingSubLabel: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 8 },
  timeoutLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 8 },
  retryBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 12, backgroundColor: 'rgba(212,175,55,0.1)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)' },
  retryBtnText: { fontSize: 15, fontWeight: '700', color: ACCENT },
  serviceUnavailableBox: { alignItems: 'center', gap: 10, marginTop: 20 },
  serviceUnavailableText: { fontSize: 15, color: '#f59e0b', fontWeight: '600', textAlign: 'center' },
  serviceUnavailableBtns: { flexDirection: 'row', gap: 12 },

  // Review
  reviewScroll: { flex: 1 },
  reviewContent: { padding: 20 },

  reviewPhotoRow: {
    flexDirection: 'row', gap: 14, alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 20,
  },
  reviewThumb: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#111' },
  reviewThumbFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1e' },
  reviewPhotoLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 },
  reviewDateLabel: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 6 },
  reviewItemCount: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reviewItemCountText: { fontSize: 13, color: ACCENT, fontWeight: '700' },

  sectionLabel: {
    fontSize: 10, fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.2, marginBottom: 12,
  },

  addFoodBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(212,175,55,0.3)',
    backgroundColor: 'rgba(212,175,55,0.06)',
    marginBottom: 20,
  },
  addFoodBtnText: { fontSize: 15, fontWeight: '700', color: ACCENT },

  totalsCard: {
    backgroundColor: '#18181B',
    borderRadius: 18, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 18, marginBottom: 20,
  },
  totalsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  totalsTitle: { fontSize: 14, fontWeight: '800', color: '#fff' },
  totalsGrid: { flexDirection: 'row', gap: 10 },
  totalCell: {
    flex: 1, borderRadius: 12, paddingVertical: 12,
    alignItems: 'center', gap: 3,
  },
  totalCellVal: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  totalCellLbl: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.3 },

  addToDayBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 10 },
  addToDayGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, gap: 10,
  },
  addToDayText: { fontSize: 17, fontWeight: '900', color: '#000' },

  cancelBtn: { alignItems: 'center', paddingVertical: 14 },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
});
