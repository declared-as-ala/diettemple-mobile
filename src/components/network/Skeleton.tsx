import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

/** One shared pulse for every block on screen (cheap: a single animated value, native driver). */
function usePulse() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return v;
}

export function SkeletonBlock({ width, height = 14, radius = 8, style }: { width?: number | `${number}%`; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const { isDarkMode } = useTheme();
  const pulse = usePulse();
  const base = isDarkMode ? '#1B1B1B' : '#E7E7EA';
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  return <Animated.View style={[{ width: width ?? '100%', height, borderRadius: radius, backgroundColor: base, opacity }, style]} />;
}

/** Card-shaped placeholder: image on the left, two text lines on the right. */
export function SkeletonCard({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }, style]}>
      <SkeletonBlock width={64} height={64} radius={14} />
      <View style={styles.lines}>
        <SkeletonBlock width="70%" height={14} />
        <SkeletonBlock width="45%" height={12} />
      </View>
    </View>
  );
}

/** Generic list placeholder: use it instead of a spinner while the first load is running. */
export function SkeletonList({ count = 5, style }: { count?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.list, style]} accessibilityLabel="Chargement en cours" accessibilityRole="progressbar" accessible>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

/** Full-screen placeholder with a header line + hero block + list (screens without a specific layout). */
export function SkeletonScreen({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.screen, style]} accessibilityLabel="Chargement en cours" accessibilityRole="progressbar" accessible>
      <SkeletonBlock width="55%" height={22} />
      <SkeletonBlock width="35%" height={12} style={{ marginTop: 10 }} />
      <SkeletonBlock height={150} radius={18} style={{ marginTop: 22 }} />
      <View style={{ marginTop: 22, gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 18, borderWidth: 1 },
  lines: { flex: 1, gap: 10 },
  list: { gap: 12, paddingHorizontal: 16, paddingTop: 8 },
  screen: { flex: 1, padding: 18 },
});
