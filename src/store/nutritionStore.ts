/**
 * Single source of truth for daily nutrition (targets + log) so Home "Objectif du jour"
 * and Nutrition page stay in sync. Updated when:
 * - Home or Nutrition fetches /me/nutrition/today or /me/today
 * - Nutrition adds/edits/deletes a meal (call invalidateDate then fetchIfNeeded).
 *
 * fetchIfNeeded(dateKey): idempotent — skips fetch if data is fresh (< 5 min old).
 * pendingFetches: prevents duplicate in-flight requests for the same date.
 */
import { create } from 'zustand';
import { meService } from '../services/meService';
import type { NutritionTargets } from '../services/meService';

export interface NutritionDayLog {
  consumedCalories?: number;
  consumedMacros?: { proteinG?: number; carbsG?: number; fatG?: number };
  waterMl?: number;
}

export interface NutritionDayData {
  targets: NutritionTargets | null;
  log: NutritionDayLog | null;
}

/** How long before cached data is considered stale (ms). */
const STALE_MS = 5 * 60 * 1000; // 5 minutes

interface NutritionState {
  nutritionByDate: Record<string, NutritionDayData>;
  /** Unix timestamps of last successful fetch per dateKey. */
  fetchedAtByDate: Record<string, number>;
  /** In-flight fetch guards — prevents parallel duplicate requests. */
  pendingFetches: Set<string>;

  setNutritionForDate: (dateKey: string, data: NutritionDayData) => void;
  getNutritionForDate: (dateKey: string) => NutritionDayData | undefined;

  /**
   * Fetch nutrition for dateKey only if:
   * - No data yet for that date, OR
   * - Last fetch was more than STALE_MS ago
   * - AND no request is already in flight for that date
   *
   * Safe to call from multiple screens simultaneously — only one request fires.
   */
  fetchIfNeeded: (dateKey: string) => Promise<void>;

  /** Force-mark a date as stale so the next fetchIfNeeded re-fetches. */
  invalidateDate: (dateKey: string) => void;

  clear: () => void;
}

export const useNutritionStore = create<NutritionState>((set, get) => ({
  nutritionByDate: {},
  fetchedAtByDate: {},
  pendingFetches: new Set<string>(),

  setNutritionForDate: (dateKey, data) => {
    set((s) => ({
      nutritionByDate: { ...s.nutritionByDate, [dateKey]: data },
      fetchedAtByDate: { ...s.fetchedAtByDate, [dateKey]: Date.now() },
    }));
  },

  getNutritionForDate: (dateKey) => get().nutritionByDate[dateKey],

  fetchIfNeeded: async (dateKey) => {
    const { nutritionByDate, fetchedAtByDate, pendingFetches } = get();

    // Already fetching this date — skip
    if (pendingFetches.has(dateKey)) return;

    // Check staleness
    const lastFetch = fetchedAtByDate[dateKey] ?? 0;
    const hasData = !!nutritionByDate[dateKey];
    const isStale = Date.now() - lastFetch > STALE_MS;

    if (hasData && !isStale) return;

    // Mark in-flight
    set((s) => {
      const next = new Set(s.pendingFetches);
      next.add(dateKey);
      return { pendingFetches: next };
    });

    try {
      const res = await meService.getNutritionToday(dateKey);
      set((s) => ({
        nutritionByDate: {
          ...s.nutritionByDate,
          [dateKey]: { targets: res?.targets ?? null, log: res?.log ?? null },
        },
        fetchedAtByDate: { ...s.fetchedAtByDate, [dateKey]: Date.now() },
      }));
    } catch {
      // Silently ignore — keep previous data if any
    } finally {
      set((s) => {
        const next = new Set(s.pendingFetches);
        next.delete(dateKey);
        return { pendingFetches: next };
      });
    }
  },

  invalidateDate: (dateKey) =>
    set((s) => ({
      fetchedAtByDate: { ...s.fetchedAtByDate, [dateKey]: 0 },
    })),

  clear: () =>
    set({ nutritionByDate: {}, fetchedAtByDate: {}, pendingFetches: new Set() }),
}));
