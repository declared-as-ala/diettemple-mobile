import api from './api';
import { getAuthToken } from '../utils/authStorage';
import { getLocalDateKey } from '../utils/date';

export interface ExerciseSession {
  exerciseId: string | any;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  sets: {
    setNumber: number;
    weight?: number;
    repsCompleted?: number;
    notes?: string;
    completed?: boolean;
    completedAt?: string;
  }[];
  startedAt?: string;
  completedAt?: string;
}

export interface WorkoutSession {
  _id: string;
  userId: string;
  sessionId: string;
  date: string;
  workoutType?: string;
  exercises: ExerciseSession[];
  startedAt: string;
  completedAt?: string;
  status: 'active' | 'completed' | 'abandoned';
}

export interface ExerciseProgression {
  _id: string;
  userId: string;
  exerciseId: string | any;
  currentWeight: number;
  targetReps: number;
  lastCompletedAt?: string;
  progressionHistory: {
    date: string;
    weight: number;
    reps: number;
    sets: number;
  }[];
}

export type RecommendationDecision = 'ADVANCE' | 'KEEP' | 'DOWN' | 'NO_HISTORY';

export interface ExerciseRecommendation {
  hasHistory: boolean;
  exerciseId: string;
  exerciseName: string;
  lastSessionDate?: string;
  lastSets: Array<{ setNumber: number; weight: number; reps: number }>;
  targetRepRange: { min: number; max: number };
  decision: RecommendationDecision;
  recommendedWeight?: number;
  reason: string;
  suggestedSets: Array<{ setNumber: number; weight: number; repsTarget: string; type: 'warmup' | 'working' }>;
}

const checkAuth = async (): Promise<boolean> => {
  const token = await getAuthToken();
  if (!token) {
    return false;
  }
  return true;
};

