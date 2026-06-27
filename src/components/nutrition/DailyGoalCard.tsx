import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { nutritionColors } from '../../constants/nutritionColors';

const GOLD = '#D4AF37';
const R = 58;
const CIRCUM = 2 * Math.PI * R;
const DIAMETER = 140;

interface DailyGoalCardProps {
  consumedCal: number;
  targetCal: number;
}

export function DailyGoalCard({ consumedCal, targetCal }: DailyGoalCardProps) {
  const safeTarget = Math.max(targetCal, 1);
  const pct = Math.min(100, Math.round((consumedCal / safeTarget) * 100));
  const remaining = Math.max(0, targetCal - consumedCal);
  const over = consumedCal > targetCal;
  const ringColor = over ? '#EF5350' : GOLD;
  const dashOffset = CIRCUM * (1 - pct / 100);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>OBJECTIF DU JOUR</Text>

      {/* Ring */}
      <View style={styles.ringWrap}>
        <Svg width={DIAMETER} height={DIAMETER}>
          {/* Track */}
          <Circle
            cx={DIAMETER / 2} cy={DIAMETER / 2} r={R}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={11}
            fill="none"
          />
          {/* Progress */}
          <Circle
            cx={DIAMETER / 2} cy={DIAMETER / 2} r={R}
            stroke={ringColor}
            strokeWidth={11}
            fill="none"
            strokeDasharray={CIRCUM}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${DIAMETER / 2} ${DIAMETER / 2})`}
          />
        </Svg>
        {/* Center text */}
        <View style={styles.ringCenter}>
          <Text style={[styles.ringValue, over && { color: '#EF5350' }]}>
            {consumedCal.toLocaleString('fr-FR')}
          </Text>
          <Text style={styles.ringUnit}>kcal</Text>
          <Text style={styles.ringPct}>{pct}%</Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{consumedCal.toLocaleString('fr-FR')}</Text>
          <Text style={styles.statLabel}>Consommées</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={[styles.statValue, { color: over ? '#EF5350' : '#4ADE80' }]}>
            {over ? '+' : ''}{Math.abs(remaining).toLocaleString('fr-FR')}
          </Text>
          <Text style={styles.statLabel}>{over ? 'En excès' : 'Restantes'}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{targetCal.toLocaleString('fr-FR')}</Text>
          <Text style={styles.statLabel}>Objectif</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#151518',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    marginBottom: 14,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.2,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  ringWrap: {
    width: DIAMETER,
    height: DIAMETER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#F3F4F6',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  ringUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.5,
  },
  ringPct: {
    fontSize: 11,
    fontWeight: '700',
    color: GOLD,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginVertical: 10,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F3F4F6',
    letterSpacing: 0.2,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    marginTop: 3,
    letterSpacing: 0.4,
  },
});
