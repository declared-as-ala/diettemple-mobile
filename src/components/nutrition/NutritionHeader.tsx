import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DateSegmentChips, type DateOption } from './DateSegmentChips';
import { nutritionColors } from '../../constants/nutritionColors';

interface NutritionHeaderProps {
  selectedDateKey: string;
  titleDateLabel: string;
  options: DateOption[];
  onSelectDate: (key: string) => void;
}

function NutritionHeaderComponent({
  selectedDateKey,
  titleDateLabel,
  options,
  onSelectDate,
}: NutritionHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.title}>Nutrition</Text>
          <Text style={styles.subtitle}>{titleDateLabel}</Text>
        </View>
      </View>
      <DateSegmentChips options={options} selectedKey={selectedDateKey} onSelect={onSelectDate} />
    </View>
  );
}

export const NutritionHeader = memo(NutritionHeaderComponent);

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: nutritionColors.text,
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
  },
});

