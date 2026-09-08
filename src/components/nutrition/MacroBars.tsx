import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { nutritionColors } from '../../constants/nutritionColors';

interface MacroBarsProps {
  consumedProtein: number;
  consumedCarbs: number;
  consumedFat: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}

function MacroBar({
  label,
  consumed,
  target,
  color,
}: {
  label: string;
  consumed: number;
  target: number;
  color: string;
}) {
  const pct = target > 0 ? Math.min(1, consumed / target) : 0;
  return (
    <View style={styles.macroRow}>
      <View style={styles.labelCol}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={[styles.macroValue, { color }]}>
          {Math.round(consumed)}g
          <Text style={styles.macroTarget}>{target > 0 ? ` / ${Math.round(target)}g` : ' / —'}</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function MacroBarsComponent(props: MacroBarsProps) {
  return (
    <View style={styles.wrap}>
      <MacroBar
        label="Protéines"
        consumed={props.consumedProtein}
        target={props.targetProtein}
        color="#D5BF87"
      />
      <MacroBar
        label="Glucides"
        consumed={props.consumedCarbs}
        target={props.targetCarbs}
        color="#A9C8B0"
      />
      <MacroBar
        label="Lipides"
        consumed={props.consumedFat}
        target={props.targetFat}
        color="#D5A787"
      />
    </View>
  );
}

export const MacroBars = memo(MacroBarsComponent);

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  macroRow: {
    gap: 8,
  },
  labelCol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D1DBC3',
    letterSpacing: 0.2,
  },
  macroValue: {
    fontSize: 13,
    fontWeight: '900',
  },
  macroTarget: {
    fontSize: 11,
    color: '#AEBF9B',
    fontWeight: '600',
  },
  track: {
    height: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});

