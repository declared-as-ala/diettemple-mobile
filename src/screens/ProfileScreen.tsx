import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AppBackground from '../components/AppBackground';
import DrawerScreenContainer from '../components/DrawerScreenContainer';
import LogoutModal from '../components/LogoutModal';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { getSubscriptionState } from '../utils/subscriptionState';
import { RootStackParamList } from '../types';
import { profileService } from '../services/profileService';
import { resolveMediaUrl } from '../config/api.config';
import { rootNavigationRef } from '../navigation/rootNavigationRef';
import { useDrawerOpen } from '../navigation/DrawerOpenContext';
import { getLevelImageSource, getLevelDisplayName } from '../utils/levelAssets';
import type { LevelKey } from '../utils/levelAssets';
import { clearAllAppStorage } from '../utils/clearStorage';
import { useSnackbar } from '../components/Snackbar';

type ProfileScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<any, 'Profile'>,
  StackNavigationProp<RootStackParamList>
>;

const GOLD = '#D4AF37';
const SURFACE = '#131313';
const SURFACE_2 = '#1C1C1C';

// ── Menu row helper ─────────────────────────────────────────────────────────

interface MenuRowProps {
  icon: string;
  iconLib?: 'ionicons' | 'material';
  label: string;
  onPress: () => void;
  locked?: boolean;
  danger?: boolean;
  last?: boolean;
}

function MenuRow({ icon, iconLib = 'ionicons', label, onPress, locked, danger, last }: MenuRowProps) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, !last && styles.menuRowBorder]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.menuIconWrap, danger && styles.menuIconWrapDanger]}>
        {iconLib === 'material'
          ? <MaterialIcons name={icon as any} size={18} color={danger ? '#EF5350' : GOLD} />
          : <Ionicons name={icon as any} size={18} color={danger ? '#EF5350' : GOLD} />
        }
      </View>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      {locked && <Ionicons name="lock-closed" size={13} color="rgba(255,255,255,0.3)" style={{ marginRight: 4 }} />}
      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
    </TouchableOpacity>
  );
}

// ── Stat pill ────────────────────────────────────────────────────────────────

interface StatPillProps {
  label: string;
  value: string;
  unit?: string;
  onPress: () => void;
}

