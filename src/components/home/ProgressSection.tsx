import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

const ACCENT = '#D4AF37';

interface ProgressSectionProps {
  streaks?: { workout: number; nutrition: number };
  level?: number;
  lastWorkout?: string | null;
}

const levelNames: Record<number, string> = {
  1: 'Initiate',
  2: 'Fighter',
  3: 'Warrior',
  4: 'Champion',
  5: 'Elite',
};

export function ProgressSection({ streaks, level = 1, lastWorkout }: ProgressSectionProps) {
  const { colors } = useTheme();
  const levelName = levelNames[level] || 'Initiate';

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Progression</Text>
      <View style={styles.row}>
        <View style={styles.stat}>
          <Ionicons name="trophy" size={22} color={ACCENT} />
          <Text style={[styles.statValue, { color: colors.text }]}>{levelName}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Niveau</Text>
        </View>
        {streaks && (
          <>
            <View style={styles.stat}>
              <Ionicons name="barbell-outline" size={22} color={colors.textSecondary} />
              <Text style={[styles.statValue, { color: colors.text }]}>{streaks.workout}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Streak</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="nutrition-outline" size={22} color={colors.textSecondary} />
              <Text style={[styles.statValue, { color: colors.text }]}>{streaks.nutrition}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Régime</Text>
            </View>
          </>
        )}
      </View>
      {lastWorkout && (
        <Text style={[styles.lastWorkout, { color: colors.textSecondary }]}>
          Dernier entraînement: {lastWorkout}
        </Text>
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
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  lastWorkout: {
    fontSize: 12,
    marginTop: 12,
  },
});
