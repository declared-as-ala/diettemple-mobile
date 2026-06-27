import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDateKey } from '../utils/date';
import { checkinService } from '../services/checkinService';
import { useAuthStore } from './authStore';

const STORAGE_KEY = '@diettemple_gym_checkin';

interface GymCheckinState {
  verifiedDateKey: string | null;
  verifiedAt: string | null;
  proofUrl: string | null;
  /** Sync from API for today (or given dateKey). Call on app open / resume / before start. */
  syncStatus: (dateKey?: string) => Promise<void>;
  /** Set after successful photo check-in (once per day). */
  setVerified: (proofUrl?: string | null) => void;
  /** Clear local state (e.g. on logout). */
  clear: () => void;
  /** True if user has verified gym for this dateKey (default today). */
  isGymVerifiedToday: (dateKey?: string) => boolean;
  /** Sync from API then return whether verified for dateKey. Call before starting session. */
  ensureGymVerified: (dateKey?: string) => Promise<boolean>;
}

export const useGymCheckinStore = create<GymCheckinState>((set, get) => ({
  verifiedDateKey: null,
  verifiedAt: null,
  proofUrl: null,

  syncStatus: async (dateKey?: string) => {
    const dk = dateKey || getLocalDateKey(new Date());
    try {
      const res = await checkinService.getGymStatus(dk);
      if (res.verified) {
        set({
          verifiedDateKey: dk,
          verifiedAt: res.verifiedAt || new Date().toISOString(),
          proofUrl: res.proofUrl ?? null,
        });
        const userId = useAuthStore.getState().user?._id;
        if (userId) {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
            verifiedDateKey: dk,
            verifiedAt: res.verifiedAt,
            proofUrl: res.proofUrl,
          }));
        }
      } else {
        set({
          verifiedDateKey: null,
          verifiedAt: null,
          proofUrl: null,
        });
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Network / server error: keep existing same-day verification (stale-while-revalidate).
      // Clearing here caused resume-from-home to loop on "Vérification requise" after a failed GET.
    }
  },

  setVerified: (proofUrl?: string | null) => {
    const dateKey = getLocalDateKey(new Date());
    set({
      verifiedDateKey: dateKey,
      verifiedAt: new Date().toISOString(),
      proofUrl: proofUrl ?? null,
    });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      verifiedDateKey: dateKey,
      verifiedAt: new Date().toISOString(),
      proofUrl: proofUrl ?? null,
    })).catch(() => {});
  },

  clear: () => {
    set({
      verifiedDateKey: null,
      verifiedAt: null,
      proofUrl: null,
    });
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },

  isGymVerifiedToday: (dateKey?: string) => {
    const dk = dateKey || getLocalDateKey(new Date());
    const { verifiedDateKey } = get();
    return verifiedDateKey === dk;
  },

  ensureGymVerified: async (dateKey?: string) => {
    const dk = dateKey || getLocalDateKey(new Date());
    await get().syncStatus(dk);
    return get().isGymVerifiedToday(dk);
  },
}));

/** Hydrate from AsyncStorage on app start (call once after auth ready). */
export async function hydrateGymCheckinStore(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    const today = getLocalDateKey(new Date());
    if (data.verifiedDateKey !== today) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      useGymCheckinStore.getState().clear();
      return;
    }
    useGymCheckinStore.setState({
      verifiedDateKey: data.verifiedDateKey,
      verifiedAt: data.verifiedAt,
      proofUrl: data.proofUrl ?? null,
    });
  } catch {
    useGymCheckinStore.getState().clear();
  }
}
