import { BRAND_YELLOW } from '../constants/brand';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Circle,
  G,
} from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';

type Nav = StackNavigationProp<RootStackParamList, 'Intro'>;

const { width, height } = Dimensions.get('window');

const GOLD = BRAND_YELLOW;
const VOLT = '#B8FF00';
const GOLD_LIGHT = BRAND_YELLOW;
const ICON_SIZE = Math.min(88, width * 0.22);
const UH_LOGO_SIZE = Math.min(96, width * 0.25);

/* ── Halftone Dot Patterns ─────────────────────────────────────────── */
function TopRightHalftone() {
  const dots = [];
  const cols = 9;
  const rows = 12;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const diag = (c + (rows - r)) / (cols + rows);
      const opacity = Math.max(0, Math.min(0.7, (diag - 0.25) * 1.1));
      const radius = 1.2 + diag * 1.6;
      if (opacity > 0.05) {
        dots.push(
          <Circle
            key={`tr-${r}-${c}`}
            cx={150 - c * 13}
            cy={r * 13}
            r={radius}
            fill={GOLD_LIGHT}
            opacity={opacity}
          />
        );
      }
    }
  }
  return (
    <View style={s.halftoneTopRight} pointerEvents="none">
      <Svg width={160} height={170} viewBox="0 0 160 170">
        <G>{dots}</G>
      </Svg>
    </View>
  );
}

function BottomLeftHalftone() {
  const dots = [];
  const cols = 9;
  const rows = 12;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const diag = (cols - c + r) / (cols + rows);
      const opacity = Math.max(0, Math.min(0.65, (diag - 0.28) * 1.1));
      const radius = 1.1 + diag * 1.5;
      if (opacity > 0.05) {
        dots.push(
          <Circle
            key={`bl-${r}-${c}`}
            cx={c * 13}
            cy={160 - r * 13}
            r={radius}
            fill={GOLD_LIGHT}
            opacity={opacity}
          />
        );
      }
    }
  }
  return (
    <View style={s.halftoneBottomLeft} pointerEvents="none">
      <Svg width={160} height={170} viewBox="0 0 160 170">
        <G>{dots}</G>
      </Svg>
    </View>
  );
}

