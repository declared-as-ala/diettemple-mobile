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
  StatusBar as RNStatusBar,
  BackHandler,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList, type VideoSourceType } from '../types';
import { resolveVideoUrl } from '../config/api.config';
import RestTimer from '../components/RestTimer';
import ReelsVideoPlayer, { type ReelsVideoPlayerHandle } from '../components/workout/ReelsVideoPlayer';
import QualitySheet from '../components/workout/QualitySheet';
import { useActiveWorkoutPersistStore } from '../store/activeWorkoutPersistStore';
import AlternativeBottomSheet, { AlternativeOption } from '../components/workout/AlternativeBottomSheet';
import SetRunnerOverlay from '../components/workout/SetRunnerOverlay';
import { workoutProgressStorage, type SetLog } from '../services/workoutProgressStorage';
import { workoutService } from '../services/workoutService';
import { homeService } from '../services/homeService';
import { buildReelsSessionFromApiSession } from '../utils/buildReelsSessionFromApiSession';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWorkoutProgress } from '../hooks/useWorkoutProgress';
import { useWorkoutCompletionSound } from '../hooks/useWorkoutCompletionSound';
import { usePreventScreenCapture } from '../hooks/usePreventScreenCapture';
import { findFirstIncompletePosition } from '../utils/workoutResumeReconciler';
import {
  defaultLoadMode as resolveDefaultLoadMode,
  formatSetLoad,
  supportedLoadModes as resolveSupportedLoadModes,
  type ExerciseLoadMode,
} from '../utils/workoutLoad';
type SessionReelsRouteProp = RouteProp<RootStackParamList, 'SessionReels'>;
type SessionReelsNavProp = StackNavigationProp<RootStackParamList, 'SessionReels'>;

const { width, height } = Dimensions.get('window');
const ACCENT = BRAND_YELLOW;
const ACCENT_DIM = 'rgba(212,175,55,0.15)';
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
    videoVariants?: Array<{ quality: string; url: string; bytes?: number; bitrateKbps?: number }>;
    videoPosterUrl?: string;
    videoHlsUrl?: string;
    videoDurationSec?: number;
    supportedLoadModes?: ExerciseLoadMode[];
    defaultLoadMode?: ExerciseLoadMode;
    supportsAdditionalWeight?: boolean;
    defaultWeight?: number;
    instruction?: string;
    message?: string;
    clientInstruction?: string;
    warmupInstruction?: string;
  };
  alternatives?: AlternativeOption[];
  sets?: number;
  reps?: string | number | { min?: number; max?: number };
  restSeconds?: number;
  order?: number;
  instruction?: string;
  message?: string;
  notes?: string;
  clientInstruction?: string;
  warmupInstruction?: string;
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

/**
 * Rebuilds the effective exercise of every slot from the immutable slot definitions plus the
 * client's explicit picks (session-scoped, see utils/exerciseSelection). Nothing is mutated
 * permanently: changing a pick back restores displaced exercises.
 */
function applyEffectiveExercises(
  itemList: SessionItem[],
  slots: Record<number, { primary: any; alternatives: any[] }>,
  selections: Record<number, string>,
  locked: Record<number, string>
): SessionItem[] {
  if (itemList.some((_, i) => !slots[i])) return itemList;
  const defs: SlotDef<any>[] = itemList.map((_, i) => ({
    primary: { ...slots[i].primary, _id: resolveExerciseId(slots[i].primary) ?? '' },
    alternatives: (slots[i].alternatives || []).map((a: any) => ({ ...a, _id: resolveExerciseId(a) ?? '' })),
  }));
  const effective = resolveEffectiveExercises(defs, selections, locked);
  return itemList.map((it, i) => {
    const eff = effective[i];
    const def = defs[i];
    const exerciseId =
      eff._id === def.primary._id
        ? { ...def.primary }
        : {
            _id: eff._id,
            name: eff.name,
            muscleGroup: eff.muscleGroup,
            equipment: eff.equipment,
            videoUrl: eff.videoUrl,
            videoSource: eff.videoSource,
            description: eff.description,
            supportedLoadModes: eff.supportedLoadModes,
            defaultLoadMode: eff.defaultLoadMode,
            supportsAdditionalWeight: eff.supportsAdditionalWeight,
            defaultWeight: eff.defaultWeight,
          };
    const alternatives = slotCandidates(def)
      .filter((c) => c._id !== eff._id)
      .map((c) => ({
        _id: c._id,
        name: c.name,
        muscleGroup: c.muscleGroup,
        equipment: c.equipment,
        videoUrl: c.videoUrl,
        supportedLoadModes: c.supportedLoadModes,
        defaultLoadMode: c.defaultLoadMode,
        supportsAdditionalWeight: c.supportsAdditionalWeight,
        defaultWeight: c.defaultWeight,
      }));
    return { ...it, exerciseId, alternatives };
  });
}

import { getLocalDateKey } from '../utils/date';
import {
  applyExplicitSelection,
  resolveEffectiveExercises,
  slotCandidates,
  SlotDef,
} from '../utils/exerciseSelection';
import { hydrateGymCheckinStore, useGymCheckinStore } from '../store/gymCheckinStore';

