import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const { width } = Dimensions.get('window');

const GOLD       = '#D4AF37';
const VOLT       = '#C8FF3D';
const LOGO_SIZE  = Math.min(160, width * 0.38);
const TRACK_W    = Math.min(220, width * 0.58);

let SPLASH_SOUND: ReturnType<typeof require> | null = null;
try { SPLASH_SOUND = require('../../assets/spalsh.mp3'); } catch { SPLASH_SOUND = null; }

interface Props {
  progress: number;
  label?: string;
  done?: boolean;
  onFinish?: () => void;
}

export default function LuxurySplash({
  progress,
  label = 'Initialisation…',
  done = false,
  onFinish,
}: Props) {
  const containerOp  = useRef(new Animated.Value(0)).current;
  const logoOp       = useRef(new Animated.Value(0)).current;
  const logoScale    = useRef(new Animated.Value(0.88)).current;
  const lineScale    = useRef(new Animated.Value(0)).current;
  const textOp       = useRef(new Animated.Value(0)).current;
  const textY        = useRef(new Animated.Value(16)).current;
  const progressScale= useRef(new Animated.Value(0)).current;
  const glowX        = useRef(new Animated.Value(-110)).current;
  const exitOp       = useRef(new Animated.Value(1)).current;
  const hasFinished  = useRef(false);
  const clampedPct   = useMemo(() => Math.max(0, Math.min(100, Math.round(progress))), [progress]);

  /* ── Entrance animation ─────────────────────────────────────────── */
  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(containerOp, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(logoScale,   { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }),
        Animated.timing(logoOp,      { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.delay(150),
      Animated.timing(lineScale, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(textOp, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(textY,  { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  /* ── Splash sound ────────────────────────────────────────────────── */
  useEffect(() => {
    if (!SPLASH_SOUND) return;
    let mounted = true;
    (async () => {
      try { await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false }); } catch {}
      if (!mounted) return;
      try {
        const player = createAudioPlayer(SPLASH_SOUND!);
        player.volume = 0.6;
        player.play();
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  /* ── Progress bar ────────────────────────────────────────────────── */
  useEffect(() => {
    Animated.timing(progressScale, {
      toValue: clampedPct / 100, duration: 260, useNativeDriver: true,
    }).start();
  }, [clampedPct]);

  /* ── Progress bar glow sweep ─────────────────────────────────────── */
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowX, { toValue: TRACK_W + 110, duration: 1700, useNativeDriver: true }),
        Animated.timing(glowX, { toValue: -110, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  /* ── Exit animation ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!done || hasFinished.current) return;
    hasFinished.current = true;
    Animated.timing(exitOp, { toValue: 0, duration: 320, useNativeDriver: true }).start(
      ({ finished }) => { if (finished) onFinish?.(); }
    );
  }, [done]);

  return (
    <Animated.View style={[s.root, { opacity: Animated.multiply(containerOp, exitOp) }]}>

      {/* Ambient glows — no image, pure CSS */}
      <View style={s.glowTopRight}   pointerEvents="none" />
      <View style={s.glowBottomLeft} pointerEvents="none" />

      {/* ── App logo ─────────────────────────────────────────────────── */}
      <Animated.View style={[s.logoWrap, { opacity: logoOp, transform: [{ scale: logoScale }] }]}>
        <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
      </Animated.View>

      {/* ── Brand title ──────────────────────────────────────────────── */}
      <View style={s.brandBlock}>
        <Text style={s.title}>DIET<Text style={s.titleAccent}>TEMPLE</Text></Text>
        <Image source={require('../../assets/logo-uh.png')} style={s.uhLogo} resizeMode="contain" />
      </View>

      {/* ── Gold divider ─────────────────────────────────────────────── */}
      <Animated.View style={[s.divider, { transform: [{ scaleX: lineScale }] }]} />

      {/* ── Three phrases ────────────────────────────────────────────── */}
      <Animated.View style={[s.phrasesWrap, { opacity: textOp, transform: [{ translateY: textY }] }]}>
        <Text style={s.phrase}>Un parcours clair.</Text>
        <Text style={s.phrase}>Une progression réelle.</Text>
        <Text style={[s.phrase, s.phraseGold]}>Une approche scientifique.</Text>
      </Animated.View>

      {/* ── Progress bar ─────────────────────────────────────────────── */}
      <Animated.View style={{ opacity: textOp }}>
        <View style={s.track}>
          <Animated.View style={[s.fill, { transform: [{ scaleX: progressScale }] }]} />
          <Animated.View style={[s.fillGlow, { transform: [{ translateX: glowX }] }]}
            pointerEvents="none" />
        </View>
        <Text style={s.pct}>{clampedPct}%</Text>
        <Text style={s.label}>{label}</Text>
      </Animated.View>

    </Animated.View>
  );
}

/* ── Styles ────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 0,
  },

  /* Ambient glows */
  glowTopRight: {
    position: 'absolute',
    width: width * 0.75, height: width * 0.75,
    borderRadius: width * 0.375,
    backgroundColor: 'rgba(212,175,55,0.06)',
    top: -width * 0.22, right: -width * 0.22,
  },
  glowBottomLeft: {
    position: 'absolute',
    width: width * 0.55, height: width * 0.55,
    borderRadius: width * 0.275,
    backgroundColor: 'rgba(200,255,61,0.04)',
    bottom: -width * 0.1, left: -width * 0.15,
  },

  /* Logo — no box, no border */
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE },

  /* Brand block */
  brandBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },

  /* Title */
  title: {
    fontSize: 22, fontWeight: '900', letterSpacing: 6,
    color: '#FFFFFF',
    marginBottom: 14,
    textAlign: 'center',
  },
  titleAccent: { color: '#C8FF3D' },

  /* UH logo under title */
  uhLogo: {
    width: LOGO_SIZE * 0.68,
    height: LOGO_SIZE * 0.68,
    opacity: 0.92,
  },

  /* Divider */
  divider: {
    width: width * 0.26, height: 1,
    backgroundColor: GOLD,
    opacity: 0.6,
    marginBottom: 28,
  },

  /* Phrases */
  phrasesWrap: { alignItems: 'center', gap: 10, marginBottom: 44 },
  phrase: {
    fontSize: 15.5, fontWeight: '300',
    color: 'rgba(244,242,236,0.88)',
    textAlign: 'center',
    letterSpacing: 0.3, lineHeight: 24,
  },
  phraseGold: {
    color: GOLD, fontWeight: '500', letterSpacing: 0.5,
  },

  /* Progress */
  track: {
    width: TRACK_W, height: 6, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(212,175,55,0.2)',
  },
  fill: {
    width: '100%', height: '100%',
    backgroundColor: GOLD,
    transformOrigin: 'left',
  },
  fillGlow: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 40,
    backgroundColor: 'rgba(255,255,255,0.32)', borderRadius: 999,
  },
  pct: {
    color: '#EDE1B0', fontSize: 12, fontWeight: '700',
    letterSpacing: 1, marginTop: 8, textAlign: 'center',
  },
  label: {
    color: 'rgba(255,255,255,0.38)', fontSize: 11,
    letterSpacing: 0.4, marginTop: 4, textAlign: 'center',
  },
});
