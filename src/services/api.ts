import axios from 'axios';
import { getAuthToken, deleteAuthToken } from '../utils/authStorage';
import { getApiBaseUrl } from '../config/api.config';
import { connectivity } from '../network/connectivityService';
import { cacheKey, isCacheable, readCache, writeCache } from '../network/apiCache';
import { errorKindOf } from '../network/classifyError';

/**
 * Registered by App.tsx after stores are ready.
 * Avoids circular dependency: api.ts cannot import stores directly (stores import api).
 */
type UnauthorizedHandler = () => void;
let _onUnauthorized: UnauthorizedHandler | null = null;
export function registerUnauthorizedHandler(handler: UnauthorizedHandler) {
  _onUnauthorized = handler;
}

const API_BASE_URL = getApiBaseUrl();

const REQUEST_TIMEOUT_MS = 30000;

const fullBaseUrl = API_BASE_URL;
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  console.log('[API] baseURL (dev):', fullBaseUrl);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

// French messages for user-facing errors (clear and distinct)
const ERROR_MESSAGES = {
  network: 'Connexion impossible. Vérifiez votre réseau ou réessayez.',
  timeout: 'La requête a expiré. Vérifiez votre connexion et réessayez.',
  unauthorized: 'Session expirée ou invalide. Veuillez vous reconnecter.',
  forbidden: 'Accès refusé.',
  serverError: 'Le serveur est indisponible. Réessayez plus tard.',
  unknown: 'Une erreur est survenue. Réessayez.',
};

function getErrorMessage(error: any): string {
  if (error.response) {
    const status = error.response.status;
    if (status === 401) return ERROR_MESSAGES.unauthorized;
    if (status === 403) return ERROR_MESSAGES.forbidden;
    if (status >= 500) return ERROR_MESSAGES.serverError;
    const msg = error.response?.data?.message;
    return typeof msg === 'string' ? msg : ERROR_MESSAGES.unknown;
  }
  const code = error.code;
  const message = error.message || '';
  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || message.includes('timeout')) {
    return ERROR_MESSAGES.timeout;
  }
  if (
    code === 'ERR_NETWORK' ||
    message === 'Network Error' ||
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'ENETUNREACH'
  ) {
    return ERROR_MESSAGES.network;
  }
  return ERROR_MESSAGES.unknown;
}

// Add token to requests (except for public endpoints)
api.interceptors.request.use(async (config) => {
  (config as any)._startedAt = Date.now();
  // Known offline: give up quickly instead of leaving a spinner for 30 s (the request still doubles as a reconnection probe).
  if (connectivity.getState().status === 'offline') config.timeout = Math.min(config.timeout ?? REQUEST_TIMEOUT_MS, 8000);
  const baseURL = config.baseURL ?? fullBaseUrl;
  const endpoint = config.url ?? '';
  const fullUrl = endpoint ? `${baseURL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}` : baseURL;
  // Debug: log before each request (baseURL, endpoint) — useful for APK debugging
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log('[API] request:', config.method?.toUpperCase(), fullUrl);
  } else {
    // In release APK, still log once per session to verify URL (can be removed later)
    if (!(global as any).__apiBaseUrlLogged) {
      (global as any).__apiBaseUrlLogged = true;
      console.log('[API] baseURL:', baseURL, '| endpoint:', endpoint || '(root)');
    }
  }

  const publicEndpoints = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/verify-otp',
    '/auth/reset-password',
    '/products',
  ];

  const isPublicEndpoint =
    publicEndpoints.some((endpoint) => config.url?.includes(endpoint));

  if (!isPublicEndpoint) {
    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      if (__DEV__) console.log('[API] token added:', config.url?.substring(0, 50));
    } else {
      if (__DEV__) console.warn('[API] no token for:', config.url);
    }
  }
  return config;
});

