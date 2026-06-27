import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  type ImageSourcePropType,
} from 'react-native';

const ACCENT = '#D4AF37';
const BANNER_BG = '#0a0f0a';
const CHIP_BG = 'rgba(0, 255, 0, 0.12)';

export type PremiumBannerState = 'guest' | 'logged_in_not_subscribed' | 'subscribed';

interface PremiumBannerProps {
  state: PremiumBannerState;
  levelName?: string | null;
  levelImageSource?: ImageSourcePropType | null;
  onPress: () => void;
}

const CHIPS = [
  'Plan d\'entraînement',
  'Plan nutrition',
  'IA calories repas',
];

function getCtaLabel(state: PremiumBannerState): string {
  switch (state) {
    case 'guest':
      return 'Découvrir UH';
    case 'logged_in_not_subscribed':
      return 'Voir l\'abonnement';
    case 'subscribed':
      return 'Ouvrir UH';
    default:
      return 'Découvrir UH';
  }
}

export default function PremiumBanner({
  state,
  levelName,
  levelImageSource,
  onPress,
}: PremiumBannerProps) {
  const ctaLabel = getCtaLabel(state);
  const isSubscribed = state === 'subscribed';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`UH Premium Coaching. ${ctaLabel}`}
    >
      <View style={styles.inner}>
        <Image
          source={require('../../../assets/uh-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>UH Premium Coaching</Text>
            {isSubscribed && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Actif</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitle}>Programme + nutrition + outils IA</Text>
          <View style={styles.chips}>
            {CHIPS.map((label) => (
              <View key={label} style={styles.chip}>
                <Text style={styles.chipText} numberOfLines={1}>{label}</Text>
              </View>
            ))}
          </View>
          {isSubscribed && (levelName || levelImageSource) && (
            <View style={styles.levelRow}>
              {levelImageSource && (
                <Image source={levelImageSource} style={styles.levelImage} resizeMode="contain" />
              )}
              {levelName && (
                <Text style={styles.levelText}>Niveau : {levelName}</Text>
              )}
            </View>
          )}
          <TouchableOpacity
            style={styles.cta}
            onPress={(e) => {
              e.stopPropagation();
              onPress();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: BANNER_BG,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 0, 0.25)',
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  logo: {
    width: 56,
    height: 56,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  activeBadge: {
    backgroundColor: CHIP_BG,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: ACCENT,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  chip: {
    backgroundColor: CHIP_BG,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: '48%',
  },
  chipText: {
    fontSize: 11,
    color: ACCENT,
    fontWeight: '500',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  levelImage: {
    width: 28,
    height: 28,
  },
  levelText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  cta: {
    alignSelf: 'flex-start',
    backgroundColor: ACCENT,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
});
