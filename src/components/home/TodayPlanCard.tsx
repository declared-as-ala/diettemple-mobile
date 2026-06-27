import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import type { TodaySessionTemplate } from '../../services/meService';

const ACCENT = '#D4AF37';

interface TodayPlanCardProps {
  levelName?: string;
  weekNumber: number;
  dayName: string;
  sessionTemplate: TodaySessionTemplate | null;
  label?: string;
  status?: 'completed' | 'pending' | 'missed' | 'rest';
  onStartSession: () => void;
  onViewWeek?: () => void;
  locked?: boolean;
}

export function TodayPlanCard({
  levelName,
  weekNumber,
  dayName,
  sessionTemplate,
  label = 'Séance du jour',
  status = 'pending',
  onStartSession,
  onViewWeek,
  locked,
}: TodayPlanCardProps) {
  const { colors } = useTheme();

  const durationStr =
    sessionTemplate?.durationMinutes != null
      ? `${sessionTemplate.durationMinutes} min`
      : sessionTemplate
        ? '45–60 min'
        : '';
  const countStr =
    sessionTemplate?.exerciseCount != null
      ? `${sessionTemplate.exerciseCount} exercice${sessionTemplate.exerciseCount !== 1 ? 's' : ''}`
      : sessionTemplate
        ? '— exercices'
        : '';
  const metaStr = [durationStr, countStr].filter(Boolean).join(' • ');

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{label}</Text>
      {levelName && (
        <Text style={[styles.levelName, { color: colors.text }]} numberOfLines={1}>
          {levelName}
        </Text>
      )}
      <View style={styles.metaRow}>
        <Text style={[styles.weekDay, { color: colors.textSecondary }]}>
          Semaine {weekNumber} · {dayName}
        </Text>
      </View>

      {sessionTemplate ? (
        <>
          <View style={[styles.badgeRow, { marginBottom: 8 }]}>
            {status === 'completed' ? (
              <View style={[styles.badge, { backgroundColor: '#27AE60' }]}>
                <Text style={styles.badgeText}>Terminé</Text>
              </View>
            ) : (
              <View style={[styles.badge, { backgroundColor: ACCENT }]}>
                <Text style={styles.badgeText}>{status === 'missed' ? 'À rattraper' : "Aujourd'hui"}</Text>
              </View>
            )}
          </View>
          <View style={[styles.sessionRow, { borderColor: colors.border }]}>
            <Ionicons name="barbell-outline" size={22} color={ACCENT} />
            <View style={styles.sessionInfo}>
              <Text style={[styles.sessionTitle, { color: colors.text }]}>{sessionTemplate.title}</Text>
              {metaStr ? (
                <Text style={[styles.sessionMeta, { color: colors.textSecondary }]}>
                  {metaStr}
                  {sessionTemplate.difficulty ? ` · ${sessionTemplate.difficulty}` : ''}
                </Text>
              ) : sessionTemplate.difficulty ? (
                <Text style={[styles.sessionMeta, { color: colors.textSecondary }]}>{sessionTemplate.difficulty}</Text>
              ) : null}
            </View>
          </View>
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: locked ? '#444' : status === 'completed' ? '#27AE60' : ACCENT }]}
            onPress={onStartSession}
            disabled={locked}
            activeOpacity={0.8}
          >
            <Ionicons name={status === 'completed' ? 'checkmark-circle' : 'play-circle'} size={22} color={locked ? '#888' : '#FFF'} />
            <Text style={[styles.ctaText, { color: locked ? '#888' : '#FFF' }]}>
              {locked ? 'Abonnement requis' : status === 'completed' ? 'Refaire la séance' : status === 'missed' ? 'Rattraper la séance' : 'Commencer la séance'}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={[styles.restDay, { backgroundColor: colors.background }]}>
          <Ionicons name="moon-outline" size={24} color={colors.textSecondary} />
          <Text style={[styles.restText, { color: colors.textSecondary }]}>Repos aujourd'hui</Text>
          <Text style={[styles.restHint, { color: colors.textSecondary }]}>
            Mobilité ou étirements recommandés
          </Text>
        </View>
      )}

      {onViewWeek && (
        <TouchableOpacity style={styles.weekLink} onPress={onViewWeek}>
          <Text style={[styles.weekLinkText, { color: ACCENT }]}>Voir le plan de la semaine</Text>
          <Ionicons name="chevron-forward" size={16} color={ACCENT} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  levelName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  metaRow: {
    marginBottom: 12,
  },
  weekDay: {
    fontSize: 14,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  sessionMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
  },
  restDay: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  restText: {
    fontSize: 16,
    fontWeight: '600',
  },
  restHint: {
    fontSize: 13,
  },
  weekLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 4,
  },
  weekLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
});
