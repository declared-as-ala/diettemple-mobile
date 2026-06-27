import type { WeekPlanDay, WeekPlanResponse } from '../services/meService';
import type { DayProgressStatus } from '../services/workoutProgressStorage';

export type WorkoutDayStatus = 'completed' | 'pending' | 'missed' | 'rest' | 'rattrapage';

export interface WorkoutDayInfo {
  dateKey: string;
  dayName: string;
  sessionTemplateId: string | null;
  sessionTitle: string;
  status: WorkoutDayStatus;
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
    .sort((a, b) => dateKeyToDate(b.dateKey).getTime() - dateKeyToDate(a.dateKey).getTime());

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
