/**
 * Local persistence for workout progress per day.
 * Used for: home day dots (grey / yellow / green) and set logs (weight, reps) in Reels.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@diet_temple_progress_';

export type DayProgressStatus = 'none' | 'started' | 'completed';

export interface SetLog {
  weightKg?: number;
  reps?: number;
  completed: boolean;
  /** Duration of set in seconds (from chronometer). */
  durationSeconds?: number;
}

export interface DayProgress {
  date: string; // YYYY-MM-DD
  status: DayProgressStatus;
  sessionTemplateId?: string;
  /** exerciseIndex -> array of set logs */
  sets: Record<number, SetLog[]>;
}

function key(date: string): string {
  return `${PREFIX}${date}`;
}

export const workoutProgressStorage = {
  get: async (date: string): Promise<DayProgress | null> => {
    try {
      const raw = await AsyncStorage.getItem(key(date));
      if (!raw) return null;
      return JSON.parse(raw) as DayProgress;
    } catch {
      return null;
    }
  },

  set: async (payload: DayProgress): Promise<void> => {
    try {
      await AsyncStorage.setItem(key(payload.date), JSON.stringify(payload));
    } catch {}
  },

  /** Merge set completion for an exercise; updates status to started/completed. */
  recordSet: async (
    date: string,
    sessionTemplateId: string,
    exerciseIndex: number,
    setIndex: number,
    setLog: SetLog
  ): Promise<DayProgress> => {
    const current = await workoutProgressStorage.get(date);
    const sets = current?.sets ?? {};
    const exerciseSets = sets[exerciseIndex] ?? [];
    const next = [...exerciseSets];
    next[setIndex] = setLog;
    sets[exerciseIndex] = next;

    const totalSetsForExercise = Object.values(sets).flat().length; // approximate; we don't have target count here
    const allCompleted = Object.values(next).every((s) => s?.completed);
    const anyCompleted = next.some((s) => s?.completed);
    let status: DayProgressStatus = current?.status ?? 'none';
    if (allCompleted && setLog.completed) status = 'started'; // one exercise's sets done
    if (anyCompleted && status === 'none') status = 'started';

    const out: DayProgress = {
      date,
      status: current?.status === 'completed' ? 'completed' : status,
      sessionTemplateId: sessionTemplateId || current?.sessionTemplateId,
      sets,
    };
    await workoutProgressStorage.set(out);
    return out;
  },

  /** Mark day as fully completed (all exercises). */
  markCompleted: async (date: string, sessionTemplateId: string): Promise<void> => {
    const current = await workoutProgressStorage.get(date);
    await workoutProgressStorage.set({
      date,
      status: 'completed',
      sessionTemplateId: sessionTemplateId || current?.sessionTemplateId,
      sets: current?.sets ?? {},
    });
  },

  /** Get status for a date (for home dots). */
  getStatus: async (date: string): Promise<DayProgressStatus> => {
    const p = await workoutProgressStorage.get(date);
    return p?.status ?? 'none';
  },
};
