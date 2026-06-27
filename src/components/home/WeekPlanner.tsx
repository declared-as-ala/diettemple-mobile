import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import type { DayProgressStatus } from '../../services/workoutProgressStorage';
import { getLocalDateKey, formatWeekday } from '../../utils/date';

const ACCENT = '#D4AF37';
const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export interface WeekDayInfo {
  date: Date;
  dayIndex: number;
  isRest: boolean;
  sessionTitle?: string;
  sessionTemplateId?: string;
  status: DayProgressStatus;
  isRattrapage?: boolean;
}

export interface WeekPlannerProps {
  weekNumber: number;
  weekDates: Date[];
  dayInfo: WeekDayInfo[];
  selectedDate: Date | null;
  onSelectDay: (date: Date) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  /** Optional date range under "Week N" e.g. "Feb 10 – Feb 16" */
  weekRangeLabel?: string;
  /** When set, show "Today" button to jump to the week containing today */
  onJumpToToday?: () => void;
}

function isToday(d: Date): boolean {
  return getLocalDateKey(d) === getLocalDateKey(new Date());
}

export default function WeekPlanner({
  weekNumber,
  weekDates,
  dayInfo,
  selectedDate,
  onSelectDay,
  onPrevWeek,
  onNextWeek,
  weekRangeLabel,
  onJumpToToday,
}: WeekPlannerProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrapper}>
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={onPrevWeek}
          style={[styles.arrowBtn, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.centerBlock}>
          <Text style={[styles.weekTitle, { color: colors.text }]}>Semaine {weekNumber}</Text>
          {weekRangeLabel ? (
            <Text style={[styles.weekRangeLabel, { color: colors.textSecondary }]}>{weekRangeLabel}</Text>
          ) : null}
          {weekDates.length === 7 && weekDates.some((d) => getLocalDateKey(d) === getLocalDateKey(new Date())) && !onJumpToToday && (
            <View style={[styles.todayPill, { backgroundColor: ACCENT }]}>
              <Text style={styles.todayPillText}>Today</Text>
            </View>
          )}
          {onJumpToToday && (
            <TouchableOpacity style={[styles.todayPill, { backgroundColor: ACCENT }]} onPress={onJumpToToday} activeOpacity={0.85}>
              <Text style={styles.todayPillText}>Today</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={onNextWeek}
          style={[styles.arrowBtn, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.daysRow}>
        {weekDates.map((d, i) => {
          const info = dayInfo[i];
          const isTodayDate = isToday(d);
          const selected = selectedDate && getLocalDateKey(selectedDate) === getLocalDateKey(d);
          const isRest = info?.isRest ?? true;
          const status = info?.status ?? 'none';

          return (
            <TouchableOpacity
              key={getLocalDateKey(d)}
              style={[
                styles.dayCard,
                { backgroundColor: colors.cardBackground, borderColor: colors.border },
                isTodayDate && styles.dayCardToday,
                isTodayDate && { borderColor: ACCENT, backgroundColor: 'rgba(212,175,55,0.2)' },
                selected && !isTodayDate && { borderColor: ACCENT, borderWidth: 2 },
              ]}
              onPress={() => onSelectDay(d)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.dayLabel,
                  { color: isTodayDate ? ACCENT : colors.textSecondary },
                ]}
              >
                {formatWeekday(d)}
              </Text>
              <Text
                style={[
                  styles.dayNum,
                  { color: isTodayDate ? '#fff' : colors.text },
                ]}
              >
                {d.getDate()}
              </Text>
              {isRest && (
                <Text style={[styles.restLabel, { color: colors.textSecondary }]}>Repos</Text>
              )}
              <View style={styles.dotWrap}>
                <View
                  style={[
                    styles.dot,
                    status === 'none' && { backgroundColor: colors.border },
                    status === 'started' && { backgroundColor: '#EAB308' },
                    status === 'completed' && { backgroundColor: ACCENT },
                  ]}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  arrowBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerBlock: {
    alignItems: 'center',
  },
  weekTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  weekRangeLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  todayPill: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  todayPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayCard: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  dayCardToday: {
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dayNum: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  restLabel: {
    fontSize: 9,
    marginTop: 4,
    fontWeight: '600',
  },
  dotWrap: {
    marginTop: 8,
    height: 6,
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
