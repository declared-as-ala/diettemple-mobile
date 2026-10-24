/**
 * Persists in-progress SessionReels state for resume after app kill / relaunch.
 *
 * One slot PER SESSION (keyed by sessionTemplateId): an unfinished Séance 1 stays resumable for 20 hours
 * from ITS OWN start, even after the client has started (or finished) Séance 2 the next day.
 * Slots are only removed when that session is completed, expires, or the server says it is gone.
 * PiP flag is kept here so AppState handlers outside the screen can read it if needed.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RootStackParamList } from '../types';
import type { SetLog } from '../services/workoutProgressStorage';

const STORAGE_KEY_V1 = '@diettemple_active_workout_v1';
const STORAGE_KEY = '@diettemple_active_workouts_v2';
// Resume window = 20 hours from the session's START (not last activity). The server is authoritative
// (WorkoutSession.expiresAt); this is only the offline fallback.
export const RESUME_WINDOW_MS = 20 * 60 * 60 * 1000;

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

type SnapshotMap = Record<string, PersistedWorkoutSnapshotV1>;

export function snapshotExpiresAt(s: Pick<PersistedWorkoutSnapshotV1, 'startedAt' | 'updatedAt'>): number {
  return (s.startedAt || s.updatedAt || 0) + RESUME_WINDOW_MS;
}

const isValid = (d: any): d is PersistedWorkoutSnapshotV1 =>
  !!d && d.v === 1 && !!d.sessionTemplateId && !!d.session;

// All reads/writes go through one chain so debounced saves can't interleave and lose another slot.
let chain: Promise<unknown> = Promise.resolve();
function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

async function readMap(now = Date.now()): Promise<{ map: SnapshotMap; changed: boolean }> {
  let map: SnapshotMap = {};
  let changed = false;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') map = parsed as SnapshotMap;
    }
  } catch {
    map = {};
  }
  // One-time migration of the old single-slot format.
  try {
    const legacy = await AsyncStorage.getItem(STORAGE_KEY_V1);
    if (legacy) {
      const d = JSON.parse(legacy);
      if (isValid(d) && !map[d.sessionTemplateId]) map[d.sessionTemplateId] = d;
      await AsyncStorage.removeItem(STORAGE_KEY_V1);
      changed = true;
    }
  } catch {
    /* noop */
  }
  for (const [id, snap] of Object.entries(map)) {
    if (!isValid(snap) || snapshotExpiresAt(snap) <= now) {
      delete map[id]; // expired (or corrupt): no longer resumable, NEVER auto-validated
      changed = true;
    }
  }
  return { map, changed };
}

async function writeMap(map: SnapshotMap): Promise<void> {
  try {
    if (Object.keys(map).length === 0) await AsyncStorage.removeItem(STORAGE_KEY);
    else await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* best effort */
  }
}

const byStartDesc = (a: PersistedWorkoutSnapshotV1, b: PersistedWorkoutSnapshotV1) =>
  (b.startedAt || b.updatedAt || 0) - (a.startedAt || a.updatedAt || 0);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

type State = {
  pipActive: boolean;
  setPipActive: (v: boolean) => void;
  /** Snapshot of the session currently being edited (synchronous UI updates). */
  activeSnapshot: PersistedWorkoutSnapshotV1 | null;
  /** Every unexpired unfinished session, most recently started first (drives the "Continuer" cards). */
  resumable: PersistedWorkoutSnapshotV1[];
  /** Latest snapshot queued for AsyncStorage (debounced). */
  pendingSnapshot: PersistedWorkoutSnapshotV1 | null;
  queuePersist: (snapshot: PersistedWorkoutSnapshotV1) => void;
  saveImmediate: (snapshot: PersistedWorkoutSnapshotV1) => Promise<void>;
  flushPersist: () => Promise<void>;
  /** Loads all slots (pruning expired). Returns the slot for `sessionTemplateId`, or the most recent one. */
  hydrate: (sessionTemplateId?: string) => Promise<PersistedWorkoutSnapshotV1 | null>;
  /** Removes ONE slot (default: the session currently being edited). Other unfinished sessions are untouched. */
  clearPersisted: (sessionTemplateId?: string) => Promise<void>;
};

async function persistOne(snapshot: PersistedWorkoutSnapshotV1): Promise<void> {
  await serialized(async () => {
    const { map } = await readMap();
    // Keep the ORIGINAL start of this session: re-saving must never extend its 20h window.
    const prev = map[snapshot.sessionTemplateId];
    const startedAt = prev?.startedAt ?? snapshot.startedAt;
    map[snapshot.sessionTemplateId] = { ...snapshot, startedAt };
    await writeMap(map);
  });
}

export const useActiveWorkoutPersistStore = create<State>((set, get) => ({
  pipActive: false,
  setPipActive: (v) => set({ pipActive: v }),

  activeSnapshot: null,
  resumable: [],
  pendingSnapshot: null,

  queuePersist: (snapshot) => {
    set({ activeSnapshot: snapshot, pendingSnapshot: snapshot });
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      const snap = get().pendingSnapshot;
      if (snap) void persistOne(snap);
    }, 650);
  },

  saveImmediate: async (snapshot) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    set({ activeSnapshot: snapshot, pendingSnapshot: snapshot });
    await persistOne(snapshot);
  },

  flushPersist: async () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    const snap = get().pendingSnapshot;
    if (snap) await persistOne(snap);
  },

  hydrate: async (sessionTemplateId) => {
    const { map } = await serialized(async () => {
      const r = await readMap();
      if (r.changed) await writeMap(r.map);
      return r;
    });
    const list = Object.values(map).sort(byStartDesc);
    set({ resumable: list });
    const pick = sessionTemplateId ? map[sessionTemplateId] ?? null : list[0] ?? null;
    set({ activeSnapshot: pick });
    return pick;
  },

  clearPersisted: async (sessionTemplateId) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    const id = sessionTemplateId ?? get().activeSnapshot?.sessionTemplateId ?? get().pendingSnapshot?.sessionTemplateId;
    set((s) => ({
      activeSnapshot: s.activeSnapshot && s.activeSnapshot.sessionTemplateId === id ? null : s.activeSnapshot,
      pendingSnapshot: s.pendingSnapshot && s.pendingSnapshot.sessionTemplateId === id ? null : s.pendingSnapshot,
      resumable: s.resumable.filter((x) => x.sessionTemplateId !== id),
      pipActive: false,
    }));
    if (!id) return;
    await serialized(async () => {
      const { map } = await readMap();
      delete map[id];
      await writeMap(map);
    });
  },
}));
