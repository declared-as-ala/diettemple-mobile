import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppLoader from '../AppLoader';
import { ExerciseRecommendation } from '../../services/workoutService';

interface Props {
  loading: boolean;
  error: string | null;
  recommendation: ExerciseRecommendation | null;
}

function badgeMeta(decision?: ExerciseRecommendation['decision']) {
  if (decision === 'ADVANCE') return { label: 'Augmenter', color: '#22C55E', icon: 'trending-up' as const };
  if (decision === 'DOWN') return { label: 'Reduire', color: '#EF4444', icon: 'trending-down' as const };
  return { label: 'Garder', color: '#D4AF37', icon: 'remove' as const };
}

export default function ExerciseRecommendationCard({ loading, error, recommendation }: Props) {
  if (error) return null;

  if (loading) {
    return (
      <View style={styles.card}>
        <AppLoader variant="inline" size="sm" label="Analyse de la derniere performance..." />
      </View>
    );
  }

  if (!recommendation?.hasHistory) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Derniere performance</Text>
        <Text style={styles.emptyText}>Aucun historique pour cet exercice. Commence avec une charge confortable.</Text>
      </View>
    );
  }

  const meta = badgeMeta(recommendation.decision);
  const latestSet = recommendation.lastSets[recommendation.lastSets.length - 1];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Derniere performance</Text>
        <View style={[styles.badge, { borderColor: meta.color }]}>
          <Ionicons name={meta.icon} size={14} color={meta.color} />
          <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      <Text style={styles.metric}>
        {latestSet ? `S${latestSet.setNumber}: ${latestSet.weight} kg x ${latestSet.reps} reps` : 'Performance recente'}
      </Text>
      <Text style={styles.label}>Recommandation de depart</Text>
      <Text style={styles.recommended}>{recommendation.recommendedWeight ?? '-'} kg</Text>
      <Text style={styles.reason}>{recommendation.reason}</Text>

      {recommendation.suggestedSets.length > 0 && (
        <View style={styles.setsRow}>
          {recommendation.suggestedSets.slice(0, 4).map((set) => (
            <View key={set.setNumber} style={styles.setChip}>
              <Text style={styles.setChipTitle}>S{set.setNumber}</Text>
              <Text style={styles.setChipValue}>{set.weight} kg</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 56,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(17,17,17,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    padding: 12,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  metric: { color: '#E5E7EB', fontSize: 13, marginBottom: 6 },
  label: { color: '#9CA3AF', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  recommended: { color: '#D4AF37', fontSize: 24, fontWeight: '800', marginTop: 2, marginBottom: 4 },
  reason: { color: '#F3F4F6', fontSize: 12, lineHeight: 17 },
  emptyText: { color: '#D1D5DB', fontSize: 12, lineHeight: 17 },
  setsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  setChip: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  setChipTitle: { color: '#9CA3AF', fontSize: 10, fontWeight: '700' },
  setChipValue: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginTop: 2 },
});

