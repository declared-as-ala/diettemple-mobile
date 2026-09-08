import { BRAND_YELLOW } from '../../constants/brand';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { WeeklyValidationResponse } from '../../services/meService';

interface Props {
  loading: boolean;
  data: WeeklyValidationResponse | null;
}

function getTodayHint(today: WeeklyValidationResponse['today'] | undefined): string {
  if (!today) return 'Termine ta séance et ton objectif nutrition pour valider la journée';
  if (today.isRestDay) {
    return today.nutritionGoalCompleted
      ? 'Excellente journée de récupération ! Objectif nutrition validé.'
      : "Aujourd'hui c'est repos ! Respecte ton plan nutritionnel pour valider la journée.";
  }
  if (today.isValidated) return 'Continue comme ça ! Tous tes objectifs du jour sont validés.';
  if (today.workoutCompleted && !today.nutritionGoalCompleted) {
    return 'Séance validée ! Reste ton objectif nutrition pour compléter la journée.';
  }
  if (!today.workoutCompleted && today.nutritionGoalCompleted) {
    return 'Nutrition validée ! Termine ta séance pour compléter la journée.';
  }
  return 'Termine ta séance et ton objectif nutrition pour valider la journée.';
}

export default function WeeklyValidationCard({ loading, data }: Props) {
  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.skeletonHeader}>
          <View style={styles.skeletonLineLg} />
          <View style={styles.skeletonLineMd} />
        </View>
        <View style={styles.skeletonRow}>
          {Array.from({ length: 7 }).map((_, i) => (
            <View key={i} style={styles.skeletonDot} />
          ))}
        </View>
      </View>
    );
  }

  if (!data) return null;

  const today = data.today;
  const isTodayRest = !!today?.isRestDay;
  const todayWorkoutDone = !!today?.workoutCompleted;
  const todayNutritionDone = !!today?.nutritionGoalCompleted;

  // Target workout sessions count (e.g. 4 or 3 instead of 7)
  const targetSessions = data.targetWorkoutSessions || (data.totalDays && data.totalDays < 7 ? data.totalDays : 4);
  const completedSessions = data.completedWorkoutsCount ?? data.days.filter((d) => d.workoutCompleted).length;
  const restDaysCount = data.days.filter((d) => d.isRestDay).length || Math.max(0, 7 - targetSessions);
  const progressPct = Math.min(100, Math.round((completedSessions / Math.max(1, targetSessions)) * 100));

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['rgba(28,26,20,0.95)', 'rgba(15,15,15,0.98)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowDot} />
            <Text style={styles.eyebrow}>Validation de la semaine</Text>
          </View>
          <Text style={styles.mainStat}>
            {completedSessions}/{targetSessions} séances validées
          </Text>
          <Text style={styles.subtitle}>
            {completedSessions >= targetSessions
              ? 'Toutes les séances de la semaine sont complétées !'
              : `${targetSessions - completedSessions} séance${targetSessions - completedSessions > 1 ? 's' : ''} restante${targetSessions - completedSessions > 1 ? 's' : ''} • ${restDaysCount}j repos`}
          </Text>
        </View>

        {/* Big Score Badge */}
        <View style={styles.scoreWrap}>
          <LinearGradient
            colors={['rgba(212,175,55,0.22)', 'rgba(212,175,55,0.06)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.scoreValue}>{completedSessions}</Text>
          <Text style={styles.scoreTotal}>/{targetSessions}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressTrack}>
        <LinearGradient
          colors={progressPct >= 100 ? ['#22C55E', '#16A34A'] : [BRAND_YELLOW, '#F3E5AB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${Math.max(4, progressPct)}%` }]}
        />
      </View>

      {/* Today Status Pill */}
      <View style={styles.todayPillRow}>
        {isTodayRest ? (
          <View style={[styles.statusBadge, styles.statusBadgeRest]}>
            <Ionicons name="cafe" size={13} color={BRAND_YELLOW} />
            <Text style={[styles.statusBadgeText, { color: BRAND_YELLOW }]}>
              {todayNutritionDone ? 'Journée de repos validée' : 'Journée de repos (Récupération)'}
            </Text>
          </View>
        ) : todayWorkoutDone ? (
          <View style={[styles.statusBadge, styles.statusBadgeSuccess]}>
            <Ionicons name="checkmark-circle" size={13} color="#22C55E" />
            <Text style={[styles.statusBadgeText, { color: '#22C55E' }]}>
              Séance terminée
            </Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, styles.statusBadgePending]}>
            <Ionicons name="flash-outline" size={13} color="#F59E0B" />
            <Text style={[styles.statusBadgeText, { color: '#F59E0B' }]}>
              Séance à réaliser aujourd'hui
            </Text>
          </View>
        )}
      </View>

      {/* Checklist */}
      <View style={styles.checklistContainer}>
        {/* Workout item */}
        <View style={styles.checkItem}>
          <View
            style={[
              styles.checkIconWrap,
              isTodayRest
                ? styles.checkIconWrapRest
                : todayWorkoutDone && styles.checkIconWrapDone,
            ]}
          >
            <Ionicons
              name={
                isTodayRest
                  ? 'cafe-outline'
                  : todayWorkoutDone
                  ? 'checkmark'
                  : 'remove'
              }
              size={12}
              color={
                isTodayRest
                  ? BRAND_YELLOW
                  : todayWorkoutDone
                  ? '#22C55E'
                  : '#6B7280'
              }
            />
          </View>
          <Text style={[styles.checkText, isTodayRest && { color: 'rgba(255,255,255,0.75)' }]}>
            {isTodayRest ? 'Jour de repos (récupération)' : 'Séance du jour terminée'}
          </Text>
        </View>

        {/* Nutrition item */}
        <View style={styles.checkItem}>
          <View style={[styles.checkIconWrap, todayNutritionDone && styles.checkIconWrapDone]}>
            <Ionicons
              name={todayNutritionDone ? 'checkmark' : 'remove'}
              size={12}
              color={todayNutritionDone ? '#22C55E' : '#6B7280'}
            />
          </View>
          <Text style={styles.checkText}>Objectif nutrition accompli</Text>
        </View>
      </View>

      {/* 7-Days Visual Schedule */}
      <View style={styles.weekGrid}>
        {data.days.map((day) => {
          const isRest = day.hasScheduledWorkout === false || !!day.isRestDay;
          const isDone = !isRest && !!day.workoutCompleted;
          const isToday = !!day.isToday;

          return (
            <View
              key={day.date}
              style={[
                styles.dayCard,
                isRest && styles.dayCardRest,
                isDone && styles.dayCardDone,
                isToday && styles.dayCardToday,
              ]}
            >
              <Text
                style={[
                  styles.dayLabel,
                  isToday && styles.dayLabelToday,
                  isDone && styles.dayLabelDone,
                ]}
              >
                {day.label}
              </Text>
              <View style={styles.dayIconSlot}>
                {isRest ? (
                  <Text style={styles.restChipText}>REPOS</Text>
                ) : isDone ? (
                  <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                ) : (
                  <Ionicons name="barbell-outline" size={12} color="rgba(255,255,255,0.25)" />
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Coach Hint */}
      <View style={styles.hintContainer}>
        <Ionicons name="information-circle-outline" size={14} color="rgba(212,175,55,0.7)" />
        <Text style={styles.hintText}>{getTodayHint(today)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.22)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND_YELLOW,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(212,175,55,0.9)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  mainStat: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  scoreWrap: {
    width: 62,
    height: 62,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  scoreValue: {
    fontSize: 24,
    color: BRAND_YELLOW,
    fontWeight: '900',
    lineHeight: 26,
  },
  scoreTotal: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '800',
  },
  progressTrack: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    marginBottom: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  todayPillRow: {
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  statusBadgeRest: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderColor: 'rgba(212,175,55,0.35)',
  },
  statusBadgeSuccess: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderColor: 'rgba(34,197,94,0.35)',
  },
  statusBadgePending: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.35)',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  checklistContainer: {
    gap: 8,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.025)',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIconWrapDone: {
    borderColor: 'rgba(34,197,94,0.4)',
    backgroundColor: 'rgba(34,197,94,0.16)',
  },
  checkIconWrapRest: {
    borderColor: 'rgba(212,175,55,0.35)',
    backgroundColor: 'rgba(212,175,55,0.12)',
  },
  checkText: {
    fontSize: 13,
    color: '#E5E7EB',
    fontWeight: '600',
  },
  weekGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  dayCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayCardRest: {
    backgroundColor: 'rgba(255,255,255,0.015)',
    borderColor: 'rgba(255,255,255,0.04)',
  },
  dayCardDone: {
    borderColor: 'rgba(34,197,94,0.35)',
    backgroundColor: 'rgba(34,197,94,0.08)',
  },
  dayCardToday: {
    borderColor: BRAND_YELLOW,
    borderWidth: 1.6,
    backgroundColor: 'rgba(212,175,55,0.06)',
  },
  dayLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 4,
    fontWeight: '800',
  },
  dayLabelToday: {
    color: BRAND_YELLOW,
  },
  dayLabelDone: {
    color: '#86EFAC',
  },
  dayIconSlot: {
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restChipText: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(212,175,55,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.15)',
  },
  hintText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    flex: 1,
    lineHeight: 15,
  },
  skeletonHeader: {
    marginBottom: 12,
  },
  skeletonLineLg: {
    height: 18,
    width: '60%',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 6,
  },
  skeletonLineMd: {
    height: 12,
    width: '40%',
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 6,
  },
  skeletonDot: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});
