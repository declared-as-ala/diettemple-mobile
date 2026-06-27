/**
 * Persists in-progress SessionReels state for resume after app kill / relaunch.
 * PiP flag is kept here so AppState handlers outside the screen can read it if needed.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RootStackParamList } from '../types';
import type { SetLog } from '../services/workoutProgressStorage';

const STORAGE_KEY = '@diettemple_active_workout_v1';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type SessionReelsSessionParam = RootStackParamList['SessionReels']['session'];

export type PersistedWorkoutSnapshotV1 = {
  v: 1;
  sessionTemplateId: string;
  session: SessionReelsSessionParam;
  currentIndex: number;
  positionSeconds: number;
  isPaused: boolean;
  setLogs: Record<number, SetLog[]>;
  updatedAt: number;
};

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

type State = {
  pipActive: boolean;
  setPipActive: (v: boolean) => void;
  /** Latest snapshot queued for AsyncStorage (debounced). */
  pendingSnapshot: PersistedWorkoutSnapshotV1 | null;
  queuePersist: (snapshot: PersistedWorkoutSnapshotV1) => void;
  flushPersist: () => Promise<void>;
  hydrate: () => Promise<PersistedWorkoutSnapshotV1 | null>;
  clearPersisted: () => Promise<void>;
};

export const useActiveWorkoutPersistStore = create<State>((set, get) => ({
  pipActive: false,
  setPipActive: (v) => set({ pipActive: v }),

  pendingSnapshot: null,

  queuePersist: (snapshot) => {
    set({ pendingSnapshot: snapshot });
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      const snap = get().pendingSnapshot;
      if (snap) {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snap)).catch(() => {});
      }
    }, 650);
  },

  flushPersist: async () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    const snap = get().pendingSnapshot;
    if (snap) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snap)).catch(() => {});
    }
  },

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as PersistedWorkoutSnapshotV1;
      if (!data || data.v !== 1 || !data.sessionTemplateId || !data.session) {
        await AsyncStorage.removeItem(STORAGE_KEY);
        return null;
      }
      if (Date.now() - (data.updatedAt || 0) > MAX_AGE_MS) {
        await AsyncStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  },

  clearPersisted: async () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    set({ pendingSnapshot: null, pipActive: false });
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },
}));
