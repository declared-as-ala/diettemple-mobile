/**
 * Single source of truth for subscription and plan.
 * All screens read from this store. No screen should fetch subscription separately
 * or compute status/daysLeft locally — use getSubscriptionState(subscription) from subscriptionState.ts.
 */
import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { startupSteps } from '../utils/startupLogger';
import { meService, type MeSubscription } from '../services/meService';
import type { PlanBounds } from '../services/meService';

interface SubscriptionStore {
  subscription: MeSubscription | null;
  plan: PlanBounds | null;
  isLoading: boolean;
  setSubscription: (s: MeSubscription | null) => void;
  setPlan: (p: PlanBounds | null) => void;
  /** Single bootstrap: fetch /me/today and set subscription + plan. Call once after login or app load. */
  bootSubscription: () => Promise<void>;
  /** Clear when logging out. */
  clear: () => void;
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  subscription: null,
  plan: null,
  isLoading: true,

  setSubscription: (subscription) => set({ subscription }),
  setPlan: (plan) => set({ plan }),

  bootSubscription: async () => {
    const token = useAuthStore.getState().token;
    if (!token) {
      set({ subscription: null, plan: null, isLoading: false });
      return;
    }
    // Only show the full-screen loading state on initial boot (no data yet).
    // On refresh calls the subscription already exists so skip the loading flag
    // to avoid unmounting the tab navigator and jumping back to the Home tab.
    if (!get().subscription) {
      set({ isLoading: true });
    }
    startupSteps.subscriptionBoot();
    try {
      const data = await meService.getToday();
      set({
        subscription: data?.subscription ?? null,
        plan: data?.plan ?? null,
        isLoading: false,
      });
      startupSteps.subscriptionBootDone();
    } catch {
      set({ subscription: null, plan: null, isLoading: false });
      startupSteps.subscriptionBootDone();
    }
  },

  clear: () => set({ subscription: null, plan: null, isLoading: false }),
}));
