import React, { memo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { nutritionColors } from '../../constants/nutritionColors';

interface ActionButtonsProps {
  onScanPress: () => void;
  onRecipePress: () => void;
  scanDisabled?: boolean;
}

function ActionButtonsComponent({
  onScanPress,
  onRecipePress,
  scanDisabled,
}: ActionButtonsProps) {
  const pressAnim = useRef(new Animated.Value(1)).current;
  const onPressIn = () => {
    Animated.timing(pressAnim, { toValue: 0.97, duration: 110, useNativeDriver: true }).start();
  };
  const onPressOut = () => {
    Animated.timing(pressAnim, { toValue: 1, duration: 110, useNativeDriver: true }).start();
  };

  return (
    <View style={styles.row}>
      <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
        <Pressable
          onPress={onScanPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={scanDisabled}
          style={({ pressed }) => [styles.mainBtn, scanDisabled && styles.disabled, pressed && { opacity: 0.92 }]}
        >
          <LinearGradient
            colors={scanDisabled ? ['#1F2124', '#1F2124'] : ['#E4C25A', '#D4AF37', '#C39A2D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mainBtnInner}
          >
            <Ionicons name="scan" size={20} color={scanDisabled ? '#666' : '#111'} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.mainTitle, scanDisabled && styles.disabledText]}>Scanner un repas</Text>
              <Text style={[styles.mainSub, scanDisabled && styles.disabledSub]}>
                {scanDisabled ? "Disponible aujourd'hui seulement" : 'Ajouter avec IA en quelques secondes'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={scanDisabled ? '#666' : '#111'} />
          </LinearGradient>
        </Pressable>
      </Animated.View>

      <Pressable onPress={onRecipePress} style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.88 }]}>
        <Ionicons name="book-outline" size={18} color={nutritionColors.gold} />
        <Text style={styles.secondaryText}>Ajouter depuis recettes</Text>
      </Pressable>
    </View>
  );
}

export const ActionButtons = memo(ActionButtonsComponent);

const styles = StyleSheet.create({
  row: {
    gap: 10,
  },
  mainBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  mainBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  mainTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111',
  },
  mainSub: {
    fontSize: 11,
    color: 'rgba(0,0,0,0.6)',
    marginTop: 2,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.7,
  },
  disabledText: {
    color: '#555',
  },
  disabledSub: {
    color: '#666',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.32)',
    backgroundColor: 'rgba(212,175,55,0.08)',
    paddingVertical: 13,
  },
  secondaryText: {
    color: nutritionColors.gold,
    fontSize: 14,
    fontWeight: '700',
  },
});

