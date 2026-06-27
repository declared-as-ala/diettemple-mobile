/**
 * Encapsulates "what to show on Home for the workout slot" given a TodayResponse.
 *
 * Backend (`/me/today`) now returns:
 *   - today.sessionTemplate      : scheduled session for today (null on rest day)
 *   - today.completed            : true when today's session has a completed WorkoutSession
 *   - today.completedRattrapage  : true when today's completion was a rattrapage
 *   - today.rattrapageSession    : most recent uncompleted missed session (always returned)
 *   - today.missedSession        : legacy alias for rattrapageSession
 *   - today.displayKind          : 'NORMAL' | 'MAKEUP' | 'REST' (server-computed)
 *
 * Key behavioral change: rattrapageSession is returned ALONGSIDE sessionTemplate,
 * never replacing it. The UI now shows both cards simultaneously when both exist.
 */
import { useMemo } from 'react';
import type {
  MissedSessionInfo,
  TodayResponse,
  TodaySessionTemplate,
  WeekPlanDay,
  WeekDayStatus,
  WorkoutDisplayKind,
} from '../services/meService';

export interface TodayWorkoutVM {
  /** Whether today has a normal scheduled session (not rest day). */
  kind: WorkoutDisplayKind;
  /** Resolved label for the primary session card header. */
  label: string;
  /** Today's scheduled session (null on rest day). Always shown when present, regardless of rattrapage. */
  session: TodaySessionTemplate | null;
  /** True if today is a rest day (no scheduled session). */
  todayIsRestDay: boolean;
  /** The missed session available to rattraper (shown as second card). */
  missed: MissedSessionInfo | null;
  /** True when a rattrapage is available (missed exists and not yet completed as rattrapage). */
  hasRattrapage: boolean;
  /** True when today's rattrapage has already been completed. */
  completedRattrapage: boolean;
  /** True if today's scheduled session has already been completed today. */
  completedToday: boolean;
  /** sessionTemplateId for the primary (today's) session start button. */
  startSessionId: string | null;
  /** sessionTemplateId for the rattrapage start button. */
  rattrapageSessionId: string | null;
}

const LABELS: Record<WorkoutDisplayKind, string> = {
  NORMAL: 'Séance du jour',
  MAKEUP: 'Séance à rattraper',
  REST: 'Repos aujourd\'hui',
};

/**
 * Pure resolver — easy to unit test. Falls back gracefully when backend has not yet been
 * upgraded (no displayKind / rattrapageSession fields).
 */
export function resolveTodayWorkout(today: TodayResponse['today'] | null | undefined): TodayWorkoutVM {
  if (!today) {
    return {
      kind: 'REST',
      label: LABELS.REST,
      session: null,
      todayIsRestDay: true,
      missed: null,
      hasRattrapage: false,
      completedRattrapage: false,
      completedToday: false,
      startSessionId: null,
      rattrapageSessionId: null,
    };
  }

  const session = today.sessionTemplate ?? null;
  const completedToday = !!today.completed;
  const completedRattrapage = !!today.completedRattrapage;
  const todayIsRestDay = !session?.sessionTemplateId;

  // Prefer rattrapageSession (new) over missedSession (legacy alias)
  const missed = today.rattrapageSession ?? today.missedSession ?? null;
  const hasRattrapage = !!missed && !completedRattrapage;

  // displayKind is now only for legacy rest-day detection; we no longer use it for card logic
  let kind: WorkoutDisplayKind;
  if (!todayIsRestDay && !completedToday) {
    kind = 'NORMAL';
  } else if (todayIsRestDay && hasRattrapage) {
    kind = 'MAKEUP';
  } else {
    kind = today.displayKind ?? 'REST';
  }

  const startSessionId =
    session?.sessionTemplateId ? String(session.sessionTemplateId) : null;
  const rattrapageSessionId =
    missed?.sessionTemplateId ? String(missed.sessionTemplateId) : null;

  return {
    kind,
    label: LABELS[kind],
    session,
    todayIsRestDay,
    missed,
    hasRattrapage,
    completedRattrapage,
    completedToday,
    startSessionId,
    rattrapageSessionId,
  };
}

export function useTodayWorkout(dashboard: TodayResponse | null | undefined): TodayWorkoutVM {
  return useMemo(() => resolveTodayWorkout(dashboard?.today), [dashboard]);
}

/**
 * Derive a per-day status for any date in the displayed week.
 * Prefers the backend's `status` field (from `/me/plan/week` v2). Falls back to inference for
 * legacy responses or for off-week days the user types via the calendar strip.
 */
export function getWorkoutStatusForDate(args: {
  dateKey: string;
  todayKey: string;
  planDay?: WeekPlanDay | null;
  localCompleted?: boolean;
}): WeekDayStatus {
  const { dateKey, todayKey, planDay, localCompleted } = args;
  if (planDay?.status) return planDay.status;
  const sessions = planDay?.sessions ?? [];
  if (sessions.length === 0) return 'rest';
  const everyCompleted = sessions.every((s) => s.status === 'completed');
  if (everyCompleted || localCompleted) return 'completed';
  const someMissed = sessions.some((s) => s.status === 'missed');
  if (someMissed) return 'missed';
  const someRattrapage = sessions.some((s) => s.status === 'rattrapage');
  if (someRattrapage) return 'rattrapage';
  if (dateKey < todayKey) return 'missed';
  return 'pending';
}
