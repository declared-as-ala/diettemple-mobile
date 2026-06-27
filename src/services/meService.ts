/**
 * Authenticated user "me" API: subscription, today dashboard, nutrition, plan, session, exercise.
 * All requests use the same axios instance (token attached in api.ts).
 */
import api from './api';

export interface ScanMealSuggestedFood {
  foodId: string;
  name: string;
  macrosPer100g?: { kcal: number; protein: number; carbs: number; fat: number };
}

export interface ScanMealItem {
  label: string;
  category: string;
  confidence: number;
  suggestedFoods: ScanMealSuggestedFood[];
  defaultGrams: number;
}

export interface ScanMealResponse {
  items: ScanMealItem[];
  notes: string;
}

export interface FoodSearchItem {
  foodId: string;
  name: string;
  synonyms: string[];
  macrosPer100g: { kcal: number; protein: number; carbs: number; fat: number };
  tags: string[];
}

export type SubscriptionDisplayStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'CANCELED';

export interface MeSubscription {
  status: SubscriptionDisplayStatus;
  levelName?: string | null;
  startAt?: string;
  endAt?: string;
  daysRemaining: number;
  levelTemplateId?: string;
  lastAction?: string | null;
  lastActionAt?: string | null;
}

export interface TodaySessionTemplate {
  sessionTemplateId: string;
  title: string;
  durationMinutes?: number;
  difficulty?: string;
  exerciseCount?: number;
}

