import api from './api';
import { getAuthToken } from '../utils/authStorage';
import type { TodayResponse } from './meService';

export interface DailyProgram {
  _id: string;
  date: string;
  userId: string;
  weekNumber?: number;
  waterTarget?: number;
  calorieTarget?: number;
  dailyGoal?: string;
  sessionId?: string | null;
  completed?: boolean;
  mainObjective?: {
    title: string;
    description?: string;
    videoUrl?: string;
  };
  session?: Session | null;
  programStatus?: 'ACTIVE' | 'COMPLETED' | 'PAUSED';
  isProgramCompleted?: boolean;
  programStartDate?: string | null;
  programEndDate?: string | null;
  nextNutritionistVisit?: string | null;
}

export interface Session {
  _id: string;
  title: string;
  description?: string;
  duration?: number;
  exercises: Exercise[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface Exercise {
  _id: string;
  name: string;
  muscleGroup: string;
  equipment?: string;
  difficulty?: string;
  reps?: number;
  sets?: number;
  duration?: number;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
  alternatives?: string[]; // Array of alternative exercise IDs
}

export interface BodyProgressPhoto {
  _id?: string;
  date: string;
  imageUrl: string;
  userId?: string;
}

export interface CoachEvent {
  _id?: string;
  date: string;
  type: string;
  title?: string;
  description?: string;
}







const checkAuth = async (): Promise<boolean> => {
  const token = await getAuthToken();
  if (!token) {
    return false;
  }
  return true;
};

export const homeService = {
  /** Single source of truth for home dashboard: GET /me/today. Use this instead of calling /home/* on Home. */
  getTodayDashboard: async (date?: string): Promise<TodayResponse> => {
    if (!(await checkAuth())) {
      throw new Error('Not authenticated');
    }
    const params = date ? { date } : {};
    const response = await api.get<TodayResponse>('/me/today', { params });
    return response.data;
  },

  getDailyProgram: async (date: string): Promise<{ dailyProgram: DailyProgram | null }> => {
    if (!(await checkAuth())) {
      throw new Error('Not authenticated');
    }
    const response = await api.get<{ dailyProgram: DailyProgram }>('/home/daily-program', {
      params: { date },
    });
    return response.data;
  },

  getSession: async (sessionId: string): Promise<{ session: Session }> => {
    if (!(await checkAuth())) {
      throw new Error('Not authenticated');
    }
    const response = await api.get<{ session: Session }>(`/home/session/${sessionId}`);
    return response.data;
  },

  getExercises: async (): Promise<{ exercises: Exercise[] }> => {
    if (!(await checkAuth())) {
      throw new Error('Not authenticated');
    }
    const response = await api.get<{ exercises: Exercise[] }>('/home/exercises');
    return response.data;
  },

  // Get alternative exercises for a given exercise (same muscle group)
  getAlternativeExercises: async (exerciseId: string, muscleGroup: string): Promise<{ exercises: Exercise[] }> => {
    if (!(await checkAuth())) {
      throw new Error('Not authenticated');
    }
    // Filter exercises by muscle group, excluding the current exercise
    const response = await api.get<{ exercises: Exercise[] }>('/home/exercises');
    const alternatives = response.data.exercises.filter(
      (ex: Exercise) => ex.muscleGroup === muscleGroup && ex._id !== exerciseId
    );
    return { exercises: alternatives.slice(0, 2) }; // Return max 2 alternatives
  },

  getProgram: async (): Promise<{
    current_program: {
      _id: string;
      startDate: string;
      endDate: string;
      lengthWeeks: number;
      nextNutritionistVisit: string;
      completedDays: number;
      totalDays: number;
      currentDay: number;
      daysRemaining: number;
      currentWeek: number;
      status: 'ACTIVE' | 'COMPLETED' | 'PAUSED';
      programStatus: 'ongoing' | 'completed' | 'upcoming';
      progressPercentage: number;
    } | null;
  }> => {
    if (!(await checkAuth())) {
      throw new Error('Not authenticated');
    }
    const response = await api.get<{
      current_program: {
        _id: string;
        startDate: string;
        endDate: string;
        lengthWeeks: number;
        nextNutritionistVisit: string;
        completedDays: number;
        totalDays: number;
        currentDay: number;
        daysRemaining: number;
        currentWeek: number;
        status: 'ACTIVE' | 'COMPLETED' | 'PAUSED';
        programStatus: 'ongoing' | 'completed' | 'upcoming';
        progressPercentage: number;
      } | null;
    }>('/home/program');
    return response.data;
  },

  getProgramHistory: async (): Promise<{
    programs: Array<{
      _id: string;
      startDate: string;
      endDate: string;
      lengthWeeks: number;
      nextNutritionistVisit: string;
      completedDays: number;
      totalDays: number;
      currentDay: number;
      daysRemaining: number;
      status: 'ACTIVE' | 'COMPLETED' | 'PAUSED';
      programStatus: 'ongoing' | 'completed' | 'upcoming';
      progressPercentage: number;
    }>
  }> => {
    if (!(await checkAuth())) {
      throw new Error('Not authenticated');
    }
    const response = await api.get<{
      programs: Array<{
        _id: string;
        startDate: string;
        endDate: string;
        lengthWeeks: number;
        nextNutritionistVisit: string;
        completedDays: number;
        totalDays: number;
        currentDay: number;
        daysRemaining: number;
        status: 'ACTIVE' | 'COMPLETED' | 'PAUSED';
        programStatus: 'ongoing' | 'completed' | 'upcoming';
        progressPercentage: number;
      }>
    }>('/home/programs/history');
    return response.data;
  },

  getBodyPhoto: async (date: string): Promise<{ photo: BodyProgressPhoto | null }> => {
    if (!(await checkAuth())) {
      throw new Error('Not authenticated');
    }
    try {
      const response = await api.get<{ photo: BodyProgressPhoto | null }>('/home/body-photo', { params: { date } });
      return response.data;
    } catch {
      return { photo: null };
    }
  },

  getCoachEvent: async (date: string): Promise<{ event: CoachEvent | null }> => {
    if (!(await checkAuth())) {
      throw new Error('Not authenticated');
    }
    try {
      const response = await api.get<{ event: CoachEvent | null }>('/home/coach-event', { params: { date } });
      return response.data;
    } catch {
      return { event: null };
    }
  },

  uploadBodyPhoto: async (date: string, base64: string): Promise<void> => {
    if (!(await checkAuth())) {
      throw new Error('Not authenticated');
    }
    await api.post('/home/body-photo', { date, imageBase64: base64 });
  },
};

