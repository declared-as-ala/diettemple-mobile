import { BRAND_YELLOW } from '../../constants/brand';
/**
 * Set Runner overlay: chronometer, Finish Set → reps/weight input → recommendation → auto-advance.
 * Single set at a time; parent controls currentSetIndex for horizontal flow.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Animated,
  ActivityIndicator,
  Dimensions,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  useWindowDimensions,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import type { SetLog } from '../../services/workoutProgressStorage';
import {
  LOAD_MODE_LABELS,
  defaultLoadMode as resolveDefaultLoadMode,
  type ExerciseLoadMode,
} from '../../utils/workoutLoad';

const vibrate = (ms: number) => {
  try {
    if (Platform.OS === 'web') return;
    const RN = require('react-native');
    if (RN.Vibration && typeof RN.Vibration.vibrate === 'function') RN.Vibration.vibrate(ms);
  } catch (_) {}
};

const ACCENT = BRAND_YELLOW;
const { width } = Dimensions.get('window');

export type SetRunnerStep = 'timer' | 'input' | 'recommendation' | 'completed';

export type WeightRecommendation = 'decrease' | 'increase' | 'maintain';

export interface SetRunnerOverlayProps {
  visible: boolean;
  currentSetIndex: number; // 0-based
  totalSets: number;
  /** Logs for previous sets (to get last weight for default and recommendation). */
  previousLogs: SetLog[];
  currentLog?: SetLog;
  supportedLoadModes?: ExerciseLoadMode[];
  defaultLoadMode?: ExerciseLoadMode;
  /** Target reps range; default 8–12. */
  targetRepsMin?: number;
  targetRepsMax?: number;
  /** Recommended starting weight for first set (e.g. from exercise config). */
  recommendedStartingWeight?: number;
  /** When true, Save/Continue buttons are disabled and a spinner is shown (parent is processing the save). */
  saving?: boolean;
  onCancel: () => void;
  /** Called after user saves a set (weight, reps, duration). Optional 4th: recommended weight for next set. */
  onFinishSet: (
    weightKg: number | undefined,
    reps: number,
    durationSeconds: number,
    recommendedNextKg?: number,
    loadMode?: ExerciseLoadMode,
    externalWeightKg?: number,
    additionalWeightKg?: number
  ) => void;
  /** Called when all sets for this exercise are done (after last set save). */
  onExerciseComplete?: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function getWeightRecommendation(
  reps: number,
  lastWeight: number | undefined,
  targetMin: number,
  targetMax: number
): { recommendation: WeightRecommendation; suggestedKg: number; message: string } {
  const weight = lastWeight ?? 0;
  if (reps < targetMin) {
    const suggested = Math.max(0, weight - 2);
    return {
      recommendation: 'decrease',
      suggestedKg: suggested,
      message: `Recommandation : diminuer de 2 kg à la prochaine série${suggested !== weight ? ` (essayer ${suggested} kg)` : ''}.`,
    };
  }
  if (reps > targetMax) {
    const suggested = weight + 2;
    return {
      recommendation: 'increase',
      suggestedKg: suggested,
      message: `Recommandation : augmenter de 2 kg à la prochaine série (essayer ${suggested} kg).`,
    };
  }
  return {
    recommendation: 'maintain',
    suggestedKg: weight,
    message: 'Recommandation : garder le même poids.',
  };
}

