/**
 * Single source of truth for subscription display state.
 * All screens MUST use this function — no local computation of status/daysLeft/label.
 * Rule: endAt is inclusive (user has access through end of that calendar day, local time).
 */
import { getLocalDateKey } from './date';
import type { MeSubscription } from '../services/meService';

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'CANCELED' | 'NONE';

const EXPIRING_SOON_DAYS = 7;
const ENABLE_SUBSCRIPTION_DEBUG_LOGS = false;

export interface SubscriptionStateResult {
  status: SubscriptionStatus;
  daysLeft: number;
  endDateLocal: Date | null;
  labelFr: string;
  isActive: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

function startOfDayLocal(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

/**
 * Compute subscription state from raw API subscription.
 * Uses device local date only. endAt is inclusive (last day of access).
 */
export function getSubscriptionState(
  subscription: MeSubscription | null,
  now: Date = new Date()
): SubscriptionStateResult {
  const none: SubscriptionStateResult = {
    status: 'NONE',
    daysLeft: 0,
    endDateLocal: null,
    labelFr: 'Aucun',
    isActive: false,
    isExpired: true,
    isExpiringSoon: false,
  };

  if (!subscription?.endAt) {
    if (subscription?.status === 'ACTIVE') {
      return {
        status: 'ACTIVE',
        daysLeft: subscription.daysRemaining ?? 0,
        endDateLocal: null,
        labelFr: 'Actif',
        isActive: true,
        isExpired: false,
        isExpiringSoon: false,
      };
    }
    if (subscription?.status === 'EXPIRED' || subscription?.status === 'CANCELED') {
      return { ...none, status: subscription.status, labelFr: subscription.status === 'CANCELED' ? 'Annulé' : 'Expiré' };
    }
    return none;
  }

  const todayStart = startOfDayLocal(now);
  const endDate = new Date(subscription.endAt);
  const endDateLocal = startOfDayLocal(endDate);
  const todayKey = getLocalDateKey(now);
  const endKey = getLocalDateKey(endDate);

  if (todayKey > endKey) {
    return {
      status: 'EXPIRED',
      daysLeft: 0,
      endDateLocal,
      labelFr: 'Expiré',
      isActive: false,
      isExpired: true,
      isExpiringSoon: false,
    };
  }

  const diffMs = endDateLocal.getTime() - todayStart.getTime();
  const daysLeft = Math.max(0, Math.round(diffMs / (24 * 60 * 60 * 1000)));

  let status: SubscriptionStatus = 'ACTIVE';
  let labelFr = 'Actif';
  if (daysLeft === 0) {
    labelFr = 'Dernier jour';
  } else if (daysLeft <= EXPIRING_SOON_DAYS) {
    status = 'EXPIRING_SOON';
    labelFr = 'Expire bientôt';
  } else {
    labelFr = 'Actif';
  }

  if (__DEV__ && ENABLE_SUBSCRIPTION_DEBUG_LOGS) {
    try {
      console.log('[SubscriptionState]', {
        nowLocal: todayKey,
        endAt: subscription.endAt,
        endKey,
        daysLeft,
        status,
        labelFr,
      });
    } catch {}
  }

  return {
    status,
    daysLeft,
    endDateLocal,
    labelFr,
    isActive: status === 'ACTIVE' || (status === 'EXPIRING_SOON' && daysLeft >= 0),
    isExpired: false,
    isExpiringSoon: status === 'EXPIRING_SOON',
  };
}
