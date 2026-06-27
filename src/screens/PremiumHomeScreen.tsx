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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../store/authStore';
import { getLevelImageSource, getLevelDisplayName, type LevelKey } from '../utils/levelAssets';

type NavProp = StackNavigationProp<RootStackParamList, 'PremiumHome'>;

const ACCENT = '#D4AF37';
const CARD_BG = '#0f1410';

const QUICK_ACTIONS = [
  { id: 'plan', label: 'Mon Plan (5 semaines)', icon: 'calendar-outline' as const, screen: 'WeekPlan' as const, params: {} },
  { id: 'session', label: 'Séance du jour', icon: 'barbell-outline' as const, screen: 'Home' as const, params: {} },
  { id: 'nutrition', label: 'Plan Nutrition', icon: 'nutrition-outline' as const, screen: 'Home' as const, params: {} },
  { id: 'scan', label: 'Scanner un repas (IA)', icon: 'camera-outline' as const, screen: 'Home' as const, params: {} },
  { id: 'gallery', label: 'Galerie progression (avant/après)', icon: 'images-outline' as const, screen: 'Gallery' as const, params: {} },
];

export default function PremiumHomeScreen() {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuthStore();
  const level = (user?.level ?? 'Intiate') as LevelKey;
  const levelImage = getLevelImageSource(level);
  const levelName = getLevelDisplayName(level);

  const handleAction = (screen: keyof RootStackParamList, params: object) => {
    navigation.navigate(screen as any, params);
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Espace UH</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>Actif</Text>
        </View>

        <View style={styles.levelCard}>
          <Text style={styles.levelCardTitle}>Ton niveau</Text>
          <View style={styles.levelRow}>
            {levelImage && (
              <Image source={levelImage} style={styles.levelImage} resizeMode="contain" />
            )}
            <Text style={styles.levelName}>{levelName}</Text>
          </View>
        </View>

        <Text style={styles.actionsLabel}>Accès rapide</Text>
        <View style={styles.actions}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={styles.actionCard}
              onPress={() => handleAction(a.screen, a.params)}
              activeOpacity={0.85}
            >
              <Ionicons name={a.icon} size={24} color={ACCENT} />
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  placeholder: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  activeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212,175,55,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 20,
  },
  activeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT,
  },
  levelCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  levelCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 10,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelImage: {
    width: 56,
    height: 56,
  },
  levelName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  actionsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
  },
  actions: {
    gap: 10,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
    gap: 14,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  bottomSpacer: {
    height: 40,
  },
});
