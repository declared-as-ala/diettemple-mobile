import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LiftRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  sets: number;
  date: string;
  notes?: string;
}

interface LiftHistoryStore {
  liftHistory: LiftRecord[];
  addLift: (lift: Omit<LiftRecord, 'id'>) => void;
  getExerciseHistory: (exerciseId: string) => LiftRecord[];
  getPersonalRecord: (exerciseId: string) => LiftRecord | null;
  deleteLift: (id: string) => void;
}

export const useLiftHistoryStore = create<LiftHistoryStore>()(
  persist(
    (set, get) => ({
      liftHistory: [],

      addLift: (lift) => {
        const newLift: LiftRecord = {
          ...lift,
          id: `${Date.now()}`,
        };
        set((state) => ({
          liftHistory: [newLift, ...state.liftHistory],
        }));
      },

      getExerciseHistory: (exerciseId: string) => {
        return get().liftHistory
          .filter((lift) => lift.exerciseId === exerciseId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      },

      getPersonalRecord: (exerciseId: string) => {
        const history = get().liftHistory.filter((lift) => lift.exerciseId === exerciseId);
        if (history.length === 0) return null;
        return history.reduce((pr, lift) => (lift.weight > pr.weight ? lift : pr));
      },

      deleteLift: (id: string) => {
        set((state) => ({
          liftHistory: state.liftHistory.filter((lift) => lift.id !== id),
        }));
      },
    }),
    {
      name: 'lift-history-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
