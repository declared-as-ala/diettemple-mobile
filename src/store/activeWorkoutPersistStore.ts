/**
 * Persists in-progress SessionReels state for resume after app kill / relaunch.
 * PiP flag is kept here so AppState handlers outside the screen can read it if needed.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RootStackParamList } from '../types';
import type { SetLog } from '../services/workoutProgressStorage';

const STORAGE_KEY = '@diettemple_active_workout_v1';
const MAX_AGE_MS = 20 * 60 * 60 * 1000; // Active workout resume expires after 20 hours

export type SessionReelsSessionParam = RootStackParamList['SessionReels']['session'];

export type PersistedWorkoutSnapshotV1 = {
  v: 1;
  workoutSessionId?: string;
  sessionTemplateId: string;
  session: SessionReelsSessionParam;
  currentIndex: number;
  runnerSetIndex?: number;
  positionSeconds: number;
  isPaused: boolean;
  setLogs: Record<number, SetLog[]>;
  completedExerciseIds?: string[];
  startedAt?: number;
  updatedAt: number;
};

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

type State = {
  pipActive: boolean;
  setPipActive: (v: boolean) => void;
  /** Active in-memory snapshot for synchronous UI updates (e.g. resume bar). */
  activeSnapshot: PersistedWorkoutSnapshotV1 | null;
  /** Latest snapshot queued for AsyncStorage (debounced). */
  pendingSnapshot: PersistedWorkoutSnapshotV1 | null;
  queuePersist: (snapshot: PersistedWorkoutSnapshotV1) => void;
  saveImmediate: (snapshot: PersistedWorkoutSnapshotV1) => Promise<void>;
  flushPersist: () => Promise<void>;
  hydrate: () => Promise<PersistedWorkoutSnapshotV1 | null>;
  clearPersisted: () => Promise<void>;
};

export const useActiveWorkoutPersistStore = create<State>((set, get) => ({
  pipActive: false,
  setPipActive: (v) => set({ pipActive: v }),

  activeSnapshot: null,
  pendingSnapshot: null,

  queuePersist: (snapshot) => {
    set({ activeSnapshot: snapshot, pendingSnapshot: snapshot });
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      const snap = get().pendingSnapshot;
      if (snap) {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snap)).catch(() => {});
      }
    }, 650);
  },

  saveImmediate: async (snapshot) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    set({ activeSnapshot: snapshot, pendingSnapshot: snapshot });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {}
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
      if (!raw) {
        set({ activeSnapshot: null });
        return null;
      }
      const data = JSON.parse(raw) as PersistedWorkoutSnapshotV1;
      if (!data || data.v !== 1 || !data.sessionTemplateId || !data.session) {
        await AsyncStorage.removeItem(STORAGE_KEY);
        set({ activeSnapshot: null });
        return null;
      }
      const lastActive = data.updatedAt || data.startedAt || 0;
      if (Date.now() - lastActive > MAX_AGE_MS) {
        await AsyncStorage.removeItem(STORAGE_KEY);
        set({ activeSnapshot: null });
        return null;
      }
      set({ activeSnapshot: data });
      return data;
    } catch {
      set({ activeSnapshot: null });
      return null;
    }
  },

  clearPersisted: async () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    set({ activeSnapshot: null, pendingSnapshot: null, pipActive: false });
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },
}));
