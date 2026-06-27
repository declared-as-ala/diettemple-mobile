/**
 * MacroRow — a single unified card showing all 3 macros as horizontal bars.
 * Replaces the old 3-separate-cards layout.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MACROS = [
  { key: 'protein', label: 'Protéines', color: '#FF6B9D', emoji: '🥩' },
  { key: 'carbs',   label: 'Glucides',  color: '#60A5FA', emoji: '🌾' },
  { key: 'fat',     label: 'Lipides',   color: '#D4AF37', emoji: '🥑' },
] as const;

type MacroType = 'protein' | 'carbs' | 'fat';

/** Legacy single-macro card — kept for backwards compatibility */
interface MacroProgressCardProps {
  type: MacroType;
  consumed: number;
  target: number;
}

export function MacroProgressCard({ type, consumed, target }: MacroProgressCardProps) {
  const macro = MACROS.find((m) => m.key === type)!;
  const safeTarget = Math.max(target, 1);
  const pct = Math.min(100, Math.round((consumed / safeTarget) * 100));

  return (
    <View style={styles.card}>
      <Text style={styles.emoji}>{macro.emoji}</Text>
      <Text style={styles.label}>{macro.label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: macro.color }]} />
      </View>
      <Text style={styles.value}>
        <Text style={[styles.consumed, { color: macro.color }]}>{Math.round(consumed)}</Text>
        <Text style={styles.target}>/{target}g</Text>
      </Text>
    </View>
  );
}

/** New unified macro row card — use this instead of 3 MacroProgressCards */
interface MacroRowCardProps {
  consumedProtein: number;
  targetProtein: number;
  consumedCarbs: number;
  targetCarbs: number;
  consumedFat: number;
  targetFat: number;
}

export function MacroRowCard({
  consumedProtein, targetProtein,
  consumedCarbs, targetCarbs,
  consumedFat, targetFat,
}: MacroRowCardProps) {
  const rows = [
    { emoji: '🥩', label: 'Prot.',  consumed: consumedProtein, target: targetProtein, color: '#FF6B9D' },
    { emoji: '🌾', label: 'Gluc.', consumed: consumedCarbs,   target: targetCarbs,   color: '#60A5FA' },
    { emoji: '🥑', label: 'Lip.',  consumed: consumedFat,     target: targetFat,     color: '#D4AF37' },
  ];

  return (
    <View style={styles2.card}>
      <Text style={styles2.label}>MACRONUTRIMENTS</Text>
      {rows.map(({ emoji, label, consumed, target, color }) => {
        const pct = target > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0;
        return (
          <View key={label} style={styles2.row}>
            <Text style={styles2.emoji}>{emoji}</Text>
            <Text style={styles2.macroLabel}>{label}</Text>
            <View style={styles2.barTrack}>
              <View style={[styles2.barFill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
            <Text style={styles2.macroVal}>
              <Text style={{ color }}>{Math.round(consumed)}</Text>
              <Text style={styles2.macroTarget}>/{target}g</Text>
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#151518',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    gap: 6,
  },
  emoji: { fontSize: 20, marginBottom: 2 },
  label: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.3 },
  barTrack: {
    width: '100%',
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  value: { fontSize: 13, fontWeight: '600' },
  consumed: { fontWeight: '800', fontSize: 14 },
  target: { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
});

const styles2 = StyleSheet.create({
  card: {
    backgroundColor: '#151518',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 14,
    gap: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emoji: { fontSize: 16, width: 22, textAlign: 'center' },
  macroLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    width: 38,
    letterSpacing: 0.3,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  macroVal: {
    fontSize: 12,
    fontWeight: '600',
    width: 58,
    textAlign: 'right',
  },
  macroTarget: { color: 'rgba(255,255,255,0.35)', fontSize: 11 },
});
