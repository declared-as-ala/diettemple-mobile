import { BRAND_YELLOW } from '../../constants/brand';
import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  onScanPress: () => void;
  onRecipePress: () => void;
  scanDisabled?: boolean;
}

export const ActionButtons = memo(function ActionButtons({
  onScanPress,
  onRecipePress,
  scanDisabled,
}: Props) {
  return (
    <View style={{ gap: 12 }}>
      <Pressable
        onPress={onScanPress}
        disabled={scanDisabled}
        accessibilityRole="button"
        accessibilityLabel="Scanner un repas"
        accessibilityState={{ disabled: !!scanDisabled }}
        style={({ pressed }) => [
          s.main,
          scanDisabled && { backgroundColor: '#222', opacity: 0.6 },
          pressed && { opacity: 0.85 },
        ]}
      >
        <View style={s.icon}>
          <Ionicons name="scan-outline" size={24} color={scanDisabled ? '#888' : '#000000'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, scanDisabled && { color: '#888' }]}>Scanner un repas</Text>
          <Text style={[s.subtitle, scanDisabled && { color: '#666' }]}>
            {scanDisabled ? 'Sélectionnez aujourd’hui pour scanner' : 'Enregistrez votre repas en photo'}
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color={scanDisabled ? '#888' : '#000000'} />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Explorer les recettes"
        onPress={onRecipePress}
        style={({ pressed }) => [s.secondary, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name="book-outline" size={22} color={BRAND_YELLOW} />
        <View style={{ flex: 1 }}>
          <Text style={s.secondaryTitle}>Trouver l’inspiration</Text>
          <Text style={s.secondaryCaption}>Explorer les recettes</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={BRAND_YELLOW} />
      </Pressable>
    </View>
  );
});

const s = StyleSheet.create({
  main: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: BRAND_YELLOW,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 84,
  },
  icon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(0,0,0,0.7)',
    marginTop: 4,
    fontWeight: '500',
  },
  secondary: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#151518',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 80,
  },
  secondaryTitle: {
    fontSize: 15,
    color: '#F3F4F6',
    fontWeight: '700',
  },
  secondaryCaption: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    fontWeight: '500',
  },
});