export interface NutritionTargets {
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MealItemTemplate {
  name: string;
  calories: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  notes?: string;
}

export interface MealTemplate {
  title: string;
  targetCalories: number;
  items: MealItemTemplate[];
}

export interface PlanBounds {
  planStartDate: string;
  planEndDate: string;
  durationWeeks: number;
  planAssignmentId?: string | null;
}

export type WorkoutDisplayKind = 'NORMAL' | 'MAKEUP' | 'REST';

export interface MissedSessionInfo {
  sessionTemplateId: string;
  title?: string;
  durationMinutes?: number;
  difficulty?: string;
  exerciseCount?: number;
  /** Original calendar date (YYYY-MM-DD UTC) of the missed scheduled session */
  originalDate: string;
  /** English day name of the missed scheduled session, e.g. "Monday" */
  dayName: string;
}

export interface TodayResponse {
  subscription: MeSubscription | null;
  plan?: PlanBounds | null;
  today: {
    date: string;
    weekNumber: number;
    dayName: string;
    sessionTemplate: TodaySessionTemplate | null;
    sessionId?: string | null;
    sessionTitle?: string | null;
    isRestDay?: boolean;
    /** True when today's scheduled session has a completed WorkoutSession server-side. */
    completed?: boolean;
    /** True when today's completed session was a rattrapage (catch-up) completion. */
    completedRattrapage?: boolean;
    /** Most recent uncompleted scheduled session within last 14 days, or null. */
    missedSession?: MissedSessionInfo | null;
    /** Same as missedSession — always returned alongside sessionTemplate (never replaces it). */
    rattrapageSession?: MissedSessionInfo | null;
    /** UI hint: NORMAL = today scheduled and not done, MAKEUP = pending missed session, REST = rest day. */
    displayKind?: WorkoutDisplayKind;
    nutritionTargets: NutritionTargets | null;
    meals: MealTemplate[];
    log?: {
      consumedCalories?: number;
      consumedMacros?: { proteinG?: number; carbsG?: number; fatG?: number };
      waterMl?: number;
      status?: string;
    } | null;
  };
  progress: {
    streaks: { workout: number; nutrition: number };
    lastWorkout: unknown;
    level: number;
  };
}

export type WeekDayStatus = 'completed' | 'pending' | 'missed' | 'rest' | 'rattrapage';

export interface WeekDaySession {
  sessionTemplateId: string;
  title?: string;
  durationMinutes?: number;
  status?: WeekDayStatus;
}

export interface WeekPlanDay {
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  date?: string;
  dateKey?: string;
  /** Roll-up status of the day (completed/pending/missed/rest). Backend-supplied. */
  status?: WeekDayStatus;
  sessions: WeekDaySession[];
}

export interface WeekPlanResponse {
  plan: {
    weekNumber: number;
    levelName?: string;
    planStartDate?: string;
    planEndDate?: string;
    durationWeeks?: number;
    days: WeekPlanDay[];
  } | null;
  message?: string;
}

export interface ActivePlanDay {
  dayIndex: number;
  date: string;
  isRestDay: boolean;
  seance: {
    id: string | null;
    name: string;
    exercises: Array<{ exerciseId: string | null }>;
  } | null;
}

export interface ActivePlanWeek {
  weekIndex: number;
  days: ActivePlanDay[];
}

export interface ActivePlanResponse {
  assignment: {
    id: string;
    startDate: string;
    endDate: string;
    durationWeeks: number;
    status: 'active' | 'paused' | 'archived' | 'completed';
  } | null;
  plan: {
    id: string;
    name: string;
    gender?: string;
    durationWeeks: number;
    weeks: ActivePlanWeek[];
  } | null;
  progress: {
    currentWeekIndex: number;
    currentDayIndex: number;
    totalScheduledSessions: number;
    completedSessions: number;
    completionPercent: number;
    remainingDays: number;
  } | null;
  today?: {
    weekIndex: number;
    dayIndex: number;
  } | null;
  missedSeances?: Array<{
    weekIndex: number;
    dayIndex: number;
    originalDate?: string;
  }>;
  subscription: {
    expiresAt: string;
    status: string;
  } | null;
}

export interface SessionItemConfig {
  exerciseId: { _id: string; name: string; muscleGroup?: string; equipment?: string; difficulty?: string; description?: string; videoUrl?: string };
  alternatives?: Array<{ _id: string; name: string; muscleGroup?: string; equipment?: string; videoUrl?: string }>;
  sets?: number;
  reps?: string;
  restSeconds?: number;
  order?: number;
}

export interface SessionResponse {
  session: {
    _id: string;
    title: string;
    durationMinutes?: number;
    difficulty?: string;
    warmup?: {
      title?: string;
      notes?: string;
      items: Array<{
        title: string;
        durationSeconds?: number;
        reps?: number;
        notes?: string;
        order?: number;
      }>;
    };
    items: SessionItemConfig[];
  };
}

export interface ExerciseResponse {
  exercise: {
    _id: string;
    name: string;
    muscleGroup?: string;
    equipment?: string;
    difficulty?: string;
    description?: string;
    videoUrl?: string;
    alternatives?: string[];
  };
}

export interface NutritionTodayResponse {
  targets: NutritionTargets | null;
  meals: MealTemplate[];
  recommendations?: string[];
  log: {
    consumedCalories?: number;
    consumedMacros?: { proteinG?: number; carbsG?: number; fatG?: number };
    waterMl?: number;
    completedMealsIds?: string[];
    status?: string;
  } | null;
}

export interface HomeWeeklySummaryResponse {
  weekRange: {
    startDate: string;
    endDate: string;
  };
  weeklySessions: {
    completed: number;
    planned: number;
  };
  weeklyNutrition: {
    completeDays: number;
    totalCalories: number;
  };
  level: {
    name: string | null;
    slug: string | null;
  };
  levelHomeContent: {
    title?: string;
    instructions?: string;
    videoUrl?: string;
  } | null;
}

export interface WeeklyValidationDay {
  date: string;
  label: string;
  workoutCompleted: boolean;
  nutritionGoalCompleted: boolean;
  isValidated: boolean;
  isToday: boolean;
}

export interface WeeklyValidationResponse {
  weekStart: string;
  weekEnd: string;
  validatedDaysCount: number;
  totalDays: number;
  today: {
    date: string;
    workoutCompleted: boolean;
    nutritionGoalCompleted: boolean;
    isValidated: boolean;
    statusLabel: 'Journée validée' | 'Journée non validée';
    missing: Array<'workout' | 'nutrition'>;
  };
  days: WeeklyValidationDay[];
}

export const meService = {
  getSubscription: async (): Promise<{ subscription: MeSubscription | null }> => {
    const res = await api.get<{ subscription: MeSubscription | null }>('/me/subscription');
    return res.data;
  },

  getToday: async (date?: string): Promise<TodayResponse> => {
    const params = date ? { date } : {};
    const res = await api.get<TodayResponse>('/me/today', { params });
    return res.data;
  },

  getNutritionToday: async (date: string): Promise<NutritionTodayResponse> => {
    const res = await api.get<NutritionTodayResponse>('/me/nutrition/today', { params: { date } });
    return res.data;
  },

  getHomeWeeklySummary: async (): Promise<HomeWeeklySummaryResponse> => {
    const res = await api.get<HomeWeeklySummaryResponse>('/me/home/weekly-summary');
    return res.data;
  },

  getWeeklyValidation: async (): Promise<WeeklyValidationResponse> => {
    const res = await api.get<WeeklyValidationResponse>('/me/weekly-validation');
    return res.data;
  },

  postNutritionLog: async (body: {
    date: string;
    consumedCalories?: number;
    waterMl?: number;
    consumedMacros?: { proteinG?: number; carbsG?: number; fatG?: number };
    completedMealsIds?: string[];
    status?: 'incomplete' | 'complete';
    notes?: string;
  }): Promise<{ log: unknown }> => {
    const res = await api.post<{ log: unknown }>('/me/nutrition/log', body);
    return res.data;
  },

  /** Scan meal photo (AI). Returns detected items with label, confidence, suggestedFoods, defaultGrams. */
  scanMeal: async (imageBase64?: string): Promise<ScanMealResponse> => {
    const res = await api.post<ScanMealResponse>('/me/nutrition/scan-meal', { imageBase64: imageBase64 || '' });
    return res.data;
  },

  /** Add one scan entry to day log (confirmed items). Updates day totals. */
  postNutritionLogEntry: async (
    dateKey: string,
    payload: { photoUrl?: string; items: Array<{ foodId?: string; name: string; grams: number; kcal: number; protein: number; carbs: number; fat: number }> }
  ): Promise<{ log: unknown; entryId: string }> => {
    const res = await api.post<{ log: unknown; entryId: string }>(`/me/nutrition/logs/${dateKey}`, payload);
    return res.data;
  },

  getPlanWeek: async (weekNumber: number): Promise<WeekPlanResponse> => {
    const res = await api.get<WeekPlanResponse>('/me/plan/week', { params: { weekNumber } });
    return res.data;
  },

  getActivePlan: async (): Promise<ActivePlanResponse> => {
    const res = await api.get<ActivePlanResponse>('/me/plan/active');
    return res.data;
  },

  completeWorkout: async (payload: any): Promise<any> => {
    const res = await api.post('/workout/complete', payload);
    return res.data;
  },

  getSession: async (sessionTemplateId: string): Promise<SessionResponse> => {
    const res = await api.get<SessionResponse>(`/me/session/${sessionTemplateId}`);
    return res.data;
  },

  getExercise: async (exerciseId: string): Promise<ExerciseResponse> => {
    const res = await api.get<ExerciseResponse>(`/me/exercise/${exerciseId}`);
    return res.data;
  },
};
