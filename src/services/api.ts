import axios from 'axios';
import { getAuthToken, deleteAuthToken } from '../utils/authStorage';
import { getApiBaseUrl } from '../config/api.config';

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
  (response) => response,
  async (error) => {
    const config = error.config;
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
    } else {
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
    return Promise.reject(error);
  }
);

export default api;
