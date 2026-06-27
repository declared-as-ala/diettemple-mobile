import { create } from 'zustand';
import { User, AuthState } from '../types';
import * as authStorage from '../utils/authStorage';
import { startupSteps } from '../utils/startupLogger';
import { profileService } from '../services/profileService';
import { disconnectRealtimeSocket } from '../services/realtimeSocket';
import type { UserUpdatedRealtimePayload } from '../realtime/events';

export type AuthStatus = 'BOOTING' | 'LOGGED_OUT' | 'LOGGED_IN';

interface AuthStore extends AuthState {
  authStatus: AuthStatus;
  setUser: (user: User | null) => void;
  /** Update only part of user (e.g. after avatar upload). Single source of truth. */
  setUserPartial: (partial: Partial<User>) => void;
  setToken: (token: string | null) => Promise<void>;
  applyRealtimeUserUpdate: (payload: UserUpdatedRealtimePayload) => boolean;
  logout: () => Promise<void>;
  /** Fetch /auth/profile and set user. Use after login or to refresh avatar/profile everywhere. */
  refreshMe: () => Promise<void>;
  /** Run once at app start; never sets BOOTING again after completion. */
  boot: () => Promise<void>;
  /** @deprecated Use boot() */
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  authStatus: 'BOOTING',

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setUserPartial: (partial) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...partial } : null,
    })),

  refreshMe: async () => {
    const { token } = get();
    if (!token) return;
    try {
      startupSteps.profileFetch();
      const res = await profileService.getProfile();
      set({ user: res?.user ?? null, isAuthenticated: !!res?.user });
      startupSteps.profileFetchDone();
    } catch {
      startupSteps.profileFetchDone();
      // keep current state on error — never crash
    }
  },

  setToken: async (token) => {
    try {
      if (token) {
        await authStorage.setAuthToken(token);
        set({ token, isAuthenticated: true, authStatus: 'LOGGED_IN' });
      } else {
        await authStorage.deleteAuthToken();
        set({ token: null, isAuthenticated: false, authStatus: 'LOGGED_OUT' });
      }
    } catch {
      set({ token: null, isAuthenticated: false, authStatus: 'LOGGED_OUT' });
    }
  },

  applyRealtimeUserUpdate: (payload) => {
    let applied = false;
    set((state) => {
      if (!state.user) return state;
      if (state.user._id !== payload.id) return state;
      const incomingUpdatedAtMs = Date.parse(payload.updatedAt);
      const currentUpdatedAtMs = Date.parse(state.user.updatedAt ?? '');
      if (Number.isFinite(incomingUpdatedAtMs) && Number.isFinite(currentUpdatedAtMs) && incomingUpdatedAtMs < currentUpdatedAtMs) {
        return state;
      }
      applied = true;
      return {
        user: {
          ...state.user,
          name: payload.name ?? state.user.name,
          level: (payload.level as any) ?? state.user.level,
          photoUri: payload.avatar ?? state.user.photoUri,
          avatar: payload.avatar ?? state.user.avatar,
          badgePhoto: payload.badgePhoto ?? state.user.badgePhoto,
          plan: payload.plan ?? state.user.plan ?? null,
          subscriptionStatus: payload.subscriptionStatus,
          updatedAt: payload.updatedAt || state.user.updatedAt,
        },
      };
    });
    return applied;
  },

  logout: async () => {
    try {
      await authStorage.deleteAuthToken();
      const [gymMod, nutritionMod, subscriptionMod] = await Promise.all([
        import('./gymCheckinStore'),
        import('./nutritionStore'),
        import('./subscriptionStore'),
      ]);
      gymMod.useGymCheckinStore.getState().clear();
      nutritionMod.useNutritionStore.getState().clear();
      subscriptionMod.useSubscriptionStore.getState().clear();
      disconnectRealtimeSocket();
      set({ user: null, token: null, isAuthenticated: false, authStatus: 'LOGGED_OUT' });
    } catch {
      disconnectRealtimeSocket();
      set({ user: null, token: null, isAuthenticated: false, authStatus: 'LOGGED_OUT' });
    }
  },

  boot: async () => {
    const { authStatus } = get();
    if (authStatus !== 'BOOTING') return;
    startupSteps.hydrateAuth();
    try {
      const token = await authStorage.getAuthToken();
      if (token) {
        set({ token, isAuthenticated: true, isLoading: false, authStatus: 'LOGGED_IN' });
        startupSteps.hydrateAuthDone(true);
      } else {
        set({ token: null, isAuthenticated: false, isLoading: false, authStatus: 'LOGGED_OUT' });
        startupSteps.hydrateAuthDone(false);
      }
    } catch {
      set({ token: null, isAuthenticated: false, isLoading: false, authStatus: 'LOGGED_OUT' });
      startupSteps.hydrateAuthDone(false);
    }
  },

  initializeAuth: async () => {
    return get().boot();
  },
}));
