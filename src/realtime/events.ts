export const REALTIME_EVENTS = {
  userUpdated: 'user:updated',
} as const;

export type RealtimeSubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELED' | 'NONE';

export interface UserUpdatedRealtimePayload {
  id: string;
  name: string | null;
  plan: string | null;
  level: string | null;
  badgePhoto: string | null;
  avatar: string | null;
  subscriptionStatus: RealtimeSubscriptionStatus;
  updatedAt: string;
}

export function isCompleteUserUpdatedPayload(payload: UserUpdatedRealtimePayload): boolean {
  return Boolean(
    payload &&
      payload.id &&
      typeof payload.updatedAt === 'string' &&
      payload.updatedAt.trim() &&
      payload.subscriptionStatus
  );
}
