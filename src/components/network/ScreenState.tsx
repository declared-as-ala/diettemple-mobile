import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BRAND_YELLOW } from '../../constants/brand';
import { useTheme } from '../../context/ThemeContext';
import { classifyError } from '../../network/classifyError';
import { useNetwork } from '../../network/NetworkProvider';
import OfflineScreen from './OfflineScreen';
import { SkeletonList } from './Skeleton';

const serifFont = Platform.OS === 'ios' ? 'Georgia' : 'serif';
/** A first load that lasts longer than this is shown as a "too slow" error with a retry button: no endless spinner. */
export const MAX_LOADING_MS = 20000;

/** Friendly error panel (French, no technical text) with a retry button. Offline gets the illustrated variant. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void | Promise<unknown> }) {
  const { colors } = useTheme();
  const { retry: recheck, checking } = useNetwork();
  const info = classifyError(error);

  if (info.kind === 'offline' || info.kind === 'timeout' || info.kind === 'server') {
    return (
      <OfflineScreen
        compact
        kind={info.kind}
        checking={checking}
        onRetry={async () => {
          if (info.kind === 'offline') await recheck();
          await onRetry?.();
        }}
      />
    );
  }
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <Ionicons name={info.kind === 'auth' || info.kind === 'forbidden' ? 'lock-closed-outline' : 'alert-circle-outline'} size={44} color={BRAND_YELLOW} />
      <Text style={[styles.title, { color: colors.text }]}>{info.title}</Text>
      <Text style={[styles.text, { color: colors.textSecondary }]}>{info.message}</Text>
      {info.retryable && onRetry ? (
        <TouchableOpacity style={styles.btn} onPress={() => void onRetry()} accessibilityRole="button" accessibilityLabel="Réessayer">
          <Ionicons name="refresh" size={16} color="#0B0B0B" />
          <Text style={styles.btnText}>Réessayer</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

interface ScreenStateProps {
  loading: boolean;
  error?: unknown;
  /** True when there is something to show (fresh OR cached). Content stays visible even if a refresh failed. */
  hasData: boolean;
  onRetry?: () => void | Promise<unknown>;
  /** Placeholder while the first load runs. Defaults to a list skeleton. */
  skeleton?: React.ReactNode;
  emptyIcon?: React.ComponentProps<typeof Ionicons>['name'];
  emptyTitle?: string;
  emptyText?: string;
  /** When there is no data and no error: show the empty state (default true). Set false to render children anyway. */
  showEmpty?: boolean;
  children: React.ReactNode;
}

/**
 * One wrapper that guarantees every data screen is in a presentable state:
 *   first load → skeleton (never a blank screen or bare spinner), at most MAX_LOADING_MS;
 *   failure with no data → French error / offline panel with "Réessayer";
 *   data (even stale or cached) → the content, with a smooth fade-in.
 */
export default function ScreenState({ loading, error, hasData, onRetry, skeleton, emptyIcon = 'file-tray-outline', emptyTitle = 'Rien à afficher pour le moment', emptyText, showEmpty = true, children }: ScreenStateProps) {
  const { colors } = useTheme();
  const [timedOut, setTimedOut] = useState(false);
  const fade = React.useRef(new Animated.Value(hasData ? 1 : 0)).current;

  useEffect(() => {
    if (!loading || hasData) {
      setTimedOut(false);
      return;
    }
    const t = setTimeout(() => setTimedOut(true), MAX_LOADING_MS);
    return () => clearTimeout(t);
  }, [loading, hasData]);

  useEffect(() => {
    if (hasData) Animated.timing(fade, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    else fade.setValue(0);
  }, [hasData, fade]);

  if (hasData) return <Animated.View style={{ flex: 1, opacity: fade }}>{children}</Animated.View>;
  if (loading && !timedOut) return <View style={{ flex: 1 }}>{skeleton ?? <SkeletonList />}</View>;
  if (error || timedOut) return <ErrorState error={timedOut && !error ? { code: 'ECONNABORTED' } : error} onRetry={onRetry} />;
  if (!showEmpty) return <>{children}</>;
  return (
    <View style={styles.center}>
      <Ionicons name={emptyIcon} size={40} color={colors.textSecondary} />
      <Text style={[styles.title, { color: colors.text }]}>{emptyTitle}</Text>
      {emptyText ? <Text style={[styles.text, { color: colors.textSecondary }]}>{emptyText}</Text> : null}
    </View>
  );
}

/** Small inline spinner for secondary actions (buttons, pull-to-refresh footers) — not for first loads. */
export function InlineSpinner() {
  return <ActivityIndicator color={BRAND_YELLOW} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
  title: { fontFamily: serifFont, fontSize: 20, textAlign: 'center', marginTop: 6 },
  text: { fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 320 },
  btn: { marginTop: 14, minHeight: 46, borderRadius: 23, backgroundColor: BRAND_YELLOW, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24 },
  btnText: { color: '#0B0B0B', fontSize: 15, fontWeight: '800' },
});