function LuminousGoldBeam({ width: beamW = width * 0.82 }: { width?: number }) {
  return (
    <View style={{ width: beamW, height: 16, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={beamW} height={16} viewBox={`0 0 ${beamW} 16`}>
        <Defs>
          <LinearGradient id="beamGradIntro" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={BRAND_YELLOW} stopOpacity="0" />
            <Stop offset="25%" stopColor={BRAND_YELLOW} stopOpacity="0.4" />
            <Stop offset="50%" stopColor="#FFF2B8" stopOpacity="1" />
            <Stop offset="75%" stopColor={BRAND_YELLOW} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={BRAND_YELLOW} stopOpacity="0" />
          </LinearGradient>
          <RadialGradient id="beamCenterGlowIntro" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <Stop offset="30%" stopColor={BRAND_YELLOW} stopOpacity="0.6" />
            <Stop offset="100%" stopColor={BRAND_YELLOW} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={beamW / 2} cy={8} r={8} fill="url(#beamCenterGlowIntro)" />
        <Rect x={0} y={7.2} width={beamW} height={1.6} fill="url(#beamGradIntro)" />
      </Svg>
    </View>
  );
}

function TaperedGoldLine({ width: lineW = 34 }: { width?: number }) {
  return (
    <Svg width={lineW} height={2} viewBox={`0 0 ${lineW} 2`}>
      <Defs>
        <LinearGradient id="taperGradIntro" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={BRAND_YELLOW} stopOpacity="0.1" />
          <Stop offset="50%" stopColor={BRAND_YELLOW} stopOpacity="0.85" />
          <Stop offset="100%" stopColor={BRAND_YELLOW} stopOpacity="0.1" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0.5} width={lineW} height={1} fill="url(#taperGradIntro)" />
    </Svg>
  );
}

export default function IntroScreen() {
  const navigation = useNavigation<Nav>();

  const containerOp = useRef(new Animated.Value(0)).current;
  const iconOp = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.88)).current;
  const wordmarkOp = useRef(new Animated.Value(0)).current;
  const wordmarkY = useRef(new Animated.Value(6)).current;
  const presenteOp = useRef(new Animated.Value(0)).current;
  const uhLogoOp = useRef(new Animated.Value(0)).current;
  const uhLogoScale = useRef(new Animated.Value(0.86)).current;
  const uhTitleOp = useRef(new Animated.Value(0)).current;
  const uhTitleY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(containerOp, { toValue: 1, duration: 320, useNativeDriver: true }),

      Animated.parallel([
        Animated.timing(iconOp, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.spring(iconScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      ]),

      Animated.sequence([
        Animated.delay(100),
        Animated.parallel([
          Animated.timing(wordmarkOp, { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.timing(wordmarkY, { toValue: 0, duration: 380, useNativeDriver: true }),
        ]),
      ]),

      Animated.sequence([
        Animated.delay(200),
        Animated.timing(presenteOp, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),

      Animated.sequence([
        Animated.delay(280),
        Animated.parallel([
          Animated.timing(uhLogoOp, { toValue: 1, duration: 420, useNativeDriver: true }),
          Animated.spring(uhLogoScale, { toValue: 1, tension: 45, friction: 7, useNativeDriver: true }),
        ]),
      ]),

      Animated.sequence([
        Animated.delay(420),
        Animated.parallel([
          Animated.timing(uhTitleOp, { toValue: 1, duration: 420, useNativeDriver: true }),
          Animated.timing(uhTitleY, { toValue: 0, duration: 420, useNativeDriver: true }),
        ]),
      ]),
    ]).start();

    const timer = setTimeout(() => navigation.replace('Onboarding'), 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[s.root, { opacity: containerOp }]}>
      <Image
        source={require('../../assets/background.png')}
        style={s.bgImage}
        resizeMode="cover"
      />
      <TopRightHalftone />
      <BottomLeftHalftone />

      <View style={s.brandBlock}>
        <Animated.View style={[s.iconWrap, { opacity: iconOp, transform: [{ scale: iconScale }] }]}>
          <Image source={require('../../assets/logo.png')} style={s.icon} resizeMode="contain" />
        </Animated.View>

        <Animated.View
          style={[s.wordmarkWrap, { opacity: wordmarkOp, transform: [{ translateY: wordmarkY }] }]}
        >
          <Text style={s.wordmark}>
            <Text style={s.wordmarkDiet}>Diet </Text>
            <Text style={s.wordmarkTemple}>Temple</Text>
          </Text>
        </Animated.View>

        <Animated.View style={[s.presenteRow, { opacity: presenteOp }]}>
          <TaperedGoldLine width={36} />
          <Text style={s.presenteText}>PRÉSENTE</Text>
          <TaperedGoldLine width={36} />
        </Animated.View>

        <Animated.View
          style={[s.uhLogoWrap, { opacity: uhLogoOp, transform: [{ scale: uhLogoScale }] }]}
        >
          <Image source={require('../../assets/logo-uh.png')} style={s.uhLogo} resizeMode="contain" />
        </Animated.View>
      </View>

      <Animated.View
        style={[s.uhSection, { opacity: uhTitleOp, transform: [{ translateY: uhTitleY }] }]}
      >
        <LuminousGoldBeam width={width * 0.82} />
        <View style={s.uhTitleInner}>
          <Text style={s.uhTitleText}>UH – ULTIMATE HUMAN</Text>
        </View>
        <LuminousGoldBeam width={width * 0.82} />
      </Animated.View>
    </Animated.View>
  );
}

const serifFont = Platform.OS === 'ios' ? 'Georgia' : 'serif';

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  bgImage: {
    position: 'absolute',
    top: -height * 0.14,
    left: 0,
    right: 0,
    width: width,
    height: height * 1.25,
  },
  halftoneTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  halftoneBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  brandBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  iconLightStreak: {
    width: 70,
    height: 1.5,
    backgroundColor: 'rgba(212, 175, 55, 0.5)',
    borderRadius: 999,
    marginTop: -2,
    shadowColor: GOLD,
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  wordmarkWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 10,
  },
  wordmark: {
    fontSize: 22.5,
    fontFamily: serifFont,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  wordmarkDiet: {
    color: '#EDE3C2',
    fontWeight: '600',
  },
  wordmarkTemple: {
    color: '#B8FF00',
    fontWeight: '600',
    textShadowColor: 'rgba(184, 255, 0, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  presenteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  presenteText: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 4.5,
    color: 'rgba(218, 185, 110, 0.82)',
    textTransform: 'uppercase',
  },
  uhLogoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 2,
  },
  uhLogoHalo: {
    position: 'absolute',
    width: UH_LOGO_SIZE * 1.45,
    height: UH_LOGO_SIZE * 1.45,
    borderRadius: UH_LOGO_SIZE,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
  },
  uhLogo: {
    width: UH_LOGO_SIZE,
    height: UH_LOGO_SIZE,
  },
  uhSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  uhTitleInner: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uhTitleText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.0,
    color: BRAND_YELLOW,
    fontFamily: serifFont,
    textAlign: 'center',
    textShadowColor: 'rgba(212, 175, 55, 0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
});

