import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const GOLD = '#D4AF37';

interface ActionButtonsProps {
  onScanPress: () => void;
  onRecipePress: () => void;
  scanDisabled?: boolean;
}

/** Two-button row: scan a meal + add from recipe */
export function MealActionButtons({ onScanPress, onRecipePress, scanDisabled }: ActionButtonsProps) {
  return (
    <View style={styles.row}>
      {/* Scan button — gold fill */}
      <TouchableOpacity
        style={[styles.btn, scanDisabled && styles.btnDisabled]}
        onPress={onScanPress}
        disabled={scanDisabled}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={scanDisabled ? ['#222', '#222'] : ['#D4AF37', '#C19B28']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.btnGradient}
        >
          <Ionicons name="camera" size={22} color={scanDisabled ? '#555' : '#000'} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.btnTitle, scanDisabled && styles.btnTitleDisabled]}>
              Scanner un repas
            </Text>
            <Text style={[styles.btnSub, scanDisabled && styles.btnSubDisabled]}>
              {scanDisabled ? "Uniquement pour aujourd'hui" : 'Analyse IA en 2 secondes'}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Recipe button — outline */}
      <TouchableOpacity
        style={styles.btn}
        onPress={onRecipePress}
        activeOpacity={0.85}
      >
        <View style={styles.btnOutline}>
          <Ionicons name="book-outline" size={22} color={GOLD} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.btnTitle}>Depuis recettes</Text>
            <Text style={styles.btnSub}>Ajouter un plat favori</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

/** Legacy single-card — kept for backwards compat */
interface ScanMealCtaCardProps {
  onPress: () => void;
  subtitle?: string;
  disabled?: boolean;
}

export function ScanMealCtaCard({ onPress, subtitle, disabled }: ScanMealCtaCardProps) {
  return (
    <TouchableOpacity
      style={[legacyStyles.card, disabled && legacyStyles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.88}
    >
      <Ionicons name="camera-outline" size={24} color={disabled ? '#555' : '#000'} />
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text style={[legacyStyles.title, disabled && { color: '#555' }]}>
          Scanner mon repas (IA)
        </Text>
        {subtitle ? (
          <Text style={[legacyStyles.sub, disabled && { color: '#444' }]}>{subtitle}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={disabled ? '#444' : '#000'} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 10,
    marginBottom: 14,
  },
  btn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  btnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(212,175,55,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
    borderRadius: 16,
  },
  btnTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.1,
  },
  btnTitleDisabled: { color: '#555' },
  btnSub: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.6)',
    fontWeight: '500',
    marginTop: 1,
  },
  btnSubDisabled: { color: '#444' },
  btnDisabled: { opacity: 0.6 },
});

const legacyStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4AF37',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  disabled: { opacity: 0.6, backgroundColor: '#222' },
  title: { fontSize: 15, fontWeight: '800', color: '#000' },
  sub: { fontSize: 12, color: 'rgba(0,0,0,0.6)', marginTop: 2 },
});
