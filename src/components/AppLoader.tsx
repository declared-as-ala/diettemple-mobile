/**
 * AppLoader — premium gold loader.
 *
 * Variants:
 *  • fullscreen  — dark overlay, static logo in center, gold arc ring rotating around it
 *  • inline      — small gold arc spinner (no card/box), optional label below
 *  • button      — 3 gold pulsing dots (replaces button text while loading)
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Image,
  Modal,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppLoaderVariant = 'fullscreen' | 'inline' | 'button';
export type AppLoaderSize = 'sm' | 'md' | 'lg';

export interface AppLoaderProps {
  variant?: AppLoaderVariant;
  size?: AppLoaderSize;
  /** Optional French label shown below the spinner */
  label?: string;
  visible?: boolean;
  /** Min display ms to prevent flash (fullscreen only) */
  minDisplayMs?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GOLD = '#D4AF37';
const GOLD_DIM = 'rgba(212,175,55,0.15)';
const DOT_COLOR = GOLD;

/** Arc spinner sizes (outer diameter in px) */
const ARC_SIZE: Record<AppLoaderSize, number> = { sm: 28, md: 44, lg: 60 };
const ARC_STROKE: Record<AppLoaderSize, number> = { sm: 2.5, md: 3, lg: 3.5 };
const FULLSCREEN_ARC = 96;       // diameter of arc ring around logo in fullscreen
const FULLSCREEN_LOGO = 56;      // logo image size in fullscreen
const FULLSCREEN_STROKE = 3.5;

// ─── Arc spinner (SVG) ────────────────────────────────────────────────────────

interface ArcSpinnerProps {
  diameter: number;
  strokeWidth: number;
  /** 0–1: fraction of circumference that is the visible arc */
  arcFraction?: number;
  speed?: number; // ms per full revolution
}

function ArcSpinner({
  diameter,
  strokeWidth,
  arcFraction = 0.28,
  speed = 900,
}: ArcSpinnerProps) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: speed,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spin, speed]);

  const rotation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const r = (diameter - strokeWidth) / 2;
  const cx = diameter / 2;
  const circumference = 2 * Math.PI * r;
  const arcLength = circumference * arcFraction;
  const gapLength = circumference - arcLength;

  return (
    <Animated.View
      style={{
        width: diameter,
        height: diameter,
        transform: [{ rotate: rotation }],
      }}
    >
      <Svg width={diameter} height={diameter}>
        {/* Dim full track */}
        <Circle
          cx={cx}
          cy={cx}
          r={r}
          stroke={GOLD_DIM}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Gold arc */}
        <Circle
          cx={cx}
          cy={cx}
          r={r}
          stroke={GOLD}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={[arcLength, gapLength]}
          strokeLinecap="round"
          // Start arc from top (SVG starts at 3 o'clock, rotate -90° offset via dashoffset)
          strokeDashoffset={0}
          rotation={-90}
          origin={`${cx}, ${cx}`}
        />
      </Svg>
    </Animated.View>
  );
}

// ─── 3-dot pulse (button variant) ────────────────────────────────────────────

function PulseDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeDot = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 300,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(600 - delay),
        ])
      );

    const a1 = makeDot(dot1, 0);
    const a2 = makeDot(dot2, 160);
    const a3 = makeDot(dot3, 320);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  const dotScale = (val: Animated.Value) =>
    val.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.15] });
  const dotOpacity = (val: Animated.Value) =>
    val.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <View style={styles.dotsRow}>
      {[dot1, dot2, dot3].map((val, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              transform: [{ scale: dotScale(val) }],
              opacity: dotOpacity(val),
            },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AppLoader({
  variant = 'inline',
  size = 'md',
  label,
  visible = true,
  minDisplayMs,
}: AppLoaderProps) {
  const [display, setDisplay] = useState(visible);
  const shownAtRef = useRef<number | null>(null);
  const labelOpacity = useRef(new Animated.Value(0)).current;

  // Minimum display time (fullscreen only)
  useEffect(() => {
    if (variant !== 'fullscreen' || minDisplayMs == null) {
      setDisplay(visible);
      return;
    }
    if (visible) {
      shownAtRef.current = Date.now();
      setDisplay(true);
      return;
    }
    const elapsed = Date.now() - (shownAtRef.current ?? 0);
    const remain = Math.max(0, minDisplayMs - elapsed);
    const t = setTimeout(() => {
      setDisplay(false);
      shownAtRef.current = null;
    }, remain);
    return () => clearTimeout(t);
  }, [visible, variant, minDisplayMs]);

  // Fade-in label on fullscreen after a short delay
  useEffect(() => {
    if (variant === 'fullscreen' && display && label) {
      const t = setTimeout(() => {
        Animated.timing(labelOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }, 350);
      return () => clearTimeout(t);
    }
    labelOpacity.setValue(0);
  }, [display, variant, label, labelOpacity]);

  // ── Button variant ──────────────────────────────────────────────────────────
  if (variant === 'button') {
    return <PulseDots />;
  }

  // ── Inline variant ──────────────────────────────────────────────────────────
  if (variant === 'inline') {
    const d = ARC_SIZE[size];
    const sw = ARC_STROKE[size];
    return (
      <View style={styles.inlineWrap}>
        <ArcSpinner diameter={d} strokeWidth={sw} />
        {label ? (
          <Text style={styles.inlineLabel}>{label}</Text>
        ) : null}
      </View>
    );
  }

  // ── Fullscreen variant ──────────────────────────────────────────────────────
  if (!display) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={styles.overlay} pointerEvents="auto">
        {/* Logo + arc ring stacked */}
        <View style={styles.fullscreenCenter}>
          {/* Arc ring */}
          <View style={styles.arcRingWrap}>
            <ArcSpinner
              diameter={FULLSCREEN_ARC}
              strokeWidth={FULLSCREEN_STROKE}
              arcFraction={0.3}
              speed={1000}
            />
          </View>

          {/* Static logo in the center of the ring */}
          <View style={styles.logoWrap}>
            <Image
              source={require('../../assets/logo.png')}
              style={{ width: FULLSCREEN_LOGO, height: FULLSCREEN_LOGO }}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Label fades in after 350ms */}
        {label ? (
          <Animated.Text style={[styles.fullscreenLabel, { opacity: labelOpacity }]}>
            {label}
          </Animated.Text>
        ) : null}
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Fullscreen
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCenter: {
    width: FULLSCREEN_ARC,
    height: FULLSCREEN_ARC,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arcRingWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  logoWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenLabel: {
    marginTop: 24,
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.4,
  },

  // Inline
  inlineWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  inlineLabel: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.3,
  },

  // Dots
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: DOT_COLOR,
  },
});
