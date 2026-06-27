import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import type { NutritionTargets, MealTemplate } from '../../services/meService';

const ACCENT = '#D4AF37';

interface NutritionCardProps {
  targets: NutritionTargets | null;
  meals: MealTemplate[];
  consumedCalories?: number;
  waterMl?: number;
  onViewMeals?: () => void;
  onLogMeal?: () => void;
  locked?: boolean;
}

export function NutritionCard({
  targets,
  meals,
  consumedCalories,
  waterMl,
  onViewMeals,
  onLogMeal,
  locked,
}: NutritionCardProps) {
  const { colors } = useTheme();

  if (!targets && (!meals || meals.length === 0)) {
    return (
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Objectif du jour</Text>
        <View style={[styles.empty, { backgroundColor: colors.background }]}>
          <Ionicons name="nutrition-outline" size={28} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Aucun plan nutritionnel assigné
          </Text>
        </View>
      </View>
    );
  }

  const hasLog = consumedCalories != null || waterMl != null;
  const calorieProgress = targets && consumedCalories != null
    ? Math.min(100, Math.round((consumedCalories / targets.dailyCalories) * 100))
    : 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Objectif du jour</Text>

      {targets && (
        <View style={styles.targetsRow}>
          <View style={styles.targetItem}>
            <Ionicons name="flame" size={20} color={ACCENT} />
            <Text style={[styles.targetValue, { color: colors.text }]}>{targets.dailyCalories}</Text>
            <Text style={[styles.targetLabel, { color: colors.textSecondary }]}>kcal</Text>
          </View>
          <View style={styles.targetItem}>
            <Text style={[styles.targetValue, { color: colors.text }]}>{targets.proteinG}g</Text>
            <Text style={[styles.targetLabel, { color: colors.textSecondary }]}>protéines</Text>
          </View>
          <View style={styles.targetItem}>
            <Text style={[styles.targetValue, { color: colors.text }]}>{targets.carbsG}g</Text>
            <Text style={[styles.targetLabel, { color: colors.textSecondary }]}>glucides</Text>
          </View>
          <View style={styles.targetItem}>
            <Text style={[styles.targetValue, { color: colors.text }]}>{targets.fatG}g</Text>
            <Text style={[styles.targetLabel, { color: colors.textSecondary }]}>lipides</Text>
          </View>
        </View>
      )}

      {hasLog && (
        <View style={[styles.logRow, { borderColor: colors.border }]}>
          {consumedCalories != null && (
            <Text style={[styles.logText, { color: colors.textSecondary }]}>
              Consommé : {consumedCalories} kcal
            </Text>
          )}
          {waterMl != null && waterMl > 0 && (
            <Text style={[styles.logText, { color: colors.textSecondary }]}>
              Eau : {waterMl} ml
            </Text>
          )}
        </View>
      )}

      {targets && (
        <View style={styles.progressBarWrap}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { width: `${calorieProgress}%` }]} />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>{calorieProgress}%</Text>
        </View>
      )}

      {meals.length > 0 && (
        <View style={styles.mealsPreview}>
          {meals.slice(0, 4).map((m, i) => (
            <Text key={i} style={[styles.mealChip, { color: colors.textSecondary }]} numberOfLines={1}>
              {m.title}
            </Text>
          ))}
        </View>
      )}

      {!locked && (onViewMeals || onLogMeal) && (
        <View style={styles.actions}>
          {onViewMeals && (
            <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.border }]} onPress={onViewMeals}>
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Voir les repas</Text>
            </TouchableOpacity>
          )}
          {onLogMeal && (
            <TouchableOpacity style={[styles.actionBtnPrimary, { backgroundColor: ACCENT }]} onPress={onLogMeal}>
              <Text style={styles.actionBtnPrimaryText}>Ajouter un repas</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {locked && (
        <Text style={[styles.lockedHint, { color: colors.textSecondary }]}>Renouvelez l'abonnement pour suivre la nutrition</Text>
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
    marginBottom: 10,
  },
  empty: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
  },
  targetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  targetItem: {
    alignItems: 'center',
  },
  targetValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  targetLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  logRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  logText: {
    fontSize: 13,
  },
  progressBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 36,
  },
  mealsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  mealChip: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    maxWidth: '48%',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionBtnPrimary: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  lockedHint: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});
