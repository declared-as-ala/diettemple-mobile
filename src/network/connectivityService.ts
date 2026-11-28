import { AppState } from 'react-native';
import * as Network from 'expo-network';
import { getApiBaseUrl } from '../config/api.config';
import { ConnectivityManager } from './connectivity';

const PROBE_TIMEOUT_MS = 5000;

/** Any HTTP answer (even a 5xx) proves the network path works; only "no answer" counts as offline. */
async function probeServer(): Promise<boolean> {
  const root = getApiBaseUrl().replace(/\/api\/?$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    await fetch(`${root}/health?t=${Date.now()}`, { method: 'GET', signal: controller.signal, headers: { 'Cache-Control': 'no-cache' } });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export const connectivity = new ConnectivityManager({ probe: probeServer });

function deviceReachable(s: Network.NetworkState): boolean | null {
  if (s.isConnected === false) return false;
  if (s.isInternetReachable === false) return false;
  return s.isConnected === true ? true : null;
}

let started = false;

/** Idempotent. Call once at app start. */
export async function startConnectivity(): Promise<void> {
  if (started) return;
  started = true;
  try {
    connectivity.setDeviceReachable(deviceReachable(await Network.getNetworkStateAsync()));
    Network.addNetworkStateListener((s) => connectivity.setDeviceReachable(deviceReachable(s)));
  } catch {
    /* unknown device state: the API traffic and the probe still work */
  }
  // Coming back to the app after a while (tunnel, lift…): re-check instead of trusting an outdated state.
  AppState.addEventListener('change', (next) => {
    if (next === 'active') void connectivity.retryNow();
  });
}
