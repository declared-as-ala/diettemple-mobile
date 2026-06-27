import api from './api';
import { getLocalDateKey } from '../utils/date';

export interface GymCheckinStatus {
  verified: boolean;
  verifiedAt: string | null;
  proofUrl?: string | null;
  /** Present when server has GYM_CHECKIN_FORCE_EVERY_TIME (QA); client ignores for gating. */
  qaForceEveryTimeActive?: boolean;
}

export interface GymCheckinStartResult {
  verified: true;
  checkinId: string | null;
  verifiedAt: string;
  /** When true, backend is in QA "verify every time" mode — client must not cache. */
  forceEveryTime?: boolean;
}

/** Server rejection payload (400 GYM_VERIFY_FAILED, or 503 with reason: 'provider_error') */
export interface GymCheckinRejectPayload {
  verified: false;
  message: string;
  code: 'GYM_VERIFY_FAILED';
  score?: number;
  reason?:
    | 'too_dark'
    | 'blurry'
    | 'no_equipment'
    | 'looks_like_food'
    | 'screenshot_suspected'
    | 'invalid_file'
    | 'ai_unavailable'
    | 'provider_error';
  retryable?: boolean;
  retryAfterSeconds?: number;
  tips?: string[];
  attemptCount?: number;
  nextAllowedMethod?: 'photo' | 'gps';
}

const PROVIDER_RETRY_ATTEMPTS = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function buildFormData(
  photoUri: string,
  dateKey: string,
  meta?: { sessionId?: string; capturedAt?: string; deviceInfo?: string; gpsDistanceMeters?: number }
): FormData {
  const formData = new FormData();
  formData.append('dateKey', dateKey);
  if (meta?.sessionId) formData.append('sessionId', meta.sessionId);
  if (meta?.capturedAt) formData.append('capturedAt', meta.capturedAt);
  if (meta?.deviceInfo) formData.append('deviceInfo', meta.deviceInfo);
  if (meta?.gpsDistanceMeters != null) formData.append('gpsDistanceMeters', String(meta.gpsDistanceMeters));
  formData.append('photo', {
    uri: photoUri,
    type: 'image/jpeg',
    name: 'gym-checkin.jpg',
  } as any);
  return formData;
}

export const checkinService = {
  /** Once per day: get verification status for dateKey (sessionId optional, for backward compat). */
  getGymStatus: async (dateKey?: string): Promise<GymCheckinStatus> => {
    const dk = dateKey || getLocalDateKey(new Date());
    const { data } = await api.get<GymCheckinStatus>('/checkin/gym/status', {
      params: { dateKey: dk },
    });
    return data;
  },

  /**
   * Upload the gym-check-in photo. Automatically retries once on a `provider_error` (503)
   * with exponential backoff (1s → 3s) so transient AI outages don't surface to the user.
   * Rethrows the axios error on definitive failure; the caller handles UX.
   */
  startGymCheckin: async (
    photoUri: string,
    dateKey?: string,
    meta?: { sessionId?: string; capturedAt?: string; deviceInfo?: string; gpsDistanceMeters?: number }
  ): Promise<GymCheckinStartResult> => {
    const dk = dateKey || getLocalDateKey(new Date());

    let lastError: any;
    for (let attempt = 0; attempt <= PROVIDER_RETRY_ATTEMPTS; attempt++) {
      try {
        const { data } = await api.post<GymCheckinStartResult>(
          '/checkin/gym/start',
          buildFormData(photoUri, dk, meta),
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return data;
      } catch (err: any) {
        lastError = err;
        const status = err?.response?.status;
        const reason = err?.response?.data?.reason;
        const retryable = err?.response?.data?.retryable === true;
        const isProviderError = status === 503 && (reason === 'provider_error' || retryable);
        if (!isProviderError || attempt === PROVIDER_RETRY_ATTEMPTS) throw err;
        const hinted = Number(err?.response?.data?.retryAfterSeconds);
        const baseMs = Number.isFinite(hinted) && hinted > 0 ? hinted * 1000 : 1000 * Math.pow(2, attempt);
        const delay = Math.min(8000, baseMs + Math.floor(Math.random() * 500));
        await sleep(delay);
      }
    }
    throw lastError;
  },
};
