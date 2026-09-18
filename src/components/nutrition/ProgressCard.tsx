import { BRAND_YELLOW } from '../../constants/brand';
import React, { memo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { MacroBars } from './MacroBars';

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

function ProgressCardComponent(props: ProgressCardProps) {
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 360 || fontScale > 1.3;
  const pct = props.targetCal > 0 ? Math.min(1, Math.max(0, props.consumedCal / props.targetCal)) : 0;
  const circumference = 2 * Math.PI * 59;

  return (
    <View style={s.card}>
      <View style={s.heading}>
        <View style={s.dot} />
        <Text style={s.eyebrow}>VOTRE BILAN DU JOUR</Text>
      </View>
      <View style={[s.top, compact && { flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Énergie consommée</Text>
          <Text style={s.calories}>
            {Math.round(props.consumedCal)}
            <Text style={s.unit}> kcal</Text>
          </Text>
          <Text style={s.target}>
            {props.targetCal > 0 ? `Objectif : ${Math.round(props.targetCal)} kcal` : 'Objectif non renseigné'}
          </Text>
          <View style={s.pill}>
            <Text style={s.pillText}>
              {props.targetCal > 0
                ? `${Math.round(Math.max(0, props.targetCal - props.consumedCal))} kcal restantes`
                : 'Suivez vos apports du jour'}
            </Text>
          </View>
        </View>
        <View
          style={{ width: 136, height: 136, alignSelf: 'center' }}
          accessible
          accessibilityLabel={
            props.targetCal > 0
              ? `${Math.round(pct * 100)} pour cent de votre objectif calorique`
              : 'Objectif non renseigné'
          }
        >
          <Svg width={136} height={136}>
            <Circle cx={68} cy={68} r={59} stroke="rgba(255,255,255,0.07)" strokeWidth={10} fill="none" />
            <Circle
              cx={68}
              cy={68}
              r={59}
              stroke={BRAND_YELLOW}
              strokeWidth={10}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct)}
              transform="rotate(-90 68 68)"
            />
          </Svg>
          <View style={s.ringText}>
            <Text style={s.percent}>{props.targetCal > 0 ? `${Math.round(pct * 100)}%` : '—'}</Text>
            <Text style={s.label}>de l’objectif</Text>
          </View>
        </View>
      </View>
      <View style={s.divider} />
      <MacroBars {...props} />
    </View>
  );
}

export const ProgressCard = memo(ProgressCardComponent);

const s = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#151518',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND_YELLOW,
  },
  eyebrow: {
    color: BRAND_YELLOW,
    fontSize: 10,
    letterSpacing: 1.6,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  label: {
    color: '#9CA3AF',
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '500',
  },
  calories: {
    color: '#F3F4F6',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 6,
  },
  unit: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0,
    color: '#9CA3AF',
  },
  target: {
    color: '#9CA3AF',
    fontSize: 11,
    lineHeight: 18,
    marginTop: 4,
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.28)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 14,
  },
  pillText: {
    color: BRAND_YELLOW,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },
  ringText: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percent: {
    fontSize: 28,
    color: BRAND_YELLOW,
    fontWeight: '800',
    marginBottom: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 20,
  },
});
