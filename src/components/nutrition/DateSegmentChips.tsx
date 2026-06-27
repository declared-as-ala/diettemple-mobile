import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const GOLD = '#D4AF37';

export interface DateOption {
  key: string;
  label: string;
}

interface DateSegmentChipsProps {
  options: DateOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
}

export function DateSegmentChips({ options, selectedKey, onSelect }: DateSegmentChipsProps) {
  return (
    <View style={styles.container}>
      {options.map((opt) => {
        const active = selectedKey === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(opt.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  chipActive: {
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderColor: 'rgba(212,175,55,0.5)',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
  },
  chipTextActive: {
    color: GOLD,
    fontWeight: '700',
  },
});