function StatPill({ label, value, unit, onPress }: StatPillProps) {
  return (
    <TouchableOpacity style={styles.statPill} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.statValue}>{value || '—'}{unit && value ? <Text style={styles.statUnit}>{unit}</Text> : null}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { token, user, logout } = useAuthStore();
  const { profile, updateProfile, loadProfile, syncWithBackend } = useProfileStore();
  const { showSnackbar } = useSnackbar();
  const subscription = useSubscriptionStore((s) => s.subscription);
  const subscriptionState = getSubscriptionState(subscription);
  const refetchSubscription = useSubscriptionStore((s) => s.bootSubscription);
  const { openDrawer, isAvailable: isDrawerAvailable } = useDrawerOpen();

  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [imageKey, setImageKey] = useState(0);

  const level = (user?.level ?? '') as LevelKey | '';
  const levelDisplay = level ? getLevelDisplayName(level) : '—';
  const levelImage = getLevelImageSource(level || undefined);
  const getSexeLabel = (raw?: string) => {
    const v = String(raw || '').trim().toLowerCase();
    if (v === 'm' || v === 'homme') return 'Homme';
    if (v === 'f' || v === 'femme') return 'Femme';
    return '';
  };

  const isPremiumActive = subscriptionState.isActive;

  if (!token) {
    return (
      <AppBackground>
        <StatusBar style="light" />
        <View style={styles.centered}>
          <Text style={styles.loginMessage}>Vous devez être connecté</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login' as never)}>
            <Text style={styles.loginBtnText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </AppBackground>
    );
  }

  useEffect(() => {
    if (!token) return;
    const init = async () => {
      await loadProfile();
      try {
        await syncWithBackend();
      } catch {
        // ignore sync errors silently
      }
    };
    init();
  }, [token]);

  useFocusEffect(
    React.useCallback(() => {
      if (!useAuthStore.getState().token) return;
      useAuthStore.getState().refreshMe().catch(() => {});
      syncWithBackend().catch(() => {});
      refetchSubscription?.().catch(() => {});
    }, [syncWithBackend, refetchSubscription])
  );

  const handlePickImage = async () => {
    if (!useAuthStore.getState().token) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Accès aux photos nécessaire.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
        allowsMultipleSelection: false,
      });
      if (!result.canceled && result.assets[0]?.base64) {
        setUpdatingPhoto(true);
        try {
          await profileService.uploadImage(result.assets[0].base64);
          await syncWithBackend();
          setImageKey((k) => k + 1);
          showSnackbar({ message: 'Photo de profil mise à jour.', duration: 2000 });
        } catch (err: any) {
          showSnackbar({
            message: err.response?.data?.message || 'Impossible de mettre à jour la photo.',
            duration: 2800,
          });
        } finally {
          setUpdatingPhoto(false);
        }
      }
    } catch (err: any) {
      showSnackbar({
        message: err.message || 'Impossible d\'accéder aux photos.',
        duration: 2800,
      });
    }
  };

  const onRefresh = async () => {
    if (!useAuthStore.getState().token) return;
    setRefreshing(true);
    try {
      await syncWithBackend();
      await refetchSubscription?.();
    } finally {
      setRefreshing(false);
    }
  };

  const handleEditStat = (field: 'name' | 'age' | 'sexe' | 'poids' | 'taille') => {
    const currentValue = field === 'name' ? (profile.name || '') : (profile[field] || '');
    navigation.navigate('EditProfile', { field, currentValue });
  };

  const handleLogout = () => setShowLogoutModal(true);

  const handleClearStorage = () => {
    Alert.alert(
      'Effacer les données locales',
      'Toutes les données stockées sur cet appareil seront supprimées. Vous serez déconnecté. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: async () => {
            await clearAllAppStorage();
            await logout();
            if (rootNavigationRef.isReady()) {
              rootNavigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
            }
          },
        },
      ]
    );
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    if (rootNavigationRef.isReady()) {
      rootNavigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  };

  const displayName = profile.name || user?.email?.split('@')[0] || 'Profil';
  const avatarUri = resolveMediaUrl(user?.photoUri ?? null)
    ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1C1C1C&color=D4AF37&size=200&bold=true`;

  return (
    <AppBackground useSafeArea={false}>
      <DrawerScreenContainer
        title="Profil"
        backgroundColor="transparent"
        leftAction={!isDrawerAvailable ? <View style={{ width: 44, height: 44 }} /> : undefined}
      >
        <StatusBar style="light" />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} colors={[GOLD]} />
          }
        >

          {/* ── Hero card ────────────────────────────────────────────── */}
          <LinearGradient
            colors={['#1A1200', '#131313']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            {/* Avatar */}
            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={handlePickImage}
              disabled={updatingPhoto}
              activeOpacity={0.85}
            >
              <Image
                key={imageKey}
                source={{ uri: avatarUri }}
                style={styles.avatar}
              />
              <View style={[styles.avatarCameraBadge, updatingPhoto && { opacity: 0.5 }]}>
                <Ionicons name={updatingPhoto ? 'hourglass-outline' : 'camera'} size={14} color="#fff" />
              </View>
              {/* Gold ring */}
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <View style={styles.avatarRing} />
              </View>
            </TouchableOpacity>

            {/* Name */}
            <TouchableOpacity
              style={styles.nameRow}
              onPress={() => handleEditStat('name')}
              activeOpacity={0.8}
            >
              <Text style={styles.userName}>{displayName}</Text>
              <Ionicons name="create-outline" size={16} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>

            {/* Email */}
            <Text style={styles.userEmail}>{user?.email || user?.phone || ''}</Text>

            {/* Subscription badge */}
            {subscription && (
              <View style={[
                styles.subBadge,
                subscriptionState.isActive ? styles.subBadgeActive : styles.subBadgeExpired,
              ]}>
                <Ionicons
                  name={subscriptionState.isActive ? 'checkmark-circle' : 'close-circle'}
                  size={13}
                  color={subscriptionState.isActive ? GOLD : '#EF5350'}
                />
                <Text style={[styles.subBadgeText, { color: subscriptionState.isActive ? GOLD : '#EF5350' }]}>
                  {subscriptionState.labelFr}
                  {subscriptionState.isActive && subscriptionState.daysLeft != null
                    ? `  ·  ${subscriptionState.daysLeft}j restants`
                    : ''}
                </Text>
              </View>
            )}

            {/* Level */}
            {level && (
              <View style={styles.levelRow}>
                <Image source={levelImage} style={styles.levelImg} resizeMode="contain" />
                <Text style={styles.levelText}>{levelDisplay}</Text>
              </View>
            )}
          </LinearGradient>

          {/* ── Stats row ────────────────────────────────────────────── */}
          <View style={styles.statsRow}>
            <StatPill
              label="Poids"
              value={profile.poids ? String(profile.poids) : ''}
              unit="kg"
              onPress={() => handleEditStat('poids')}
            />
            <View style={styles.statDivider} />
            <StatPill
              label="Taille"
              value={profile.taille ? String(profile.taille) : ''}
              unit="cm"
              onPress={() => handleEditStat('taille')}
            />
            <View style={styles.statDivider} />
            <StatPill
              label="Âge"
              value={profile.age ? String(profile.age) : ''}
              onPress={() => handleEditStat('age')}
            />
            <View style={styles.statDivider} />
            <StatPill
              label="Sexe"
              value={getSexeLabel(profile.sexe)}
              onPress={() => handleEditStat('sexe')}
            />
          </View>

          {/* ── Modifier profil ──────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>MODIFIER PROFIL</Text>
          <View style={styles.menuCard}>
            <MenuRow icon="person-outline" label="Modifier le profil" onPress={() => handleEditStat('name')} />
            <MenuRow icon="lock-closed-outline" label="Changer le mot de passe" onPress={() => navigation.navigate('ChangePassword')} last />
          </View>

          {/* ── Mes achats ───────────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>MES ACHATS</Text>
          <View style={styles.menuCard}>
            <MenuRow icon="receipt-outline" label="Mes commandes" onPress={() => navigation.navigate('OrdersList')} last />
          </View>

          {/* ── Support ──────────────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>SUPPORT</Text>
          <View style={styles.menuCard}>
            <MenuRow icon="help-circle-outline" label="Aide & Contact" onPress={() => navigation.navigate('HelpSupport')} />
            <MenuRow icon="gavel" iconLib="material" label="Mentions légales" onPress={() => navigation.navigate('LegalNotices')} />
            <MenuRow icon="trash-outline" label="Effacer les données locales" onPress={handleClearStorage} danger last />
          </View>

          {/* ── Logout ───────────────────────────────────────────────── */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <Ionicons name="log-out-outline" size={20} color="#EF5350" />
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>

        <LogoutModal
          visible={showLogoutModal}
          onCancel={() => setShowLogoutModal(false)}
          onConfirm={handleConfirmLogout}
        />
      </DrawerScreenContainer>
    </AppBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  loginMessage: { fontSize: 16, color: '#fff', textAlign: 'center', marginBottom: 20 },
  loginBtn: { backgroundColor: GOLD, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14 },
  loginBtnText: { fontSize: 16, fontWeight: '800', color: '#000' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },

  // ── Hero card ──────────────────────────────────────────────────────────────
  heroCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.15)',
  },
  avatarWrap: {
    width: 96,
    height: 96,
    marginBottom: 14,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2.5,
    borderColor: GOLD,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    position: 'absolute',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0A0A0A',
    zIndex: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 4,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
  userEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 12,
    fontWeight: '400',
  },
  subBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
  },
  subBadgeActive: {
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderColor: 'rgba(212,175,55,0.3)',
  },
  subBadgeExpired: {
    backgroundColor: 'rgba(239,83,80,0.1)',
    borderColor: 'rgba(239,83,80,0.3)',
  },
  subBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  levelImg: { width: 24, height: 24 },
  levelText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '500',
  },

  // ── Stats row ──────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 20,
    overflow: 'hidden',
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
  statUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.45)',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    marginTop: 3,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginVertical: 12,
  },

  // ── Section label ──────────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 4,
  },

  // ── Menu card ──────────────────────────────────────────────────────────────
  menuCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
    marginBottom: 20,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(212,175,55,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconWrapDanger: {
    backgroundColor: 'rgba(239,83,80,0.1)',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#F2F2F2',
  },
  menuLabelDanger: {
    color: '#EF5350',
  },

  // ── Logout ────────────────────────────────────────────────────────────────
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,83,80,0.25)',
    backgroundColor: 'rgba(239,83,80,0.08)',
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF5350',
  },
});
