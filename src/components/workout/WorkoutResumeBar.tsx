import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { rootNavigationRef } from '../../navigation/rootNavigationRef';
import { useAuthStore } from '../../store/authStore';
import {
  useActiveWorkoutPersistStore,
  type PersistedWorkoutSnapshotV1,
} from '../../store/activeWorkoutPersistStore';

const ACCENT = '#D4AF37';

function getDeepestRouteName(state: { routes: { name: string; state?: unknown }[]; index: number } | undefined): string | undefined {
  if (!state?.routes?.length || state.index == null) return undefined;
  const route = state.routes[state.index] as { name: string; state?: { routes: unknown[]; index: number } };
  if (route.state) return getDeepestRouteName(route.state as { routes: { name: string; state?: unknown }[]; index: number });
  return route.name;
}

function shouldHideForCurrentRoute(): boolean {
  if (!rootNavigationRef.isReady()) return false;
  const state = rootNavigationRef.getState() as { routes: { name: string; state?: unknown }[]; index: number } | undefined;
  const name = getDeepestRouteName(state);
  return name === 'SessionReels';
}

export default function WorkoutResumeBar() {
  const insets = useSafeAreaInsets();
  const authStatus = useAuthStore((s) => s.authStatus);
  const [snapshot, setSnapshot] = useState<PersistedWorkoutSnapshotV1 | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const refresh = useCallback(async () => {
    if (authStatus !== 'LOGGED_IN') {
      setSnapshot(null);
      return;
    }
    if (!rootNavigationRef.isReady()) return;
    if (shouldHideForCurrentRoute()) {
      setSnapshot(null);
      return;
    }
    const data = await useActiveWorkoutPersistStore.getState().hydrate();
    setSnapshot(data);
  }, [authStatus]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (rootNavigationRef.isReady()) return;
    const t = setInterval(() => {
      if (rootNavigationRef.isReady()) {
        clearInterval(t);
        void refresh();
      }
    }, 80);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    if (!rootNavigationRef.isReady()) return;
    const unsub = rootNavigationRef.addListener('state', () => {
      void refresh();
    });
    return unsub;
  }, [refresh]);

  const onResume = useCallback(() => {
    if (!snapshot || !rootNavigationRef.isReady()) return;
    rootNavigationRef.navigate('SessionReels', {
      sessionTemplateId: snapshot.sessionTemplateId,
      session: snapshot.session,
      resumeFromStorage: true,
    });
  }, [snapshot]);

  if (dismissed || !snapshot) return null;

  const title = snapshot.session?.title ?? 'Séance en cours';

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingBottom: Math.max(insets.bottom, 10),
          paddingHorizontal: 14,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.card}>
        <View style={styles.textCol}>
          <Text style={styles.kicker}>Reprendre</Text>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <TouchableOpacity onPress={onResume} style={styles.cta} activeOpacity={0.88}>
          <Ionicons name="play" size={18} color="#000" />
          <Text style={styles.ctaText}>Continuer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setDismissed(true)}
          style={styles.close}
          hitSlop={12}
          accessibilityLabel="Masquer"
        >
          <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18,18,18,0.96)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 8,
    gap: 10,
  },
  textCol: { flex: 1, minWidth: 0 },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    color: ACCENT,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: { fontSize: 15, fontWeight: '700', color: '#fff', marginTop: 2 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ACCENT,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  ctaText: { color: '#000', fontWeight: '800', fontSize: 14 },
  close: { padding: 4 },
});
