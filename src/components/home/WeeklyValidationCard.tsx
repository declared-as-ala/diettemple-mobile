import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WeeklyValidationResponse } from '../../services/meService';

interface Props {
  loading: boolean;
  data: WeeklyValidationResponse | null;
}

function getTodayHint(today: WeeklyValidationResponse['today'] | undefined): string {
  if (!today) return "Termine ta séance et ton objectif nutrition pour valider la journée";
  if (today.isValidated) return 'Continue comme ça';
  if (today.missing.length === 2) return "Termine ta séance et ton objectif nutrition pour valider la journée";
  if (today.missing[0] === 'nutrition') return 'Il reste ton objectif nutrition';
  return 'Il reste ta séance';
}

export default function WeeklyValidationCard({ loading, data }: Props) {
  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.skeletonLineLg} />
        <View style={styles.skeletonLineMd} />
        <View style={styles.skeletonRow}>
          {Array.from({ length: 7 }).map((_, i) => <View key={i} style={styles.skeletonDot} />)}
        </View>
      </View>
    );
  }

  if (!data) return null;

  const today = data.today;
  const todayValidated = today.isValidated;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>Validation de la semaine</Text>
          <Text style={styles.mainStat}>
            {data.validatedDaysCount}/{data.totalDays} journées validées
          </Text>
          <Text style={styles.subtitle}>Cette semaine</Text>
        </View>
        <View style={styles.scoreWrap}>
          <Text style={styles.scoreValue}>{data.validatedDaysCount}</Text>
          <Text style={styles.scoreTotal}>/7</Text>
        </View>
      </View>

      <View style={[styles.todayBadge, todayValidated ? styles.todayBadgeOk : styles.todayBadgeNo]}>
        <Ionicons name={todayValidated ? 'checkmark-circle' : 'alert-circle'} size={15} color={todayValidated ? '#22C55E' : '#F59E0B'} />
        <Text style={[styles.todayBadgeText, todayValidated ? styles.todayBadgeTextOk : styles.todayBadgeTextNo]}>
          {today.statusLabel}
        </Text>
      </View>

      <View style={styles.checklistRow}>
        <View style={styles.checkItem}>
          <View style={[styles.checkIconWrap, today.workoutCompleted && styles.checkIconWrapDone]}>
            <Ionicons name={today.workoutCompleted ? 'checkmark' : 'remove'} size={12} color={today.workoutCompleted ? '#22C55E' : '#9CA3AF'} />
          </View>
          <Text style={styles.checkText}>Séance terminée</Text>
        </View>
        <View style={styles.checkItem}>
          <View style={[styles.checkIconWrap, today.nutritionGoalCompleted && styles.checkIconWrapDone]}>
            <Ionicons name={today.nutritionGoalCompleted ? 'checkmark' : 'remove'} size={12} color={today.nutritionGoalCompleted ? '#22C55E' : '#9CA3AF'} />
          </View>
          <Text style={styles.checkText}>Objectif nutrition accompli</Text>
        </View>
      </View>

      <View style={styles.weekRow}>
        {data.days.map((day) => (
          <View
            key={day.date}
            style={[
              styles.dayChip,
              day.isValidated && styles.dayChipOk,
              day.isToday && styles.dayChipToday,
            ]}
          >
            <Text style={[styles.dayLabel, day.isValidated && styles.dayLabelOk]}>{day.label}</Text>
            <Ionicons
              name={day.isValidated ? 'checkmark' : 'remove'}
              size={12}
              color={day.isValidated ? '#22C55E' : '#6B7280'}
            />
          </View>
        ))}
      </View>

      <Text style={styles.hint}>{getTodayHint(today)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111111',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.18)',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  eyebrow: { fontSize: 10, fontWeight: '700', color: '#B4B4B4', letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' },
  mainStat: { fontSize: 19, fontWeight: '800', color: '#F5F5F5' },
  subtitle: { marginTop: 2, fontSize: 12, color: '#8E8E8E', fontWeight: '500' },
  scoreWrap: {
    minWidth: 62,
    height: 62,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    backgroundColor: 'rgba(212,175,55,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: { fontSize: 24, color: '#D4AF37', fontWeight: '900', lineHeight: 26 },
  scoreTotal: { fontSize: 11, color: '#A3A3A3', fontWeight: '700' },
  todayBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10, marginBottom: 12, borderWidth: 1 },
  todayBadgeOk: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.35)' },
  todayBadgeNo: { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.35)' },
  todayBadgeText: { fontSize: 12, fontWeight: '700' },
  todayBadgeTextOk: { color: '#22C55E' },
  todayBadgeTextNo: { color: '#F59E0B' },
  checklistRow: { gap: 9, marginBottom: 12 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIconWrapDone: {
    borderColor: 'rgba(34,197,94,0.35)',
    backgroundColor: 'rgba(34,197,94,0.12)',
  },
  checkText: { fontSize: 13, color: '#D1D5DB', fontWeight: '600' },
  weekRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  dayChip: { flex: 1, minWidth: 0, borderRadius: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', paddingVertical: 7 },
  dayChipOk: { borderColor: 'rgba(34,197,94,0.35)', backgroundColor: 'rgba(34,197,94,0.08)' },
  dayChipToday: { borderColor: '#D4AF37', borderWidth: 1.6 },
  dayLabel: { fontSize: 10, color: '#9CA3AF', marginBottom: 2, fontWeight: '700' },
  dayLabelOk: { color: '#86EFAC' },
  hint: { fontSize: 12, color: '#9CA3AF', lineHeight: 17 },
  skeletonLineLg: { height: 14, width: '60%', borderRadius: 7, backgroundColor: '#232323', marginBottom: 10 },
  skeletonLineMd: { height: 12, width: '45%', borderRadius: 6, backgroundColor: '#232323', marginBottom: 12 },
  skeletonRow: { flexDirection: 'row', gap: 6 },
  skeletonDot: { flex: 1, height: 28, borderRadius: 8, backgroundColor: '#232323' },
});

