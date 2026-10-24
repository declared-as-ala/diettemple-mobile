/**
 * Data Saver ("Économiseur de données") + manual video quality. Preferences only (not sensitive) -> AsyncStorage.
 * `useMediaPolicy()` combines them with the live connection type and the quality ceiling learned from playback stalls.
 */
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getNetworkKind, startNetworkMonitor, subscribeNetwork } from '../services/networkType';
import { resolveMediaPolicy, type DataSaverMode, type MediaPolicy, type VideoPref, type VideoTier } from '../utils/videoQuality';

const KEY = '@dt_data_saver_v1';

interface State {
  mode: DataSaverMode;
  videoPref: VideoPref;
  /** Highest tier proven sustainable this session (null = unknown). In memory: re-learned each launch. */
  ceiling: VideoTier | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setMode: (m: DataSaverMode) => void;
  setVideoPref: (p: VideoPref) => void;
  setCeiling: (c: VideoTier | null) => void;
}

const persist = (s: Pick<State, 'mode' | 'videoPref'>) => AsyncStorage.setItem(KEY, JSON.stringify({ mode: s.mode, videoPref: s.videoPref })).catch(() => {});

export const useDataSaverStore = create<State>((set, get) => ({
  mode: 'auto',
  videoPref: 'auto',
  ceiling: null,
  hydrated: false,
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        set({
          mode: ['auto', 'saver', 'high'].includes(p.mode) ? p.mode : 'auto',
          videoPref: ['auto', '240', '360', '540'].includes(p.videoPref) ? p.videoPref : 'auto',
        });
      }
    } catch {
      /* defaults */
    }
    set({ hydrated: true });
    void startNetworkMonitor();
  },
  setMode: (mode) => {
    set({ mode });
    persist({ mode, videoPref: get().videoPref });
  },
  setVideoPref: (videoPref) => {
    set({ videoPref, ceiling: null });
    persist({ mode: get().mode, videoPref });
  },
  setCeiling: (ceiling) => set({ ceiling }),
}));

/** Live media policy for components. Re-renders when the preference or the connection type changes. */
export function useMediaPolicy(): MediaPolicy {
  const mode = useDataSaverStore((s) => s.mode);
  const videoPref = useDataSaverStore((s) => s.videoPref);
  const ceiling = useDataSaverStore((s) => s.ceiling);
  const [network, setNetwork] = useState(getNetworkKind());
  useEffect(() => {
    void startNetworkMonitor();
    setNetwork(getNetworkKind());
    return subscribeNetwork(setNetwork);
  }, []);
  return resolveMediaPolicy({ mode, network, videoPref, ceiling });
}

/** Non-hook access (services, callbacks). */
export function currentMediaPolicy(): MediaPolicy {
  const s = useDataSaverStore.getState();
  return resolveMediaPolicy({ mode: s.mode, network: getNetworkKind(), videoPref: s.videoPref, ceiling: s.ceiling });
}
