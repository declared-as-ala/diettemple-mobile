/**
 * Shared hook: ensures today's nutrition (local dateKey) is loaded into the store
 * and exposes it for Home & Nutrition. Single source of truth — no duplicate state.
 * Safe startup: defers first fetch briefly so home can render before network.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getLocalDateKey } from '../utils/date';
import { meService } from '../services/meService';
import { useNutritionStore } from '../store/nutritionStore';
import { startupSteps } from '../utils/startupLogger';
import type { NutritionDayData } from '../store/nutritionStore';

/** Defer nutrition fetch on first mount to avoid startup crash (safe mode). */
const NUTRITION_FETCH_DEFER_MS = 400;

export function useTodayNutritionData(enabled: boolean) {
  const todayDateKey = getLocalDateKey(new Date());
  const nutritionByDate = useNutritionStore((s) => s.nutritionByDate);
  const data = nutritionByDate?.[todayDateKey];
  const setNutritionForDate = useNutritionStore((s) => s.setNutritionForDate);

  const [isFetching, setIsFetching] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deferDone = useRef(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    setIsFetching(true);
    setError(null);
    startupSteps.nutritionFetch();
    try {
      const res = await meService.getNutritionToday(todayDateKey);
      setNutritionForDate(todayDateKey, {
        targets: res?.targets ?? null,
        log: res?.log ?? null,
      });
      startupSteps.nutritionFetchDone();
    } catch (e) {
      setError((e as Error)?.message ?? 'Erreur de chargement');
      startupSteps.nutritionFetchDone();
    } finally {
      setIsFetching(false);
      setAttempted(true);
    }
  }, [enabled, todayDateKey, setNutritionForDate]);

  // True only if we have data with actual targets (not null-placeholder from /me/today)
  const hasRealData = data != null && data.targets != null;

  // Safe startup: defer first fetch so home renders before network.
  useEffect(() => {
    if (!enabled) return;
    if (hasRealData) {
      setAttempted(true);
      return;
    }
    if (!deferDone.current) {
      deferDone.current = true;
      const t = setTimeout(() => {
        load();
      }, NUTRITION_FETCH_DEFER_MS);
      return () => clearTimeout(t);
    }
    load();
  }, [enabled, todayDateKey, load, hasRealData]);

  // On focus (e.g. back from Nutrition): ensure we have latest for today.
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      if (!hasRealData && !isFetching) load();
    }, [enabled, load, hasRealData, isFetching])
  );

  const loading = (!hasRealData && (isFetching || !attempted));
  return {
    data: data ?? undefined,
    loading,
    error,
    todayDateKey,
    refetch: load,
  };
}