// Improve error handling: distinguish network / timeout / 401 / 403 / server; log details; show French message
api.interceptors.response.use(
  (response) => {
    const cfg: any = response.config;
    connectivity.reportRequest({ durationMs: Date.now() - (cfg?._startedAt ?? Date.now()), reachedServer: true });
    // Keep the last good answer so the content stays available when the connection drops.
    if (isCacheable(cfg?.method, cfg?.url, cfg?.responseType)) void writeCache(cacheKey(cfg.url, cfg.params), response.data);
    return response;
  },
  async (error) => {
    const config = error.config;
    {
      const code0 = error.code ?? '';
      const timedOut = code0 === 'ECONNABORTED' || code0 === 'ETIMEDOUT' || /timeout/i.test(error.message ?? '');
      connectivity.reportRequest({ durationMs: Date.now() - ((config as any)?._startedAt ?? Date.now()), reachedServer: !!error.response, timedOut });
    }
    const baseURL = config?.baseURL ?? fullBaseUrl;
    const endpoint = config?.url ?? '';
    const method = config?.method?.toUpperCase() ?? 'GET';

    if (error.response) {
      const status = error.response.status;
      // Only 401 means the token is invalid/expired. 403 means the user is
      // authenticated but lacks a specific permission or prerequisite
      // (e.g. GYM_CHECKIN_REQUIRED on /workout/start, admin-only endpoints)
      // and must NOT trigger a logout — the caller handles it.
      if (status === 401) {
        const isAuthEndpoint = endpoint?.includes('/auth/');
        if (!isAuthEndpoint) {
          console.warn('[API] Session invalide, déconnexion automatique:', { method, endpoint, status });
          try {
            await deleteAuthToken();
          } catch {}
          _onUnauthorized?.();
        } else {
          console.error('[API] 401 Unauthorized:', { method, baseURL, endpoint });
        }
      } else if (status === 403) {
        // Surface a helpful log but keep the session — caller decides UX.
        const code = error.response?.data?.code;
        console.warn('[API] 403 Forbidden (session preserved):', { method, endpoint, code });
      } else if (status >= 500) {
        console.error('[API] Server error:', status, { method, baseURL, endpoint });
      }

      // Transparent single retry on transient proxy/deploy errors (502, 503, 504) for GET requests
      if (config && !config._isRetry && method === 'GET' && (status === 502 || status === 503 || status === 504)) {
        config._isRetry = true;
        await new Promise((resolve) => setTimeout(resolve, 800));
        return api(config);
      }
    } else {
      // Transient network retry for GET requests
      if (config && !config._isRetry && method === 'GET' && error.code !== 'ECONNABORTED' && connectivity.getState().status !== 'offline') {
        config._isRetry = true;
        await new Promise((resolve) => setTimeout(resolve, 800));
        return api(config);
      }
      // Offline-first for reads: serve the last good answer instead of an error (a banner tells the user).
      if (config && isCacheable(config.method, config.url, config.responseType)) {
        const hit = await readCache(cacheKey(config.url, config.params));
        if (hit) {
          return { data: hit.data, status: 200, statusText: 'OK (cache)', headers: { 'x-from-cache': '1', 'x-cached-at': String(hit.at) }, config, request: undefined };
        }
      }
      // No response = network error, timeout, or server unreachable — log details for APK debugging
      const code = error.code ?? 'UNKNOWN';
      const message = error.message ?? '';
      console.error('[API] Network/request error:', {
        code,
        message,
        baseURL,
        endpoint,
        fullUrl: endpoint ? `${baseURL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}` : baseURL,
      });
    }

    const userMessage = getErrorMessage(error);
    error.response = error.response ?? {
      data: { message: userMessage },
      status: error.response?.status ?? 0,
      statusText: error.response?.statusText ?? 'Error',
      headers: error.response?.headers ?? {},
      config: error.config,
    };
    if (!error.response.data?.message) {
      error.response.data = { ...error.response.data, message: userMessage };
    }
    error.isOffline = !error.response?.status && errorKindOf(error) === 'offline';
    return Promise.reject(error);
  }
);

export default api;
