import React, { useRef } from 'react';
import {
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
  StyleProp,
  ViewStyle,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

const BULLET_POINTS = [
  'Alliance science & terrain',
  'Nutrition durable & vivable',
  'Instructions simples et précises',
  'Diagnostic sur mesure',
];

export default function UHPremiumBanner({ onPress, style }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 45,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 45,
    }).start();
  };

  return (
    <Animated.View style={[s.wrapper, { transform: [{ scale: scaleAnim }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={s.pressable}
        accessible
        accessibilityRole="button"
        accessibilityLabel="The Ultimate Human : Path. Fini l'improvisation. Découvrir UH"
      >
        <ImageBackground
          source={require('../../../assets/background.png')}
          style={s.surface}
          imageStyle={s.bgImage}
          resizeMode="cover"
        >
          {/* Deep Dark Velvet Gradient Overlay */}
          <LinearGradient
            colors={['rgba(7, 6, 4, 0.72)', 'rgba(12, 10, 6, 0.88)', 'rgba(5, 4, 3, 0.95)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Elegant Gold Perimeter Border + Corner Brackets */}
          <View style={s.goldBorder} pointerEvents="none" />
          <View style={[s.corner, s.cornerTL]} pointerEvents="none" />
          <View style={[s.corner, s.cornerTR]} pointerEvents="none" />
          <View style={[s.corner, s.cornerBL]} pointerEvents="none" />
          <View style={[s.corner, s.cornerBR]} pointerEvents="none" />

          {/* Card Content Layout */}
          <View style={s.content}>
            {/* Top Row: Left Crest + Right Info */}
            <View style={s.topRow}>
              {/* Left UH Crest Logo */}
              <View style={s.crestCol}>
                <Image
                  source={require('../../../assets/logo-uh.png')}
                  style={s.crestImage}
                  resizeMode="contain"
                />
              </View>

              {/* Right Titles & Intro */}
              <View style={s.infoCol}>
                <Text style={s.subHeader}>The Ultimate Human : Path</Text>
                <Text style={s.mainTitle}>FINI L'IMPROVISATION</Text>
                <Text style={s.mainDesc}>
                  Le 1er système alliant la science et le terrain pour une transformation physique mesurable et durable.
                </Text>

                {/* Concise Bullet Points List */}
                <View style={s.benefitsList}>
                  {BULLET_POINTS.map((text, idx) => (
                    <View key={idx} style={s.benefitRow}>
                      <Ionicons name="checkmark" size={15} color="#7FE024" style={s.checkIcon} />
                      <Text style={s.benefitText}>{text}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Bottom Luxury Gold CTA Button */}
            <View style={s.ctaWrapper}>
              <LinearGradient
                colors={['#FFEAA0', '#E5C058', '#C6992E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.ctaButton}
              >
                <Text style={s.ctaText}>DÉCOUVRIR UH</Text>
              </LinearGradient>
            </View>
          </View>
        </ImageBackground>
      </Pressable>
    </Animated.View>
  );
}

const serifFont = Platform.OS === 'ios' ? 'Georgia' : 'serif';

const s = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 16,
    elevation: 8,
    backgroundColor: '#060504',
  },
  pressable: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  surface: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#060504',
  },
  bgImage: {
    borderRadius: 20,
    opacity: 0.45,
  },
  goldBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(212, 175, 55, 0.45)',
  },
  corner: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: '#F3C958',
  },
  cornerTL: {
    top: 6,
    left: 6,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  cornerTR: {
    top: 6,
    right: 6,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  cornerBL: {
    bottom: 6,
    left: 6,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  cornerBR: {
    bottom: 6,
    right: 6,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
  },
  crestCol: {
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  crestImage: {
    width: 88,
    height: 98,
  },
  infoCol: {
    flex: 1,
  },
  subHeader: {
    color: '#EBD082',
    fontFamily: serifFont,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  mainTitle: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  mainDesc: {
    color: 'rgba(230, 230, 230, 0.85)',
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '400',
    marginBottom: 10,
  },
  benefitsList: {
    gap: 6,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  checkIcon: {
    marginTop: 1,
  },
  benefitText: {
    color: 'rgba(245, 245, 245, 0.92)',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  ctaWrapper: {
    width: '100%',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.42,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaButton: {
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.42)',
  },
  ctaText: {
    color: '#080602',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
  },
});


