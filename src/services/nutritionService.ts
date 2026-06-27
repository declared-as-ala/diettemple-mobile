/**
 * Nutrition: daily meals summary (from /me/nutrition/today or /me/today) and mapping to UI shape.
 */
import type { DailyMealsSummary, MealProgress } from '../types';
import { meService } from './meService';

const DEFAULT_TARGET = 2200;

function toMealProgress(
  targetCalories: number,
  consumedCalories: number,
  weightG?: number
): MealProgress {
  const pct = targetCalories > 0 ? Math.min(100, Math.round((consumedCalories / targetCalories) * 100)) : 0;
  return {
    calories: consumedCalories,
    grams: weightG,
    progressPct: pct,
    targetCalories,
  };
}

/**
 * Fetch nutrition for a date and map to DailyMealsSummary (breakfast, lunch, dinner with progress).
 * Uses /me/nutrition/today and splits consumed calories across meals when no per-meal log exists.
 */
export async function getDailyMealsSummary(dateKey: string): Promise<DailyMealsSummary> {
  const res = await meService.getNutritionToday(dateKey);
  const targets = res.targets;
  const meals = res.meals || [];
  const log = res.log;
  const totalTarget = targets?.dailyCalories ?? DEFAULT_TARGET;
  const consumed = log?.consumedCalories ?? 0;

  const titles = ['Petit-déjeuner', 'Déjeuner', 'Dîner'];
  const mealTargets = meals.slice(0, 3).map((m) => m.targetCalories ?? Math.floor(totalTarget / 3));
  while (mealTargets.length < 3) mealTargets.push(Math.floor(totalTarget / 3));

  const totalTargetMeals = mealTargets[0] + mealTargets[1] + mealTargets[2];
  const breakfastConsumed = totalTargetMeals > 0 ? Math.round((consumed * mealTargets[0]) / totalTargetMeals) : 0;
  const lunchConsumed = totalTargetMeals > 0 ? Math.round((consumed * mealTargets[1]) / totalTargetMeals) : 0;
  const dinnerConsumed = consumed - breakfastConsumed - lunchConsumed;

  return {
    dateKey,
    breakfast: toMealProgress(mealTargets[0], breakfastConsumed),
    lunch: toMealProgress(mealTargets[1], lunchConsumed),
    dinner: toMealProgress(mealTargets[2], Math.max(0, dinnerConsumed)),
    totalTargetCalories: totalTarget,
  };
}
