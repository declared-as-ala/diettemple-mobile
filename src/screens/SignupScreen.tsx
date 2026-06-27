import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Image,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../types';

type Nav = StackNavigationProp<RootStackParamList, 'Signup'>;

const { width: SW, height: SH } = Dimensions.get('window');
const GOLD = '#D4AF37';
const GAP = 10;
const PAD = 16;
const CARD_W = (SW - PAD * 2 - GAP) / 2;
const CARD_H = SH * 0.52;

export default function SignupScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const titleAnim = useRef(new Animated.Value(0)).current;
  const cardsAnim = useRef(new Animated.Value(0)).current;
  const hommeGlowAnim = useRef(new Animated.Value(0)).current;
  const femmeGlowAnim = useRef(new Animated.Value(0)).current;
  const hommeScale = useRef(new Animated.Value(1)).current;
  const femmeScale = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    React.useCallback(() => {
      Animated.timing(titleAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      Animated.timing(cardsAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      const createGlowLoop = (anim: Animated.Value) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ).start();
      };
      createGlowLoop(hommeGlowAnim);
      createGlowLoop(femmeGlowAnim);
    }, [titleAnim, cardsAnim, hommeGlowAnim, femmeGlowAnim])
  );

  const handlePressHomme = () => {
    Animated.sequence([
      Animated.timing(hommeScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(hommeScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.navigate('GenderVideo', { gender: 'homme' });
    });
  };

  const handlePressFemme = () => {
    Animated.sequence([
      Animated.timing(femmeScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(femmeScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.navigate('GenderVideo', { gender: 'femme' });
    });
  };

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require('../../assets/login.jpg')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.85)', 'rgba(4,3,0,0.95)', 'rgba(0,0,0,0.99)']}
          style={StyleSheet.absoluteFillObject}
        />
      </ImageBackground>

      <View style={[styles.topBar, { paddingTop: Math.max(14, insets.top + 4) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Image source={require('../../assets/logo-uh.png')} style={styles.topLogo} resizeMode="contain" />
        <View style={{ width: 38 }} />
      </View>

      <Animated.View
        style={[
          styles.heroText,
          {
            opacity: titleAnim,
            transform: [
              {
                translateY: titleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.eyebrow}>— Choisissez votre parcours</Text>
        <Text style={styles.title}>Bienvenue{'\n'}dans le Temple.</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.cardsRow,
          { marginBottom: insets.bottom + 20 },
          {
            opacity: cardsAnim,
            transform: [
              {
                translateY: cardsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [40, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* HOMME */}
        <Animated.View style={[styles.card, { transform: [{ scale: hommeScale }] }]}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.cardTouchable}
            onPress={handlePressHomme}
          >
            <ImageBackground
              source={require('../../assets/photo-1605490855119-94921710a47f.avif')}
              style={styles.cardBg}
              resizeMode="cover"
            >
              <LinearGradient
                colors={['rgba(0,0,0,0.30)', 'transparent', 'rgba(0,0,0,0.88)']}
                locations={[0, 0.4, 1]}
                style={StyleSheet.absoluteFillObject}
              />

              {/* Glow effect */}
              <Animated.View
                style={[
                  styles.cardGlow,
                  {
                    opacity: hommeGlowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 0.6],
                    }),
                  },
                ]}
              />

              <View style={styles.cardBorder} pointerEvents="none" />

              <View style={styles.cardSymbolWrap}>
                <Text style={styles.cardSymbol}>♂</Text>
              </View>

              <View style={styles.cardPlayWrap}>
                <Animated.View
                  style={[
                    styles.cardPlay,
                    {
                      transform: [
                        {
                          scale: hommeGlowAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Ionicons name="play" size={16} color="#fff" />
                </Animated.View>
              </View>

              <View style={styles.cardBottom}>
                <Text style={styles.cardLabel}>HOMME</Text>
                <Text style={styles.cardSub}>Force · Muscle</Text>
                <LinearGradient
                  colors={[GOLD, '#b8922a']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.cardCta}
                >
                  <Text style={styles.cardCtaText}>Commencer</Text>
                  <Ionicons name="arrow-forward" size={10} color="#000" />
                </LinearGradient>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        </Animated.View>

        {/* FEMME */}
        <Animated.View style={[styles.card, { transform: [{ scale: femmeScale }] }]}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.cardTouchable}
            onPress={handlePressFemme}
          >
            <ImageBackground
              source={require('../../assets/photo-1734630341082-0fec0e10126c.avif')}
              style={styles.cardBg}
              resizeMode="cover"
            >
              <LinearGradient
                colors={['rgba(0,0,0,0.30)', 'transparent', 'rgba(0,0,0,0.88)']}
                locations={[0, 0.4, 1]}
                style={StyleSheet.absoluteFillObject}
              />

              {/* Glow effect */}
              <Animated.View
                style={[
                  styles.cardGlow,
                  {
                    opacity: femmeGlowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 0.6],
                    }),
                  },
                ]}
              />

              <View style={styles.cardBorder} pointerEvents="none" />

              <View style={styles.cardSymbolWrap}>
                <Text style={styles.cardSymbol}>♀</Text>
              </View>

              <View style={styles.cardPlayWrap}>
                <Animated.View
                  style={[
                    styles.cardPlay,
                    {
                      transform: [
                        {
                          scale: femmeGlowAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Ionicons name="play" size={16} color="#fff" />
                </Animated.View>
              </View>

              <View style={styles.cardBottom}>
                <Text style={styles.cardLabel}>FEMME</Text>
                <Text style={styles.cardSub}>Galbe · Vitalité</Text>
                <LinearGradient
                  colors={[GOLD, '#b8922a']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.cardCta}
                >
                  <Text style={styles.cardCtaText}>Commencer</Text>
                  <Ionicons name="arrow-forward" size={10} color="#000" />
                </LinearGradient>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      <View style={[styles.hint, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.hintText}>Protocole scientifique · Dr en pharmacie · 10 ans d'expérience</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAD,
    paddingBottom: 6,
  },
  backBtn: { padding: 4, width: 38 },
  topLogo: { width: 44, height: 44 },

  heroText: {
    paddingHorizontal: PAD,
    paddingBottom: 18,
  },
  eyebrow: {
    color: GOLD,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 35,
    letterSpacing: 0.2,
  },

  cardsRow: {
    flexDirection: 'row',
    paddingHorizontal: PAD,
    gap: GAP,
    flex: 1,
  },

  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardTouchable: {
    flex: 1,
  },
  cardBg: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    backgroundColor: GOLD,
  },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.35)',
  },

  cardSymbolWrap: {
    paddingTop: 14,
    paddingHorizontal: 14,
  },
  cardSymbol: {
    fontSize: 28,
    color: GOLD,
    fontWeight: '700',
  },

  cardPlayWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  cardPlay: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardBottom: {
    paddingHorizontal: 12,
    paddingBottom: 14,
    gap: 2,
  },
  cardLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  cardSub: {
    color: 'rgba(255,221,127,0.80)',
    fontSize: 9.5,
    marginBottom: 8,
  },
  cardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  cardCtaText: {
    color: '#000',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.2,
  },

  hint: {
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: PAD,
  },
  hintText: {
    color: 'rgba(255,255,255,0.30)',
    fontSize: 10,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