export default function SetRunnerOverlay({
  visible,
  currentSetIndex,
  totalSets,
  previousLogs,
  currentLog,
  supportedLoadModes = ['external_weight'],
  defaultLoadMode,
  targetRepsMin = 8,
  targetRepsMax = 12,
  recommendedStartingWeight,
  saving = false,
  onCancel,
  onFinishSet,
  onExerciseComplete,
}: SetRunnerOverlayProps) {
  const { colors } = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<SetRunnerStep>('timer');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [repsInput, setRepsInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loadMode, setLoadMode] = useState<ExerciseLoadMode>(
    defaultLoadMode && supportedLoadModes.includes(defaultLoadMode)
      ? defaultLoadMode
      : resolveDefaultLoadMode({ supportedLoadModes })
  );
  const [lastRecommendation, setLastRecommendation] = useState<{
    message: string;
    suggestedKg: number;
  } | null>(null);
  const [pendingAdvance, setPendingAdvance] = useState<{
    weightKg: number | undefined;
    reps: number;
    duration: number;
    suggestedKg: number;
    loadMode: ExerciseLoadMode;
    externalWeightKg: number;
    additionalWeightKg: number;
  } | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setNumber = currentSetIndex + 1;
  const isWideLayout = windowWidth >= 900 || windowWidth > windowHeight;
  const isLastSet = currentSetIndex >= totalSets - 1;
  const isEditing = !!currentLog?.completed;
  const lastLoggedWeight =
    previousLogs.length > 0 ? previousLogs[previousLogs.length - 1]?.weightKg : undefined;
  const lastWeight =
    currentSetIndex > 0
      ? (recommendedStartingWeight ?? lastLoggedWeight)
      : (lastLoggedWeight ?? recommendedStartingWeight);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Completed sets reopen directly in edit mode; new sets start the timer.
  useEffect(() => {
    if (!visible) return;
    const nextMode = currentLog?.loadMode ?? (
      defaultLoadMode && supportedLoadModes.includes(defaultLoadMode)
        ? defaultLoadMode
        : supportedLoadModes[0] ?? 'external_weight'
    );
    setLoadMode(nextMode);
    setStep(isEditing ? 'input' : 'timer');
    setElapsedSeconds(currentLog?.durationSeconds ?? 0);
    setRepsInput(currentLog?.reps != null ? String(currentLog.reps) : '');
    const storedWeight = nextMode === 'bodyweight_plus_weight'
      ? currentLog?.additionalWeightKg ?? currentLog?.weightKg
      : currentLog?.externalWeightKg ?? currentLog?.weightKg ?? lastWeight;
    setWeightInput(nextMode === 'bodyweight' || storedWeight == null ? '' : String(storedWeight));
    setLastRecommendation(null);
    setPendingAdvance(null);
    setValidationError(null);
    if (!isEditing) startTimer();
    return () => stopTimer();
  }, [visible, currentSetIndex, currentLog, defaultLoadMode, supportedLoadModes, isEditing, lastWeight, startTimer, stopTimer]);

  // Slide animation when set index changes (horizontal advance)
  useEffect(() => {
    if (!visible) return;
    slideAnim.setValue(0);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, currentSetIndex]);

  const handleFinishSetPress = useCallback(() => {
    stopTimer();
    vibrate(50);
    setStep('input');
    const defaultWeight = currentSetIndex > 0
      ? (recommendedStartingWeight ?? lastLoggedWeight)
      : (lastLoggedWeight ?? recommendedStartingWeight);
    setWeightInput(defaultWeight != null ? String(defaultWeight) : '');
  }, [stopTimer, currentSetIndex, recommendedStartingWeight, lastLoggedWeight]);

  const handleSave = useCallback(() => {
    const reps = parseInt(repsInput.trim(), 10);
    if (Number.isNaN(reps) || reps <= 0 || reps > 1000) {
      setValidationError('Saisis un nombre de repetitions entre 1 et 1000.');
      return;
    }
    const parsedWeight = weightInput.trim() ? Number(weightInput.trim().replace(',', '.')) : 0;
    if (loadMode !== 'bodyweight' && (!Number.isFinite(parsedWeight) || parsedWeight < 0 || parsedWeight > 1000)) {
      setValidationError('La charge doit etre comprise entre 0 et 1000 kg.');
      return;
    }
    if (loadMode === 'bodyweight_plus_weight' && parsedWeight <= 0) {
      setValidationError('Ajoute une charge superieure a 0 kg.');
      return;
    }
    setValidationError(null);
    const externalWeightKg = loadMode === 'external_weight' ? parsedWeight : 0;
    const additionalWeightKg = loadMode === 'bodyweight_plus_weight' ? parsedWeight : 0;
    const weightKg = loadMode === 'bodyweight' ? 0 : parsedWeight;
    const duration = elapsedSeconds;
    vibrate(50);

    const { message, suggestedKg } = loadMode === 'bodyweight'
      ? { message: 'Serie au poids du corps enregistree.', suggestedKg: 0 }
      : getWeightRecommendation(reps, weightKg ?? lastWeight, targetRepsMin, targetRepsMax);
    setLastRecommendation({ message, suggestedKg });
    setPendingAdvance({
      weightKg,
      reps,
      duration,
      suggestedKg,
      loadMode,
      externalWeightKg,
      additionalWeightKg,
    });
    setStep('recommendation');
  }, [
    repsInput,
    weightInput,
    lastWeight,
    targetRepsMin,
    targetRepsMax,
    elapsedSeconds,
    loadMode,
  ]);

  const handleContinue = useCallback(() => {
    if (!pendingAdvance) return;
    onFinishSet(
      pendingAdvance.weightKg,
      pendingAdvance.reps,
      pendingAdvance.duration,
      pendingAdvance.suggestedKg,
      pendingAdvance.loadMode,
      pendingAdvance.externalWeightKg,
      pendingAdvance.additionalWeightKg
    );
    if (isLastSet && onExerciseComplete) {
      onExerciseComplete();
    }
  }, [pendingAdvance, onFinishSet, isLastSet, onExerciseComplete]);

  const handleCancel = useCallback(() => {
    stopTimer();
    onCancel();
  }, [stopTimer, onCancel]);

  if (!visible) return null;

  /**
   * Bottom padding for the sheet:
   * - Phone bottom sheet: leave space for the safe-area inset and a comfortable margin
   *   so the Save button is never under the keyboard on small Android screens.
   * - Side sheet (tablet/landscape): less margin since it floats on the right.
   */
  const sheetBottomPad = isWideLayout ? 24 : Math.max(insets.bottom, 16) + 16;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight ?? 0)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => {}} />
        </TouchableWithoutFeedback>
        <Animated.View
          style={[
            styles.sheet,
            isWideLayout ? styles.sheetSide : styles.sheetBottom,
            { paddingBottom: sheetBottomPad },
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
          ]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
            bounces={false}
          >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {step === 'timer' && (
            <>
              <Text style={[styles.setHeader, { color: colors.text }]}>
                Série {setNumber} / {totalSets}
              </Text>
              <View style={styles.chronoWrap}>
                <Text style={styles.chrono}>{formatTime(elapsedSeconds)}</Text>
              </View>
              <View style={styles.timerActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={handleCancel}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.finishBtn}
                  onPress={handleFinishSetPress}
                  activeOpacity={0.8}
                >
                  <Text style={styles.finishBtnText}>Terminer la série</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === 'input' && (
            <>
              <Text style={[styles.setHeader, { color: colors.text }]}>{isEditing ? `Modifier la série ${setNumber}` : 'Enregistrer la série'}</Text>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nombre de reps ?</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                placeholder="Reps"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                value={repsInput}
                onChangeText={(value) => { setRepsInput(value); setValidationError(null); }}
                autoFocus
                returnKeyType="next"
              />
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Mode de charge</Text>
              <View style={styles.modeList}>
                {supportedLoadModes.map((mode) => {
                  const selected = loadMode === mode;
                  return (
                    <Pressable
                      key={mode}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        setLoadMode(mode);
                        setValidationError(null);
                        if (mode === 'bodyweight') setWeightInput('');
                      }}
                      style={({ pressed }) => [styles.modeOption, selected && styles.modeOptionSelected, pressed && { opacity: 0.78 }]}
                    >
                      <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={selected ? ACCENT : colors.textSecondary} />
                      <Text style={[styles.modeOptionText, { color: selected ? colors.text : colors.textSecondary }]}>{LOAD_MODE_LABELS[mode]}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {loadMode !== 'bodyweight' && (
                <>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    {loadMode === 'bodyweight_plus_weight' ? 'Charge additionnelle (kg)' : 'Charge externe (kg)'}
                  </Text>
                  <View style={styles.weightRow}>
                    <Pressable accessibilityRole="button" accessibilityLabel="Diminuer de 2,5 kg" onPress={() => setWeightInput(String(Math.max(0, (Number(weightInput.replace(',', '.')) || 0) - 2.5)))} style={styles.stepperBtn}>
                      <Ionicons name="remove" size={20} color={colors.text} />
                    </Pressable>
                    <TextInput
                      accessibilityLabel={loadMode === 'bodyweight_plus_weight' ? 'Charge additionnelle en kilogrammes' : 'Charge externe en kilogrammes'}
                      style={[styles.input, styles.weightInput, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.text }]}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                      value={weightInput}
                      onChangeText={(value) => { setWeightInput(value); setValidationError(null); }}
                      returnKeyType="done"
                    />
                    <Pressable accessibilityRole="button" accessibilityLabel="Augmenter de 2,5 kg" onPress={() => setWeightInput(String((Number(weightInput.replace(',', '.')) || 0) + 2.5))} style={styles.stepperBtn}>
                      <Ionicons name="add" size={20} color={colors.text} />
                    </Pressable>
                  </View>
                </>
              )}
              {validationError && <Text accessibilityRole="alert" style={styles.validationError}>{validationError}</Text>}
              <View style={styles.inputActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border, flex: 1 }]}
                  onPress={handleCancel}
                  activeOpacity={0.8}
                  disabled={saving}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Fermer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.finishBtn, styles.saveBtn, (!repsInput.trim() || saving) && styles.finishBtnDisabled]}
                  onPress={handleSave}
                  disabled={!repsInput.trim() || saving}
                  activeOpacity={0.8}
                >
                  {saving ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <Text style={styles.finishBtnText}>Enregistrer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === 'recommendation' && lastRecommendation && (
            <>
              {isLastSet ? (
                <View style={styles.completedWrap}>
                  <Ionicons name="checkmark-circle" size={64} color={ACCENT} />
                  <Text style={[styles.completedText, { color: colors.text }]}>Exercice terminé</Text>
                  <TouchableOpacity
                    style={[styles.continueBtn, { marginTop: 16 }, saving && styles.finishBtnDisabled]}
                    onPress={handleContinue}
                    activeOpacity={0.85}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#000" size="small" />
                    ) : (
                      <Text style={styles.continueBtnText}>Continuer</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={[styles.setHeader, { color: colors.text }]}>Série {setNumber} enregistrée</Text>
                  <View style={[styles.recommendationCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                    <Text style={[styles.recommendationText, { color: colors.text }]}>{lastRecommendation.message}</Text>
                    <Text style={[styles.nextSetHint, { color: colors.textSecondary }]}>
                      {loadMode === 'bodyweight' ? 'Prochaine série : poids du corps' : `Prochaine série : essayer ${lastRecommendation.suggestedKg} kg`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.continueBtn, { marginTop: 14 }, saving && styles.finishBtnDisabled]}
                    onPress={handleContinue}
                    activeOpacity={0.85}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#000" size="small" />
                    ) : (
                      <Text style={styles.continueBtnText}>Continuer</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    minHeight: 320,
    borderWidth: 1,
  },
  sheetBottom: {
    marginTop: 'auto',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  sheetSide: {
    marginLeft: 'auto',
    marginTop: 20,
    marginBottom: 20,
    marginRight: 20,
    width: Math.min(430, width * 0.42),
    borderRadius: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  setHeader: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  chronoWrap: {
    alignItems: 'center',
    marginVertical: 24,
  },
  chrono: {
    fontSize: 48,
    fontWeight: '700',
    color: ACCENT,
    fontVariant: ['tabular-nums'],
  },
  timerActions: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelBtn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  finishBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  finishBtnDisabled: { opacity: 0.55 },
  saveBtn: { flex: 1, alignItems: 'center' },
  finishBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  modeList: { gap: 8 },
  modeOption: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modeOptionSelected: { borderColor: ACCENT, backgroundColor: 'rgba(212,175,55,0.10)' },
  modeOptionText: { fontSize: 14, fontWeight: '700', flex: 1 },
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  weightInput: { flex: 1, textAlign: 'center', fontVariant: ['tabular-nums'] },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  validationError: { color: '#FCA5A5', fontSize: 13, lineHeight: 18, marginTop: 10 },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  recommendationCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  recommendationText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextSetHint: {
    fontSize: 14,
    marginTop: 8,
  },
  completedWrap: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  completedText: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 12,
  },
  continueBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignSelf: 'center',
  },
  continueBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000',
  },
});
