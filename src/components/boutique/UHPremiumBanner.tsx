import React from 'react';
import {
  View,
  StyleSheet,
  Image,
  ImageBackground,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const HORIZONTAL_MARGIN = 12;
const BANNER_WIDTH = width - HORIZONTAL_MARGIN * 2;
const BANNER_HEIGHT = Math.round(BANNER_WIDTH / 1.3);
const BORDER_RADIUS = 20;
const UH_BANNER_BACKGROUND = require('../../../assets/background.png');

interface UHPremiumBannerProps {
  onPress: () => void;
}

export default function UHPremiumBanner({ onPress }: UHPremiumBannerProps) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 60,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 60,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <TouchableOpacity
        style={styles.bannerTouchable}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.95}
      >
        <ImageBackground
          source={UH_BANNER_BACKGROUND}
          style={styles.surface}
          imageStyle={styles.backgroundImage}
          resizeMode="cover"
        >
          {/* Premium dark overlay */}
          <LinearGradient
            colors={['rgba(0,0,0,0.58)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.65)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Gold border accent */}
          <View style={styles.border} pointerEvents="none" />

          {/* Corner accents */}
          <View style={[styles.corner, styles.cornerTL]} pointerEvents="none" />
          <View style={[styles.corner, styles.cornerBR]} pointerEvents="none" />

          <View style={styles.container}>
            {/* Logo section — optimized for mobile */}
            <View style={styles.logoSection}>
              <Image
                source={require('../../../assets/logo-uh.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Content section */}
            <View style={styles.contentSection}>
              <Text style={styles.mainTitle}>Deviens ta Version Ultime</Text>

              <Text style={styles.mainDesc}>
                Un protocole scientifique + suivi personnalisé. Transformation physique garantie.
              </Text>

              {/* Benefits list */}
              <View style={styles.benefitsContainer}>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitBullet}>✦</Text>
                  <Text style={styles.benefitText}>Guidé pas à pas</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitBullet}>✦</Text>
                  <Text style={styles.benefitText}>Suivi personnalisé</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitBullet}>✦</Text>
                  <Text style={styles.benefitText}>Progression mesurable</Text>
                </View>
              </View>

              {/* CTA Button */}
              <LinearGradient
                colors={['#f2d36f', '#d4af37', '#ba9125']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cta}
              >
                <Text style={styles.ctaText}>DÉCOUVRIR</Text>
              </LinearGradient>
            </View>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: HORIZONTAL_MARGIN,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: BORDER_RADIUS,
    overflow: 'hidden',
    width: BANNER_WIDTH,
    alignSelf: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  bannerTouchable: {
    borderRadius: BORDER_RADIUS,
    overflow: 'hidden',
  },
  surface: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: BORDER_RADIUS,
    backgroundColor: '#080604',
  },
  backgroundImage: {
    borderRadius: BORDER_RADIUS,
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BORDER_RADIUS,
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.45)',
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: 'rgba(212,175,55,0.6)',
  },
  cornerTL: {
    top: 12,
    left: 12,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
  },
  cornerBR: {
    bottom: 12,
    right: 12,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  logoSection: {
    width: BANNER_WIDTH * 0.38,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
    maxWidth: BANNER_WIDTH * 0.38,
  },
  contentSection: {
    flex: 1,
    justifyContent: 'center',
  },
  mainTitle: {
    color: '#F4DB8A',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 20,
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  mainDesc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    marginBottom: 10,
  },
  benefitsContainer: {
    gap: 4,
    marginBottom: 10,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  benefitBullet: {
    color: 'rgba(255,221,127,0.95)',
    fontSize: 12,
    fontWeight: '700',
  },
  benefitText: {
    color: 'rgba(255,221,127,0.9)',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  cta: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  ctaText: {
    color: '#1a1200',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
