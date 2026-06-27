import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const GOLD = '#D4AF37';

interface ShopHeroBannerProps {
  onPress: () => void;
}

export default function ShopHeroBanner({ onPress }: ShopHeroBannerProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.wrap}>
      <LinearGradient
        colors={['#1A1200', '#2A1D00', '#0A0800']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative rays */}
        <View style={styles.raysWrap} pointerEvents="none">
          {[0, 45, 90, 135].map((a) => (
            <View key={a} style={[styles.ray, { transform: [{ rotate: `${a}deg` }] }]} />
          ))}
        </View>

        {/* Main content */}
        <View style={styles.content}>
          <View style={styles.left}>
            <Text style={styles.title}>
              Boutique{'\n'}Suppléments
            </Text>
            <Text style={styles.subtitle}>Protéines · BCAA · Vitamines</Text>
            <View style={styles.cta}>
              <Text style={styles.ctaText}>Découvrir</Text>
              <Ionicons name="arrow-forward" size={14} color="#000" />
            </View>
          </View>
          <View style={styles.right}>
            <View style={styles.iconRing}>
              <Text style={styles.iconLarge}>🏋️</Text>
            </View>
            <View style={styles.iconRingSmall}>
              <Text style={styles.iconSmall}>💪</Text>
            </View>
          </View>
        </View>

        {/* Bottom stats */}
        <View style={styles.statsRow}>
          {statsData.map(({ icon, label }) => (
            <View key={label} style={styles.stat}>
              <Text style={styles.statIcon}>{icon}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const statsData = [
  { icon: '📦', label: 'Livraison rapide' },
  { icon: '✅', label: 'Qualité certifiée' },
  { icon: '💰', label: 'Meilleurs prix' },
];

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradient: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
  },

  // Decorative rays
  raysWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.05,
  },
  ray: {
    position: 'absolute',
    width: 500,
    height: 1,
    backgroundColor: GOLD,
  },

  // Content layout
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  left: { flex: 1 },
  right: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginLeft: 12,
  },

  // Title & subtitle
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 30,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600',
    marginBottom: 16,
  },

  // CTA button
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignSelf: 'flex-start',
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000',
  },

  // Icon rings
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(212,175,55,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRingSmall: {
    position: 'absolute',
    right: -8,
    bottom: -4,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212,175,55,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLarge: { fontSize: 42 },
  iconSmall: { fontSize: 22 },

  // Bottom stats row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    paddingTop: 14,
  },
  stat: { alignItems: 'center', gap: 4 },
  statIcon: { fontSize: 16 },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600',
  },
});
