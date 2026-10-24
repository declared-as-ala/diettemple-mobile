/**
 * Current connection type (Wi-Fi / cellular / none), kept in memory and updated by expo-network's listener.
 * Used only to pick DEFAULTS (Data Saver "Auto"); actual video quality additionally adapts to real playback stalls.
 */
import * as Network from 'expo-network';
import type { NetworkKind } from '../utils/videoQuality';

let current: NetworkKind = 'unknown';
const listeners = new Set<(n: NetworkKind) => void>();
let started = false;

function map(state: Network.NetworkState): NetworkKind {
  if (state.isConnected === false || state.isInternetReachable === false) return 'none';
  switch (state.type) {
    case Network.NetworkStateType.WIFI:
    case Network.NetworkStateType.ETHERNET:
      return 'wifi';
    case Network.NetworkStateType.CELLULAR:
      return 'cellular';
    case Network.NetworkStateType.NONE:
      return 'none';
    default:
      return 'unknown';
  }
}

function set(next: NetworkKind) {
  if (next === current) return;
  current = next;
  listeners.forEach((l) => l(next));
}

export function getNetworkKind(): NetworkKind {
  return current;
}

export function subscribeNetwork(cb: (n: NetworkKind) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Idempotent. Call once at app start. */
export async function startNetworkMonitor(): Promise<void> {
  if (started) return;
  started = true;
  try {
    set(map(await Network.getNetworkStateAsync()));
    Network.addNetworkStateListener((s) => set(map(s)));
  } catch {
    /* keep 'unknown': defaults stay conservative */
  }
}
