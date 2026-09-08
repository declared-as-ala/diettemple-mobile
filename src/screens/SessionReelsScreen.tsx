import { BRAND_YELLOW } from '../constants/brand';
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  AppState,
  AppStateStatus,
  ScrollView,
  ActivityIndicator,
  Animated,
  Alert,
  TextInput,
  Keyboard,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList, type VideoSourceType } from '../types';
import { resolveVideoUrl } from '../config/api.config';
import RestTimer from '../components/RestTimer';
import ReelsVideoPlayer, { type ReelsVideoPlayerHandle } from '../components/workout/ReelsVideoPlayer';
import { isPictureInPictureSupported } from 'expo-video';
import { useActiveWorkoutPersistStore } from '../store/activeWorkoutPersistStore';
import AlternativeBottomSheet, { AlternativeOption } from '../components/workout/AlternativeBottomSheet';
import SetRunnerOverlay from '../components/workout/SetRunnerOverlay';
import { workoutProgressStorage, type SetLog } from '../services/workoutProgressStorage';
import { workoutService } from '../services/workoutService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWorkoutProgress } from '../hooks/useWorkoutProgress';
import { useWorkoutCompletionSound } from '../hooks/useWorkoutCompletionSound';
import { usePreventScreenCapture } from '../hooks/usePreventScreenCapture';
type SessionReelsRouteProp = RouteProp<RootStackParamList, 'SessionReels'>;
type SessionReelsNavProp = StackNavigationProp<RootStackParamList, 'SessionReels'>;

const { width, height } = Dimensions.get('window');
const ACCENT = BRAND_YELLOW;
const ACCENT_DIM = 'rgba(212,175,55,0.15)';
const REELS_SOUND_MUTED_PREF_KEY = 'diettemple_reels_sound_muted_pref_v1';
const MIN_REST_SECONDS = 90; // 1 min 30 sec

type SessionItem = {
  exerciseId: {
    _id: string;
    name: string;
    muscleGroup?: string;
    equipment?: string;
    videoUrl?: string;
    description?: string;
    videoSource?: VideoSourceType;
  };
  alternatives?: AlternativeOption[];
  sets?: number;
  reps?: string | number | { min?: number; max?: number };
  restSeconds?: number;
  order?: number;
};

function resolveExerciseId(exerciseRef: any): string | undefined {
  if (!exerciseRef) return undefined;
  if (typeof exerciseRef === 'string') return exerciseRef;
  if (typeof exerciseRef._id === 'string') return exerciseRef._id;
  if (typeof exerciseRef.id === 'string') return exerciseRef.id;
  if (exerciseRef.exerciseId) return resolveExerciseId(exerciseRef.exerciseId);
  return undefined;
}

function formatReps(reps: string | number | { min?: number; max?: number } | undefined): string {
  if (reps == null) return '10';
  if (typeof reps === 'string') return reps;
  if (typeof reps === 'number') return String(reps);
  if (typeof reps === 'object' && reps !== null && ('min' in reps || 'max' in reps)) {
    const min = reps.min ?? reps.max;
    const max = reps.max ?? reps.min;
    if (min != null && max != null && min !== max) return `${min}–${max}`;
    if (min != null) return String(min);
    if (max != null) return String(max);
  }
  return '10';
}

function getTargetRepsRange(reps: string | number | { min?: number; max?: number } | undefined): { min: number; max: number } {
  if (reps != null && typeof reps === 'object' && 'min' in reps && 'max' in reps) {
    return { min: reps.min ?? 8, max: reps.max ?? 12 };
  }
  return { min: 8, max: 12 };
}

import { getLocalDateKey } from '../utils/date';
import { hydrateGymCheckinStore, useGymCheckinStore } from '../store/gymCheckinStore';

type GymGateState = 'loading' | 'ready' | 'needVerification';

// ── Speed bottom sheet component ───────────────────────────────────────────────

