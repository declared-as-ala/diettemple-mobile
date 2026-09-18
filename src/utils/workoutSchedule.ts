import type { WeekPlanDay, WeekPlanResponse } from '../services/meService';
import type { DayProgressStatus } from '../services/workoutProgressStorage';

export type WorkoutDayStatus = 'completed' | 'pending' | 'missed' | 'rest' | 'rattrapage';

/**
 * Deterministic DayState type (Requirement 10)
 * Single authoritative source of truth for day states across the entire application.
 */
export type DayState =
  | 'future'
  | 'today'
  | 'rest'
  | 'scheduled'
  | 'completed'
  | 'missed'
  | 'rattrapage';

export interface GetWorkoutDayStateParams {
  dateKey: string;
  todayDateKey: string;
  sessionTemplateId?: string | null;
  isRestDay?: boolean;
  isCompleted?: boolean;
  backendStatus?: 'completed' | 'pending' | 'missed' | 'rest' | 'rattrapage';
  isRattrapageEligible?: boolean;
  programWeek?: number;
  currentProgramWeek?: number;
}

/**
 * Authoritative single selector for workout day states (Requirement 10).
 * Never infer these states independently in multiple components.
 */
export function getWorkoutDayState(params: GetWorkoutDayStateParams): DayState {
  const {
    dateKey,
    todayDateKey,
    sessionTemplateId,
    isRestDay,
    isCompleted,
    backendStatus,
    isRattrapageEligible,
    programWeek,
    currentProgramWeek,
  } = params;

  // 1. Authoritative completed check (takes absolute priority)
  if (isCompleted || backendStatus === 'completed') {
    return 'completed';
  }

  // 2. Rest day check
  if (isRestDay || (!sessionTemplateId && backendStatus === 'rest')) {
    return 'rest';
  }

  // 3. Past day check (dateKey < todayDateKey)
  if (dateKey < todayDateKey) {
    // Rattrapage is strictly valid ONLY during the same program week (Requirement 4)
    const isSameWeek =
      programWeek != null && currentProgramWeek != null
        ? programWeek === currentProgramWeek
        : true;

    if (isSameWeek && (isRattrapageEligible || backendStatus === 'rattrapage')) {
      return 'rattrapage';
    }
    return 'missed';
  }

  // 4. Today check
  if (dateKey === todayDateKey) {
    return 'today';
  }

  // 5. Future day
  return 'future';
}

/**
 * UI badge styling helper for deterministic DayState.
 */
export function getDayStateBadge(state: DayState): { label: string; color: string; bg: string } {
  switch (state) {
    case 'completed':
      return { label: '✓ Terminée', color: '#4ADE80', bg: 'rgba(74, 222, 128, 0.12)' };
    case 'today':
      return { label: '○ À faire', color: '#D4AF37', bg: 'rgba(212, 175, 55, 0.12)' };
    case 'rattrapage':
      return { label: '↺ Rattrapage', color: '#FB923C', bg: 'rgba(251, 146, 60, 0.12)' };
    case 'missed':
      return { label: '✕ Manquée', color: '#F87171', bg: 'rgba(248, 113, 113, 0.12)' };
    case 'rest':
      return { label: 'Repos', color: 'rgba(255, 255, 255, 0.5)', bg: 'rgba(255, 255, 255, 0.05)' };
    case 'future':
    case 'scheduled':
    default:
      return { label: 'À venir', color: 'rgba(255, 255, 255, 0.6)', bg: 'rgba(255, 255, 255, 0.05)' };
  }
}

export interface WorkoutDayInfo {
  dateKey: string;
  dayName: string;
  sessionTemplateId: string | null;
  sessionTitle: string;
  status: WorkoutDayStatus;
  dayState?: DayState;
}

function toStartOfDay(date: Date): Date {
  const out = new Date(date);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function dateKeyToDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00`);
}

function parseDayInfo(day: WeekPlanDay): { dateKey: string | null; sessionTemplateId: string | null; sessionTitle: string } {
  const firstSession = day.sessions?.[0];
  return {
    dateKey: day.dateKey ?? day.date ?? null,
    sessionTemplateId: firstSession?.sessionTemplateId ?? null,
    sessionTitle: firstSession?.title ?? 'Séance',
  };
}

export function getWorkoutStatusForDate(params: {
  dateKey: string;
  sessionTemplateId: string | null;
  progressStatus?: DayProgressStatus;
  todayDateKey: string;
}): WorkoutDayStatus {
  const { dateKey, sessionTemplateId, progressStatus, todayDateKey } = params;
  if (!sessionTemplateId) return 'rest';
  if (progressStatus === 'completed') return 'completed';
  if (dateKey < todayDateKey) return 'missed';
  return 'pending';
}

export function buildWorkoutScheduleByDate(params: {
  weekPlans: Array<WeekPlanResponse['plan'] | null>;
  progressByDate: Record<string, DayProgressStatus>;
  todayDateKey: string;
}): Record<string, WorkoutDayInfo> {
  const out: Record<string, WorkoutDayInfo> = {};
  for (const plan of params.weekPlans) {
    if (!plan?.days?.length) continue;
    for (const day of plan.days) {
      const info = parseDayInfo(day);
      if (!info.dateKey) continue;
      out[info.dateKey] = {
        dateKey: info.dateKey,
        dayName: day.day,
        sessionTemplateId: info.sessionTemplateId,
        sessionTitle: info.sessionTemplateId ? info.sessionTitle : 'Repos',
        status: getWorkoutStatusForDate({
          dateKey: info.dateKey,
          sessionTemplateId: info.sessionTemplateId,
          progressStatus: params.progressByDate[info.dateKey],
          todayDateKey: params.todayDateKey,
        }),
      };
    }
  }
  return out;
}

export function getTodayWorkoutOrMissedWorkout(params: {
  selectedDateKey: string;
  todayDateKey: string;
  scheduleByDate: Record<string, WorkoutDayInfo>;
}): { kind: 'today' | 'missed' | 'rest'; day: WorkoutDayInfo | null } {
  const selectedDay = params.scheduleByDate[params.selectedDateKey] ?? null;
  if (params.selectedDateKey !== params.todayDateKey) {
    if (!selectedDay || selectedDay.status === 'rest') return { kind: 'rest', day: selectedDay };
    return { kind: selectedDay.status === 'missed' ? 'missed' : 'today', day: selectedDay };
  }

  const today = params.scheduleByDate[params.todayDateKey] ?? null;
  const missedCandidates = Object.values(params.scheduleByDate)
    .filter((d) => d.status === 'missed')
    .sort((a, b) => dateKeyToDate(a.dateKey).getTime() - dateKeyToDate(b.dateKey).getTime()); // oldest first (Requirement 5)

  if ((!today || today.status === 'rest') && missedCandidates.length > 0) {
    return { kind: 'missed', day: missedCandidates[0] };
  }
  if (!today || today.status === 'rest') return { kind: 'rest', day: today };
  return { kind: today.status === 'missed' ? 'missed' : 'today', day: today };
}

export function buildCalendarRange(centerDate: Date, daysBefore = 3, daysAfter = 3): Date[] {
  const center = toStartOfDay(centerDate);
  const start = new Date(center);
  start.setDate(start.getDate() - daysBefore);
  return Array.from({ length: daysBefore + daysAfter + 1 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return date;
  });
}