type GymGateState = 'loading' | 'ready' | 'needVerification';


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
    personalRecords?: { externalWeightKg?: number; additionalWeightKg?: number; bodyweightMaxReps?: number };
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

  const androidStatusBar = RNStatusBar.currentHeight || 30;
  const topPadding = Platform.OS === 'android'
    ? Math.max(androidStatusBar + 65, (insets.top || 0) + 65, 115)
    : Math.max(insets.top + 36, 85);

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
              paddingTop: topPadding,
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
            {onBackToReel ? (
              <TouchableOpacity onPress={onBackToReel} style={hp.backHeaderBtn} hitSlop={12} activeOpacity={0.75}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>
            ) : (
              <View style={hp.headerIconWrap}>
                <Ionicons name="time-outline" size={20} color={ACCENT} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={hp.headerTitle}>Historique</Text>
              <Text style={hp.headerSub} numberOfLines={1}>{exerciseName}</Text>
            </View>
            {onBackToReel && (
              <TouchableOpacity onPress={onBackToReel} style={hp.backToReelBtn} activeOpacity={0.75}>
                <Ionicons name="videocam-outline" size={15} color={ACCENT} />
                <Text style={hp.backToReelText}>Vidéo</Text>
              </TouchableOpacity>
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
                      {prevSet ? formatSetLoad({ ...prevSet, weightKg: prevWeight ?? undefined }) : '—'}
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
              <Text style={hp.emptyText}>Enregistre tes séries actuelles pour suivre ta progression.</Text>
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
                      value={log.loadMode === 'bodyweight' ? '' : (log.additionalWeightKg ?? log.externalWeightKg ?? log.weightKg) != null ? String(log.additionalWeightKg ?? log.externalWeightKg ?? log.weightKg) : ''}
                      onChangeText={(v) => onChangeSetWeight(i, v)}
                      onFocus={handleInputFocus}
                      placeholder={log.loadMode === 'bodyweight' ? 'PDC' : log.loadMode === 'bodyweight_plus_weight' ? '+ kg' : 'Kg'}
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                      style={hp.input}
                      editable={log.loadMode !== 'bodyweight'}
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

// ── Coach Instruction modal component ──────────────────────────────────────────

// ── Coach Instruction floating card component (Non-blocking Reel overlay) ────

const HEAD_SIZE = 58;
const HEAD_EDGE = 8;
const HEAD_MIN_Y = 92; // below the top bar
// The head keeps its place from one exercise to the next (like a Messenger chat head).
let lastCoachHeadPos: { x: number; y: number } | null = null;
// Heads the user removed (per session + exercise). Kept here, NOT in the parent screen: the reel rows are cached by
// the list, so a parent state change would not redraw them and the bubble would stay on screen.
const removedCoachHeads = new Set<string>();

const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Coach message as a Messenger-style "chat head": a round bubble you can DRAG anywhere (it snaps to the
 * nearest screen edge), TAP to open/close the message, and DRAG onto the X zone to remove it.
 * A red badge shows until the message has been opened/closed once.
 */
function CoachChatHead({ instruction, slotKey }: { instruction: string; slotKey: string }) {
  const start = lastCoachHeadPos ?? { x: width - HEAD_SIZE - HEAD_EDGE, y: 130 };
  const pan = useRef(new Animated.ValueXY(start)).current;
  const base = useRef(start);
  const live = useRef(start);
  const [gone, setGone] = useState(() => removedCoachHeads.has(slotKey));
  const removeRef = useRef(() => {});
  removeRef.current = () => {
    removedCoachHeads.add(slotKey);
    setGone(true);
  };
  const overRef = useRef(false);

  const [expanded, setExpanded] = useState(true);
  const [unread, setUnread] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [overTrash, setOverTrash] = useState(false);
  const [onRight, setOnRight] = useState(start.x + HEAD_SIZE / 2 > width / 2);
  const pop = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  // New message (new exercise): the head pops in with its message open and a badge.
  useEffect(() => {
    setExpanded(true);
    setUnread(true);
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 6, tension: 80 }).start();
  }, [instruction, pop]);

  useEffect(() => {
    if (!unread) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [unread, pulse]);

  const trashX = width / 2;
  const trashY = height - 96;
  const nearTrash = (x: number, y: number) => Math.hypot(x + HEAD_SIZE / 2 - trashX, y + HEAD_SIZE / 2 - trashY) < 72;

  const finish = (moved: boolean) => {
    setDragging(false);
    setOverTrash(false);
    const { x, y } = live.current;
    if (!moved) {
      setExpanded((e) => !e);
      setUnread(false);
      return;
    }
    if (overRef.current || nearTrash(x, y)) {
      overRef.current = false;
      removeRef.current();
      return;
    }
    const toRight = x + HEAD_SIZE / 2 > width / 2;
    const nx = toRight ? width - HEAD_SIZE - HEAD_EDGE : HEAD_EDGE;
    live.current = { x: nx, y };
    lastCoachHeadPos = { x: nx, y };
    setOnRight(toRight);
    Animated.spring(pan, { toValue: { x: nx, y }, useNativeDriver: false, friction: 7, tension: 90 }).start();
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.stopAnimation();
        base.current = { ...live.current };
        overRef.current = false;
        setDragging(true);
      },
      onPanResponderMove: (_e, g) => {
        const x = clampN(base.current.x + g.dx, 0, width - HEAD_SIZE);
        const y = clampN(base.current.y + g.dy, HEAD_MIN_Y, height - HEAD_SIZE - 16);
        live.current = { x, y };
        pan.setValue({ x, y });
        // Over the X when the bubble OR the finger is close to it (generous: easier to hit on any screen).
        const over = nearTrash(x, y) || Math.hypot(g.moveX - trashX, g.moveY - trashY) < 90;
        overRef.current = over;
        setOverTrash(over);
      },
      // The reel list scrolls vertically: refuse to hand the touch over, otherwise dragging DOWN to the X
      // cancels the drag (and swipes to the next exercise) before the bubble reaches the X.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderRelease: (_e, g) => finish(Math.hypot(g.dx, g.dy) > 8),
      onPanResponderTerminate: () => finish(true),
    })
  ).current;

  const cardWidth = Math.min(250, width - HEAD_SIZE - 34);

  if (gone) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {dragging && (
        <View style={[chat.trash, overTrash && chat.trashActive]} pointerEvents="none">
          <Ionicons name="close" size={overTrash ? 34 : 28} color="#fff" />
        </View>
      )}

      {/* outer node: position (JS-driven) */}
      <Animated.View style={[chat.anchor, { transform: [{ translateX: pan.x }, { translateY: pan.y }] }]} pointerEvents="box-none">
        {/* inner node: pop-in (native-driven) */}
        <Animated.View style={{ opacity: pop, transform: [{ scale: pop }] }} pointerEvents="box-none">
          {expanded && !dragging && (
            <View style={[chat.card, { width: cardWidth }, onRight ? { right: HEAD_SIZE + 10 } : { left: HEAD_SIZE + 10 }]} pointerEvents="none">
              <Text style={chat.cardName}>Coach</Text>
              <Text style={chat.cardText} numberOfLines={9}>{instruction}</Text>
            </View>
          )}
          <Animated.View {...responder.panHandlers} style={[chat.head, { transform: [{ scale: pulse }] }]}>
            <Ionicons name="barbell" size={26} color="#000" />
            {unread && (
              <View style={chat.badge}>
                <Text style={chat.badgeText}>1</Text>
              </View>
            )}
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/**
 * "Quitter la séance ?" confirmation: explains what happens (progress saved, resumable for 20h) with the real
 * numbers, instead of a bare system alert.
 */
function QuitSessionModal({
  visible,
  exerciseText,
  setsText,
  resumeUntilText,
  onStay,
  onQuit,
}: {
  visible: boolean;
  exerciseText: string;
  setsText: string;
  resumeUntilText: string;
  onStay: () => void;
  onQuit: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 70 }).start();
  }, [visible, anim]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onStay} statusBarTranslucent>
      <View style={qm.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onStay} />
        <Animated.View
          style={[
            qm.card,
            {
              opacity: anim,
              transform: [
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
                { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
              ],
            },
          ]}
        >
          <LinearGradient colors={['rgba(212,175,55,0.14)', 'rgba(0,0,0,0)']} style={qm.glow} />

          <View style={qm.iconWrap}>
            <Ionicons name="pause" size={28} color={ACCENT} />
          </View>
          <Text style={qm.title}>Quitter la séance ?</Text>
          <Text style={qm.subtitle}>Pas de panique : ta progression est sauvegardée.</Text>

          <View style={qm.infoBox}>
            <View style={qm.infoRow}>
              <View style={qm.infoIcon}><Ionicons name="barbell-outline" size={16} color={ACCENT} /></View>
              <View style={{ flex: 1 }}>
                <Text style={qm.infoLabel}>Où tu en es</Text>
                <Text style={qm.infoValue}>{exerciseText} · {setsText}</Text>
              </View>
            </View>
            <View style={qm.infoDivider} />
            <View style={qm.infoRow}>
              <View style={qm.infoIcon}><Ionicons name="time-outline" size={16} color={ACCENT} /></View>
              <View style={{ flex: 1 }}>
                <Text style={qm.infoLabel}>Reprise possible jusqu'à</Text>
                <Text style={qm.infoValue}>{resumeUntilText}</Text>
              </View>
            </View>
          </View>
          <Text style={qm.note}>Tu retrouves ta séance dans « Continuer » sur l'accueil. Elle n'est pas validée tant que tu ne l'as pas terminée.</Text>

          <TouchableOpacity style={qm.primary} onPress={onStay} activeOpacity={0.88}>
            <LinearGradient colors={[ACCENT, '#B8942E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={qm.primaryGrad}>
              <Ionicons name="play" size={18} color="#000" />
              <Text style={qm.primaryText}>Continuer la séance</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={qm.secondary} onPress={onQuit} activeOpacity={0.8}>
            <Ionicons name="exit-outline" size={17} color="#F87171" />
            <Text style={qm.secondaryText}>Quitter et reprendre plus tard</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
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
  const { sessionTemplateId, session, resumeFromStorage, workoutSessionId: initialWorkoutSessionId } = route.params;
  const ensureGymVerified = useGymCheckinStore((s) => s.ensureGymVerified);
  /** Subscribe so gate updates when hydrate/sync sets verification for today. */
  const gymVerifiedDateKey = useGymCheckinStore((s) => s.verifiedDateKey);
  const [gymGate, setGymGate] = useState<GymGateState>('loading');
  const [isHydrated, setIsHydrated] = useState(false);
  const [quitVisible, setQuitVisible] = useState(false);
  const quitActionRef = useRef<any>(null);

  // Coach messages are always read FRESH from the server: a resumed workout (saved before the coach wrote or
  // edited a message) must still show the latest message. Matched by position, so swapped alternatives don't matter.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await homeService.getSession(sessionTemplateId);
        const fresh: any = buildReelsSessionFromApiSession(res?.session);
        if (cancelled || !fresh?.items?.length) return;
        setItems((prev) =>
          prev.length !== fresh.items.length
            ? prev
            : prev.map((it, i) => ({
                ...it,
                clientInstruction: fresh.items[i].clientInstruction,
                instruction: fresh.items[i].instruction,
                message: fresh.items[i].message,
                notes: fresh.items[i].notes,
                exerciseId:
                  String(fresh.items[i].exerciseId?._id) === String(it.exerciseId?._id)
                    ? {
                        ...it.exerciseId,
                        videoVariants: fresh.items[i].exerciseId?.videoVariants ?? it.exerciseId.videoVariants,
                        videoPosterUrl: fresh.items[i].exerciseId?.videoPosterUrl ?? it.exerciseId.videoPosterUrl,
                        videoHlsUrl: fresh.items[i].exerciseId?.videoHlsUrl ?? it.exerciseId.videoHlsUrl,
                        videoDurationSec: fresh.items[i].exerciseId?.videoDurationSec ?? it.exerciseId.videoDurationSec,
                      }
                    : it.exerciseId,
              }))
        );
      } catch {
        /* offline: keep whatever the saved session already has */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionTemplateId]);
  const [activeWorkoutSessionId, setActiveWorkoutSessionId] = useState<string | undefined>(initialWorkoutSessionId);
  const isSavingSetRef = useRef(false);

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
  const [manualRestTimer, setManualRestTimer] = useState(false);
  const [restSeconds, setRestSeconds] = useState(MIN_REST_SECONDS);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showQualitySheet, setShowQualitySheet] = useState(false);
  const [firstLoopCompletedByExercise, setFirstLoopCompletedByExercise] = useState<Record<number, boolean>>({});
  const [userMutedOverrideByExercise, setUserMutedOverrideByExercise] = useState<Record<number, boolean>>({});
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
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
        personalRecords?: { externalWeightKg?: number; additionalWeightKg?: number; bodyweightMaxReps?: number };
        lastReps: number[];
        lastSets: any[];
        lastCompletedAt?: string;
      }
    >
  >({});
  const [sessionComplete, setSessionComplete] = useState(false);
  const sessionCompleteRef = useRef(false);
  const [pendingNavParams, setPendingNavParams] = useState<any>(null);
  const [savingCurrentByExercise, setSavingCurrentByExercise] = useState<Record<string, boolean>>({});
  const [savingSet, setSavingSet] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const isAdvancingRef = useRef(false);
  const originalSlots = useRef<Record<number, { primary: any; alternatives: any[] }>>({});
  /** Session-scoped explicit exercise picks (slot index -> exercise id). Never sent to the template. */
  const slotSelections = useRef<Record<number, string>>({});
  const setLogsRef = useRef(setLogs);
  setLogsRef.current = setLogs;
  const lockedPerformedSlots = useCallback((list: SessionItem[]): Record<number, string> => {
    const locked: Record<number, string> = {};
    list.forEach((it, i) => {
      if ((setLogsRef.current[i] ?? []).some((x) => x?.completed)) {
        const id = resolveExerciseId(it.exerciseId);
        if (id) locked[i] = id;
      }
    });
    return locked;
  }, []);
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
  const isHistoryOpenRef = useRef(false);
  const allowNavigationWithoutConfirm = useRef(false);
  const { maxUnlockedIndex } = useWorkoutProgress(items, setLogs, unlockedIndex);
  const { playExerciseCompleteSound, playWorkoutCompleteSound } = useWorkoutCompletionSound(require('../../assets/sound_workout.mp3'));
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
            personalRecords: h.personalRecords,
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
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') return;
      if (useActiveWorkoutPersistStore.getState().pipActive) return;
      setIsPaused(true);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (sessionCompleteRef.current || sessionComplete || allowNavigationWithoutConfirm.current) return;
      if (isHistoryOpenRef.current) {
        e.preventDefault();
        horizontalScrollRefs.current[currentIndex]?.scrollTo({ x: 0, animated: true });
        isHistoryOpenRef.current = false;
        return;
      }
      e.preventDefault();
      quitActionRef.current = e.data.action;
      setQuitVisible(true);
    });
    return unsub;
  }, [navigation, sessionComplete, currentIndex]);

  const confirmQuit = useCallback(() => {
    setQuitVisible(false);
    void useActiveWorkoutPersistStore.getState().flushPersist();
    const action = quitActionRef.current;
    quitActionRef.current = null;
    if (!action) return;
    allowNavigationWithoutConfirm.current = true;
    navigation.dispatch(action);
    setTimeout(() => {
      allowNavigationWithoutConfirm.current = false;
    }, 500);
  }, [navigation]);

  useEffect(() => {
    const backAction = () => {
      if (sessionCompleteRef.current || allowNavigationWithoutConfirm.current) {
        return false;
      }
      if (isHistoryOpenRef.current) {
        horizontalScrollRefs.current[currentIndex]?.scrollTo({ x: 0, animated: true });
        isHistoryOpenRef.current = false;
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [currentIndex]);

  // Hydration effect: runs as soon as gymGate is ready.
  // Loads snapshot from activeWorkoutPersistStore and workoutProgressStorage,
  // then deterministically finds the exact first incomplete exercise & set.
  useEffect(() => {
    if (gymGate !== 'ready') return;
    let cancelled = false;

    (async () => {
      try {
        const d = await useActiveWorkoutPersistStore.getState().hydrate(sessionTemplateId);
        const date = getLocalDateKey(new Date());
        const progress = await workoutProgressStorage.get(date);

        if (cancelled) return;

        let mergedLogs: Record<number, SetLog[]> = {};

        if (d && d.sessionTemplateId === sessionTemplateId && d.setLogs) {
          mergedLogs = { ...d.setLogs };
          // Keep the ORIGINAL start so the 20h resume window is never extended by re-opening.
          if (d.startedAt) sessionStartTime.current = d.startedAt;
          if (d.workoutSessionId && !activeWorkoutSessionId) {
            setActiveWorkoutSessionId(d.workoutSessionId);
          }
        }

        // Day progress is stored per DATE: only merge it when it belongs to THIS session (an older session resumed
        // on a later day must not receive today's sets from another session).
        if (progress?.sets && (!progress.sessionTemplateId || progress.sessionTemplateId === sessionTemplateId)) {
          const raw = progress.sets as Record<number, SetLog[]>;
          Object.keys(raw).forEach((k) => {
            const idx = Number(k);
            const arr = raw[idx] ?? [];
            const normArr = arr.map((s) => (s && typeof s === 'object' ? s : { completed: false }));
            if (!mergedLogs[idx]) {
              mergedLogs[idx] = normArr;
            } else {
              const existing = [...mergedLogs[idx]];
              normArr.forEach((s, sIdx) => {
                if (s?.completed) {
                  existing[sIdx] = { ...existing[sIdx], ...s };
                }
              });
              mergedLogs[idx] = existing;
            }
          });
        }

        // Deterministically reconcile resume position from completed sets!
        const resumePos = findFirstIncompletePosition(items, mergedLogs);
        const targetExIndex = resumePos.exerciseIndex;
        const targetSetIndex = resumePos.setIndex;

        resumeIndexRef.current = targetExIndex;
        setCurrentIndex(targetExIndex);
        setRunnerSetIndex(targetSetIndex);
        setUnlockedIndex(targetExIndex);
        setSetLogs(mergedLogs);

        if (d?.positionSeconds) {
          setResumeSeekSeconds(d.positionSeconds);
          positionSecondsRef.current = d.positionSeconds;
        }
        if (d?.isPaused !== undefined) {
          setIsPaused(d.isPaused);
        }

        requestAnimationFrame(() => {
          try {
            flatListRef.current?.scrollToIndex({ index: targetExIndex, animated: false });
          } catch {
            /* Handled by initialScrollIndex */
          }
        });
      } catch (err) {
        if (__DEV__) console.warn('Session hydration error:', err);
      } finally {
        if (!cancelled) {
          setIsHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gymGate, sessionTemplateId, items]);

  // Auto-persist: only writes AFTER hydration is complete to prevent overwriting saved state
  useEffect(() => {
    if (!isHydrated || gymGate !== 'ready' || items.length === 0 || sessionComplete) return;
    queuePersist({
      v: 1,
      workoutSessionId: activeWorkoutSessionId,
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
                    videoVariants: it.exerciseId.videoVariants,
                    videoPosterUrl: it.exerciseId.videoPosterUrl,
                    videoHlsUrl: it.exerciseId.videoHlsUrl,
                    videoDurationSec: it.exerciseId.videoDurationSec,
                    supportedLoadModes: it.exerciseId.supportedLoadModes,
                    defaultLoadMode: it.exerciseId.defaultLoadMode,
                    supportsAdditionalWeight: it.exerciseId.supportsAdditionalWeight,
                    defaultWeight: it.exerciseId.defaultWeight,
          },
          alternatives: it.alternatives,
          sets: it.sets,
          reps: typeof it.reps === 'string' ? it.reps : formatReps(it.reps),
          restSeconds: it.restSeconds,
          order: it.order,
          clientInstruction: it.clientInstruction,
          instruction: it.instruction,
          message: it.message,
          notes: it.notes,
        })),
      },
      currentIndex,
      runnerSetIndex,
      positionSeconds: positionSecondsRef.current,
      isPaused,
      setLogs,
      startedAt: sessionStartTime.current,
      updatedAt: Date.now(),
    });
  }, [
    isHydrated,
    gymGate,
    sessionComplete,
    sessionTemplateId,
    session,
    items,
    currentIndex,
    runnerSetIndex,
    isPaused,
    setLogs,
    activeWorkoutSessionId,
    queuePersist,
  ]);

  useEffect(() => { setRecommendedWeightForNextSet(undefined); }, [currentIndex]);

  useEffect(() => {
    if (!isHydrated) return;
    if (currentIndex <= maxUnlockedIndex) return;
    setCurrentIndex(maxUnlockedIndex);
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToIndex({ index: maxUnlockedIndex, animated: true });
    });
  }, [isHydrated, currentIndex, maxUnlockedIndex]);

  // Pre-fetch history for active and next exercise
  useEffect(() => {
    const curId = resolveExerciseId(items[currentIndex]?.exerciseId);
    if (curId) void fetchHistoryForExercise(curId);
    if (currentIndex + 1 < items.length) {
      const nextId = resolveExerciseId(items[currentIndex + 1]?.exerciseId);
      if (nextId) void fetchHistoryForExercise(nextId);
    }
  }, [currentIndex, items, fetchHistoryForExercise]);

  // Pre-fetch alternative histories only when alternative bottom sheet is opened
  useEffect(() => {
    if (showAlternatives) {
      const slot = originalSlots.current[currentIndex];
      const primId = resolveExerciseId(slot?.primary);
      if (primId) void fetchHistoryForExercise(primId);
      (slot?.alternatives || items[currentIndex]?.alternatives || []).forEach((alt: any) => {
        const altId = resolveExerciseId(alt);
        if (altId) void fetchHistoryForExercise(altId);
      });
    }
  }, [showAlternatives, currentIndex, items, fetchHistoryForExercise]);

  const currentItem = items[currentIndex];
  const currentLoadModes = useMemo(
    () => resolveSupportedLoadModes(currentItem?.exerciseId),
    [currentItem?.exerciseId?._id, currentItem?.exerciseId?.supportedLoadModes]
  );
  const currentDefaultLoadMode = useMemo(
    () => resolveDefaultLoadMode(currentItem?.exerciseId),
    [currentItem?.exerciseId?._id, currentItem?.exerciseId?.defaultLoadMode, currentItem?.exerciseId?.supportedLoadModes]
  );
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

  const currentCoachInstruction = useMemo(() => {
    const cur = items[currentIndex];
    if (!cur) return null;
    const ex = cur.exerciseId;
    const instruction =
      cur.clientInstruction ||
      (ex as any)?.clientInstruction ||
      cur.instruction ||
      cur.message ||
      cur.notes ||
      cur.warmupInstruction ||
      (ex as any)?.instruction ||
      (ex as any)?.message ||
      (ex as any)?.warmupInstruction ||
      (currentIndex === 0 ? ((session as any)?.warmup?.notes || (session as any)?.warmupInstruction || (session as any)?.warmupNotes || (session as any)?.instruction) : null);
    if (!instruction || !String(instruction).trim()) return null;
    return String(instruction).trim();
  }, [currentIndex, items, session]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    const idx = viewableItems[0]?.index;
    if (idx == null) return;
    isHistoryOpenRef.current = false;
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
      .map((s, i) => ({
        setNumber: i + 1,
        reps: s?.reps ?? 0,
        weightKg: s?.weightKg ?? 0,
        loadMode: s?.loadMode,
        externalWeightKg: s?.externalWeightKg,
        additionalWeightKg: s?.additionalWeightKg,
        completedAt: s?.completedAt,
      }))
      .filter((s) => s.reps > 0 || s.weightKg > 0);
    if (enteredSets.length === 0) {
      Toast.show({ type: 'info', text1: 'Aucune donnée', text2: 'Saisis au moins une série.' });
      return;
    }
    setSavingCurrentByExercise((p) => ({ ...p, [exerciseId]: true }));
    try {
      const currentHistory = exerciseHistories[exerciseId];
      const previousPR = currentHistory?.personalRecord ?? 0;
      const validPRSets = enteredSets.filter((s) => (s.loadMode ?? 'external_weight') === 'external_weight' && s.reps >= 5 && s.reps <= 8 && s.weightKg > 0);
      const enteredPRMaxWeight = validPRSets.reduce((max, s) => Math.max(max, s.weightKg), 0);
      const isNewPR = enteredPRMaxWeight > previousPR && enteredPRMaxWeight > 0;
      const updatedPR = isNewPR ? enteredPRMaxWeight : previousPR;
      const overallLastWeight = enteredSets.reduce((max, s) => Math.max(max, s.weightKg), 0);

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
            return {
              ...s,
              reps: entered.reps,
              weightKg: entered.weightKg,
              loadMode: entered.loadMode,
              externalWeightKg: entered.externalWeightKg,
              additionalWeightKg: entered.additionalWeightKg,
              completedAt: entered.completedAt ?? new Date().toISOString(),
              completed: true,
              syncStatus: 'synced',
            };
          }
          return s;
        });
        return next;
      });

      // Update optimistic exercise history
      setExerciseHistories((prev) => ({
        ...prev,
        [exerciseId]: {
          lastWeight: overallLastWeight,
          personalRecord: updatedPR,
          personalRecords: prev[exerciseId]?.personalRecords,
          lastReps: enteredSets.map((s) => s.reps),
          lastSets: enteredSets.map((s) => ({
            setNumber: s.setNumber,
            weight: s.weightKg,
            loadMode: s.loadMode,
            externalWeightKg: s.externalWeightKg,
            additionalWeightKg: s.additionalWeightKg,
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
          text2: `${item.exerciseId.name} : ${enteredPRMaxWeight} kg (5-8 reps)`,
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
    async (
      weightKg: number | undefined,
      reps: number,
      durationSeconds: number,
      recommendedNextKg?: number,
      loadMode: ExerciseLoadMode = 'external_weight',
      externalWeightKg = 0,
      additionalWeightKg = 0
    ) => {
      if (isSavingSetRef.current) return;
      isSavingSetRef.current = true;
      const setIdx = runnerSetIndex;
      const resolvedExerciseId = resolveExerciseId(items[currentIndex]?.exerciseId);
      const wasAlreadyCompleted = !!setLogs[currentIndex]?.[setIdx]?.completed;
      const log: SetLog = {
        id: `${resolvedExerciseId ?? currentIndex}:${setIdx + 1}`,
        weightKg,
        loadMode,
        externalWeightKg,
        additionalWeightKg,
        reps,
        completed: true,
        completedAt: new Date().toISOString(),
        durationSeconds,
        syncStatus: 'pending',
      };
      const existingLogs = setLogs[currentIndex] ?? Array.from({ length: sets }, () => ({ completed: false }));
      const updatedLogs = [...existingLogs];
      updatedLogs[setIdx] = log;
      const isLastSet = setIdx >= sets - 1;

      Keyboard.dismiss();
      setSavingSet(true);

      // 1. Optimistic history update & check for new PR
      if (resolvedExerciseId) {
        const completedLogs = updatedLogs.filter((s) => s?.completed);
        const currentHist = exerciseHistories[resolvedExerciseId];
        const previousPR = currentHist?.personalRecord ?? 0;
        const weightNum = Number(weightKg ?? 0);
        const repsNum = Number(reps ?? 0);
        const qualifiesForPR = loadMode === 'external_weight' && repsNum >= 5 && repsNum <= 8 && weightNum > 0;
        const isNewPR = qualifiesForPR && weightNum > previousPR;
        const updatedPR = isNewPR ? weightNum : previousPR;
        const lastWeight = completedLogs.reduce((max, s) => Math.max(max, s.weightKg ?? 0), 0);
        const previousRecords = currentHist?.personalRecords ?? { externalWeightKg: previousPR, additionalWeightKg: 0, bodyweightMaxReps: 0 };
        const isAdditionalPR = loadMode === 'bodyweight_plus_weight' && repsNum >= 5 && repsNum <= 8 && additionalWeightKg > Number(previousRecords.additionalWeightKg ?? 0);
        const isBodyweightPR = loadMode === 'bodyweight' && repsNum > Number(previousRecords.bodyweightMaxReps ?? 0);
        const personalRecords = {
          externalWeightKg: updatedPR,
          additionalWeightKg: isAdditionalPR ? additionalWeightKg : Number(previousRecords.additionalWeightKg ?? 0),
          bodyweightMaxReps: isBodyweightPR ? repsNum : Number(previousRecords.bodyweightMaxReps ?? 0),
        };

        setExerciseHistories((prev) => ({
          ...prev,
          [resolvedExerciseId]: {
            lastWeight,
            personalRecord: updatedPR,
            personalRecords,
            lastReps: completedLogs.map((s) => s.reps ?? 0),
            lastSets: completedLogs.map((s, i) => ({
              setNumber: i + 1,
              weight: s.weightKg ?? 0,
              loadMode: s.loadMode,
              externalWeightKg: s.externalWeightKg,
              additionalWeightKg: s.additionalWeightKg,
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
            text2: `${items[currentIndex]?.exerciseId?.name ?? 'Exercice'} : ${weightNum} kg (5-8 reps)`,
            visibilityTime: 3500,
          });
        } else if (isAdditionalPR || isBodyweightPR) {
          Toast.show({
            type: 'success',
            text1: 'Nouveau record personnel',
            text2: isBodyweightPR ? `${repsNum} reps au poids du corps` : `Poids du corps + ${additionalWeightKg} kg`,
            visibilityTime: 3500,
          });
        }
      }

      const nextIncompleteAfterSave = updatedLogs.findIndex((set) => !set?.completed);
      const nextRunnerSet = nextIncompleteAfterSave >= 0 ? nextIncompleteAfterSave : 0;
      const nextLogsMap = {
        ...setLogs,
        [currentIndex]: updatedLogs,
      };

      // 3. Persist IMMEDIATELY to local storage (synchronous guarantee on force-close)
      const date = getLocalDateKey(new Date());
      await workoutProgressStorage.recordSet(date, sessionTemplateId, currentIndex, setIdx, log);
      await useActiveWorkoutPersistStore.getState().saveImmediate({
        v: 1,
        workoutSessionId: activeWorkoutSessionId,
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
                    videoVariants: it.exerciseId.videoVariants,
                    videoPosterUrl: it.exerciseId.videoPosterUrl,
                    videoHlsUrl: it.exerciseId.videoHlsUrl,
                    videoDurationSec: it.exerciseId.videoDurationSec,
                    supportedLoadModes: it.exerciseId.supportedLoadModes,
                    defaultLoadMode: it.exerciseId.defaultLoadMode,
                    supportsAdditionalWeight: it.exerciseId.supportsAdditionalWeight,
                    defaultWeight: it.exerciseId.defaultWeight,
            },
            alternatives: it.alternatives,
            sets: it.sets,
            reps: typeof it.reps === 'string' ? it.reps : formatReps(it.reps),
            restSeconds: it.restSeconds,
            order: it.order,
          clientInstruction: it.clientInstruction,
          instruction: it.instruction,
          message: it.message,
          notes: it.notes,
          })),
        },
        currentIndex,
        runnerSetIndex: nextRunnerSet,
        positionSeconds: positionSecondsRef.current,
        isPaused,
        setLogs: nextLogsMap,
        startedAt: sessionStartTime.current,
        updatedAt: Date.now(),
      });
      setSetLogs(nextLogsMap);

      // 4. Save to backend asynchronously (tolerant to offline/temporary connectivity loss)
      if (resolvedExerciseId) {
        const completedLogs = updatedLogs.filter((s) => s?.completed);
        const syncRequests: Promise<unknown>[] = [workoutService.upsertExerciseHistory(
          resolvedExerciseId,
          completedLogs.map((s, i) => ({
            setNumber: i + 1,
            reps: s.reps ?? 0,
            weightKg: s.weightKg ?? 0,
            loadMode: s.loadMode,
            externalWeightKg: s.externalWeightKg,
            additionalWeightKg: s.additionalWeightKg,
            completedAt: s.completedAt ?? new Date().toISOString(),
          }))
        )];

        if (activeWorkoutSessionId) {
          syncRequests.push(workoutService.updateExerciseSet(
            activeWorkoutSessionId,
            resolvedExerciseId,
            setIdx + 1,
            Number(weightKg ?? 0),
            reps,
            undefined,
            { loadMode, externalWeightKg, additionalWeightKg }
          ));
        }
        void Promise.all(syncRequests).then(async () => {
          const synced = { ...log, syncStatus: 'synced' as const };
          updateSetLog(currentIndex, setIdx, synced);
          await workoutProgressStorage.recordSet(date, sessionTemplateId, currentIndex, setIdx, synced);
        }).catch(async (err) => {
          const failed = { ...log, syncStatus: 'failed' as const };
          updateSetLog(currentIndex, setIdx, failed);
          await workoutProgressStorage.recordSet(date, sessionTemplateId, currentIndex, setIdx, failed);
          if (__DEV__) console.warn('Workout set sync pending:', err);
        });
      }

      setRecommendedWeightForNextSet(recommendedNextKg);
      setSavingSet(false);
      setSetRunnerVisible(false);
      isSavingSetRef.current = false;

      if (wasAlreadyCompleted) {
        Toast.show({ type: 'success', text1: 'Serie mise a jour', text2: formatSetLoad(log) });
        return;
      }

      if (isLastSet) {
        if (resolvedExerciseId && activeWorkoutSessionId) {
          workoutService.completeExercise(activeWorkoutSessionId, resolvedExerciseId).catch(() => {});
        }
        void playExerciseCompleteSound();
        if (currentIndex < items.length - 1) {
          setUnlockedIndex((prev) => Math.max(prev, currentIndex + 1));
          setRestSeconds(Math.max(restSec, MIN_REST_SECONDS));
          setManualRestTimer(false);
          setRestVisible(true);
        } else {
          // Last set of the last exercise: workout complete! Finalize immediately without extra rest timer
          void finalizeSession();
        }
      } else {
        const nextIncomplete = updatedLogs.findIndex((s) => !s?.completed);
        setRunnerSetIndex(nextIncomplete >= 0 ? nextIncomplete : setIdx + 1);
      }
    },
    [
      currentIndex,
      items,
      runnerSetIndex,
      setLogs,
      sets,
      restSec,
      sessionTemplateId,
      session,
      activeWorkoutSessionId,
      isPaused,
      updateSetLog,
      playExerciseCompleteSound,
      exerciseHistories,
    ]
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
          setNumber: i + 1,
          reps: s.reps ?? 0,
          weightKg: s.weightKg ?? 0,
          loadMode: s.loadMode,
          externalWeightKg: s.externalWeightKg,
          additionalWeightKg: s.additionalWeightKg,
          completedAt: s.completedAt ?? new Date().toISOString(),
        })),
      };
    }).filter((ex) => !!ex.exerciseId) as Array<{
      exerciseId: string;
      exerciseName: string;
      sets: Array<{ setNumber: number; reps: number; weightKg: number; loadMode?: ExerciseLoadMode; externalWeightKg?: number; additionalWeightKg?: number; completedAt: string }>;
    }>;

    let completionType: 'normal' | 'rattrapage' = (route.params as any)?.completionType ?? 'normal';
    let originalScheduledDate: string | undefined = (route.params as any)?.originalScheduledDate;

    try {
      const metaRaw = await AsyncStorage.getItem('@dt_rattrapage_meta');
      if (metaRaw) {
        const meta = JSON.parse(metaRaw);
        if (meta?.completionType) completionType = meta.completionType;
        if (meta?.originalScheduledDate) originalScheduledDate = meta.originalScheduledDate;
        await AsyncStorage.removeItem('@dt_rattrapage_meta');
      }
    } catch {}

    let workoutSessionId = '';
    try {
      const result = await workoutService.completeSession({
        sessionTemplateId,
        durationSeconds,
        exercises: exerciseLogs,
        completionType,
        originalScheduledDate,
        workoutSessionId: activeWorkoutSessionId,
      });
      workoutSessionId = result.sessionId ?? '';
    } catch (err: any) {
      const status = err?.response?.status;
      const code = err?.response?.data?.code;
      if (status === 410 || (status === 409 && code === 'RATTRAPAGE_NOT_ELIGIBLE')) {
        // Server is the source of truth: never mark this session as validated locally.
        await useActiveWorkoutPersistStore.getState().clearPersisted(sessionTemplateId);
        Toast.show({
          type: 'error',
          text1: status === 410 ? 'Séance expirée' : 'Rattrapage indisponible',
          text2: err?.response?.data?.message,
        });
        allowNavigationWithoutConfirm.current = true;
        navigation.goBack();
        return;
      }
      console.error('completeSession failed:', err);
    }

    const todayKey = getLocalDateKey(new Date());
    await workoutProgressStorage.markCompleted(todayKey, sessionTemplateId);
    if (originalScheduledDate) {
      await workoutProgressStorage.markCompleted(originalScheduledDate, sessionTemplateId);
    }

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

    await useActiveWorkoutPersistStore.getState().clearPersisted(sessionTemplateId);
    sessionCompleteRef.current = true;
    setPendingNavParams({
      sessionId: sessionTemplateId,
      workoutSessionId,
      exercises: items.map((item) => ({ _id: item.exerciseId._id, name: item.exerciseId.name, muscleGroup: item.exerciseId.muscleGroup ?? '' })),
      completedExercises: completedCount,
    });
    void playWorkoutCompleteSound();
    setSessionComplete(true);
  }, [fetchHistoryForExercise, items, sessionTemplateId, setLogs, route.params, playWorkoutCompleteSound, activeWorkoutSessionId, navigation]);

  const handleRestComplete = useCallback(async () => {
    if (isAdvancingRef.current) return;
    isAdvancingRef.current = true;
    setRestVisible(false);

    try {
      if (currentIndex < items.length - 1) {
        const nextIndex = currentIndex + 1;
        setUnlockedIndex((prev) => Math.max(prev, nextIndex));
        setItems((prev) =>
          applyEffectiveExercises(prev, originalSlots.current, slotSelections.current, lockedPerformedSlots(prev))
        );
        setCurrentIndex(nextIndex);
        setRunnerSetIndex(0);
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });

        void useActiveWorkoutPersistStore.getState().saveImmediate({
          v: 1,
          workoutSessionId: activeWorkoutSessionId,
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
                    videoVariants: it.exerciseId.videoVariants,
                    videoPosterUrl: it.exerciseId.videoPosterUrl,
                    videoHlsUrl: it.exerciseId.videoHlsUrl,
                    videoDurationSec: it.exerciseId.videoDurationSec,
                    supportedLoadModes: it.exerciseId.supportedLoadModes,
                    defaultLoadMode: it.exerciseId.defaultLoadMode,
                    supportsAdditionalWeight: it.exerciseId.supportsAdditionalWeight,
                    defaultWeight: it.exerciseId.defaultWeight,
              },
              alternatives: it.alternatives,
              sets: it.sets,
              reps: typeof it.reps === 'string' ? it.reps : formatReps(it.reps),
              restSeconds: it.restSeconds,
              order: it.order,
          clientInstruction: it.clientInstruction,
          instruction: it.instruction,
          message: it.message,
          notes: it.notes,
            })),
          },
          currentIndex: nextIndex,
          runnerSetIndex: 0,
          positionSeconds: 0,
          isPaused: false,
          setLogs,
          startedAt: sessionStartTime.current,
          updatedAt: Date.now(),
        });

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
  }, [currentIndex, finalizeSession, items, session, sessionTemplateId, activeWorkoutSessionId, setLogs]);

  const handleSwapAlternative = useCallback((alt: AlternativeOption) => {
    const slotDefs: SlotDef<any>[] = Object.keys(originalSlots.current)
      .map(Number)
      .sort((x, y) => x - y)
      .map((i) => ({
        primary: { ...originalSlots.current[i].primary, _id: resolveExerciseId(originalSlots.current[i].primary) ?? '' },
        alternatives: originalSlots.current[i].alternatives.map((a: any) => ({ ...a, _id: resolveExerciseId(a) ?? '' })),
      }));
    slotSelections.current = applyExplicitSelection(slotSelections.current, slotDefs, currentIndex, alt._id);
    setItems((prev) =>
      applyEffectiveExercises(prev, originalSlots.current, slotSelections.current, lockedPerformedSlots(prev))
    );
    if (alt._id) {
      void fetchHistoryForExercise(alt._id, true);
    }
    setRecommendedWeightForNextSet(undefined);
    setRunnerSetIndex(0);
    setVideoErrors((prev) => ({ ...prev, [currentIndex]: false }));
    setShowAlternatives(false);
  }, [currentIndex, fetchHistoryForExercise, lockedPerformedSlots]);

  const handleTapVideo = useCallback(() => {
    setIsPaused((p) => !p);
  }, []);

  const isSlowMotion = Math.abs(playbackSpeed - 0.75) < 0.05;

  const handleToggleSlowMotion = useCallback(() => {
    setPlaybackSpeed((curr) => (Math.abs(curr - 0.75) < 0.05 ? 1.0 : 0.75));
  }, []);

  const getIsExerciseMuted = useCallback(
    (exerciseIndex: number): boolean => {
      // If user has explicitly toggled sound for this exercise, use that override
      if (userMutedOverrideByExercise[exerciseIndex] !== undefined) {
        return userMutedOverrideByExercise[exerciseIndex];
      }
      // First playback of the exercise video: SOUND ON
      // From the second playback onward (after first loop completes): MUTED
      if (firstLoopCompletedByExercise[exerciseIndex]) {
        return true;
      }
      return false;
    },
    [userMutedOverrideByExercise, firstLoopCompletedByExercise]
  );

  const handleToggleSound = useCallback(
    (exerciseIndex: number) => {
      const currentlyMuted = getIsExerciseMuted(exerciseIndex);
      const nextMuted = !currentlyMuted;
      setUserMutedOverrideByExercise((prev) => ({
        ...prev,
        [exerciseIndex]: nextMuted,
      }));
    },
    [getIsExerciseMuted]
  );

  const handleVideoLoopComplete = useCallback((exerciseIndex: number) => {
    setFirstLoopCompletedByExercise((prev) => {
      if (prev[exerciseIndex]) return prev;
      return { ...prev, [exerciseIndex]: true };
    });
  }, []);

  const renderItem = useCallback(({ item, index }: { item: SessionItem; index: number }) => {
    const ex = item.exerciseId;
    const isActive = index === currentIndex;
    const numSets = item.sets ?? 3;
    const logs = setLogs[index] ?? Array.from({ length: numSets }, () => ({ completed: false }));
    const doneCount = logs.filter((s) => s.completed).length;
    const activeSetIndex = logs.findIndex((set) => !set?.completed);
    const hasStarted = doneCount > 0;
    const isExDone = doneCount >= numSets;
    const resolvedUri = resolveVideoUrl(ex.videoUrl);
    const hasVideo = (resolvedUri || ex.videoSource === 'youtube') && !videoErrors[index];
    const historyKey = resolveExerciseId(ex);
    const history = historyKey ? exerciseHistories[historyKey] : undefined;
    const savingCurrent = historyKey ? !!savingCurrentByExercise[historyKey] : false;
    const isExerciseMuted = getIsExerciseMuted(index);
    const hasAlternatives = (item.alternatives?.length ?? 0) > 0;
    const exerciseDefaultLoadMode = resolveDefaultLoadMode(ex);
    const prValue = exerciseDefaultLoadMode === 'bodyweight'
      ? history?.personalRecords?.bodyweightMaxReps ?? null
      : exerciseDefaultLoadMode === 'bodyweight_plus_weight'
        ? history?.personalRecords?.additionalWeightKg ?? null
        : history?.personalRecords?.externalWeightKg ?? history?.personalRecord ?? null;
    const prUnit = exerciseDefaultLoadMode === 'bodyweight' ? ' reps' : 'kg';

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
          onScroll={(e) => {
            if (isActive) {
              const offsetX = e.nativeEvent.contentOffset.x;
              isHistoryOpenRef.current = offsetX >= width * 0.4;
            }
          }}
          onMomentumScrollEnd={(e) => {
            if (isActive) {
              const offsetX = e.nativeEvent.contentOffset.x;
              isHistoryOpenRef.current = offsetX >= width * 0.4;
            }
          }}
        >
          {/* ── Video / exercise page ─────────────────────────────────── */}
          <View style={[styles.slidePage, { width }]}>
            {hasVideo ? (
              isActive ? (
                <ReelsVideoPlayer
                  ref={activeVideoRef}
                  videoSource={ex.videoSource ?? (ex.videoUrl && /youtube\.com|youtu\.be/i.test(ex.videoUrl) ? 'youtube' : 'external')}
                  videoUrl={ex.videoUrl}
                  variants={ex.videoVariants}
                  posterUrl={ex.videoPosterUrl}
                  hlsUrl={ex.videoHlsUrl}
                  durationSec={ex.videoDurationSec}
                  resolvedUri={resolvedUri ?? undefined}
                  isActive
                  isPaused={isPaused}
                  isMuted={isExerciseMuted}
                  playbackRate={playbackSpeed}
                  onTap={handleTapVideo}
                  onMutedChange={(m) => {
                    setUserMutedOverrideByExercise((prev) => ({
                      ...prev,
                      [index]: m,
                    }));
                  }}
                  onLoopComplete={() => handleVideoLoopComplete(index)}
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
                <View style={styles.topBarLeft}>
                  <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topBtn} hitSlop={12} activeOpacity={0.8}>
                    <View style={styles.topBtnInner}>
                      <Ionicons name="chevron-back" size={22} color="#fff" />
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.topBarTitle} numberOfLines={1}>{ex.name}</Text>
                </View>

                <View style={styles.topBarRight}>
                  {/* Compact exercise progress: e.g. 3/9 */}
                  <View style={styles.compactProgressBadge}>
                    <Text style={styles.compactProgressText}>{index + 1}/{items.length}</Text>
                  </View>

                  {/* Simplified PR Badge next to progress: Clean typography in DietTemple gold, NO trophy */}
                  <TouchableOpacity
                    style={styles.compactPrBadge}
                    onPress={() => {
                      isHistoryOpenRef.current = true;
                      horizontalScrollRefs.current[index]?.scrollTo({ x: width, animated: true });
                    }}
                    activeOpacity={0.8}
                    hitSlop={8}
                  >
                    <Text style={styles.compactPrText}>PR</Text>
                    {prValue != null ? (
                      <Text style={styles.compactPrValText}>{prValue}{prUnit}</Text>
                    ) : null}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Coach message: Messenger-style chat head (drag, tap to open/close, drag to X to remove) */}
            {isActive && currentCoachInstruction ? (
              <CoachChatHead
                key={`coach-head-${index}`}
                instruction={currentCoachInstruction}
                slotKey={`${sessionTemplateId}:${index}`}
              />
            ) : null}

            {/* Swipe hint */}
            {isActive && (
              <View style={styles.swipeHintWrap} pointerEvents="none">
                <SwipeHint />
              </View>
            )}

            {/* Left action rail: Slow Motion & Sound */}
            {isActive && (
              <View style={styles.leftRail}>
                {/* Slow motion */}
                <TouchableOpacity
                  style={[styles.railBtn, isSlowMotion && styles.railBtnActive]}
                  onPress={handleToggleSlowMotion}
                  activeOpacity={0.8}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={isSlowMotion ? 'Désactiver le ralenti' : 'Ralenti 0.75×'}
                >
                  <MaterialCommunityIcons
                    name="snail"
                    size={20}
                    color={isSlowMotion ? '#000' : 'rgba(255,255,255,0.9)'}
                  />
                </TouchableOpacity>

                {/* Mute / unmute */}
                <TouchableOpacity
                  style={[styles.railBtn, !isExerciseMuted && styles.railBtnAccent]}
                  onPress={() => handleToggleSound(index)}
                  activeOpacity={0.8}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={isExerciseMuted ? 'Activer le son' : 'Couper le son'}
                >
                  <Ionicons
                    name={isExerciseMuted ? 'volume-mute' : 'volume-high'}
                    size={20}
                    color={isExerciseMuted ? 'rgba(255,255,255,0.6)' : ACCENT}
                  />
                </TouchableOpacity>

                {/* Quality */}
                <TouchableOpacity
                  style={styles.railBtn}
                  onPress={() => setShowQualitySheet(true)}
                  activeOpacity={0.8}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Qualité vidéo"
                >
                  <Ionicons name="settings-outline" size={18} color="rgba(255,255,255,0.75)" />
                </TouchableOpacity>
              </View>
            )}

            {/* Right action rail: History & Alternative */}
            {isActive && (
              <View style={styles.rightRail}>
                {/* History */}
                <TouchableOpacity
                  style={styles.railBtn}
                  onPress={() => {
                    isHistoryOpenRef.current = true;
                    horizontalScrollRefs.current[index]?.scrollTo({ x: width, animated: true });
                  }}
                  activeOpacity={0.8}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Historique"
                >
                  <Ionicons name="time-outline" size={20} color="rgba(255,255,255,0.9)" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.railBtn}
                  onPress={() => {
                    setRestSeconds(Math.max(item.restSeconds ?? MIN_REST_SECONDS, MIN_REST_SECONDS));
                    setManualRestTimer(true);
                    setRestVisible(true);
                  }}
                  activeOpacity={0.8}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Minuteur de repos"
                >
                  <Ionicons name="timer-outline" size={20} color="rgba(255,255,255,0.9)" />
                </TouchableOpacity>

                {/* Swap alternative */}
                <TouchableOpacity
                  style={[styles.railBtn, !hasAlternatives && styles.railBtnDisabled]}
                  onPress={() => {
                    if (hasAlternatives) {
                      setShowAlternatives(true);
                    } else {
                      Toast.show({
                        type: 'info',
                        text1: 'Aucune alternative',
                        text2: 'Aucune variante disponible pour cet exercice.',
                        visibilityTime: 1800,
                      });
                    }
                  }}
                  activeOpacity={hasAlternatives ? 0.8 : 0.9}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Exercice alternatif"
                >
                  <Ionicons
                    name="swap-horizontal"
                    size={20}
                    color={hasAlternatives ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)'}
                  />
                </TouchableOpacity>
              </View>
            )}

            {/* Bottom overlay */}
            <View style={styles.bottomOverlay} pointerEvents="box-none">
              {/* Exercise name */}
              <Text style={styles.exerciseName} numberOfLines={1}>{ex.name}</Text>

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
                <View style={styles.setDots} accessibilityRole="list">
                  {Array.from({ length: numSets }).map((_, si) => {
                    const completed = !!logs[si]?.completed;
                    const current = !completed && si === activeSetIndex;
                    return (
                      <Pressable
                        key={si}
                        accessibilityRole="button"
                        accessibilityLabel={`Serie ${si + 1}, ${completed ? 'terminee, toucher pour modifier' : current ? 'en cours' : 'a faire'}`}
                        onPress={() => {
                          if (!completed) return;
                          setRunnerSetIndex(si);
                          setSetRunnerVisible(true);
                        }}
                        style={({ pressed }) => [
                          styles.setProgressItem,
                          completed && styles.setProgressDone,
                          current && styles.setProgressCurrent,
                          pressed && completed && { opacity: 0.72 },
                        ]}
                      >
                        <Ionicons
                          name={completed ? 'checkmark' : current ? 'ellipse' : 'ellipse-outline'}
                          size={12}
                          color={completed ? '#07120A' : current ? '#111' : 'rgba(255,255,255,0.6)'}
                        />
                        <Text style={[styles.setProgressText, (completed || current) && styles.setProgressTextActive]}>S{si + 1}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.setPill}>
                  <Ionicons name={isExDone ? 'checkmark-done' : 'flash'} size={11} color={ACCENT} />
                  <Text style={styles.setPillText}>{isExDone ? 'Termine' : `S${Math.max(0, activeSetIndex) + 1} en cours`}</Text>
                </View>
              </View>

              {/* Action buttons */}
              {isActive && (
                <View style={styles.actionRow}>

                  <TouchableOpacity
                    style={[styles.mainCta, isExDone && styles.mainCtaDone]}
                    onPress={
                      isExDone && currentIndex < items.length - 1
                        ? () => {
                            const nextIndex = currentIndex + 1;
                            setUnlockedIndex((prev) => Math.max(prev, nextIndex));
                            setCurrentIndex(nextIndex);
                            setRunnerSetIndex(0);
                            flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
                            void useActiveWorkoutPersistStore.getState().saveImmediate({
                              v: 1,
                              workoutSessionId: activeWorkoutSessionId,
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
                    videoVariants: it.exerciseId.videoVariants,
                    videoPosterUrl: it.exerciseId.videoPosterUrl,
                    videoHlsUrl: it.exerciseId.videoHlsUrl,
                    videoDurationSec: it.exerciseId.videoDurationSec,
                    supportedLoadModes: it.exerciseId.supportedLoadModes,
                    defaultLoadMode: it.exerciseId.defaultLoadMode,
                    supportsAdditionalWeight: it.exerciseId.supportsAdditionalWeight,
                    defaultWeight: it.exerciseId.defaultWeight,
                                  },
                                  alternatives: it.alternatives,
                                  sets: it.sets,
                                  reps: typeof it.reps === 'string' ? it.reps : formatReps(it.reps),
                                  restSeconds: it.restSeconds,
                                  order: it.order,
          clientInstruction: it.clientInstruction,
          instruction: it.instruction,
          message: it.message,
          notes: it.notes,
                                })),
                              },
                              currentIndex: nextIndex,
                              runnerSetIndex: 0,
                              positionSeconds: 0,
                              isPaused: false,
                              setLogs,
                              startedAt: sessionStartTime.current,
                              updatedAt: Date.now(),
                            });
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
              const mode = logs[setIdx]?.loadMode ?? resolveDefaultLoadMode(ex);
              updateCurrentInputLog(index, setIdx, {
                weightKg,
                loadMode: mode,
                externalWeightKg: mode === 'external_weight' ? weightKg : 0,
                additionalWeightKg: mode === 'bodyweight_plus_weight' ? weightKg : 0,
              });
            }}
            onSaveCurrent={() => {
              void saveCurrentExerciseHistory(index);
            }}
            savingCurrent={savingCurrent}
            onBackToReel={() => {
              isHistoryOpenRef.current = false;
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
    playbackSpeed,
    isSlowMotion,
    maxUnlockedIndex,
    session?.title,
    handleTapVideo,
    getIsExerciseMuted,
    handleToggleSound,
    handleToggleSlowMotion,
    handleVideoLoopComplete,
    videoErrors,
    exerciseHistories,
    navigation,
    finalizeSession,
    resumeSeekSeconds,
    setPipActive,
    parseNumericInput,
    saveCurrentExerciseHistory,
    savingCurrentByExercise,
    updateCurrentInputLog,
  ]);

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

  if (gymGate !== 'ready' || !isHydrated) {
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 }]}>
        <StatusBar style="light" />
        {gymGate === 'loading' || !isHydrated ? (
          <>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={{ color: '#fff', fontSize: 16, marginTop: 16, fontWeight: '600' }}>
              {gymGate === 'loading' ? 'Vérification…' : 'Reprise de votre séance…'}
            </Text>
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
        extraData={[setLogs, currentIndex, unlockedIndex, videoErrors, sessionComplete]}
        pagingEnabled
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEnabled={!setRunnerVisible && !restVisible}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
        initialScrollIndex={currentIndex}
        windowSize={3}
        maxToRenderPerBatch={2}
        initialNumToRender={2}
        removeClippedSubviews={false}
        onMomentumScrollEnd={handleMomentumEnd}
      />
      <RestTimer
        visible={restVisible}
        seconds={restSeconds}
        onComplete={manualRestTimer ? () => { setRestVisible(false); setManualRestTimer(false); } : handleRestComplete}
        onSkip={manualRestTimer ? () => { setRestVisible(false); setManualRestTimer(false); } : handleRestComplete}
        redBelowSeconds={20}
      />
      <SetRunnerOverlay
        visible={setRunnerVisible}
        currentSetIndex={runnerSetIndex}
        totalSets={sets}
        previousLogs={previousLogsForRunner}
        currentLog={logsForRunner[runnerSetIndex]}
        supportedLoadModes={currentLoadModes}
        defaultLoadMode={currentDefaultLoadMode}
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
      <QualitySheet
        visible={showQualitySheet}
        onClose={() => setShowQualitySheet(false)}
        variants={items[currentIndex]?.exerciseId?.videoVariants}
        hasHls={!!items[currentIndex]?.exerciseId?.videoHlsUrl}
      />
      <QuitSessionModal
        visible={quitVisible}
        exerciseText={`Exercice ${Math.min(currentIndex + 1, items.length)}/${items.length}`}
        setsText={(() => {
          const done = Object.values(setLogs).flat().filter((l) => l?.completed).length;
          const total = items.reduce((n, it) => n + (it.sets ?? 3), 0);
          return `${done}/${total} séries`;
        })()}
        resumeUntilText={new Date(sessionStartTime.current + 20 * 60 * 60 * 1000).toLocaleString('fr-FR', {
          weekday: 'long',
          hour: '2-digit',
          minute: '2-digit',
        })}
        onStay={() => setQuitVisible(false)}
        onQuit={confirmQuit}
      />

      {/* Session complete overlay */}
      {sessionComplete && pendingNavParams && (
        <SessionCompleteOverlay
          totalExercises={pendingNavParams.exercises.length}
          onNavigate={() => {
            allowNavigationWithoutConfirm.current = true;
            sessionCompleteRef.current = true;
            navigation.replace('WorkoutCompletion', pendingNavParams);
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 44 : 54,
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 20,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 12,
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    flexShrink: 1,
    letterSpacing: -0.2,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactProgressBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  compactProgressText: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.5,
  },
  compactPrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.45)',
  },
  compactPrText: {
    fontSize: 12,
    fontWeight: '900',
    color: ACCENT,
    letterSpacing: 0.8,
  },
  compactPrValText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  topBtn: {},
  topBtnInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Swipe hint
  swipeHintWrap: {
    position: 'absolute',
    right: 14,
    top: '45%',
    zIndex: 15,
  },

  // Left & Right Action Rails — compact 44×44, icon-only
  leftRail: {
    position: 'absolute',
    left: 12,
    top: Platform.OS === 'android' ? 104 : 114,
    zIndex: 22,
    alignItems: 'center',
    gap: 8,
  },
  rightRail: {
    position: 'absolute',
    right: 12,
    top: Platform.OS === 'android' ? 104 : 114,
    zIndex: 22,
    alignItems: 'center',
    gap: 8,
  },
  railBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  railBtnActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  railBtnAccent: {
    borderColor: 'rgba(212,175,55,0.45)',
  },
  railBtnDisabled: {
    opacity: 0.38,
  },

  // Bottom overlay — leaner: less padding, smaller title
  bottomOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingBottom: 72, paddingTop: 14, zIndex: 20,
    // No solid background: just let the bottom LinearGradient do the job
  },
  exerciseName: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 6, lineHeight: 26, letterSpacing: -0.3 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  badge: {
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  badgeText: { color: ACCENT, fontSize: 11, fontWeight: '700' },

  // Sets row
  setsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  setDots: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 },
  setProgressItem: {
    minWidth: 46,
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(0,0,0,0.42)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  setProgressDone: { backgroundColor: '#35C56A', borderColor: '#35C56A' },
  setProgressCurrent: { backgroundColor: ACCENT, borderColor: ACCENT },
  setProgressText: { color: 'rgba(255,255,255,0.68)', fontSize: 11, fontWeight: '800' },
  setProgressTextActive: { color: '#07120A' },
  setPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.25)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  setPillText: { fontSize: 11, fontWeight: '800', color: ACCENT },

  // Action row
  actionRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 2 },
  altBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14,
  },
  altBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  mainCta: { flex: 1, borderRadius: 14, overflow: 'hidden', shadowColor: ACCENT, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  mainCtaDone: { shadowColor: '#22c55e' },
  mainCtaGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  mainCtaText: { fontSize: 16, fontWeight: '900', color: '#000' },
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
  backHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
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
  prTypographyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(212,175,55,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  prTypographyText: {
    fontSize: 16,
    fontWeight: '900',
    color: ACCENT,
    letterSpacing: 1,
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

// ── Coach Instruction modal styles ────────────────────────────────────────────

const qm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  card: {
    width: '100%', maxWidth: 380, borderRadius: 26, padding: 22, overflow: 'hidden',
    backgroundColor: '#141416', borderWidth: 1, borderColor: 'rgba(212,175,55,0.28)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.6, shadowRadius: 24, elevation: 24,
  },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 140 },
  iconWrap: {
    width: 60, height: 60, borderRadius: 30, alignSelf: 'center', marginBottom: 14,
    backgroundColor: 'rgba(212,175,55,0.12)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginTop: 6, marginBottom: 16 },
  infoBox: {
    borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14, paddingVertical: 4,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  infoIcon: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(212,175,55,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: { fontSize: 11.5, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  infoValue: { fontSize: 15, color: '#fff', fontWeight: '800', marginTop: 1, textTransform: 'capitalize' },
  infoDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  note: { fontSize: 12, lineHeight: 17, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: 12, marginBottom: 18 },
  primary: { borderRadius: 16, overflow: 'hidden' },
  primaryGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  primaryText: { fontSize: 16, fontWeight: '900', color: '#000' },
  secondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10,
    paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(248,113,113,0.4)',
    backgroundColor: 'rgba(248,113,113,0.08)',
  },
  secondaryText: { fontSize: 14.5, fontWeight: '800', color: '#F87171' },
});

const chat = StyleSheet.create({
  anchor: { position: 'absolute', left: 0, top: 0, width: HEAD_SIZE, height: HEAD_SIZE, zIndex: 60 },
  head: {
    width: HEAD_SIZE, height: HEAD_SIZE, borderRadius: HEAD_SIZE / 2, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 12,
  },
  badge: {
    position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5,
    backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  // incoming Messenger-style message: rounded, with the corner nearest the head flattened
  card: {
    position: 'absolute', top: 2,
    backgroundColor: '#2B2B30', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 8, elevation: 10,
  },
  cardName: { fontSize: 11.5, fontWeight: '800', color: ACCENT, marginBottom: 3 },
  cardText: { fontSize: 15, lineHeight: 21, color: '#fff' },
  trash: {
    position: 'absolute', bottom: 64, left: width / 2 - 32, width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.65)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center', zIndex: 59,
  },
  trashActive: { backgroundColor: '#EF4444', borderColor: '#fff' },
});

const cim = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 155,
    alignItems: 'center',
    zIndex: 45,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(16, 16, 16, 0.94)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.65)',
    padding: 16,
    overflow: 'hidden',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: ACCENT,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  closeBtn: {
    padding: 2,
  },
  bodyBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#F3F4F6',
    fontWeight: '600',
  },
  ctaBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  ctaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 0.6,
  },
});

