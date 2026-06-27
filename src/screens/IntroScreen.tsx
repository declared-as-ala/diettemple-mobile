import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';

type Nav = StackNavigationProp<RootStackParamList, 'Intro'>;

const { width, height } = Dimensions.get('window');

const PHRASES = [
  'Un parcours clair.',
  'Une progression réelle.',
  'Une approche scientifique.',
];

export default function IntroScreen() {
  const navigation = useNavigation<Nav>();

  /* ── Animation values ────────────────────────────────────────────── */
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const lineScale    = useRef(new Animated.Value(0)).current;
  const textOpacity  = useRef(new Animated.Value(0)).current;
  const textY        = useRef(new Animated.Value(24)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    /* Staggered cinematic reveal */
    Animated.sequence([
      /* 1 — logo fades in */
      Animated.timing(logoOpacity, {
        toValue: 1, duration: 900, useNativeDriver: true,
      }),
      Animated.delay(180),
      /* 2 — gold line expands */
      Animated.timing(lineScale, {
        toValue: 1, duration: 550, useNativeDriver: true,
      }),
      Animated.delay(120),
      /* 3 — phrases rise & brand fades in together */
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1, duration: 800, useNativeDriver: true,
        }),
        Animated.timing(textY, {
          toValue: 0, duration: 800, useNativeDriver: true,
        }),
        Animated.timing(brandOpacity, {
          toValue: 1, duration: 900, useNativeDriver: true,
        }),
      ]),
    ]).start();

    /* Navigate to Onboarding after display */
    const timer = setTimeout(() => navigation.replace('Onboarding'), 3600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.root}>

      {/* Ambient glow top-right */}
      <View style={styles.glowTR} pointerEvents="none" />
      {/* Ambient glow bottom-left */}
      <View style={styles.glowBL} pointerEvents="none" />

      {/* ── Logo ───────────────────────────────────────────────────── */}
      <Animated.View style={[styles.logoWrap, { opacity: logoOpacity }]}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* ── Gold divider line ───────────────────────────────────────── */}
      <Animated.View
        style={[styles.divider, { transform: [{ scaleX: lineScale }] }]}
      />

      {/* ── Phrases ────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.phrasesWrap,
          { opacity: textOpacity, transform: [{ translateY: textY }] },
        ]}
      >
        {PHRASES.map((phrase, i) => (
          <Text
            key={i}
            style={[
              styles.phrase,
              i === PHRASES.length - 1 && styles.phraseGold,
            ]}
          >
            {phrase}
          </Text>
        ))}
      </Animated.View>

      {/* ── Brand name (bottom) ─────────────────────────────────────── */}
      <Animated.View style={[styles.brandWrap, { opacity: brandOpacity }]}>
        <Text style={styles.brandName}>
          DIET<Text style={styles.brandAccent}>TEMPLE</Text>
        </Text>
        <Text style={styles.brandSub}>ULTIMATE HUMAN SOCIETY</Text>
      </Animated.View>

    </View>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────── */
const GOLD  = '#D4AF37';
const VOLT  = '#C8FF3D';
const WHITE = '#F4F2EC';
const GREY  = '#6E6B62';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  /* Ambient glows */
  glowTR: {
    position: 'absolute',
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: 'rgba(212, 175, 55, 0.07)',
    top: -width * 0.2,
    right: -width * 0.2,
  },
  glowBL: {
    position: 'absolute',
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    backgroundColor: 'rgba(200, 255, 61, 0.04)',
    bottom: -width * 0.1,
    left: -width * 0.15,
  },

  /* Logo */
  logoWrap: {
    marginBottom: 36,
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
  },

  /* Gold line */
  divider: {
    width: width * 0.28,
    height: 1,
    backgroundColor: GOLD,
    marginBottom: 40,
    opacity: 0.7,
  },

  /* Phrases */
  phrasesWrap: {
    alignItems: 'center',
    gap: 14,
    marginBottom: 64,
  },
  phrase: {
    fontSize: 17,
    fontWeight: '300',
    color: WHITE,
    textAlign: 'center',
    letterSpacing: 0.4,
    lineHeight: 26,
    opacity: 0.92,
  },
  phraseGold: {
    color: GOLD,
    fontWeight: '500',
    letterSpacing: 0.6,
  },

  /* Brand */
  brandWrap: {
    position: 'absolute',
    bottom: height * 0.08,
    alignItems: 'center',
    gap: 6,
  },
  brandName: {
    fontSize: 13,
    fontWeight: '800',
    color: WHITE,
    letterSpacing: 6,
    opacity: 0.5,
  },
  brandAccent: {
    color: GOLD,
  },
  brandSub: {
    fontSize: 9,
    fontWeight: '400',
    color: GREY,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
});
