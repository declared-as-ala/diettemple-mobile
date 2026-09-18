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
const FOCUS_REFETCH_MIN_INTERVAL_MS = 30000; // 30s throttle on screen refocus

export function useTodayNutritionData(enabled: boolean) {
  const todayDateKey = getLocalDateKey(new Date());
  const nutritionByDate = useNutritionStore((s) => s.nutritionByDate);
  const data = nutritionByDate?.[todayDateKey];
  const setNutritionForDate = useNutritionStore((s) => s.setNutritionForDate);

  const [isFetching, setIsFetching] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFetchingRef = useRef(false);
  const lastFetchedAtRef = useRef<number>(0);
  const deferDone = useRef(false);

  const load = useCallback(async (force = false) => {
    if (!enabled) return;
    if (isFetchingRef.current) return;

    // Avoid duplicate network requests within throttle window unless forced
    const now = Date.now();
    if (!force && now - lastFetchedAtRef.current < FOCUS_REFETCH_MIN_INTERVAL_MS && lastFetchedAtRef.current > 0) {
      return;
    }

    isFetchingRef.current = true;
    setIsFetching(true);
    setError(null);
    startupSteps.nutritionFetch();

    try {
      const res = await meService.getNutritionToday(todayDateKey);
      lastFetchedAtRef.current = Date.now();
      setNutritionForDate(todayDateKey, {
        targets: res?.targets ?? null,
        log: res?.log ?? null,
      });
      startupSteps.nutritionFetchDone();
    } catch (e) {
      setError((e as Error)?.message ?? 'Erreur de chargement');
      startupSteps.nutritionFetchDone();
    } finally {
      isFetchingRef.current = false;
      setIsFetching(false);
      setAttempted(true);
    }
  }, [enabled, todayDateKey, setNutritionForDate]);

  // Safe startup: trigger initial load once on mount (deferred briefly)
  useEffect(() => {
    if (!enabled) return;
    // If we already have data or already attempted, don't trigger again
    if (attempted || data !== undefined) return;

    if (!deferDone.current) {
      deferDone.current = true;
      const t = setTimeout(() => {
        load();
      }, NUTRITION_FETCH_DEFER_MS);
      return () => clearTimeout(t);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, todayDateKey]);

  // On focus (e.g. back from Nutrition): throttle refocus fetch
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      const now = Date.now();
      if (now - lastFetchedAtRef.current > FOCUS_REFETCH_MIN_INTERVAL_MS) {
        load();
      }
    }, [enabled, load])
  );

  const loading = isFetching || (!attempted && data === undefined);
  return {
    data: data ?? undefined,
    loading,
    error,
    todayDateKey,
    refetch: () => load(true),
  };
}
