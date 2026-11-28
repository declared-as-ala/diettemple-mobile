/**
 * Turns any thrown error (axios or not) into a category + a friendly French message.
 * Raw technical text ("Network Error", "Request failed with status code 500", stack traces…) never reaches the user.
 */
export type ErrorKind = 'offline' | 'timeout' | 'server' | 'auth' | 'forbidden' | 'notFound' | 'rateLimited' | 'unknown';

export interface ClassifiedError {
  kind: ErrorKind;
  title: string;
  message: string;
  /** Retrying can help (connection / timeout / server hiccup). */
  retryable: boolean;
}

const COPY: Record<ErrorKind, { title: string; message: string; retryable: boolean }> = {
  offline: { title: 'Pas de connexion', message: 'Vérifiez votre connexion Internet, puis réessayez.', retryable: true },
  timeout: { title: 'Connexion trop lente', message: 'Le serveur met trop de temps à répondre. Réessayez dans un instant.', retryable: true },
  server: { title: 'Service momentanément indisponible', message: 'Nos serveurs rencontrent un souci. Réessayez dans quelques instants.', retryable: true },
  auth: { title: 'Session expirée', message: 'Reconnectez-vous pour continuer.', retryable: false },
  forbidden: { title: 'Accès refusé', message: "Vous n'avez pas accès à ce contenu.", retryable: false },
  notFound: { title: 'Contenu introuvable', message: "Ce contenu n'existe plus ou a été déplacé.", retryable: false },
  rateLimited: { title: 'Trop de tentatives', message: 'Patientez un moment avant de réessayer.', retryable: true },
  unknown: { title: 'Une erreur est survenue', message: 'Réessayez dans un instant.', retryable: true },
};

export function errorKindOf(error: unknown): ErrorKind {
  const e = error as {
    response?: { status?: number };
    code?: string;
    message?: string;
    isOffline?: boolean;
  } | null;
  if (!e) return 'unknown';
  if (e.isOffline) return 'offline';
  const status = e.response?.status;
  // status 0 / missing = the request never got an answer (the API layer fabricates a status-0 response for those)
  if (status && status > 0) {
    if (status === 401) return 'auth';
    if (status === 403) return 'forbidden';
    if (status === 404) return 'notFound';
    if (status === 429) return 'rateLimited';
    if (status >= 500) return 'server';
    return 'unknown';
  }
  const code = e.code ?? '';
  const message = e.message ?? '';
  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || /timeout|expir/i.test(message)) return 'timeout';
  if (code === 'ERR_NETWORK' || code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ENETUNREACH' || /network|connexion/i.test(message)) return 'offline';
  return 'unknown';
}

export function classifyError(error: unknown): ClassifiedError {
  const kind = errorKindOf(error);
  return { kind, ...COPY[kind] };
}
