import { BRAND_YELLOW } from '../../constants/brand';
import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DateSegmentChips, type DateOption } from './DateSegmentChips';

interface Props {
  selectedDateKey: string;
  titleDateLabel: string;
  options: DateOption[];
  onSelectDate: (key: string) => void;
}

export const NutritionHeader = memo(function NutritionHeader({
  selectedDateKey,
  titleDateLabel,
  options,
  onSelectDate,
}: Props) {
  return (
    <View style={s.wrap}>
      <View style={s.dateRow}>
        <Text style={s.date}>{titleDateLabel}</Text>
        <Text style={s.hint}>Journal alimentaire</Text>
      </View>
      <DateSegmentChips options={options} selectedKey={selectedDateKey} onSelect={onSelectDate} />
    </View>
  );
});

const s = StyleSheet.create({
  wrap: { marginBottom: 8 },
  dateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 12,
  },
  date: {
    fontSize: 14,
    color: '#F3F4F6',
    fontWeight: '700',
  },
  hint: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '500',
  },
});
