import { BRAND_YELLOW } from '../constants/brand';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, Animated, Easing, Image, Platform, ScrollView,
  StyleSheet, Text, useWindowDimensions, View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Defs, Line, RadialGradient, Rect, Stop } from 'react-native-svg';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const PALETTE = {
  background: '#000000', gold: BRAND_YELLOW, champagne: '#E8D5A0',
  white: '#F6F4EE', muted: '#A6A39A', track: '#25251F', hairline: '#2E291C',
};

interface Props {
  progress: number;
  label?: string;
  done?: boolean;
  onFinish?: () => void;
}

/** Static vector atmosphere stays crisp without image downloads at startup. */
function Atmosphere() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox="0 0 400 850" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <RadialGradient id="splashAtmosphere" cx="50%" cy="37%" rx="65%" ry="48%">
            <Stop offset="0" stopColor="#514322" stopOpacity="0.25" />
            <Stop offset="0.65" stopColor="#211C10" stopOpacity="0.13" />
            <Stop offset="1" stopColor={PALETTE.background} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="400" height="850" fill="url(#splashAtmosphere)" />
        <Circle cx="200" cy="324" r="246" stroke={PALETTE.gold} strokeOpacity="0.07" fill="none" />
        <Circle cx="200" cy="324" r="302" stroke={PALETTE.gold} strokeOpacity="0.04" fill="none" />
        <Line x1="28" y1="0" x2="28" y2="850" stroke={PALETTE.gold} strokeOpacity="0.06" />
        <Line x1="372" y1="0" x2="372" y2="850" stroke={PALETTE.gold} strokeOpacity="0.06" />
      </Svg>
    </View>
  );
}