function SpeedBottomSheet({
  visible,
  currentSpeed,
  onSelect,
  onClose,
}: {
  visible: boolean;
  currentSpeed: number;
  onSelect: (speed: number) => void;
  onClose: () => void;
}) {
  if (!visible) return null;
  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={sbm.backdrop} onPress={onClose}>
        <Pressable style={sbm.sheet} onPress={(e) => e.stopPropagation()}>
          <LinearGradient colors={['#181818', '#0e0e0e']} style={StyleSheet.absoluteFill} />
          <View style={sbm.header}>
            <View style={sbm.headerLeft}>
              <View style={sbm.headerIconWrap}>
                <Ionicons name="speedometer-outline" size={18} color={ACCENT} />
              </View>
              <Text style={sbm.title}>Vitesse de lecture</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={sbm.closeBtn} hitSlop={10}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
          <View style={sbm.options}>
            {speeds.map((spd) => {
              const isSelected = Math.abs(spd - currentSpeed) < 0.01;
              return (
                <TouchableOpacity
                  key={spd}
                  style={[sbm.option, isSelected && sbm.optionSelected]}
                  onPress={() => {
                    onSelect(spd);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[sbm.optionText, isSelected && sbm.optionTextSelected]}>
                    {spd}x {spd === 1.0 ? '(Normal)' : ''}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={ACCENT} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── History panel component ───────────────────────────────────────────────────

function HistoryPanel({
  history,
  exerciseName,
  totalSets,
  currentLogs,
  onChangeSetReps,
  onChangeSetWeight,
  onSaveCurrent,
  savingCurrent,
  onBackToReel,
}: {
  history: {
    lastWeight: number;
    personalRecord?: number;
    lastReps: number[];
    lastSets: any[];
    lastCompletedAt?: string;
  } | undefined;
  exerciseName: string;
  totalSets: number;
  currentLogs: SetLog[];
  onChangeSetReps: (setIdx: number, value: string) => void;
  onChangeSetWeight: (setIdx: number, value: string) => void;
  onSaveCurrent: () => void;
  savingCurrent: boolean;
  onBackToReel?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const displaySets = Math.max(3, totalSets);
  const hasPrevious = !!history && ((history.lastSets?.length ?? 0) > 0 || (history.lastReps?.length ?? 0) > 0);
  const prValue = history?.personalRecord && history.personalRecord > 0 ? history.personalRecord : null;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleInputFocus = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, []);

  return (
    <View style={hp.container}>
      <LinearGradient colors={['#0a0a0a', '#121212']} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[
            hp.scrollContent,
            {
              paddingTop: Math.max(insets.top + 16, 58),
              paddingBottom: keyboardHeight > 0
                ? keyboardHeight + 120
                : Math.max(insets.bottom, 20) + 70,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={hp.header}>
            <View style={hp.headerIconWrap}>
              <Ionicons name="time-outline" size={20} color={ACCENT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={hp.headerTitle}>Historique & PR</Text>
              <Text style={hp.headerSub} numberOfLines={1}>{exerciseName}</Text>
            </View>
            {onBackToReel && (
              <TouchableOpacity onPress={onBackToReel} style={hp.backToReelBtn} activeOpacity={0.75}>
                <Ionicons name="videocam-outline" size={15} color={ACCENT} />
                <Text style={hp.backToReelText}>Vidéo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* PR Card / Banner */}
          <View style={hp.prCard}>
            <LinearGradient
              colors={['rgba(212,175,55,0.18)', 'rgba(212,175,55,0.04)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={hp.prCardLeft}>
              <View style={hp.prIconCircle}>
                <Ionicons name="trophy" size={20} color="#000" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={hp.prCardLabel}>RECORD PERSONNEL (PR)</Text>
                <Text style={hp.prCardValue}>
                  {prValue != null ? `PR 🏆 ${prValue} kg` : 'PR —'}
                </Text>
              </View>
            </View>
            {history?.lastCompletedAt && (
              <View style={hp.prCardRight}>
                <Ionicons name="calendar-outline" size={12} color={ACCENT} />
                <Text style={hp.prCardDate}>{history.lastCompletedAt}</Text>
              </View>
            )}
          </View>

          {/* Previous session history */}
          {hasPrevious ? (
            <View style={hp.compareSection}>
              <View style={hp.sectionHeaderRow}>
                <Text style={hp.sectionTitle}>SÉANCE PRÉCÉDENTE</Text>
                {history.lastCompletedAt && (
                  <Text style={hp.sectionSubDate}>{history.lastCompletedAt}</Text>
                )}
              </View>

              <View style={hp.tableHeader}>
                <Text style={[hp.tableHeadCol, hp.colSet]}>Série</Text>
                <Text style={[hp.tableHeadCol, hp.colVal]}>Reps</Text>
                <Text style={[hp.tableHeadCol, hp.colVal]}>Poids</Text>
              </View>

              {Array.from({ length: displaySets }).map((_, i) => {
                const prevSet = history?.lastSets?.[i];
                const prevReps = prevSet?.repsCompleted ?? prevSet?.reps ?? history?.lastReps?.[i] ?? null;
                const prevWeight = prevSet?.weight ?? prevSet?.weightKg ?? null;
                return (
                  <View key={`prev-${i}`} style={hp.compareRow}>
                    <Text style={[hp.compareSetLabel, hp.colSet]}>Série {i + 1}</Text>
                    <Text style={[hp.compareValue, hp.colVal]}>
                      {prevReps != null ? `${prevReps} reps` : '—'}
                    </Text>
                    <Text style={[hp.compareWeightValue, hp.colVal]}>
                      {prevWeight != null ? `${prevWeight} kg` : '—'}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={hp.empty}>
              <View style={hp.emptyIcon}>
                <Ionicons name="barbell-outline" size={26} color="rgba(255,255,255,0.2)" />
              </View>
              <Text style={hp.emptyTitle}>Aucun historique précédent</Text>
              <Text style={hp.emptyText}>Enregistre tes séries actuelles pour établir ton premier PR.</Text>
            </View>
          )}

          {/* Current session input */}
          <View style={hp.compareSection}>
            <View style={hp.sectionHeaderRow}>
              <Text style={hp.sectionTitle}>SÉANCE ACTUELLE</Text>
              {keyboardHeight > 0 && (
                <TouchableOpacity onPress={Keyboard.dismiss} activeOpacity={0.7} style={hp.dismissHeaderBtn}>
                  <Text style={hp.dismissHeaderText}>Fermer le clavier</Text>
                  <Ionicons name="chevron-down" size={13} color={ACCENT} />
                </TouchableOpacity>
              )}
            </View>
            <View style={hp.tableHeader}>
              <Text style={[hp.tableHeadCol, hp.colSet]}>Série</Text>
              <Text style={[hp.tableHeadCol, hp.colInput]}>Répétitions</Text>
              <Text style={[hp.tableHeadCol, hp.colInput]}>Poids (kg)</Text>
            </View>

            {Array.from({ length: displaySets }).map((_, i) => {
              const log = currentLogs[i] ?? { completed: false };
              return (
                <View key={`cur-${i}`} style={hp.currentInputRow}>
                  <Text style={[hp.compareSetLabel, hp.colSet]}>Série {i + 1}</Text>
                  <View style={[hp.inputWrap, hp.colInput]}>
                    <TextInput
                      value={log.reps != null ? String(log.reps) : ''}
                      onChangeText={(v) => onChangeSetReps(i, v)}
                      onFocus={handleInputFocus}
                      placeholder="Reps"
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      keyboardType="number-pad"
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                      style={hp.input}
                    />
                  </View>
                  <View style={[hp.inputWrap, hp.colInput]}>
                    <TextInput
                      value={log.weightKg != null ? String(log.weightKg) : ''}
                      onChangeText={(v) => onChangeSetWeight(i, v)}
                      onFocus={handleInputFocus}
                      placeholder="Kg"
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                      style={hp.input}
                    />
                  </View>
                </View>
              );
            })}

            <TouchableOpacity
              style={[hp.saveBtn, savingCurrent && { opacity: 0.6 }]}
              onPress={onSaveCurrent}
              disabled={savingCurrent}
              activeOpacity={0.85}
            >
              {savingCurrent ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <View style={hp.saveBtnContent}>
                  <Ionicons name="checkmark-done" size={18} color="#000" />
                  <Text style={hp.saveBtnText}>Enregistrer l'historique</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Swipe hint component ──────────────────────────────────────────────────────

function SwipeHint() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 8, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return (
    <Animated.View style={[sh.wrap, { transform: [{ translateX: anim }] }]}>
      <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.5)" />
      <Text style={sh.text}>Historique</Text>
    </Animated.View>
  );
}

// ── Session complete overlay ───────────────────────────────────────────────────

function SessionCompleteOverlay({ totalExercises, onNavigate }: { totalExercises: number; onNavigate: () => void }) {
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  return (
    <View style={sc.overlay}>
      <LinearGradient colors={['rgba(0,0,0,0.92)', '#000']} style={StyleSheet.absoluteFill} />
      <Animated.View style={[sc.card, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
        <LinearGradient
          colors={['rgba(212,175,55,0.12)', 'rgba(0,0,0,0)']}
          style={sc.cardGradient}
        />
        <View style={sc.trophyWrap}>
          <LinearGradient colors={[ACCENT, '#B8942E']} style={sc.trophyCircle}>
            <Ionicons name="trophy" size={36} color="#000" />
          </LinearGradient>
        </View>
        <Text style={sc.title}>Séance terminée !</Text>
        <Text style={sc.subtitle}>Excellent travail. Tu viens de compléter {totalExercises} exercice{totalExercises !== 1 ? 's' : ''}.</Text>
        <View style={sc.statsRow}>
          <View style={sc.stat}>
            <Ionicons name="barbell-outline" size={18} color={ACCENT} />
            <Text style={sc.statVal}>{totalExercises}</Text>
            <Text style={sc.statLbl}>Exercices</Text>
          </View>
          <View style={sc.statDivider} />
          <View style={sc.stat}>
            <Ionicons name="flame-outline" size={18} color={ACCENT} />
            <Text style={sc.statVal}>100%</Text>
            <Text style={sc.statLbl}>Complétée</Text>
          </View>
        </View>
        <TouchableOpacity style={sc.cta} onPress={onNavigate} activeOpacity={0.85}>
          <LinearGradient colors={[ACCENT, '#B8942E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={sc.ctaGrad}>
            <Text style={sc.ctaText}>Voir le résumé</Text>
            <Ionicons name="arrow-forward" size={18} color="#000" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SessionReelsScreen() {
  const route = useRoute<SessionReelsRouteProp>();
  const navigation = useNavigation<SessionReelsNavProp>();
  const { colors } = useTheme();
  const { sessionTemplateId, session, resumeFromStorage } = route.params;
  const ensureGymVerified = useGymCheckinStore((s) => s.ensureGymVerified);
  /** Subscribe so gate updates when hydrate/sync sets verification for today. */
  const gymVerifiedDateKey = useGymCheckinStore((s) => s.verifiedDateKey);
  const [gymGate, setGymGate] = useState<GymGateState>('loading');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        await hydrateGymCheckinStore();
        if (cancelled) return;
        const dk = getLocalDateKey(new Date());
        if (useGymCheckinStore.getState().isGymVerifiedToday(dk)) {
          setGymGate('ready');
          return;
        }
        setGymGate('loading');
        const ok = await ensureGymVerified(dk);
        if (cancelled) return;
        if (ok) {
          setGymGate('ready');
          return;
        }
        setGymGate('needVerification');
        navigation.replace('GymVerification', { sessionId: sessionTemplateId });
      })();
      return () => {
        cancelled = true;
      };
    }, [sessionTemplateId, ensureGymVerified, navigation, gymVerifiedDateKey])
  );

  const sessionStartTime = useRef<number>(Date.now());
  const [items, setItems] = useState<SessionItem[]>(session?.items || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [unlockedIndex, setUnlockedIndex] = useState(0);
  const [setLogs, setSetLogs] = useState<Record<number, SetLog[]>>({});
  const [restVisible, setRestVisible] = useState(false);
  const [restSeconds, setRestSeconds] = useState(MIN_REST_SECONDS);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [isReelSoundMuted, setIsReelSoundMuted] = useState(false);
  const [isSoundLoaded, setIsSoundLoaded] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [speedModalVisible, setSpeedModalVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [videoErrors, setVideoErrors] = useState<Record<number, boolean>>({});
  const [setRunnerVisible, setSetRunnerVisible] = useState(false);
  const [runnerSetIndex, setRunnerSetIndex] = useState(0);
  const [recommendedWeightForNextSet, setRecommendedWeightForNextSet] = useState<number | undefined>(undefined);
  const [exerciseHistories, setExerciseHistories] = useState<
    Record<
      string,
      {
        lastWeight: number;
        personalRecord?: number;
        lastReps: number[];
        lastSets: any[];
        lastCompletedAt?: string;
      }
    >
  >({});
  const [sessionComplete, setSessionComplete] = useState(false);
  const [pendingNavParams, setPendingNavParams] = useState<any>(null);
  const [savingCurrentByExercise, setSavingCurrentByExercise] = useState<Record<string, boolean>>({});
  const [savingSet, setSavingSet] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const isAdvancingRef = useRef(false);
  const originalSlots = useRef<Record<number, { primary: any; alternatives: any[] }>>({});
  const fetchedHistoryIds = useRef<Set<string>>(new Set());
  /**
   * Map of exercise index -> inner horizontal ScrollView ref (page 0 = video, page 1 = history).
   * Used by the post-save auto-slide animation: save → slide right to History → 1 s → slide back.
   */
  const horizontalScrollRefs = useRef<Record<number, ScrollView | null>>({});
  /** Outstanding `setTimeout` ids for the slide-back step, cleared on unmount or new save. */
  const slideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeVideoRef = useRef<ReelsVideoPlayerHandle>(null);
  const positionSecondsRef = useRef(0);
  const resumeIndexRef = useRef<number | null>(null);
  const [resumeSeekSeconds, setResumeSeekSeconds] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const allowNavigationWithoutConfirm = useRef(false);
  const pipSupported = isPictureInPictureSupported();
  const { maxUnlockedIndex } = useWorkoutProgress(items, setLogs, unlockedIndex);
  const { play: playCompletionSound } = useWorkoutCompletionSound(require('../../assets/sound_workout.mp3'));
  usePreventScreenCapture(true);

  // Initialize original slots for alternative swapping so user can return to primary or any alternative
  useEffect(() => {
    if (session?.items?.length) {
      session.items.forEach((it, idx) => {
        if (!originalSlots.current[idx]) {
          originalSlots.current[idx] = {
            primary: it.exerciseId,
            alternatives: (it.alternatives || []).map((a: any) => ({
              _id: typeof a === 'object' && a?._id ? String(a._id) : String(a),
              name: a?.name ?? '',
              muscleGroup: a?.muscleGroup,
              equipment: a?.equipment,
              videoUrl: a?.videoUrl,
            })),
          };
        }
      });
    }
  }, [session]);

  const fetchHistoryForExercise = useCallback(async (exerciseId: string, force = false) => {
    if (!exerciseId) return;
    if (!force && fetchedHistoryIds.current.has(exerciseId)) return;
    fetchedHistoryIds.current.add(exerciseId);
    try {
      const res = await workoutService.getExerciseHistory(exerciseId);
      const h = res.history;
      if (h) {
        const pr = h.personalRecord && h.personalRecord > 0
          ? h.personalRecord
          : Math.max(h.lastWeight ?? 0, ...(h.lastSets || []).map((s: any) => Number(s.weight ?? 0)));
        setExerciseHistories((prev) => ({
          ...prev,
          [exerciseId]: {
            lastWeight: h.lastWeight ?? 0,
            personalRecord: pr,
            lastReps: h.lastReps ?? [],
            lastSets: h.lastSets ?? [],
            lastCompletedAt: h.lastCompletedAt ? new Date(h.lastCompletedAt).toLocaleDateString('fr-FR') : undefined,
          },
        }));
      }
    } catch (_) {
      fetchedHistoryIds.current.delete(exerciseId);
    }
  }, []);

  const setPipActive = useActiveWorkoutPersistStore((s) => s.setPipActive);
  const queuePersist = useActiveWorkoutPersistStore((s) => s.queuePersist);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const storedMutedPref = await AsyncStorage.getItem(REELS_SOUND_MUTED_PREF_KEY);
        if (cancelled) return;
        if (storedMutedPref === '1') {
          setIsReelSoundMuted(true);
        } else {
          // Unmuted by default so audio always works unless user explicitly muted
          setIsReelSoundMuted(false);
        }
        setIsSoundLoaded(true);
      } catch {
        if (!cancelled) {
          setIsReelSoundMuted(false);
          setIsSoundLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') return;
      if (useActiveWorkoutPersistStore.getState().pipActive) return;
      setIsPaused(true);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (sessionComplete || allowNavigationWithoutConfirm.current) return;
      e.preventDefault();
      Alert.alert(
        'Quitter la séance ?',
        'Ta progression est enregistrée localement. Tu pourras reprendre depuis l’accueil.',
        [
          { text: 'Rester', style: 'cancel' },
          {
            text: 'Quitter',
            style: 'destructive',
            onPress: () => {
              void useActiveWorkoutPersistStore.getState().flushPersist();
              allowNavigationWithoutConfirm.current = true;
              navigation.dispatch(e.data.action);
              setTimeout(() => {
                allowNavigationWithoutConfirm.current = false;
              }, 500);
            },
          },
        ]
      );
    });
    return unsub;
  }, [navigation, sessionComplete]);

  useEffect(() => {
    if (!resumeFromStorage || gymGate !== 'ready') return;
    let cancelled = false;
    (async () => {
      const d = await useActiveWorkoutPersistStore.getState().hydrate();
      if (cancelled || !d || d.sessionTemplateId !== sessionTemplateId) return;
      const safeIndex = Math.max(0, Math.min(d.currentIndex, maxUnlockedIndex));
      resumeIndexRef.current = safeIndex;
      setResumeSeekSeconds(d.positionSeconds);
      setCurrentIndex(safeIndex);
      if (d.setLogs && typeof d.setLogs === 'object') setSetLogs(d.setLogs);
      setIsPaused(d.isPaused);
      positionSecondsRef.current = d.positionSeconds;
      requestAnimationFrame(() => {
        try {
          flatListRef.current?.scrollToIndex({ index: safeIndex, animated: false });
        } catch {
          /* list may not be laid out yet */
        }
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [resumeFromStorage, gymGate, sessionTemplateId, maxUnlockedIndex]);

  useEffect(() => {
    if (gymGate !== 'ready' || items.length === 0 || sessionComplete) return;
    queuePersist({
      v: 1,
      sessionTemplateId,
      session: {
        _id: session._id,
        title: session.title,
        durationMinutes: session.durationMinutes,
        difficulty: session.difficulty,
        items: items.map((it) => ({
          exerciseId: {
            _id: it.exerciseId._id,
            name: it.exerciseId.name,
            muscleGroup: it.exerciseId.muscleGroup,
            equipment: it.exerciseId.equipment,
            videoUrl: it.exerciseId.videoUrl,
            description: it.exerciseId.description,
            videoSource: it.exerciseId.videoSource,
          },
          alternatives: it.alternatives,
          sets: it.sets,
          reps: typeof it.reps === 'string' ? it.reps : formatReps(it.reps),
          restSeconds: it.restSeconds,
          order: it.order,
        })),
      },
      currentIndex,
      positionSeconds: positionSecondsRef.current,
      isPaused,
      setLogs,
      updatedAt: Date.now(),
    });
  }, [gymGate, sessionComplete, sessionTemplateId, session, items, currentIndex, isPaused, setLogs, queuePersist]);

  useEffect(() => {
    if (resumeFromStorage) {
      setUnlockedIndex((prev) => Math.max(prev, currentIndex));
      return;
    }
    let cancelled = false;
    (async () => {
      const date = getLocalDateKey(new Date());
      const progress = await workoutProgressStorage.get(date);
      if (!cancelled && progress?.sets) {
        const raw = progress.sets as Record<number, SetLog[]>;
        const normalized: Record<number, SetLog[]> = {};
        let maxWithSets = 0;
        Object.keys(raw).forEach((k) => {
          const idx = Number(k);
          const arr = raw[idx] ?? [];
          const normArr = arr.map((s) => (s && typeof s === 'object' ? s : { completed: false }));
          normalized[idx] = normArr;
          if (normArr.some((s) => s?.completed)) {
            maxWithSets = Math.max(maxWithSets, idx + 1);
          }
        });
        setSetLogs(normalized);
        setUnlockedIndex((prev) => Math.max(prev, maxWithSets));
      }
    })();
    return () => { cancelled = true; };
  }, [resumeFromStorage, currentIndex]);

  useEffect(() => { setRecommendedWeightForNextSet(undefined); }, [currentIndex]);

  useEffect(() => {
    if (currentIndex <= maxUnlockedIndex) return;
    setCurrentIndex(maxUnlockedIndex);
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToIndex({ index: maxUnlockedIndex, animated: true });
    });
  }, [currentIndex, maxUnlockedIndex]);

  // Pre-fetch history for active exercise
  useEffect(() => {
    const exId = resolveExerciseId(items[currentIndex]?.exerciseId);
    if (exId) void fetchHistoryForExercise(exId);
  }, [currentIndex, items, fetchHistoryForExercise]);

  // Comprehensive pre-fetch: pre-fetch history for ALL primary and alternative exercises in the session
  useEffect(() => {
    const ids = new Set<string>();
    items.forEach((it) => {
      const primId = resolveExerciseId(it.exerciseId);
      if (primId) ids.add(primId);
      (it.alternatives || []).forEach((alt: any) => {
        const altId = resolveExerciseId(alt);
        if (altId) ids.add(altId);
      });
    });
    Object.values(originalSlots.current).forEach((slot) => {
      const primId = resolveExerciseId(slot.primary);
      if (primId) ids.add(primId);
      (slot.alternatives || []).forEach((alt: any) => {
        const altId = resolveExerciseId(alt);
        if (altId) ids.add(altId);
      });
    });
    ids.forEach((id) => {
      void fetchHistoryForExercise(id);
    });
  }, [items, fetchHistoryForExercise]);

  const currentItem = items[currentIndex];
  const exercise = currentItem?.exerciseId;
  const sets = currentItem?.sets ?? 3;
  const reps = formatReps(currentItem?.reps);
  const restSec = Math.max(currentItem?.restSeconds ?? MIN_REST_SECONDS, MIN_REST_SECONDS);
  const logsForExercise = setLogs[currentIndex] ?? Array.from({ length: sets }, () => ({ completed: false }));
  const doneForExercise = logsForExercise.filter((s) => s?.completed).length;
  const allSetsDone = doneForExercise >= sets;

  // Options available for the current slot (primary + alternatives, excluding currently selected)
  const currentSlotAlternatives = useMemo(() => {
    const slot = originalSlots.current[currentIndex];
    const currentExId = resolveExerciseId(items[currentIndex]?.exerciseId);
    const primaryId = resolveExerciseId(slot?.primary ?? currentItem?.exerciseId);

    if (!slot) {
      return (currentItem?.alternatives ?? []).map((a: any) => ({
        _id: typeof a === 'object' && a?._id ? String(a._id) : String(a),
        name: a?.name ?? '',
        muscleGroup: a?.muscleGroup,
        equipment: a?.equipment,
        videoUrl: a?.videoUrl,
        isPrimary: false,
      }));
    }

    const allOptions: AlternativeOption[] = [
      {
        _id: resolveExerciseId(slot.primary) || '',
        name: slot.primary?.name ?? '',
        muscleGroup: slot.primary?.muscleGroup,
        equipment: slot.primary?.equipment,
        videoUrl: slot.primary?.videoUrl,
        isPrimary: true,
      },
      ...(slot.alternatives || []).map((a: any) => ({
        _id: typeof a === 'object' && a?._id ? String(a._id) : String(a),
        name: a?.name ?? '',
        muscleGroup: a?.muscleGroup,
        equipment: a?.equipment,
        videoUrl: a?.videoUrl,
        isPrimary: resolveExerciseId(a) === primaryId,
      })),
    ];

    // Exclude currently active exercise
    return allOptions.filter((opt) => opt._id && opt._id !== currentExId);
  }, [currentIndex, items, currentItem]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    const idx = viewableItems[0]?.index;
    if (idx == null) return;
    // Keep backward movement free; forward locking is enforced on momentum end.
    if (idx <= maxUnlockedIndex) setCurrentIndex(idx);
  }).current;
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 80 }).current;

  const handleMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIsAutoScrolling(false);
    const rawIndex = Math.round(e.nativeEvent.contentOffset.y / height);
    const safeIndex = Math.max(0, Math.min(rawIndex, items.length - 1));
    if (safeIndex > maxUnlockedIndex) {
      Toast.show({
        type: 'info',
        text1: 'Exercice verrouillé',
        text2: 'Termine cet exercice pour débloquer le suivant.',
      });
      flatListRef.current?.scrollToIndex({ index: maxUnlockedIndex, animated: true });
      setCurrentIndex(maxUnlockedIndex);
      return;
    }
    setCurrentIndex(safeIndex);
  }, [items.length, maxUnlockedIndex]);

  const updateSetLog = useCallback((exerciseIdx: number, setIdx: number, log: SetLog) => {
    setSetLogs((prev) => {
      const next = { ...prev };
      const numSets = items[exerciseIdx]?.sets ?? 3;
      const existing = next[exerciseIdx];
      const defaultArr = Array.from({ length: numSets }, () => ({ completed: false }));
      const arr = [...(existing ?? defaultArr)];
      arr[setIdx] = log;
      next[exerciseIdx] = arr;
      return next;
    });
  }, [items]);

  const updateCurrentInputLog = useCallback((exerciseIdx: number, setIdx: number, patch: Partial<SetLog>) => {
    setSetLogs((prev) => {
      const next = { ...prev };
      const numSets = items[exerciseIdx]?.sets ?? 3;
      const existing = next[exerciseIdx] ?? Array.from({ length: numSets }, () => ({ completed: false }));
      const arr = [...existing];
      arr[setIdx] = { ...arr[setIdx], ...patch };
      next[exerciseIdx] = arr;
      return next;
    });
  }, [items]);

  const parseNumericInput = useCallback((value: string): number | undefined => {
    const normalized = value.replace(',', '.').replace(/[^\d.]/g, '');
    if (!normalized) return undefined;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, []);

  const saveCurrentExerciseHistory = useCallback(async (exerciseIdx: number) => {
    const item = items[exerciseIdx];
    if (!item) return;
    const exerciseId = resolveExerciseId(item.exerciseId);
    if (!exerciseId) return;
    const logs = setLogs[exerciseIdx] ?? [];
    const enteredSets = logs
      .map((s, i) => ({ setNumber: i + 1, reps: s?.reps ?? 0, weightKg: s?.weightKg ?? 0 }))
      .filter((s) => s.reps > 0 || s.weightKg > 0);
    if (enteredSets.length === 0) {
      Toast.show({ type: 'info', text1: 'Aucune donnée', text2: 'Saisis au moins une série.' });
      return;
    }
    setSavingCurrentByExercise((p) => ({ ...p, [exerciseId]: true }));
    try {
      const currentHistory = exerciseHistories[exerciseId];
      const previousPR = currentHistory?.personalRecord ?? 0;
      const enteredMaxWeight = enteredSets.reduce((max, s) => Math.max(max, s.weightKg), 0);
      const isNewPR = enteredMaxWeight > previousPR && enteredMaxWeight > 0;
      const updatedPR = Math.max(previousPR, enteredMaxWeight);

      await workoutService.upsertExerciseHistory(exerciseId, enteredSets);
      await fetchHistoryForExercise(exerciseId, true);

      // Mark sets as completed in setLogs
      const targetSetsCount = item.sets ?? 3;
      setSetLogs((prev) => {
        const next = { ...prev };
        const existing = next[exerciseIdx] ?? Array.from({ length: targetSetsCount }, () => ({ completed: false }));
        next[exerciseIdx] = existing.map((s, i) => {
          const entered = enteredSets.find((es) => es.setNumber === i + 1);
          if (entered) {
            return { ...s, reps: entered.reps, weightKg: entered.weightKg, completed: true };
          }
          return s;
        });
        return next;
      });

      // Update optimistic exercise history
      setExerciseHistories((prev) => ({
        ...prev,
        [exerciseId]: {
          lastWeight: enteredMaxWeight,
          personalRecord: updatedPR,
          lastReps: enteredSets.map((s) => s.reps),
          lastSets: enteredSets.map((s) => ({
            setNumber: s.setNumber,
            weight: s.weightKg,
            repsCompleted: s.reps,
            completed: true,
          })),
          lastCompletedAt: new Date().toLocaleDateString('fr-FR'),
        },
      }));

      // Unlock next exercise if all target sets are completed
      if (enteredSets.length >= targetSetsCount && exerciseIdx < items.length - 1) {
        setUnlockedIndex((prev) => Math.max(prev, exerciseIdx + 1));
      }

      if (isNewPR) {
        Toast.show({
          type: 'success',
          text1: '🏆 Nouveau Record Personnel (PR) !',
          text2: `${item.exerciseId.name} : ${enteredMaxWeight} kg`,
          visibilityTime: 3500,
        });
      } else {
        Toast.show({ type: 'success', text1: 'Historique enregistré' });
      }
    } catch {
      Toast.show({ type: 'error', text1: "Échec d'enregistrement" });
    } finally {
      setSavingCurrentByExercise((p) => ({ ...p, [exerciseId]: false }));
    }
  }, [items, setLogs, fetchHistoryForExercise, exerciseHistories]);

  /**
   * Persist a finished set. UX flow:
   *   1. dismiss the keyboard so the auto-slide animation is clean
   *   2. POST to /me/workout/exercise-history/upsert (disable Save button while in flight)
   *   3. on failure → toast and stop (user stays on the video page, runner stays open so they can retry)
   *   4. on success → update local state + storage, close runner
   *   5. slide horizontally to the History page (right) so the user immediately sees their new set
   *   6. after ~1 s, slide back to the video page
   *   7. if it was the last set of the exercise, unlock next exercise, play completion sound, and start rest timer
   */
  const handleSetRunnerFinishSet = useCallback(
    async (weightKg: number | undefined, reps: number, durationSeconds: number, recommendedNextKg?: number) => {
      const setIdx = runnerSetIndex;
      const log: SetLog = { weightKg, reps, completed: true, durationSeconds };
      const resolvedExerciseId = resolveExerciseId(items[currentIndex]?.exerciseId);
      const existingLogs = setLogs[currentIndex] ?? Array.from({ length: sets }, () => ({ completed: false }));
      const updatedLogs = [...existingLogs];
      updatedLogs[setIdx] = log;
      const isLastSet = setIdx >= sets - 1;

      Keyboard.dismiss();
      setSavingSet(true);

      if (resolvedExerciseId) {
        const completedLogs = updatedLogs.filter((s) => s?.completed);
        try {
          await workoutService.upsertExerciseHistory(
            resolvedExerciseId,
            completedLogs.map((s, i) => ({
              setNumber: i + 1,
              reps: s.reps ?? 0,
              weightKg: s.weightKg ?? 0,
              completedAt: new Date().toISOString(),
            }))
          );
        } catch (err) {
          if (__DEV__) console.warn('upsertExerciseHistory failed:', err);
          setSavingSet(false);
          Toast.show({
            type: 'error',
            text1: "Échec d'enregistrement",
            text2: 'Vérifie ta connexion et réessaie.',
          });
          return;
        }

        // Optimistic history update & check for new PR
        const currentHist = exerciseHistories[resolvedExerciseId];
        const previousPR = currentHist?.personalRecord ?? 0;
        const weightNum = Number(weightKg ?? 0);
        const lastWeight = completedLogs.reduce((max, s) => Math.max(max, s.weightKg ?? 0), 0);
        const isNewPR = weightNum > previousPR && weightNum > 0;
        const updatedPR = Math.max(previousPR, weightNum);

        setExerciseHistories((prev) => ({
          ...prev,
          [resolvedExerciseId]: {
            lastWeight,
            personalRecord: updatedPR,
            lastReps: completedLogs.map((s) => s.reps ?? 0),
            lastSets: completedLogs.map((s, i) => ({
              setNumber: i + 1,
              weight: s.weightKg ?? 0,
              repsCompleted: s.reps ?? 0,
              completed: true,
            })),
            lastCompletedAt: new Date().toLocaleDateString('fr-FR'),
          },
        }));

        if (isNewPR) {
          Toast.show({
            type: 'success',
            text1: '🏆 Nouveau Record Personnel (PR) !',
            text2: `${items[currentIndex]?.exerciseId?.name ?? 'Exercice'} : ${weightNum} kg`,
            visibilityTime: 3500,
          });
        }
      }

      updateSetLog(currentIndex, setIdx, log);
      const date = getLocalDateKey(new Date());
      await workoutProgressStorage.recordSet(date, sessionTemplateId, currentIndex, setIdx, log);
      setRecommendedWeightForNextSet(recommendedNextKg);
      setSavingSet(false);

      // Close the runner so the auto-slide is unobstructed; the rest timer (if any) will appear on top.
      setSetRunnerVisible(false);

      // Slide right to History to show the freshly saved set, then back to the video.
      if (slideTimeoutRef.current) clearTimeout(slideTimeoutRef.current);
      const ref = horizontalScrollRefs.current[currentIndex];
      ref?.scrollTo({ x: width, y: 0, animated: true });
      slideTimeoutRef.current = setTimeout(() => {
        const r = horizontalScrollRefs.current[currentIndex];
        r?.scrollTo({ x: 0, y: 0, animated: true });
        slideTimeoutRef.current = null;
      }, 1000);

      if (isLastSet) {
        void playCompletionSound();
        // Atomically unlock next exercise
        if (currentIndex < items.length - 1) {
          setUnlockedIndex((prev) => Math.max(prev, currentIndex + 1));
        }
        setRestSeconds(Math.max(restSec, MIN_REST_SECONDS));
        setRestVisible(true);
      } else {
        setRunnerSetIndex(setIdx + 1);
      }
    },
    [currentIndex, items, runnerSetIndex, setLogs, sets, restSec, sessionTemplateId, updateSetLog, playCompletionSound, exerciseHistories]
  );

  /** Cleanup the auto-slide timer on unmount so we never call scrollTo on a stale ref. */
  useEffect(() => {
    return () => {
      if (slideTimeoutRef.current) {
        clearTimeout(slideTimeoutRef.current);
        slideTimeoutRef.current = null;
      }
    };
  }, []);

  const handleSetRunnerExerciseComplete = useCallback(() => {
    // The exercise completion transition is handled after the final set save.
  }, []);

  const openSetRunner = useCallback(() => {
    const logs = setLogs[currentIndex] ?? Array.from({ length: sets }, () => ({ completed: false }));
    const firstIncomplete = logs.findIndex((s) => !s?.completed);
    setRunnerSetIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
    setSetRunnerVisible(true);
  }, [currentIndex, setLogs, sets]);

  const finalizeSession = useCallback(async () => {
    const durationSeconds = Math.round((Date.now() - sessionStartTime.current) / 1000);
    const exerciseLogs = items.map((item, idx) => {
      const logs = setLogs[idx] ?? [];
      const resolvedExerciseId = resolveExerciseId(item.exerciseId);
      return {
        exerciseId: resolvedExerciseId,
        exerciseName: item.exerciseId.name,
        sets: logs.filter((s) => s?.completed).map((s, i) => ({
          setNumber: i + 1, reps: s.reps ?? 0, weightKg: s.weightKg ?? 0, completedAt: new Date().toISOString(),
        })),
      };
    }).filter((ex): ex is { exerciseId: string; exerciseName: string; sets: { setNumber: number; reps: number; weightKg: number; completedAt: string }[] } => !!ex.exerciseId);

    let workoutSessionId = '';
    try {
      const result = await workoutService.completeSession({ sessionTemplateId, durationSeconds, exercises: exerciseLogs });
      workoutSessionId = result.sessionId ?? '';
    } catch (err) {
      console.error('completeSession failed:', err);
    }

    await workoutProgressStorage.markCompleted(getLocalDateKey(new Date()), sessionTemplateId);

    const completedCount = items.filter((_, idx) => {
      const logs = setLogs[idx] ?? [];
      return logs.some((s) => s?.completed);
    }).length;

    const ids = items
      .map((it) => resolveExerciseId(it.exerciseId))
      .filter((v): v is string => !!v);
    ids.forEach((id) => {
      void fetchHistoryForExercise(id, true);
    });

    await useActiveWorkoutPersistStore.getState().clearPersisted();
    setPendingNavParams({
      sessionId: sessionTemplateId,
      workoutSessionId,
      exercises: items.map((item) => ({ _id: item.exerciseId._id, name: item.exerciseId.name, muscleGroup: item.exerciseId.muscleGroup ?? '' })),
      completedExercises: completedCount,
    });
    setSessionComplete(true);
  }, [fetchHistoryForExercise, items, sessionTemplateId, setLogs]);

  const handleRestComplete = useCallback(async () => {
    if (isAdvancingRef.current) return;
    isAdvancingRef.current = true;
    setRestVisible(false);

    try {
      if (currentIndex < items.length - 1) {
        const nextIndex = currentIndex + 1;
        setUnlockedIndex((prev) => Math.max(prev, nextIndex));
        setCurrentIndex(nextIndex);
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        Toast.show({
          type: 'success',
          text1: 'Repos terminé',
          text2: 'Passage à l’exercice suivant.',
          visibilityTime: 1800,
        });
      } else {
        await finalizeSession();
      }
    } finally {
      setTimeout(() => {
        isAdvancingRef.current = false;
      }, 400);
    }
  }, [currentIndex, finalizeSession, items.length]);

  const handleSwapAlternative = useCallback((alt: AlternativeOption) => {
    setItems((prev) => {
      const next = [...prev];
      next[currentIndex] = { ...next[currentIndex], exerciseId: { _id: alt._id, name: alt.name, muscleGroup: alt.muscleGroup, equipment: alt.equipment, videoUrl: alt.videoUrl } };
      return next;
    });
    if (alt._id) {
      void fetchHistoryForExercise(alt._id, true);
    }
    setRecommendedWeightForNextSet(undefined);
    setRunnerSetIndex(0);
    setVideoErrors((prev) => ({ ...prev, [currentIndex]: false }));
    setShowAlternatives(false);
  }, [currentIndex, fetchHistoryForExercise]);

  const handleTapVideo = useCallback(() => {
    setIsPaused((p) => !p);
  }, []);

  const handleMutedToggle = useCallback(() => {
    setIsReelSoundMuted((m) => {
      const next = !m;
      void AsyncStorage.setItem(REELS_SOUND_MUTED_PREF_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  const renderItem = useCallback(({ item, index }: { item: SessionItem; index: number }) => {
    const ex = item.exerciseId;
    const isActive = index === currentIndex;
    const numSets = item.sets ?? 3;
    const logs = setLogs[index] ?? Array.from({ length: numSets }, () => ({ completed: false }));
    const doneCount = logs.filter((s) => s.completed).length;
    const hasStarted = doneCount > 0;
    const isExDone = doneCount >= numSets;
    const resolvedUri = resolveVideoUrl(ex.videoUrl);
    const hasVideo = (resolvedUri || ex.videoSource === 'youtube') && !videoErrors[index];
    const historyKey = resolveExerciseId(ex);
    const history = historyKey ? exerciseHistories[historyKey] : undefined;
    const savingCurrent = historyKey ? !!savingCurrentByExercise[historyKey] : false;

    return (
      <View style={styles.slide}>
        <ScrollView
          ref={(r) => {
            horizontalScrollRefs.current[index] = r;
          }}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ width: width * 2 }}
          scrollEventThrottle={16}
        >
          {/* ── Video / exercise page ─────────────────────────────────── */}
          <View style={[styles.slidePage, { width }]}>
            {hasVideo ? (
              isActive ? (
                <ReelsVideoPlayer
                  ref={activeVideoRef}
                  videoSource={ex.videoSource ?? (ex.videoUrl && /youtube\.com|youtu\.be/i.test(ex.videoUrl) ? 'youtube' : 'external')}
                  videoUrl={ex.videoUrl}
                  resolvedUri={resolvedUri ?? undefined}
                  isActive
                  isPaused={isPaused}
                  isMuted={isReelSoundMuted}
                  playbackRate={playbackSpeed}
                  onTap={handleTapVideo}
                  onMutedChange={(m) => {
                    setIsReelSoundMuted(m);
                    void AsyncStorage.setItem(REELS_SOUND_MUTED_PREF_KEY, m ? '1' : '0');
                  }}
                  onError={() => setVideoErrors((prev) => ({ ...prev, [index]: true }))}
                  initialPositionSeconds={
                    resumeIndexRef.current === index && resumeSeekSeconds > 0.05 ? resumeSeekSeconds : 0
                  }
                  onTimeUpdateSeconds={(sec) => {
                    positionSecondsRef.current = sec;
                  }}
                  onPipActiveChange={setPipActive}
                />
              ) : (
                <View style={styles.inactiveVideoShell} pointerEvents="none">
                  <LinearGradient colors={['#1a1a1a', '#0d0d0d']} style={StyleSheet.absoluteFill} />
                  <Ionicons name="pause-circle-outline" size={44} color="rgba(255,255,255,0.35)" />
                </View>
              )
            ) : (
              <View style={styles.placeholder}>
                <LinearGradient colors={['#1a1a1a', '#0d0d0d']} style={StyleSheet.absoluteFill} />
                <View style={styles.placeholderIcon}>
                  <Ionicons name="barbell-outline" size={52} color={ACCENT} />
                </View>
                <Text style={styles.placeholderName}>{ex.name}</Text>
                <Text style={styles.placeholderSub}>Aucune vidéo disponible</Text>
              </View>
            )}

            {/* Top gradient */}
            <LinearGradient
              colors={['rgba(0,0,0,0.7)', 'transparent']}
              style={styles.gradientTop}
              pointerEvents="none"
            />
            {/* Bottom gradient */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.92)']}
              style={styles.gradientBottom}
              pointerEvents="none"
            />

            {/* Top bar */}
            {isActive && (
              <View style={styles.topBar} pointerEvents="box-none">
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topBtn} hitSlop={12}>
                  <View style={styles.topBtnInner}>
                    <Ionicons name="chevron-back" size={22} color="#fff" />
                  </View>
                </TouchableOpacity>

                {/* Progress */}
                <View style={styles.progressWrap}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${((index + 1) / items.length) * 100}%` }]} />
                  </View>
                  <Text style={styles.progressLabel}>{index + 1} / {items.length}</Text>
                </View>

                {/* Speed button in top bar */}
                <TouchableOpacity
                  onPress={() => setSpeedModalVisible(true)}
                  style={styles.topBtn}
                  hitSlop={12}
                >
                  <View style={[styles.topBtnInner, styles.speedBtnInner]}>
                    <Text style={styles.speedBtnText}>{playbackSpeed}x</Text>
                  </View>
                </TouchableOpacity>

                {pipSupported && (
                  <TouchableOpacity
                    onPress={() => void activeVideoRef.current?.enterPictureInPicture()}
                    style={styles.topBtn}
                    hitSlop={12}
                  >
                    <View style={styles.topBtnInner}>
                      <Ionicons name="expand-outline" size={18} color="#fff" />
                    </View>
                  </TouchableOpacity>
                )}

                <TouchableOpacity onPress={handleMutedToggle} style={styles.topBtn} hitSlop={12}>
                  <View style={styles.topBtnInner}>
                    <Ionicons name={isReelSoundMuted ? 'volume-mute' : 'volume-high'} size={18} color="#fff" />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Swipe hint */}
            {isActive && (
              <View style={styles.swipeHintWrap} pointerEvents="none">
                <SwipeHint />
              </View>
            )}

            {/* Right action rail (TikTok/Instagram style) */}
            {isActive && (
              <View style={styles.rightRail}>
                <TouchableOpacity
                  style={styles.railBtn}
                  onPress={() => setSpeedModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="speedometer-outline" size={20} color={ACCENT} />
                  <Text style={[styles.railBtnLabel, { color: ACCENT }]}>{playbackSpeed}x</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.railBtn}
                  onPress={handleMutedToggle}
                  activeOpacity={0.85}
                >
                  <Ionicons name={isReelSoundMuted ? 'volume-mute' : 'volume-high'} size={20} color="#fff" />
                  <Text style={styles.railBtnLabel}>{isReelSoundMuted ? 'Unmute' : 'Mute'}</Text>
                </TouchableOpacity>

                {(item.alternatives?.length ?? 0) > 0 && (
                  <TouchableOpacity
                    style={styles.railBtn}
                    onPress={() => setShowAlternatives(true)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="swap-horizontal" size={20} color="#fff" />
                    <Text style={styles.railBtnLabel}>Alt</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.railBtn}
                  onPress={() => {
                    horizontalScrollRefs.current[index]?.scrollTo({ x: width, animated: true });
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="time-outline" size={20} color="#fff" />
                  <Text style={styles.railBtnLabel}>Hist.</Text>
                </TouchableOpacity>

                <View style={styles.railProgress}>
                  <Text style={styles.railProgressValue}>{doneCount}/{numSets}</Text>
                </View>
              </View>
            )}

            {/* Bottom overlay */}
            <View style={styles.bottomOverlay} pointerEvents="box-none">
              {/* Exercise name */}
              <Text style={styles.exerciseName} numberOfLines={2}>{ex.name}</Text>

              {/* Muscle + equipment badges */}
              <View style={styles.badges}>
                {ex.muscleGroup ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{ex.muscleGroup}</Text>
                  </View>
                ) : null}
                {ex.equipment ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{ex.equipment}</Text>
                  </View>
                ) : null}
              </View>

              {/* Sets progress */}
              <View style={styles.setsRow}>
                <View style={styles.setDots}>
                  {Array.from({ length: numSets }).map((_, si) => (
                    <View
                      key={si}
                      style={[
                        styles.setDot,
                        si < doneCount ? styles.setDotDone : styles.setDotPending,
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.setPill}>
                  <Ionicons name="repeat" size={11} color={ACCENT} />
                  <Text style={styles.setPillText}>{doneCount}/{numSets} séries</Text>
                </View>
              </View>

              {/* Action buttons */}
              {isActive && (
                <View style={styles.actionRow}>
                  {(item.alternatives?.length ?? 0) > 0 && (
                    <TouchableOpacity style={styles.altBtn} onPress={() => setShowAlternatives(true)} activeOpacity={0.8}>
                      <Ionicons name="swap-horizontal" size={16} color="#fff" />
                      <Text style={styles.altBtnText}>Alterner</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.mainCta, isExDone && styles.mainCtaDone]}
                    onPress={
                      isExDone && currentIndex < items.length - 1
                        ? () => {
                            const nextIndex = currentIndex + 1;
                            setUnlockedIndex((prev) => Math.max(prev, nextIndex));
                            setCurrentIndex(nextIndex);
                            flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
                          }
                        : isExDone && currentIndex === items.length - 1
                          ? finalizeSession
                          : openSetRunner
                    }
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={isExDone ? ['#22c55e', '#16a34a'] : [ACCENT, '#B8942E']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.mainCtaGrad}
                    >
                      <Ionicons
                        name={isExDone ? (currentIndex < items.length - 1 ? 'arrow-forward' : 'checkmark-circle') : (hasStarted ? 'play' : 'flash')}
                        size={18}
                        color="#000"
                      />
                      <Text style={styles.mainCtaText}>
                        {isExDone
                          ? (currentIndex < items.length - 1 ? 'Exercice suivant' : 'Terminer')
                          : hasStarted ? 'Continuer la série' : 'Démarrer'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* ── History panel ─────────────────────────────────────────── */}
          <HistoryPanel
            history={history}
            exerciseName={ex.name}
            totalSets={numSets}
            currentLogs={logs}
            onChangeSetReps={(setIdx, value) => {
              const reps = parseNumericInput(value);
              updateCurrentInputLog(index, setIdx, { reps });
            }}
            onChangeSetWeight={(setIdx, value) => {
              const weightKg = parseNumericInput(value);
              updateCurrentInputLog(index, setIdx, { weightKg });
            }}
            onSaveCurrent={() => {
              void saveCurrentExerciseHistory(index);
            }}
            savingCurrent={savingCurrent}
            onBackToReel={() => {
              horizontalScrollRefs.current[index]?.scrollTo({ x: 0, animated: true });
            }}
          />
        </ScrollView>
      </View>
    );
  }, [
    currentIndex,
    setLogs,
    items.length,
    openSetRunner,
    isPaused,
    isReelSoundMuted,
    playbackSpeed,
    maxUnlockedIndex,
    session?.title,
    handleTapVideo,
    handleMutedToggle,
    videoErrors,
    exerciseHistories,
    navigation,
    finalizeSession,
    resumeSeekSeconds,
    setPipActive,
    pipSupported,
    parseNumericInput,
    saveCurrentExerciseHistory,
    savingCurrentByExercise,
    updateCurrentInputLog,
  ]);

  if (!isSoundLoaded) {
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        <StatusBar style="light" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Ionicons name="barbell-outline" size={48} color={ACCENT} />
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>Aucun exercice dans cette séance.</Text>
          <TouchableOpacity style={{ marginTop: 24, backgroundColor: ACCENT, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14 }} onPress={() => navigation.goBack()}>
            <Text style={{ color: '#000', fontWeight: '800', fontSize: 15 }}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const targetReps = getTargetRepsRange(currentItem?.reps);
  const logsForRunner = setLogs[currentIndex] ?? Array.from({ length: sets }, () => ({ completed: false }));
  const previousLogsForRunner = logsForRunner.slice(0, runnerSetIndex).filter((s) => s?.completed);

  if (gymGate !== 'ready') {
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 }]}>
        <StatusBar style="light" />
        {gymGate === 'loading' ? (
          <>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={{ color: '#fff', fontSize: 16, marginTop: 16, fontWeight: '600' }}>Vérification…</Text>
          </>
        ) : (
          <>
            <Ionicons name="shield-checkmark-outline" size={40} color={ACCENT} />
            <Text style={{ color: '#fff', fontSize: 16, marginTop: 16, textAlign: 'center', fontWeight: '600' }}>
              Vérification de la salle requise pour continuer.
            </Text>
            <TouchableOpacity
              style={{ marginTop: 24, backgroundColor: ACCENT, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14 }}
              onPress={() => navigation.replace('GymVerification', { sessionId: sessionTemplateId })}
              activeOpacity={0.88}
            >
              <Text style={{ color: '#000', fontWeight: '800', fontSize: 15 }}>Vérifier la salle</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <FlatList
        ref={flatListRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={(item, i) => item.exerciseId._id + i}
        pagingEnabled
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEnabled={!setRunnerVisible && !restVisible}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
        windowSize={3}
        maxToRenderPerBatch={2}
        initialNumToRender={1}
        removeClippedSubviews={true}
        onMomentumScrollEnd={handleMomentumEnd}
      />
      <RestTimer
        visible={restVisible}
        seconds={restSeconds}
        onComplete={handleRestComplete}
        onSkip={handleRestComplete}
        redBelowSeconds={20}
      />
      <SetRunnerOverlay
        visible={setRunnerVisible}
        currentSetIndex={runnerSetIndex}
        totalSets={sets}
        previousLogs={previousLogsForRunner}
        targetRepsMin={targetReps.min}
        targetRepsMax={targetReps.max}
        recommendedStartingWeight={runnerSetIndex > 0 ? recommendedWeightForNextSet : undefined}
        saving={savingSet}
        onCancel={() => setSetRunnerVisible(false)}
        onFinishSet={handleSetRunnerFinishSet}
        onExerciseComplete={handleSetRunnerExerciseComplete}
      />
      <AlternativeBottomSheet
        visible={showAlternatives}
        title="Remplacer par"
        alternatives={currentSlotAlternatives}
        onSelect={handleSwapAlternative}
        onClose={() => setShowAlternatives(false)}
      />
      <SpeedBottomSheet
        visible={speedModalVisible}
        currentSpeed={playbackSpeed}
        onSelect={(spd) => setPlaybackSpeed(spd)}
        onClose={() => setSpeedModalVisible(false)}
      />

      {/* Session complete overlay */}
      {sessionComplete && pendingNavParams && (
        <SessionCompleteOverlay
          totalExercises={pendingNavParams.exercises.length}
          onNavigate={() => {
            allowNavigationWithoutConfirm.current = true;
            navigation.replace('WorkoutCompletion', pendingNavParams);
            setTimeout(() => {
              allowNavigationWithoutConfirm.current = false;
            }, 500);
          }}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  slide: { width, height, backgroundColor: '#000' },
  slidePage: { height, justifyContent: 'flex-end' },

  inactiveVideoShell: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },

  // Placeholder
  placeholder: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  placeholderIcon: { width: 90, height: 90, borderRadius: 45, backgroundColor: ACCENT_DIM, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  placeholderName: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center', paddingHorizontal: 24 },
  placeholderSub: { fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 6 },

  // Gradients
  gradientTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 160, zIndex: 5 },
  gradientBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 340, zIndex: 5 },

  // Top bar
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 54, paddingHorizontal: 16, paddingBottom: 12, zIndex: 20,
  },
  topBtn: {},
  topBtnInner: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  speedBtnInner: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderColor: 'rgba(212,175,55,0.4)',
    minWidth: 42,
    paddingHorizontal: 6,
  },
  speedBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: ACCENT,
  },

  // Progress
  progressWrap: { flex: 1, alignItems: 'center', marginHorizontal: 8 },
  progressTrack: {
    width: '100%', height: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 2, overflow: 'hidden', marginBottom: 5,
  },
  progressFill: { height: '100%', backgroundColor: ACCENT, borderRadius: 2 },
  progressLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '700', letterSpacing: 0.5 },

  // Swipe hint
  swipeHintWrap: {
    position: 'absolute', right: 14, top: '45%', zIndex: 15,
  },
  rightRail: {
    position: 'absolute',
    right: 10,
    top: '25%',
    zIndex: 22,
    alignItems: 'center',
    gap: 10,
  },
  railBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  railBtnLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },
  railProgress: {
    marginTop: 2,
    minWidth: 52,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(212,175,55,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    alignItems: 'center',
  },
  railProgressValue: {
    fontSize: 11,
    fontWeight: '800',
    color: ACCENT,
  },

  // Bottom overlay
  bottomOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingBottom: 44, paddingTop: 18, zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  exerciseName: { fontSize: 30, fontWeight: '900', color: '#fff', marginBottom: 12, lineHeight: 36, letterSpacing: -0.5 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  badge: {
    backgroundColor: 'rgba(212,175,55,0.18)',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.35)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  badgeText: { color: ACCENT, fontSize: 12, fontWeight: '700' },

  // Sets row
  setsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  setDots: { flexDirection: 'row', gap: 6 },
  setDot: { width: 9, height: 9, borderRadius: 5 },
  setDotDone: { backgroundColor: ACCENT },
  setDotPending: { backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  setPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  setPillText: { fontSize: 12, fontWeight: '800', color: ACCENT },

  // Action row
  actionRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 2 },
  altBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 13, paddingHorizontal: 16, borderRadius: 14,
  },
  altBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  mainCta: { flex: 1, borderRadius: 14, overflow: 'hidden', shadowColor: ACCENT, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 },
  mainCtaDone: { shadowColor: '#22c55e' },
  mainCtaGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  mainCtaText: { fontSize: 17, fontWeight: '900', color: '#000' },
});

// ── Speed bottom sheet styles ─────────────────────────────────────────────────

const sbm = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(212,175,55,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  options: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  optionSelected: {
    backgroundColor: 'rgba(212,175,55,0.14)',
    borderColor: 'rgba(212,175,55,0.4)',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },
  optionTextSelected: {
    color: ACCENT,
    fontWeight: '900',
  },
});

// ── History panel styles ──────────────────────────────────────────────────────

const hp = StyleSheet.create({
  container: { width, height, padding: 0, overflow: 'hidden' },
  scrollContent: {
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENT_DIM,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  backToReelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  backToReelText: {
    fontSize: 12,
    fontWeight: '700',
    color: ACCENT,
  },
  dismissHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(212,175,55,0.15)',
  },
  dismissHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: ACCENT,
  },

  // PR Card
  prCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  prCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  prIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  prCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(212,175,55,0.85)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  prCardValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    marginTop: 2,
  },
  prCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  prCardDate: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },

  compareSection: {
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionSubDate: {
    fontSize: 11,
    color: ACCENT,
    fontWeight: '700',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    marginBottom: 8,
  },
  tableHeadCol: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
  },
  colSet: {
    width: 65,
  },
  colVal: {
    flex: 1,
    textAlign: 'center',
  },
  colInput: {
    flex: 1,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  compareSetLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  compareValue: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    textAlign: 'center',
  },
  compareWeightValue: {
    fontSize: 13,
    color: ACCENT,
    fontWeight: '800',
    textAlign: 'center',
  },
  currentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  inputWrap: {
    height: 42,
  },
  input: {
    flex: 1,
    height: '100%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(0,0,0,0.35)',
    color: '#fff',
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  saveBtn: {
    marginTop: 10,
    height: 46,
    borderRadius: 14,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  saveBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  saveBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '900',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 4 },
  emptyText: { fontSize: 12, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 17 },
});

// ── Swipe hint styles ─────────────────────────────────────────────────────────

const sh = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6,
  },
  text: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
});

// ── Session complete styles ───────────────────────────────────────────────────

const sc = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  card: {
    width: width - 40, backgroundColor: '#111',
    borderRadius: 28, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.25)',
    padding: 28, alignItems: 'center',
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 12,
  },
  cardGradient: { ...StyleSheet.absoluteFillObject },
  trophyWrap: { marginBottom: 20 },
  trophyCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 10, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  statsRow: {
    flexDirection: 'row', width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16,
    paddingVertical: 16, marginBottom: 24,
  },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statVal: { fontSize: 22, fontWeight: '900', color: '#fff', marginTop: 4 },
  statLbl: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  cta: { width: '100%', borderRadius: 16, overflow: 'hidden' },
  ctaGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  ctaText: { fontSize: 16, fontWeight: '900', color: '#000' },
});
