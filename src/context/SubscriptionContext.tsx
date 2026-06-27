import type React from 'react';

/**
 * @deprecated Use useSubscriptionStore() directly.
 *
 * This file is kept as a thin wrapper for backwards compatibility.
 * All data comes from subscriptionStore — no duplicate state.
 * TabNavigatorWrapper now boots the subscription directly via the store.
 * Screens should migrate to: import { useSubscriptionStore } from '../store/subscriptionStore'
 */
import { useSubscriptionStore } from '../store/subscriptionStore';
import { getSubscriptionState, type SubscriptionStateResult } from '../utils/subscriptionState';

export interface SubscriptionContextValue {
  subscription: ReturnType<typeof useSubscriptionStore.getState>['subscription'];
  subscriptionState: SubscriptionStateResult;
  hasSubscriptionHistory: boolean;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const defaultSubscriptionState: SubscriptionStateResult = {
  status: 'NONE',
  daysLeft: 0,
  endDateLocal: null,
  labelFr: 'Aucun',
  isActive: false,
  isExpired: true,
  isExpiringSoon: false,
};

/** @deprecated Use useSubscriptionStore() directly. */
export function useSubscription(): SubscriptionContextValue {
  const subscription = useSubscriptionStore((s) => s.subscription);
  const isLoading = useSubscriptionStore((s) => s.isLoading);
  const bootSubscription = useSubscriptionStore((s) => s.bootSubscription);

  return {
    subscription,
    subscriptionState: getSubscriptionState(subscription),
    hasSubscriptionHistory: subscription != null,
    isLoading,
    refetch: bootSubscription,
  };
}

/** @deprecated No longer needed — TabNavigatorWrapper boots subscription directly. */
export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  return children as any;
}
