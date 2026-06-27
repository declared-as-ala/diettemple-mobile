import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Image,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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

      <View style={styles.heroText}>
        <Text style={styles.eyebrow}>— Choisissez votre parcours</Text>
        <Text style={styles.title}>Bienvenue{'\n'}dans le Temple.</Text>
      </View>

      <View style={[styles.cardsRow, { marginBottom: insets.bottom + 20 }]}>
        {/* HOMME */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.card, styles.cardHomme]}
          onPress={() => navigation.navigate('GenderVideo', { gender: 'homme' })}
        >
          <LinearGradient
            colors={['rgba(70,130,180,0.2)', 'rgba(70,130,180,0.05)']}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.cardBorder} pointerEvents="none" />

          <View style={styles.cardContent}>
            <MaterialCommunityIcons name="human-male" size={52} color={GOLD} />

            <Text style={styles.cardLabel}>HOMME</Text>
            <Text style={styles.cardSub}>Force · Muscle</Text>

            <LinearGradient
              colors={[GOLD, '#b8922a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cardCta}
            >
              <Text style={styles.cardCtaText}>Commencer</Text>
              <Ionicons name="arrow-forward" size={12} color="#000" />
            </LinearGradient>
          </View>
        </TouchableOpacity>

        {/* FEMME */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.card, styles.cardFemme]}
          onPress={() => navigation.navigate('GenderVideo', { gender: 'femme' })}
        >
          <LinearGradient
            colors={['rgba(219,112,147,0.2)', 'rgba(219,112,147,0.05)']}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.cardBorder} pointerEvents="none" />

          <View style={styles.cardContent}>
            <MaterialCommunityIcons name="human-female" size={52} color={GOLD} />

            <Text style={styles.cardLabel}>FEMME</Text>
            <Text style={styles.cardSub}>Galbe · Vitalité</Text>

            <LinearGradient
              colors={[GOLD, '#b8922a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cardCta}
            >
              <Text style={styles.cardCtaText}>Commencer</Text>
              <Ionicons name="arrow-forward" size={12} color="#000" />
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </View>

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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },

  cardHomme: {
    borderColor: 'rgba(70,130,180,0.4)',
  },

  cardFemme: {
    borderColor: 'rgba(219,112,147,0.4)',
  },

  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.35)',
  },

  cardContent: {
    alignItems: 'center',
    gap: 8,
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
    marginBottom: 4,
  },

  cardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 8,
  },

  cardCtaText: {
    color: '#000',
    fontSize: 11,
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
