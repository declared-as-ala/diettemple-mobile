import { io, type Socket } from 'socket.io-client';
import { getApiBaseUrl } from '../config/api.config';
import { REALTIME_EVENTS, type UserUpdatedRealtimePayload } from '../realtime/events';

type UserUpdatedHandler = (payload: UserUpdatedRealtimePayload) => void;
type ConnectionHandler = () => void;

let socket: Socket | null = null;

function devLog(...args: unknown[]) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log('[realtime]', ...args);
  }
}

function getSocketBaseUrl(): string {
  return getApiBaseUrl().replace(/\/api\/?$/, '');
}

export function connectRealtimeSocket(token: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  if (!socket) {
    socket = io(getSocketBaseUrl(), {
      path: '/api/socket.io',
      // Start with polling for compatibility behind strict proxies, then upgrade to websocket.
      transports: ['polling', 'websocket'],
      autoConnect: false,
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
      timeout: 10000,
    });

    socket.on('connect', () => devLog('connected', socket?.id));
    socket.on('disconnect', (reason) => devLog('disconnected', reason));
    socket.on('connect_error', (err) => {
      const details =
        typeof (err as any)?.description === 'string'
          ? (err as any).description
          : JSON.stringify((err as any)?.description ?? {});
      devLog('connect_error', err.message, details);
    });
    socket.on('reconnect_attempt', (attempt) => devLog('reconnect_attempt', attempt));
  } else {
    socket.auth = { token };
  }

  socket.connect();
  return socket;
}

export function disconnectRealtimeSocket(): void {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}

export function subscribeToUserUpdated(handler: UserUpdatedHandler): () => void {
  if (!socket) {
    return () => {};
  }
  socket.on(REALTIME_EVENTS.userUpdated, handler);
  return () => {
    socket?.off(REALTIME_EVENTS.userUpdated, handler);
  };
}

export function subscribeToRealtimeConnected(handler: ConnectionHandler): () => void {
  if (!socket) return () => {};
  socket.on('connect', handler);
  return () => {
    socket?.off('connect', handler);
  };
}

export function isRealtimeConnected(): boolean {
  return !!socket?.connected;
}
