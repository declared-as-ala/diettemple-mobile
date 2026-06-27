/**
 * Mobile Workout Plan Store (Zustand)
 * Centralized state for active plan, assignments, progress, and session completion
 */

import create from 'zustand';
import { meService } from '../services/meService';

export interface IWorkoutPlanStore {
  // State
  activeAssignment: any | null;
  activePlan: any | null;
  today: any | null;
  progress: any | null;
  missedSeances: any[];
  selectedWeekIndex: number;
  selectedDayIndex: number;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Actions
  fetchActivePlan: () => Promise<void>;
  selectWeek: (weekIndex: number) => void;
  selectDay: (dayIndex: number) => void;
  selectWeekAndDay: (weekIndex: number, dayIndex: number) => void;
  goToToday: () => void;
  refreshProgress: () => Promise<void>;
  completeSession: (
    weekIndex: number,
    dayIndex: number,
    completionType: 'normal' | 'rattrapage',
    exercises?: any[]
  ) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export const useWorkoutPlanStore = create<IWorkoutPlanStore>((set, get) => ({
  // Initial state
  activeAssignment: null,
  activePlan: null,
  today: null,
  progress: null,
  missedSeances: [],
  selectedWeekIndex: 0,
  selectedDayIndex: 0,
  isLoading: false,
  isRefreshing: false,
  error: null,

  // Fetch active plan from backend
  fetchActivePlan: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await meService.getActivePlan();

      if (!response?.assignment || !response?.plan) {
        set({
          activeAssignment: null,
          activePlan: null,
          today: null,
          progress: null,
          missedSeances: [],
          selectedWeekIndex: 0,
          selectedDayIndex: 0,
          isLoading: false,
        });
        return;
      }

      // Initialize selectedWeek/Day to today's position
      const todayWeek = response.today?.weekIndex ?? 0;
      const todayDay = response.today?.dayIndex ?? 0;

      set({
        activeAssignment: response.assignment,
        activePlan: response.plan,
        today: response.today,
        progress: response.progress,
        missedSeances: response.missedSeances || [],
        selectedWeekIndex: todayWeek,
        selectedDayIndex: todayDay,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        error: err?.message || 'Failed to fetch active plan',
        isLoading: false,
      });
    }
  },

  // Select a week (0-4)
  selectWeek: (weekIndex: number) => {
    set({
      selectedWeekIndex: Math.max(0, Math.min(weekIndex, 4)),
    });
  },

  // Select a day (0-6)
  selectDay: (dayIndex: number) => {
    set({
      selectedDayIndex: Math.max(0, Math.min(dayIndex, 6)),
    });
  },

  // Select both week and day
  selectWeekAndDay: (weekIndex: number, dayIndex: number) => {
    set({
      selectedWeekIndex: Math.max(0, Math.min(weekIndex, 4)),
      selectedDayIndex: Math.max(0, Math.min(dayIndex, 6)),
    });
  },

  // Go to today's week/day
  goToToday: () => {
    const { today } = get();
    if (today) {
      set({
        selectedWeekIndex: today.weekIndex,
        selectedDayIndex: today.dayIndex,
      });
    }
  },

  // Refresh progress without fetching full plan
  refreshProgress: async () => {
    set({ isRefreshing: true });
    try {
      const response = await meService.getActivePlan();
      if (response?.assignment && response?.plan) {
        set({
          progress: response.progress,
          today: response.today,
          missedSeances: response.missedSeances || [],
          isRefreshing: false,
        });
      }
    } catch (err: any) {
      set({
        error: err?.message || 'Failed to refresh',
        isRefreshing: false,
      });
    }
  },

  // Complete a session
  completeSession: async (
    weekIndex: number,
    dayIndex: number,
    completionType: 'normal' | 'rattrapage',
    exercises = []
  ) => {
    const { activeAssignment, activePlan } = get();

    if (!activeAssignment || !activePlan) {
      throw new Error('No active plan');
    }

    const dayData = activePlan.weeks[weekIndex]?.days[dayIndex];
    if (!dayData || dayData.isRestDay) {
      throw new Error('Cannot complete rest day or invalid day');
    }

    // Calculate original scheduled date
    const planStartDate = new Date(activeAssignment.startDate);
    const originalScheduledDate = new Date(planStartDate);
    originalScheduledDate.setDate(originalScheduledDate.getDate() + weekIndex * 7 + dayIndex);

    try {
      await meService.completeWorkout({
        assignmentId: activeAssignment.id,
        weekIndex,
        dayIndex,
        completionType,
        originalScheduledDate: originalScheduledDate.toISOString().split('T')[0],
        exercisesCompleted: exercises,
      });

      // Refresh progress after completion
      await get().refreshProgress();
    } catch (err: any) {
      set({
        error: err?.message || 'Failed to complete session',
      });
      throw err;
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Reset store
  reset: () => {
    set({
      activeAssignment: null,
      activePlan: null,
      today: null,
      progress: null,
      missedSeances: [],
      selectedWeekIndex: 0,
      selectedDayIndex: 0,
      isLoading: false,
      isRefreshing: false,
      error: null,
    });
  },
}));
