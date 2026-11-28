import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { connectivity, startConnectivity } from './connectivityService';
import type { ConnectionStatus, ConnectivityState } from './connectivity';

interface NetworkContextValue {
  status: ConnectionStatus;
  isOffline: boolean;
  isSlow: boolean;
  /** A check is running (manual "Réessayer" or automatic). */
  checking: boolean;
  /** Increments each time the connection comes back after being lost: use it to re-fetch. */
  reconnectCount: number;
  /** Re-checks the connection now. Resolves true when the server is reachable. */
  retry: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextValue>({
  status: 'online',
  isOffline: false,
  isSlow: false,
  checking: false,
  reconnectCount: 0,
  retry: async () => true,
});

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConnectivityState>(connectivity.getState());
  const [reconnectCount, setReconnectCount] = useState(0);

  useEffect(() => {
    void startConnectivity();
    const offState = connectivity.subscribe(setState);
    const offReconnect = connectivity.onReconnect(() => setReconnectCount((n) => n + 1));
    setState(connectivity.getState());
    return () => {
      offState();
      offReconnect();
    };
  }, []);

  const retry = useCallback(() => connectivity.retryNow(), []);

  const value = useMemo<NetworkContextValue>(
    () => ({
      status: state.status,
      isOffline: state.status === 'offline',
      isSlow: state.status === 'slow',
      checking: state.checking,
      reconnectCount,
      retry,
    }),
    [state.status, state.checking, reconnectCount, retry]
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export const useNetwork = () => useContext(NetworkContext);

/**
 * Runs `reload` every time the connection comes back (not on first render). Use it in any screen that fetches data:
 * the screen refreshes by itself, the user never has to restart the app.
 */
export function useRefetchOnReconnect(reload: () => void | Promise<unknown>): void {
  const { reconnectCount } = useNetwork();
  const first = useRef(reconnectCount);
  const latest = useRef(reload);
  latest.current = reload;
  useEffect(() => {
    if (reconnectCount === first.current) return;
    first.current = reconnectCount;
    try {
      void Promise.resolve(latest.current()).catch(() => {});
    } catch {
      /* a failing reload must not crash the screen */
    }
  }, [reconnectCount]);
}
