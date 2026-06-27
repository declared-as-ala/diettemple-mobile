/**
 * Today dashboard: single source of truth from GET /api/me/today.
 * No /api/home/* calls from home screen.
 */
import api from './api';
import type { TodayResponse } from './meService';
import { getLocalDateKey } from '../utils/date';

let _loggedOnce = false;
function logBaseUrl() {
  if (__DEV__ && !_loggedOnce) {
    _loggedOnce = true;
    try {
      const { getApiBaseUrl } = require('../config/api.config');
      console.log('[Today] API base:', getApiBaseUrl());
    } catch {}
  }
}

export const todayService = {
  getToday: async (date?: string): Promise<TodayResponse> => {
    logBaseUrl();
    // Always send device-local calendar day so /me/today matches admin template (never rely on server UTC "today").
    const params = { date: date ?? getLocalDateKey(new Date()) };
    const res = await api.get<TodayResponse>('/me/today', { params });
    return res.data;
  },
};