export default function LuxurySplash({
  progress, label = 'Préparation de votre espace', done = false, onFinish,
}: Props) {
  const { width, height, fontScale } = useWindowDimensions();
  const compact = height < 700 || width > height || fontScale > 1.3;
  const dietTempleSize = compact ? 128 : Math.min(180, width * 0.48);
  const sealSize = compact ? 80 : 112;
  const titleSize = Math.min(compact ? 22 : 28, width * 0.075);
  const trackWidth = Math.max(100, Math.min(280, width - 80));
  const pct = Number.isFinite(progress) ? Math.max(0, Math.min(100, Math.round(progress))) : 0;
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const entrance = useRef(new Animated.Value(1)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const progressValue = useRef(new Animated.Value(pct / 100)).current;
  const onFinishRef = useRef(onFinish);
  const hasFinished = useRef(false);
  onFinishRef.current = onFinish;

  useEffect(() => {
    let mounted = true;
    let preferenceChanged = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      preferenceChanged = true;
      setReduceMotion(enabled);
    });
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted && !preferenceChanged) setReduceMotion(enabled);
    }).catch(() => {
      if (mounted && !preferenceChanged) setReduceMotion(true);
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion !== false) {
      entrance.setValue(1);
      return;
    }
    entrance.setValue(0);
    const animation = Animated.timing(entrance, {
      toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [entrance, reduceMotion]);

  useEffect(() => {
    // Browsers require a user gesture for audio; native startup keeps the sound.
    if (Platform.OS === 'web') return;
    let mounted = true;
    let player: ReturnType<typeof createAudioPlayer> | undefined;
    (async () => {
      try {
        await setAudioModeAsync({ playsInSilentMode: false, shouldPlayInBackground: false });
        if (!mounted) return;
        player = createAudioPlayer(require('../../assets/spalsh.mp3'));
        player.volume = 0.45;
        player.play();
      } catch {
        // Audio is optional; it must never delay startup.
      }
    })();
    return () => {
      mounted = false;
      player?.remove();
    };
  }, []);

  useEffect(() => {
    const animation = Animated.timing(progressValue, {
      toValue: pct / 100, duration: reduceMotion === false ? 240 : 0, useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [pct, progressValue, reduceMotion]);

  useEffect(() => {
    if (!done || hasFinished.current) return;
    const animation = Animated.timing(exitOpacity, {
      toValue: 0, duration: reduceMotion === false ? 220 : 0, useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !hasFinished.current) {
        hasFinished.current = true;
        onFinishRef.current?.();
      }
    });
    return () => animation.stop();
  }, [done, exitOpacity, reduceMotion]);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics} style={s.root}>
      <StatusBar style="light" />
      <Animated.View style={[s.root, { opacity: exitOpacity }]}>
        <Atmosphere />
        <SafeAreaView style={s.rootClear}>
          <ScrollView contentContainerStyle={[s.content, compact && s.contentCompact]} showsVerticalScrollIndicator={false} bounces={false}>
            <View style={s.header} accessible accessibilityLabel="DietTemple présente Ultimate Human">
              <View style={[s.dietTempleLogo, { width: dietTempleSize, height: dietTempleSize }]}>
                <Image
                  source={require('../../assets/logo.png')}
                  resizeMode="contain"
                  fadeDuration={0}
                  accessible={false}
                  style={{ width: dietTempleSize * 2, height: dietTempleSize * 4 / 3 }}
                />
              </View>
              <View style={s.brandRow}>
                <Text style={s.brand} maxFontSizeMultiplier={1.2}>DIET<Text style={s.brandLight}>TEMPLE</Text></Text>
              </View>
              <Text style={s.presents}>P R É S E N T E</Text>
            </View>

            <Animated.View style={[
              s.hero, compact && s.heroCompact,
              { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] },
            ]}>
              <View style={[s.seal, { width: sealSize, height: sealSize }]} accessible accessibilityRole="image" accessibilityLabel="Emblème Ultimate Human">
                <View style={s.sealInner} />
                {/* Frame the existing crest whitespace without changing the supplied artwork. */}
                <View style={[s.crestCrop, { width: sealSize - 24, height: sealSize - 24 }]}>
                  <Image source={require('../../assets/logo-uh.png')} resizeMode="contain" fadeDuration={0} accessible={false}
                    style={{ width: (sealSize - 24) * 1.9, height: (sealSize - 24) * 1.9 * 2 / 3 }} />
                </View>
                <View style={s.sealTopMarker} />
                <View style={s.sealBottomMarker} />
              </View>

              <View style={[s.titleBlock, compact && s.titleBlockCompact]} accessible accessibilityRole="header" accessibilityLabel="Ultimate Human. La meilleure version de vous-même.">
                <Text maxFontSizeMultiplier={1.15} style={[s.title, { fontSize: titleSize, lineHeight: titleSize * 1.13 }]}>ULTIMATE</Text>
                <Text maxFontSizeMultiplier={1.15} style={[s.title, s.titleGold, { fontSize: titleSize, lineHeight: titleSize * 1.13 }]}>HUMAN</Text>
                <View style={[s.titleRule, compact && s.titleRuleCompact]} />
                <Text style={s.tagline}>La meilleure version{'\n'}de vous-même.</Text>
              </View>
            </Animated.View>

            <View style={[s.footer, { width: trackWidth }]}>
              <View style={s.loader} accessible accessibilityRole="progressbar" accessibilityLabel={label}
                accessibilityValue={{ min: 0, max: 100, now: pct }}>
                <View style={s.progressRow}>
                  <Text style={s.label}>{label}</Text>
                  <Text style={s.percentage}>{pct}<Text style={s.percentSign}> %</Text></Text>
                </View>
                <View style={s.track}>
                  <Animated.View style={[s.fill, {
                    // Translation keeps the leading edge anchored on both native platforms.
                    transform: [{ translateX: progressValue.interpolate({ inputRange: [0, 1], outputRange: [-trackWidth, 0] }) }],
                  }]} />
                </View>
              </View>
              <Text style={[s.signature, compact && s.signatureCompact]}>DISCIPLINE  ·  FORCE  ·  ÉQUILIBRE</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.background },
  rootClear: { flex: 1 },
  content: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 32, paddingTop: 32, paddingBottom: 28 },
  contentCompact: { paddingTop: 20, paddingBottom: 20 },
  header: { alignItems: 'center', flexShrink: 0 },
  dietTempleLogo: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 10 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brand: { color: PALETTE.white, fontSize: 19, fontWeight: '800', letterSpacing: 2.1 },
  brandLight: { fontWeight: '300' },
  presents: { color: PALETTE.muted, fontSize: 10, marginTop: 13 },
  hero: { flexGrow: 1, flexShrink: 0, width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 36 },
  heroCompact: { paddingVertical: 12 },
  seal: { alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: PALETTE.hairline, backgroundColor: PALETTE.background },
  sealInner: { ...StyleSheet.absoluteFillObject, margin: 7, borderRadius: 999, borderWidth: 1, borderColor: '#19170F' },
  crestCrop: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 999 },
  sealTopMarker: { position: 'absolute', top: -2, width: 22, height: 3, borderRadius: 3, backgroundColor: PALETTE.champagne },
  sealBottomMarker: { position: 'absolute', bottom: -2, width: 4, height: 4, borderRadius: 2, backgroundColor: PALETTE.gold },
  titleBlock: { alignItems: 'center', marginTop: 32, width: '100%' },
  titleBlockCompact: { marginTop: 16 },
  title: { color: PALETTE.white, fontWeight: '800', letterSpacing: 3, textAlign: 'center' },
  titleGold: { color: PALETTE.champagne, letterSpacing: 7 },
  titleRule: { width: 28, height: 1, backgroundColor: PALETTE.gold, marginTop: 22, marginBottom: 16 },
  titleRuleCompact: { marginTop: 12, marginBottom: 12 },
  tagline: { color: PALETTE.muted, fontSize: 15, lineHeight: 23, letterSpacing: 0.3, textAlign: 'center' },
  footer: { alignItems: 'center', flexShrink: 0 },
  loader: { width: '100%' },
  progressRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  label: { color: PALETTE.muted, fontSize: 12, lineHeight: 18, flex: 1 },
  percentage: { color: PALETTE.champagne, fontSize: 16, fontWeight: '500', fontVariant: ['tabular-nums'] },
  percentSign: { color: PALETTE.muted, fontSize: 11 },
  track: { width: '100%', height: 3, borderRadius: 3, backgroundColor: PALETTE.track, overflow: 'hidden' },
  fill: { width: '100%', height: '100%', borderRadius: 3, backgroundColor: PALETTE.champagne },
  signature: { color: PALETTE.muted, fontSize: 9, lineHeight: 16, letterSpacing: 1.5, textAlign: 'center', marginTop: 28 },
  signatureCompact: { marginTop: 16 },
});
