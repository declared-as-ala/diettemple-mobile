import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { nutritionColors } from '../../constants/nutritionColors';
import type { MealTemplate } from '../../services/meService';

const GOLD = '#D4AF37';

// Map meal title keywords to emoji
function getMealEmoji(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('petit') || t.includes('matin') || t.includes('breakfast')) return '🌅';
  if (t.includes('déjeuner') || t.includes('midi') || t.includes('lunch')) return '🥗';
  if (t.includes('dîner') || t.includes('soir') || t.includes('dinner')) return '🍽️';
  if (t.includes('collation') || t.includes('snack') || t.includes('goûter')) return '🍎';
  if (t.includes('protéine') || t.includes('protein')) return '🥩';
  return '🍴';
}

interface MealsSectionProps {
  meals: MealTemplate[];
  onAddMeal: () => void;
  canAddMeal: boolean;
}

export function MealsSection({ meals, onAddMeal, canAddMeal }: MealsSectionProps) {
  const totalKcalAll = meals.reduce(
    (sum, m) => sum + (m.items?.reduce((s, it) => s + (it.calories ?? 0), 0) ?? 0),
    0
  );

  return (
    <View style={styles.section}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.sectionTitle}>Repas du jour</Text>
          {meals.length > 0 && (
            <Text style={styles.sectionSub}>
              {meals.length} repas · {Math.round(totalKcalAll)} kcal total
            </Text>
          )}
        </View>
        {meals.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{meals.length}</Text>
          </View>
        )}
      </View>

      {meals.length === 0 ? (
        /* Empty state */
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Text style={styles.emptyIcon}>🍽️</Text>
          </View>
          <Text style={styles.emptyTitle}>Aucun repas enregistré</Text>
          <Text style={styles.emptyDesc}>
            Scannez votre premier repas ou choisissez depuis vos recettes favorites
          </Text>
          {canAddMeal && (
            <TouchableOpacity style={styles.emptyCta} onPress={onAddMeal} activeOpacity={0.85}>
              <Ionicons name="camera" size={16} color="#000" />
              <Text style={styles.emptyCtaText}>Scanner maintenant</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.list}>
          {meals.map((meal, i) => {
            const mealKcal = meal.items?.reduce((s, it) => s + (it.calories ?? 0), 0) ?? 0;
            const emoji = getMealEmoji(meal.title);
            const pct =
              meal.targetCalories > 0
                ? Math.min(100, Math.round((mealKcal / meal.targetCalories) * 100))
                : 0;

            return (
              <View key={i} style={styles.mealCard}>
                {/* Left: emoji + info */}
                <View style={styles.mealLeft}>
                  <View style={styles.mealEmojiWrap}>
                    <Text style={styles.mealEmoji}>{emoji}</Text>
                  </View>
                  <View style={styles.mealInfo}>
                    <Text style={styles.mealTitle}>{meal.title}</Text>
                    <Text style={styles.mealMeta}>
                      {meal.items?.length ?? 0} aliment{(meal.items?.length ?? 0) > 1 ? 's' : ''}
                      {meal.targetCalories > 0 ? ` · obj. ${meal.targetCalories} kcal` : ''}
                    </Text>
                    {/* Items list */}
                    {(meal.items?.length ?? 0) > 0 && (
                      <View style={styles.itemsList}>
                        {meal.items.slice(0, 3).map((item, j) => (
                          <View key={j} style={styles.itemRow}>
                            <View style={styles.itemDot} />
                            <Text style={styles.itemName} numberOfLines={1}>
                              {item.name}
                            </Text>
                            <Text style={styles.itemCal}>{item.calories} kcal</Text>
                          </View>
                        ))}
                        {(meal.items?.length ?? 0) > 3 && (
                          <Text style={styles.itemMore}>
                            +{meal.items.length - 3} autre(s)
                          </Text>
                        )}
                      </View>
                    )}
                    {/* Mini progress bar */}
                    {meal.targetCalories > 0 && (
                      <View style={styles.miniBarTrack}>
                        <View
                          style={[
                            styles.miniBarFill,
                            {
                              width: `${pct}%`,
                              backgroundColor: pct > 100 ? '#EF5350' : GOLD,
                            },
                          ]}
                        />
                      </View>
                    )}
                  </View>
                </View>

                {/* Right: kcal */}
                <View style={styles.mealRight}>
                  <Text style={styles.mealKcal}>{Math.round(mealKcal)}</Text>
                  <Text style={styles.mealKcalUnit}>kcal</Text>
                  {meal.targetCalories > 0 && (
                    <Text style={styles.mealPct}>{pct}%</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: nutritionColors.text,
    letterSpacing: 0.1,
  },
  sectionSub: {
    fontSize: 12,
    color: nutritionColors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  countBadge: {
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: GOLD,
  },

  // Empty state
  empty: {
    backgroundColor: '#151518',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIcon: { fontSize: 28 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: nutritionColors.text,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: nutritionColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  emptyCtaText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000',
  },

  // Meal cards
  list: { gap: 10 },
  mealCard: {
    backgroundColor: '#151518',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mealLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  mealEmojiWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(212,175,55,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
    flexShrink: 0,
  },
  mealEmoji: { fontSize: 20 },
  mealInfo: { flex: 1 },
  mealTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: nutritionColors.text,
    marginBottom: 2,
  },
  mealMeta: {
    fontSize: 11,
    color: nutritionColors.textSecondary,
    fontWeight: '500',
    marginBottom: 8,
  },
  itemsList: { gap: 4, marginBottom: 8 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    flexShrink: 0,
  },
  itemName: {
    flex: 1,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  itemCal: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '600',
  },
  itemMore: {
    fontSize: 11,
    color: GOLD,
    fontWeight: '600',
    marginTop: 2,
    marginLeft: 10,
  },
  miniBarTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Right kcal
  mealRight: {
    alignItems: 'flex-end',
    paddingLeft: 12,
    flexShrink: 0,
  },
  mealKcal: {
    fontSize: 20,
    fontWeight: '900',
    color: GOLD,
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  mealKcalUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.3,
  },
  mealPct: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
});
