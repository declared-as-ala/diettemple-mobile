import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../store/authStore';
import { useSubscription } from '../context/SubscriptionContext';

type NavProp = StackNavigationProp<RootStackParamList, 'UHPreview'>;

const ACCENT = '#D4AF37';
const ACCENT_DIM = 'rgba(212,175,55,0.12)';
const { width } = Dimensions.get('window');

const BENEFITS = [
  {
    icon: 'calendar-outline' as const,
    title: 'Plan 5 semaines personnalisé',
    desc: 'Programme entraînement sur-mesure selon ton niveau',
    color: '#3B82F6',
  },
  {
    icon: 'nutrition-outline' as const,
    title: 'Nutrition & suivi calories',
    desc: 'Objectifs caloriques, macros et scan IA des repas',
    color: '#10B981',
  },
  {
    icon: 'play-circle-outline' as const,
    title: 'Reels workouts vidéo',
    desc: 'Bibliothèque complète de séances guidées',
    color: '#8B5CF6',
  },
  {
    icon: 'pricetag-outline' as const,
    title: 'Prix UH sur la boutique',
    desc: 'Tarifs exclusifs réduits sur tous les produits sélectionnés',
    color: ACCENT,
  },
  {
    icon: 'camera-outline' as const,
    title: 'IA scan repas',
    desc: 'Identifie et log tes repas en une photo',
    color: '#F59E0B',
  },
];

const REVIEWS = [
  { text: '« Programme clair, résultats au rendez-vous. »', author: 'Karim B.' },
  { text: '« La partie nutrition m\'a vraiment aidé. »', author: 'Sarra M.' },
  { text: '« Les prix boutique UH valent à eux seuls l\'abonnement ! »', author: 'Yassine T.' },
];

