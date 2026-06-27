import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import type { WeekDayStatus, WeekPlanDay } from '../../services/meService';
import { getLocalDateKey } from '../../utils/date';
import { getWorkoutStatusForDate } from '../../hooks/useTodayWorkout';

const GOLD = '#D4AF37';
const SCREEN_W = Dimensions.get('window').width;
// 16px horizontal padding on each side from scrollContent + 14px card padding
const STRIP_H_PAD = 14;
const CELL_GAP = 6;
const CELL_W = Math.floor((SCREEN_W - 32 - STRIP_H_PAD * 2 - CELL_GAP * 6) / 7);

const FR_DAY_1 = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];   // Sun=0
const FR_DAY_3 = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];

interface Props {
  dates: Date[];
  planDays?: WeekPlanDay[] | null;
  localCompleted?: Record<string, boolean>;
  selectedDate: Date | null;
  onSelectDay: (date: Date) => void;
}

function findPlanDayForDate(date: Date, planDays?: WeekPlanDay[] | null): WeekPlanDay | undefined {
  if (!planDays?.length) return undefined;
  const key = getLocalDateKey(date);
  return planDays.find((pd) => (pd.dateKey ?? pd.date) === key);
}

const STATUS_DOT: Record<WeekDayStatus, { color: string; char: string }> = {
  completed: { color: '#4ADE80', char: '✓' },
  pending:   { color: GOLD,      char: '●' },
  missed:    { color: '#F87171', char: '!' },
  rest:      { color: 'rgba(255,255,255,0.18)', char: '·' },
  rattrapage:{ color: '#FB923C', char: '↺' },
};

export default function WeekCalendarStrip({ dates, planDays, localCompleted, selectedDate, onSelectDay }: Props) {
  const todayKey = getLocalDateKey(new Date());

  const items = useMemo(() => dates.map((d) => {
    const planDay = findPlanDayForDate(d, planDays);
    const dateKey = getLocalDateKey(d);
    const localDone = !!localCompleted?.[dateKey];
    const status = getWorkoutStatusForDate({ dateKey, todayKey, planDay, localCompleted: localDone });
    return {
      date: d,
      dateKey,
      letter: FR_DAY_1[d.getDay()],
      abbr: FR_DAY_3[d.getDay()],
      dayNum: d.getDate(),
      status,
      isToday: dateKey === todayKey,
      isFuture: dateKey > todayKey,
    };
  }), [dates, planDays, localCompleted, todayKey]);

  return (
    <View style={styles.row}>
      {items.map((it) => {
        const selected = !!selectedDate && getLocalDateKey(selectedDate) === it.dateKey;
        const dot = STATUS_DOT[it.status];
        const isRest = it.status === 'rest';

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
            {/* Weekday letter */}
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
    width: CELL_W,
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
    shadowRadius: 8,
    elevation: 6,
  },
  letter: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
  },
  letterSelected: { color: '#000' },
  letterToday:   { color: GOLD },
  num: {
    fontSize: 17,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
  },
  numSelected: { color: '#000' },
  numToday:    { color: '#fff' },
  dotWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dotWrapSelected: { backgroundColor: 'rgba(0,0,0,0.15)' },
  dotWrapToday: { backgroundColor: 'rgba(212,175,55,0.15)' },
  dotWrapRest: { backgroundColor: 'transparent' },
  dotChar: {
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 13,
  },
});
