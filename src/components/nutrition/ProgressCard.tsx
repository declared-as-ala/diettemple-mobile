import React, { memo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { nutritionColors } from '../../constants/nutritionColors';
import { MacroBars } from './MacroBars';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING_SIZE = 146;
const RING_STROKE = 12;
const R = (RING_SIZE - RING_STROKE) / 2;
const CIRC = 2 * Math.PI * R;

interface ProgressCardProps {
  consumedCal: number;
  targetCal: number;
  consumedProtein: number;
  consumedCarbs: number;
  consumedFat: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}

function ProgressCardComponent({
  consumedCal,
  targetCal,
  consumedProtein,
  consumedCarbs,
  consumedFat,
  targetProtein,
  targetCarbs,
  targetFat,
}: ProgressCardProps) {
  const pct = targetCal > 0 ? Math.min(1, consumedCal / targetCal) : 0;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(ringAnim, {
        toValue: pct,
        duration: 850,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [pct, ringAnim, fadeIn]);

  const strokeDashoffset = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRC, 0],
  });
  const remaining = Math.max(targetCal - consumedCal, 0);

  return (
    <Animated.View style={[styles.card, { opacity: fadeIn }]}>
      <LinearGradient
        colors={['rgba(212,175,55,0.11)', 'rgba(212,175,55,0.04)', 'rgba(255,255,255,0.01)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.top}>
        <View style={styles.ringWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={R}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={RING_STROKE}
              fill="none"
            />
            <AnimatedCircle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={R}
              stroke={nutritionColors.gold}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={CIRC}
              strokeDashoffset={strokeDashoffset as any}
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={styles.kcalMain}>{Math.round(consumedCal)}</Text>
            <Text style={styles.kcalUnit}>kcal</Text>
          </View>
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Objectif journalier</Text>
          <Text style={styles.summaryTarget}>{Math.round(targetCal)} kcal</Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{Math.round(pct * 100)}%</Text>
          </View>
          <Text style={styles.remaining}>
            Restantes: <Text style={styles.remainingStrong}>{Math.round(remaining)} kcal</Text>
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <MacroBars
        consumedProtein={consumedProtein}
        consumedCarbs={consumedCarbs}
        consumedFat={consumedFat}
        targetProtein={targetProtein}
        targetCarbs={targetCarbs}
        targetFat={targetFat}
      />
    </Animated.View>
  );
}

export const ProgressCard = memo(ProgressCardComponent);

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: '#131416',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 8,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  kcalMain: {
    fontSize: 30,
    fontWeight: '900',
    color: nutritionColors.text,
    letterSpacing: -1,
    lineHeight: 34,
  },
  kcalUnit: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  summary: {
    flex: 1,
    gap: 6,
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600',
  },
  summaryTarget: {
    fontSize: 20,
    color: nutritionColors.text,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212,175,55,0.16)',
    borderColor: 'rgba(212,175,55,0.35)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillText: {
    color: nutritionColors.gold,
    fontWeight: '800',
    fontSize: 12,
  },
  remaining: {
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  remainingStrong: {
    color: nutritionColors.text,
    fontWeight: '800',
  },
  divider: {
    marginVertical: 16,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});

