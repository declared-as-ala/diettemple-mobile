import { BRAND_YELLOW } from '../constants/brand';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, Animated, Easing, Image, Platform,
  StyleSheet, Text, useWindowDimensions, View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const PALETTE = {
  background: '#000000',
  gold: BRAND_YELLOW,
  champagne: '#E8D5A0',
  white: '#F6F4EE',
  muted: '#A6A39A',
  track: '#25251F',
  hairline: '#2E291C',
};

interface Props {
  progress: number;
  label?: string;
  done?: boolean;
  onFinish?: () => void;
}

export default function LuxurySplash({
  progress,
  label = 'Préparation de votre espace',
  done = false,
  onFinish,
}: Props) {
  const { width } = useWindowDimensions();
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
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { opacity: entrance },
          ]}
        >
          <Image
            source={require('../../assets/splash.png')}
            resizeMode="contain"
            fadeDuration={0}
            style={s.splashImage}
          />
        </Animated.View>

        <SafeAreaView style={s.safeArea} edges={['bottom']}>
          <View style={[s.footer, { width: trackWidth }]}>
            <View
              style={s.loader}
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={label}
              accessibilityValue={{ min: 0, max: 100, now: pct }}
            >
              <View style={s.progressRow}>
                <Text style={s.label}>{label}</Text>
                <Text style={s.percentage}>{pct}<Text style={s.percentSign}> %</Text></Text>
              </View>
              <View style={s.track}>
                <Animated.View
                  style={[
                    s.fill,
                    {
                      transform: [
                        {
                          translateX: progressValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-trackWidth, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.background },
  splashImage: { width: '100%', height: '100%' },
  safeArea: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 24 },
  footer: { alignItems: 'center', flexShrink: 0 },
  loader: { width: '100%' },
  progressRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  label: { color: PALETTE.muted, fontSize: 12, lineHeight: 18, flex: 1 },
  percentage: { color: PALETTE.champagne, fontSize: 16, fontWeight: '500', fontVariant: ['tabular-nums'] },
  percentSign: { color: PALETTE.muted, fontSize: 11 },
  track: { width: '100%', height: 3, borderRadius: 3, backgroundColor: PALETTE.track, overflow: 'hidden' },
  fill: { width: '100%', height: '100%', borderRadius: 3, backgroundColor: PALETTE.champagne },
});