export const workoutService = {
  startWorkout: async (sessionId: string): Promise<{ workoutSession: WorkoutSession }> => {
    if (!(await checkAuth())) {
      throw new Error('Not authenticated');
    }
    const response = await api.post<{ workoutSession: WorkoutSession }>('/workout/start', {
      sessionId,
      dateKey: getLocalDateKey(new Date()),
    });
    return response.data;
  },

  updateExerciseSet: async (
    workoutSessionId: string,
    exerciseId: string,
    setNumber: number,
    weight: number,
    repsCompleted: number,
    notes?: string
  ): Promise<{ workoutSession: WorkoutSession }> => {
    if (!(await checkAuth())) {
      throw new Error('Not authenticated');
    }
    const response = await api.post<{ workoutSession: WorkoutSession }>('/workout/exercise/set', {
      workoutSessionId,
      exerciseId,
      setNumber,
      weight,
      repsCompleted,
      notes,
    });
    return response.data;
  },

  skipExercise: async (
    workoutSessionId: string,
    exerciseId: string
  ): Promise<{ workoutSession: WorkoutSession }> => {
    if (!(await checkAuth())) {
      throw new Error('Not authenticated');
    }
    const response = await api.post<{ workoutSession: WorkoutSession }>('/workout/exercise/skip', {
      workoutSessionId,
      exerciseId,
    });
    return response.data;
  },

  completeExercise: async (
    workoutSessionId: string,
    exerciseId: string
  ): Promise<{ 
    workoutSession: WorkoutSession; 
    history?: {
      lastWeight: number;
      lastReps: number[];
      lastSets: Array<{
        setNumber: number;
        weight: number;
        reps: number;
        completed: boolean;
        completedAt: Date;
      }>;
      progressionStatus: 'stable' | 'eligible' | 'failed';
      recommendedNextWeight?: number;
      totalVolume?: number;
    };
  }> => {
    if (!(await checkAuth())) {
      throw new Error('Not authenticated');
    }
    const response = await api.post<{ 
      workoutSession: WorkoutSession; 
      history?: {
        lastWeight: number;
        lastReps: number[];
        lastSets: Array<{
          setNumber: number;
          weight: number;
          reps: number;
          completed: boolean;
          completedAt: Date;
        }>;
        progressionStatus: 'stable' | 'eligible' | 'failed';
        recommendedNextWeight?: number;
        totalVolume?: number;
      };
    }>(
      '/workout/exercise/complete',
      {
        workoutSessionId,
        exerciseId,
      }
    );
    return response.data;
  },

  completeWorkout: async (
    workoutSessionId: string,
    options?: { completionType?: 'normal' | 'rattrapage'; originalScheduledDate?: string }
  ): Promise<{ workoutSession: WorkoutSession; level: string }> => {
    if (!(await checkAuth())) {
      throw new Error('Not authenticated');
    }
    const response = await api.post<{
      workoutSession: WorkoutSession;
      level: string;
    }>('/workout/complete', {
      workoutSessionId,
      ...options,
    });
    return response.data;
  },

  getActiveWorkout: async (): Promise<{ workoutSession: WorkoutSession }> => {
    if (!(await checkAuth())) {
      throw new Error('Not authenticated');
    }
    const response = await api.get<{ workoutSession: WorkoutSession }>('/workout/active');
    return response.data;
  },

  getExerciseProgression: async (exerciseId: string): Promise<{ progression: ExerciseProgression | { currentWeight: number; targetReps: number } }> => {
    if (!(await checkAuth())) {
      throw new Error('Not authenticated');
    }
    const response = await api.get<{ progression: ExerciseProgression | { currentWeight: number; targetReps: number } }>(
      `/workout/progression/${exerciseId}`
    );
    return response.data;
  },

  /**
   * Save a completed workout session to the backend.
   * Computes volume and upserts ExerciseHistory for each exercise.
   */
  completeSession: async (payload: {
    sessionTemplateId: string;
    durationSeconds: number;
    exercises: Array<{
      exerciseId: string;
      exerciseName: string;
      sets: Array<{ setNumber: number; reps: number; weightKg: number; completedAt: string }>;
    }>;
    completionType?: 'normal' | 'rattrapage';
    originalScheduledDate?: string;
  }): Promise<{ success: boolean; sessionId: string }> => {
    if (!(await checkAuth())) {
      throw new Error('Not authenticated');
    }
    const response = await api.post<{ success: boolean; sessionId: string }>(
      '/me/workout/session/complete',
      payload
    );
    return response.data;
  },

  getExerciseHistory: async (exerciseId: string): Promise<{
    program: {
      targetSets: number;
      targetReps: number | { min: number; max: number };
      baseWeight: number;
      restSeconds: number;
    } | null;
    history: {
      lastWeight: number;
      lastReps: number[];
      lastSets: Array<{
        setNumber: number;
        weight: number;
        reps: number;
        completed: boolean;
        completedAt: Date;
      }>;
      lastCompletedAt?: Date;
      recommendedNextWeight?: number;
      progressionStatus: 'stable' | 'eligible' | 'failed';
      totalVolume?: number;
    } | null;
    exercise: {
      name: string;
      muscleGroup: string;
      defaultWeight: number;
    } | null;
  }> => {
    if (!(await checkAuth())) {
      throw new Error('Not authenticated');
    }
    const response = await api.get(`/workout/exercise/history/${exerciseId}`);
    return response.data;
  },

  upsertExerciseHistory: async (
    exerciseId: string,
    sets: Array<{ setNumber?: number; reps: number; weightKg?: number; completedAt?: string }>
  ): Promise<{ success: boolean }> => {
    if (!(await checkAuth())) {
      throw new Error('Not authenticated');
    }
    const response = await api.post<{ success: boolean }>('/me/workout/exercise-history/upsert', {
      exerciseId,
      sets,
    });
    return response.data;
  },

  getExerciseRecommendation: async (exerciseId: string, exerciseName?: string): Promise<ExerciseRecommendation> => {
    if (!(await checkAuth())) {
      throw new Error('Not authenticated');
    }
    const params = exerciseName ? { exerciseName } : undefined;
    const response = await api.get<ExerciseRecommendation>(`/exercises/${exerciseId}/recommendation`, { params });
    return response.data;
  },
};

