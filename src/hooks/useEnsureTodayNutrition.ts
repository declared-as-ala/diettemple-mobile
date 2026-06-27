/**
 * Ensures today's nutrition data is loaded into the shared store so Home chart
 * shows correct values on first load without requiring a visit to Nutrition page.
 */
import { useEffect } from 'react';
import { getLocalDateKey } from '../utils/date';
import { meService } from '../services/meService';
import { useNutritionStore } from '../store/nutritionStore';

export function useEnsureTodayNutrition(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const todayKey = getLocalDateKey(new Date());
    let cancelled = false;
    (async () => {
      try {
        const res = await meService.getNutritionToday(todayKey);
        if (!cancelled && res) {
          useNutritionStore.getState().setNutritionForDate(todayKey, {
            targets: res.targets ?? null,
            log: res.log ?? null,
          });
        }
      } catch {
        // ignore; /me/today or dashboard may still populate store
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
