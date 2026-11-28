import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND_YELLOW } from '../../constants/brand';
import { useNetwork } from '../../network/NetworkProvider';

type Shown = 'offline' | 'slow' | 'restored' | null;
const RESTORED_MS = 2600;

const LOOK: Record<Exclude<Shown, null>, { icon: React.ComponentProps<typeof Ionicons>['name']; text: string; color: string; bg: string; border: string }> = {
  offline: { icon: 'cloud-offline-outline', text: 'Hors ligne — contenu enregistré affiché', color: '#F6F4EE', bg: '#1B1810', border: '#4A3E1A' },
  slow: { icon: 'cellular-outline', text: 'Connexion instable', color: '#F5C96B', bg: '#1B1810', border: '#4A3E1A' },
  restored: { icon: 'checkmark-circle', text: 'Connexion rétablie', color: '#0B0B0B', bg: BRAND_YELLOW, border: BRAND_YELLOW },
};

/**
 * Discreet pill at the top of the screen. It never blocks touches on the app:
 *  - offline  → stays until the connection is back (with a small "Réessayer"),
 *  - slow     → "Connexion instable" while the network is degraded,
 *  - restored → "Connexion rétablie" for ~2.5 s after an outage.
 */
export default function NetworkBanner() {
  const { status, reconnectCount, retry, checking } = useNetwork();
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState<Shown>(null);
  const [mounted, setMounted] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;
  const lastReconnect = useRef(reconnectCount);
  const restoredTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Decide what to show.
  useEffect(() => {
    if (status === 'offline') {
      if (restoredTimer.current) clearTimeout(restoredTimer.current);
      setShown('offline');
    } else if (status === 'slow') {
      if (restoredTimer.current) clearTimeout(restoredTimer.current);
      setShown('slow');
    } else {
      setShown((cur) => (cur === 'restored' ? cur : null));
    }
  }, [status]);

  // Offline → online: short success message.
  useEffect(() => {
    if (reconnectCount === lastReconnect.current) return;
    lastReconnect.current = reconnectCount;
    setShown('restored');
    if (restoredTimer.current) clearTimeout(restoredTimer.current);
    restoredTimer.current = setTimeout(() => setShown((cur) => (cur === 'restored' ? null : cur)), RESTORED_MS);
  }, [reconnectCount]);

  useEffect(() => () => { if (restoredTimer.current) clearTimeout(restoredTimer.current); }, []);

  // Slide in / out.
  useEffect(() => {
    if (shown) {
      setMounted(true);
      Animated.timing(slide, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else {
      Animated.timing(slide, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [shown, slide]);

  if (!mounted) return null;
  const look = LOOK[shown ?? 'offline'];

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { top: insets.top + 6, opacity: slide, transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }] }]}
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.pill, { backgroundColor: look.bg, borderColor: look.border }]} accessible accessibilityRole="alert" accessibilityLabel={look.text}>
        <Ionicons name={look.icon} size={16} color={look.color} />
        <Text style={[styles.text, { color: look.color }]} numberOfLines={1}>{look.text}</Text>
        {shown === 'offline' ? (
          <TouchableOpacity onPress={() => void retry()} disabled={checking} hitSlop={10} accessibilityRole="button" accessibilityLabel="Réessayer">
            <Text style={styles.retry}>{checking ? '…' : 'Réessayer'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 9000, elevation: 9000 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, maxWidth: '92%', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  text: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  retry: { color: BRAND_YELLOW, fontSize: 13, fontWeight: '800', marginLeft: 4 },
});
