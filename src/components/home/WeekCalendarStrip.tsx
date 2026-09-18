import { BRAND_YELLOW } from '../../constants/brand';
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { WeekPlanDay } from '../../services/meService';
import { getLocalDateKey } from '../../utils/date';
import { getWorkoutDayState, type DayState } from '../../utils/workoutSchedule';

const GOLD = BRAND_YELLOW;
const STRIP_H_PAD = 14;
const CELL_GAP = 6;

const FR_DAY_1 = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];   // Sun=0
const FR_DAY_3 = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];

interface Props {
  dates: Date[];
  planDays?: WeekPlanDay[] | null;
  localCompleted?: Record<string, boolean>;
  selectedDate: Date | null;
  onSelectDay: (date: Date) => void;
  programWeek?: number;
  currentProgramWeek?: number;
}

function findPlanDayForDate(date: Date, planDays?: WeekPlanDay[] | null): WeekPlanDay | undefined {
  if (!planDays?.length) return undefined;
  const key = getLocalDateKey(date);
  return planDays.find((pd) => (pd.dateKey ?? pd.date) === key);
}

const STATUS_DOT: Record<DayState, { color: string; char: string }> = {
  completed:  { color: '#4ADE80', char: '✓' },
  today:      { color: GOLD,      char: '●' },
  future:     { color: 'rgba(255,255,255,0.4)', char: '○' },
  scheduled:  { color: 'rgba(255,255,255,0.4)', char: '○' },
  missed:     { color: '#F87171', char: '!' },
  rest:       { color: 'rgba(255,255,255,0.18)', char: '·' },
  rattrapage: { color: '#FB923C', char: '↺' },
};

export default function WeekCalendarStrip({
  dates,
  planDays,
  localCompleted,
  selectedDate,
  onSelectDay,
  programWeek,
  currentProgramWeek,
}: Props) {
  const todayKey = getLocalDateKey(new Date());

  const items = useMemo(() => dates.map((d) => {
    const planDay = findPlanDayForDate(d, planDays);
    const dateKey = getLocalDateKey(d);
    const localDone = !!localCompleted?.[dateKey];
    const firstSession = planDay?.sessions?.[0];
    const hasAnySession = (planDay?.sessions?.length ?? 0) > 0;

    const dayState = getWorkoutDayState({
      dateKey,
      todayDateKey: todayKey,
      sessionTemplateId: firstSession?.sessionTemplateId ?? null,
      isRestDay: planDay ? !hasAnySession : false,
      isCompleted: localDone || planDay?.status === 'completed',
      backendStatus: planDay?.status,
      isRattrapageEligible: planDay?.status === 'rattrapage',
      programWeek,
      currentProgramWeek,
    });

    return {
      date: d,
      dateKey,
      letter: FR_DAY_1[d.getDay()],
      abbr: FR_DAY_3[d.getDay()],
      dayNum: d.getDate(),
      dayState,
      isToday: dateKey === todayKey,
      isFuture: dateKey > todayKey,
    };
  }), [dates, planDays, localCompleted, todayKey, programWeek, currentProgramWeek]);

  return (
    <View style={styles.row}>
      {items.map((it) => {
        const selected = !!selectedDate && getLocalDateKey(selectedDate) === it.dateKey;
        const dot = STATUS_DOT[it.dayState] ?? STATUS_DOT.future;
        const isRest = it.dayState === 'rest';

        return (
          <TouchableOpacity
            key={it.dateKey}
            activeOpacity={0.75}
            onPress={() => onSelectDay(it.date)}
            style={[
              styles.cell,
              it.isToday && !selected && styles.cellToday,
              selected && styles.cellSelected,
            ]}
          >
            {/* Weekday abbreviation */}
            <Text style={[
              styles.letter,
              selected && styles.letterSelected,
              it.isToday && !selected && styles.letterToday,
            ]}>
              {it.abbr}
            </Text>

            {/* Day number */}
            <Text style={[
              styles.num,
              selected && styles.numSelected,
              it.isToday && !selected && styles.numToday,
            ]}>
              {it.dayNum}
            </Text>

            {/* Status indicator */}
            <View style={[
              styles.dotWrap,
              selected && styles.dotWrapSelected,
              it.isToday && !selected && styles.dotWrapToday,
              isRest && styles.dotWrapRest,
            ]}>
              <Text style={[styles.dotChar, { color: selected ? '#000' : dot.color }, isRest && { opacity: 0.4 }]}>
                {dot.char}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: STRIP_H_PAD,
    paddingVertical: 10,
    gap: CELL_GAP,
  },
  cell: {
    flex: 1,
    minWidth: 40,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 4,
  },
  cellToday: {
    borderColor: 'rgba(212,175,55,0.5)',
    backgroundColor: 'rgba(212,175,55,0.07)',
  },
  cellSelected: {
    backgroundColor: GOLD,
    borderColor: GOLD,
    shadowColor: GOLD,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
  },
  letter: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.4,
  },
  letterToday: {
    color: GOLD,
    fontWeight: '800',
  },
  letterSelected: {
    color: '#000',
    fontWeight: '800',
  },
  num: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  numToday: {
    color: GOLD,
    fontWeight: '900',
  },
  numSelected: {
    color: '#000',
    fontWeight: '900',
  },
  dotWrap: {
    width: 20,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotWrapToday: {
    // subtle styling for today's dot container
  },
  dotWrapSelected: {
    // dot container when day cell is selected
  },
  dotWrapRest: {
    opacity: 0.5,
  },
  dotChar: {
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
  },
});
