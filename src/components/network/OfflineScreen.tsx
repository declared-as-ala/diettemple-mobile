import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND_YELLOW } from '../../constants/brand';
import type { ErrorKind } from '../../network/classifyError';

const GOLD = BRAND_YELLOW;
const serifFont = Platform.OS === 'ios' ? 'Georgia' : 'serif';

const COPY: Record<'offline' | 'timeout' | 'server', { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; text: string }> = {
  offline: { icon: 'cloud-offline-outline', title: 'Pas de connexion', text: "Vous êtes hors ligne. Vérifiez votre connexion Internet, nous reprenons dès qu'elle revient." },
  timeout: { icon: 'hourglass-outline', title: 'Connexion trop lente', text: 'Le serveur met trop de temps à répondre. Réessayez dans un instant.' },
  server: { icon: 'construct-outline', title: 'Service momentanément indisponible', text: 'Nos serveurs rencontrent un souci. Réessayez dans quelques instants.' },
};

/** Slow concentric rings + a floating badge. Falls back to a still picture when the user asked for reduced motion. */
function Illustration({ icon }: { icon: React.ComponentProps<typeof Ionicons>['name'] }) {
  const ring = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const [still, setStill] = useState(false);

  useEffect(() => {
    let loops: Animated.CompositeAnimation[] = [];
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => {
        if (!alive) return;
        if (reduce) return setStill(true);
        loops = [
          Animated.loop(Animated.timing(ring, { toValue: 1, duration: 2800, easing: Easing.out(Easing.quad), useNativeDriver: true })),
          Animated.loop(
            Animated.sequence([
              Animated.timing(float, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
              Animated.timing(float, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
          ),
        ];
        loops.forEach((l) => l.start());
      })
      .catch(() => setStill(true));
    return () => {
      alive = false;
      loops.forEach((l) => l.stop());
    };
  }, [ring, float]);

  const ringStyle = (delay: number) => {
    const p = Animated.modulo(Animated.add(ring, delay), 1);
    return {
      opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
      transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.7] }) }],
    };
  };

  return (
    <View style={styles.illus} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {!still && <Animated.View style={[styles.ring, ringStyle(0)]} />}
      {!still && <Animated.View style={[styles.ring, ringStyle(0.5)]} />}
      <Animated.View style={[styles.badge, { transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }]}>
        <Ionicons name={icon} size={44} color={GOLD} />
      </Animated.View>
    </View>
  );
}

interface Props {
  kind?: Extract<ErrorKind, 'offline' | 'timeout' | 'server'>;
  /** Runs the connection check / reload. Resolve when finished (the button shows a spinner meanwhile). */
  onRetry: () => void | Promise<unknown>;
  checking?: boolean;
  /** Offer to keep using what is already stored on the phone (shown only when something is available). */
  onContinue?: () => void;
  /** Inline version (inside a screen) instead of a full-screen takeover. */
  compact?: boolean;
}

/** Full-screen "no connection" state: logo, calm animation, clear French message, "Réessayer". */
export default function OfflineScreen({ kind = 'offline', onRetry, checking = false, onContinue, compact = false }: Props) {
  const insets = useSafeAreaInsets();
  const copy = COPY[kind];
  const fade = useRef(new Animated.Value(0)).current;
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [fade]);

  const retry = async () => {
    if (busy || checking) return;
    setBusy(true);
    try {
      await onRetry();
    } finally {
      // keep the spinner a moment so a failed attempt is visibly "tried" (no dead button)
      setTimeout(() => setBusy(false), 450);
    }
  };
  const loading = busy || checking;

  return (
    <Animated.View
      style={[compact ? styles.compact : styles.full, { opacity: fade, paddingTop: compact ? 24 : insets.top + 24, paddingBottom: compact ? 24 : insets.bottom + 24 }]}
      accessibilityLiveRegion="polite"
    >
      {!compact && <StatusBar style="light" />}
      {!compact && <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="Logo" />}
      <Illustration icon={copy.icon} />
      <Text style={styles.title} accessibilityRole="header">{copy.title}</Text>
      <Text style={styles.text}>{copy.text}</Text>

      <TouchableOpacity style={[styles.btn, loading && { opacity: 0.8 }]} onPress={retry} disabled={loading} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Réessayer">
        {loading ? <ActivityIndicator color="#0B0B0B" /> : <Ionicons name="refresh" size={18} color="#0B0B0B" />}
        <Text style={styles.btnText}>{loading ? 'Vérification…' : 'Réessayer'}</Text>
      </TouchableOpacity>

      {onContinue ? (
        <TouchableOpacity onPress={onContinue} style={styles.link} accessibilityRole="button">
          <Text style={styles.linkText}>Continuer avec les données enregistrées</Text>
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  full: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, zIndex: 9999, elevation: 9999 },
  compact: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logo: { position: 'absolute', top: 64, width: 120, height: 60, opacity: 0.95 },
  illus: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  ring: { position: 'absolute', width: 110, height: 110, borderRadius: 55, borderWidth: 1.5, borderColor: GOLD },
  badge: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#14120C', borderWidth: 1, borderColor: '#3A3118', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#F6F4EE', fontFamily: serifFont, fontSize: 24, textAlign: 'center', letterSpacing: 0.3 },
  text: { color: '#A6A39A', fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 10, maxWidth: 320 },
  btn: { marginTop: 28, minHeight: 52, minWidth: 190, borderRadius: 26, backgroundColor: GOLD, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 28 },
  btnText: { color: '#0B0B0B', fontSize: 16, fontWeight: '800' },
  link: { marginTop: 18, paddingVertical: 10, paddingHorizontal: 12 },
  linkText: { color: GOLD, fontSize: 14, fontWeight: '600' },
});