export default function UHPreviewScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuthStore();
  const { subscriptionState } = useSubscription();
  const hasActiveSubscription = subscriptionState.isActive;

  const handleContinue = () => {
    if (!isAuthenticated) {
      navigation.navigate('Login', { redirectTo: 'PremiumHome' });
      return;
    }
    if (hasActiveSubscription) {
      navigation.navigate('PremiumHome');
      return;
    }
    navigation.navigate('Subscribe');
  };

  const handleJustShop = () => {
    navigation.navigate('Home');
  };

  return (
    <LinearGradient colors={['#0A0800', '#060503', '#000000']} style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        {/* Hero */}
        <View style={styles.hero}>
          <Image
            source={require('../../assets/logo-uh.png')}
            style={styles.heroLogo}
            resizeMode="contain"
          />
          <Text style={styles.heroTitle}>UH Premium</Text>
          <View style={styles.heroTaglineRow}>
            <View style={styles.heroLine} />
            <Text style={styles.heroTagline}>The Ultimate Human Path</Text>
            <View style={styles.heroLine} />
          </View>
          <Text style={styles.heroSub}>
            Atteins ton vrai potentiel avec un plan complet,{'\n'}des vidéos et des prix exclusifs boutique.
          </Text>
        </View>

        {/* Benefits */}
        <Text style={styles.sectionLabel}>Ce que tu obtiens</Text>
        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b.title} style={styles.benefitCard}>
              <View style={[styles.benefitIcon, { backgroundColor: b.color + '18', borderColor: b.color + '35' }]}>
                <Ionicons name={b.icon} size={22} color={b.color} />
              </View>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitDesc}>{b.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Shop savings highlight */}
        <LinearGradient
          colors={['rgba(212,175,55,0.15)', 'rgba(212,175,55,0.05)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.savingsCard}
        >
          <View style={styles.savingsHeader}>
            <Ionicons name="pricetag" size={20} color={ACCENT} />
            <Text style={styles.savingsTitle}>Prix exclusifs boutique</Text>
          </View>
          <Text style={styles.savingsDesc}>
            En tant qu'abonné UH, accède à des tarifs préférentiels sur une sélection de produits. Jusqu'à <Text style={styles.savingsPct}>-20%</Text> sur les protéines, créatines, BCAA et plus encore.
          </Text>
        </LinearGradient>

        {/* Social proof */}
        <Text style={styles.sectionLabel}>Ils ont rejoint UH</Text>
        <View style={styles.reviewsRow}>
          <View style={styles.countChip}>
            <Text style={styles.countNum}>+1000</Text>
            <Text style={styles.countLabel}>adhérents</Text>
          </View>
          {REVIEWS.map((r, i) => (
            <View key={i} style={styles.reviewCard}>
              <Ionicons name="star" size={11} color={ACCENT} />
              <Text style={styles.reviewText}>{r.text}</Text>
              <Text style={styles.reviewAuthor}>— {r.author}</Text>
            </View>
          ))}
        </View>

        {/* Pricing */}
        <View style={styles.pricingCard}>
          <Text style={styles.pricingTitle}>Formules disponibles</Text>
          <View style={styles.pricingRow}>
            <View style={styles.pricingOption}>
              <Text style={styles.pricingDuration}>Mensuel</Text>
              <Text style={styles.pricingDesc2}>Accès complet 1 mois</Text>
            </View>
            <View style={[styles.pricingOption, styles.pricingOptionPro]}>
              <View style={styles.pricingBestBadge}>
                <Text style={styles.pricingBestText}>Meilleur prix</Text>
              </View>
              <Text style={styles.pricingDuration}>3 mois</Text>
              <Text style={styles.pricingDesc2}>Économisez davantage</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky CTA footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(28, insets.bottom + 16) }]}>
        <TouchableOpacity style={styles.ctaPrimary} onPress={handleContinue} activeOpacity={0.88}>
          <LinearGradient
            colors={[ACCENT, '#B8962E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Ionicons name="flash" size={18} color="#000" />
            <Text style={styles.ctaPrimaryText}>
              {hasActiveSubscription ? 'Accéder à UH Premium' : isAuthenticated ? 'S\'abonner maintenant' : 'Commencer'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.ctaSecondary} onPress={handleJustShop} activeOpacity={0.8}>
          <Text style={styles.ctaSecondaryText}>Continuer sans abonnement</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  // ── Hero ──────────────────────────────────────────────────────────
  hero: { alignItems: 'center', marginBottom: 32 },
  heroLogo: { width: 100, height: 100, marginBottom: 14 },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
    marginBottom: 8,
  },
  heroTaglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    width: '100%',
  },
  heroLine: { flex: 1, height: 1, backgroundColor: 'rgba(212,175,55,0.3)' },
  heroTagline: { fontSize: 10, fontWeight: '700', color: ACCENT, letterSpacing: 1.5, textTransform: 'uppercase' },
  heroSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── Benefits ──────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  benefits: { gap: 10, marginBottom: 24 },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    gap: 14,
  },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: { flex: 1 },
  benefitTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  benefitDesc: { fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 17 },

  // ── Savings card ──────────────────────────────────────────────────
  savingsCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
    padding: 16,
    marginBottom: 28,
  },
  savingsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  savingsTitle: { fontSize: 15, fontWeight: '800', color: ACCENT },
  savingsDesc: { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 20 },
  savingsPct: { fontWeight: '800', color: ACCENT },

  // ── Reviews ───────────────────────────────────────────────────────
  reviewsRow: { gap: 8, marginBottom: 24 },
  countChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 4,
  },
  countNum: { fontSize: 28, fontWeight: '900', color: ACCENT },
  countLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  reviewCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    gap: 4,
  },
  reviewText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontStyle: 'italic' },
  reviewAuthor: { fontSize: 11, color: ACCENT, fontWeight: '600' },

  // ── Pricing ───────────────────────────────────────────────────────
  pricingCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    marginBottom: 8,
  },
  pricingTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 12 },
  pricingRow: { flexDirection: 'row', gap: 10 },
  pricingOption: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  pricingOptionPro: {
    borderColor: 'rgba(212,175,55,0.4)',
    backgroundColor: 'rgba(212,175,55,0.06)',
  },
  pricingBestBadge: {
    backgroundColor: ACCENT,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  pricingBestText: { fontSize: 9, fontWeight: '800', color: '#000' },
  pricingDuration: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 2 },
  pricingDesc2: { fontSize: 11, color: 'rgba(255,255,255,0.45)', textAlign: 'center' },

  // ── Footer ────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  ctaPrimary: { borderRadius: 14, overflow: 'hidden', marginBottom: 10 },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  ctaPrimaryText: { fontSize: 16, fontWeight: '800', color: '#000', letterSpacing: 0.3 },
  ctaSecondary: { alignItems: 'center', paddingVertical: 8 },
  ctaSecondaryText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
});
