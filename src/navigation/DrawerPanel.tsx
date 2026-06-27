/**
 * Custom slide-in drawer panel with programmatic premium background.
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Pressable,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import { useSubscription } from '../context/SubscriptionContext';
import { useDrawerOpen } from './DrawerOpenContext';
import { useStackRef } from './StackRefContext';
import { rootNavigationRef } from './rootNavigationRef';
import type { HomeDrawerParamList } from './HomeDrawerStack';
import { getLevelDisplayName, getLevelImageSource } from '../utils/levelAssets';

const ACCENT = '#D4AF37';
const DRAWER_WIDTH = 280;
const TAB_BAR_GUARD_SPACE = 72;

const MENU_ITEMS: { name: keyof HomeDrawerParamList; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { name: 'Main',    label: 'Accueil',  icon: 'home-outline' },
  { name: 'Recipes', label: 'Recettes', icon: 'restaurant-outline' },
  { name: 'Gallery', label: 'Galerie',  icon: 'images-outline' },
];

// ── Programmatic sidebar background ──────────────────────────────────────────

function SidebarBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Base gradient */}
      <LinearGradient
        colors={['#0A0800', '#070604', '#020202']}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Top-left gold glow */}
      <Svg width={DRAWER_WIDTH} height={300} style={{ position: 'absolute', top: -20, left: -30 }}>
        <Defs>
          <RadialGradient id="g1" cx="40%" cy="40%" r="55%">
            <Stop offset="0%"   stopColor="#D4AF37" stopOpacity="0.22" />
            <Stop offset="60%"  stopColor="#A07820" stopOpacity="0.07" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx={100} cy={120} rx={150} ry={150} fill="url(#g1)" />
      </Svg>
      {/* Bottom-right glow */}
      <Svg width={DRAWER_WIDTH} height={260} style={{ position: 'absolute', bottom: 60, right: -50 }}>
        <Defs>
          <RadialGradient id="g2" cx="65%" cy="65%" r="50%">
            <Stop offset="0%"   stopColor="#B8902A" stopOpacity="0.14" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx={150} cy={130} rx={150} ry={130} fill="url(#g2)" />
      </Svg>
      {/* Decorative rings top-right */}
      <Svg width={160} height={160} style={{ position: 'absolute', top: -40, right: -40 }}>
        <Circle cx={80} cy={80} r={70} stroke="rgba(212,175,55,0.10)" strokeWidth={1.5} fill="none" />
        <Circle cx={80} cy={80} r={50} stroke="rgba(212,175,55,0.06)" strokeWidth={1}   fill="none" />
      </Svg>
      {/* Left gold vertical accent */}
      <LinearGradient
        colors={['rgba(212,175,55,0.0)', 'rgba(212,175,55,0.2)', 'rgba(212,175,55,0.0)']}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2 }}
      />
    </View>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DrawerPanel() {
  const insets = useSafeAreaInsets();
  const { isOpen, closeDrawer } = useDrawerOpen();
  const { getNavigation, getCurrentRouteName } = useStackRef();
  const { user, logout } = useAuthStore();
  const { profile } = useProfileStore();
  const { subscriptionState } = useSubscription();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // Top space: status bar height on Android, safe area on iOS
  const topSpace = Platform.OS === 'android'
    ? (StatusBar.currentHeight ?? 24) + 16
    : insets.top + 16;

  // Bottom space: keep logout clearly above bottom tab/navigation bars.
  const bottomSpace = Math.max(48 + TAB_BAR_GUARD_SPACE, insets.bottom + 24 + TAB_BAR_GUARD_SPACE);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: isOpen ? 0 : -DRAWER_WIDTH, duration: 260, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: isOpen ? 1 : 0, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [isOpen]);

  const displayName = profile?.name || user?.name || 'Membre';
  const tierLabel = getLevelDisplayName(user?.level);
  const levelImageSource = getLevelImageSource(user?.level);
  const badgeStyle =
    subscriptionState.isActive ? styles.badgeActive :
    subscriptionState.isExpiringSoon ? styles.badgeExpiring : styles.badgeExpired;
  const badgeLabel = subscriptionState.labelFr;
  const badgeSubtext =
    (subscriptionState.isActive || subscriptionState.isExpiringSoon) && subscriptionState.daysLeft >= 0
      ? `${subscriptionState.daysLeft} jour${subscriptionState.daysLeft !== 1 ? 's' : ''}`
      : '';
  const headerA11yLabel = `${displayName}, niveau ${tierLabel}, ${badgeLabel}${
    badgeSubtext ? `, ${badgeSubtext}` : ''
  }`;

  const onItemPress = (name: keyof HomeDrawerParamList) => {
    closeDrawer();
    const nav = getNavigation();
    if (nav) nav.navigate(name as any);
  };

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[styles.overlay, { opacity: overlayAnim }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
      </Animated.View>

      {/* Panel */}
      <Animated.View
        style={[styles.panel, { width: DRAWER_WIDTH, transform: [{ translateX: slideAnim }] }]}
      >
        <SidebarBackground />

        {/* ── Header (level medallion + identity + subscription) ─── */}
        <View
          style={[styles.header, { paddingTop: topSpace }]}
          accessible
          accessibilityRole="header"
          accessibilityLabel={headerA11yLabel}
        >
          <View style={styles.headerAccent} />
          <View style={styles.headerRow}>
            <View style={styles.levelMedallionShadow}>
              <LinearGradient
                colors={['rgba(232,200,90,0.95)', 'rgba(160,120,32,0.75)', 'rgba(212,175,55,0.9)']}
                start={{ x: 0.15, y: 0.1 }}
                end={{ x: 0.85, y: 0.95 }}
                style={styles.levelMedallionRing}
              >
                <View style={styles.levelMedallionInner}>
                  <Image
                    source={levelImageSource}
                    style={styles.levelImage}
                    resizeMode="contain"
                    accessibilityIgnoresInvertColors
                  />
                </View>
              </LinearGradient>
            </View>
            <View style={styles.headerTextBlock}>
              <Text style={styles.userName} numberOfLines={1}>
                {displayName}
              </Text>
              <View style={styles.tierRow}>
                <View style={styles.tierDot} />
                <Text style={styles.tierLabel}>{tierLabel}</Text>
              </View>
              <View style={[styles.badge, badgeStyle]}>
                <Text style={[styles.badgeText, { color: subscriptionState.isActive ? '#000' : '#fff' }]}>
                  {badgeLabel}
                </Text>
                {badgeSubtext ? (
                  <Text style={[styles.badgeSubtext, { color: subscriptionState.isActive ? '#000' : '#fff' }]}>
                    {badgeSubtext}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        {/* ── Menu ───────────────────────────────────────────────────── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {MENU_ITEMS.map((item) => {
            const current = getCurrentRouteName();
            const active = current === item.name || (current === 'DayGalleryDetails' && item.name === 'Gallery');
            return (
              <TouchableOpacity
                key={item.name}
                style={[styles.item, active && styles.itemActive]}
                onPress={() => onItemPress(item.name)}
                activeOpacity={0.8}
              >
                {active && <View style={styles.itemPill} />}
                <View style={[styles.iconBox, active && styles.iconBoxActive]}>
                  <Ionicons name={item.icon as any} size={19} color={active ? '#000' : 'rgba(255,255,255,0.55)'} />
                </View>
                <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
                {active && <Ionicons name="chevron-forward" size={13} color={ACCENT} style={styles.chevron} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Logout ─────────────────────────────────────────────────── */}
        <View style={[styles.logoutSection, { paddingBottom: bottomSpace }]}>
          <TouchableOpacity
            onPress={async () => {
              closeDrawer();
              await logout();
              if (rootNavigationRef.isReady())
                rootNavigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
            }}
            activeOpacity={0.85}
          >
            <View style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={styles.logoutText}>Déconnexion</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 1001,
    elevation: 1001,
    overflow: 'hidden',
    // explicit flex column so children size correctly
    flexDirection: 'column',
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.15)',
    alignItems: 'stretch',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  headerAccent: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: ACCENT,
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  headerTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  levelMedallionShadow: {
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  levelMedallionRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    padding: 3,
  },
  levelMedallionInner: {
    flex: 1,
    borderRadius: 35,
    backgroundColor: 'rgba(6,5,2,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  levelImage: {
    width: 54,
    height: 54,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 5,
    marginBottom: 9,
  },
  tierDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: ACCENT,
  },
  tierLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.88)',
    letterSpacing: 0.4,
    textTransform: 'capitalize',
  },
  userName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  badgeActive:   { backgroundColor: ACCENT },
  badgeExpiring: { backgroundColor: '#EAB308' },
  badgeExpired:  { backgroundColor: '#EF4444' },
  badgeText:    { fontSize: 12, fontWeight: '800' },
  badgeSubtext: { fontSize: 10, fontWeight: '600', marginTop: 1 },

  // Menu
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 14, paddingBottom: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginHorizontal: 10,
    marginBottom: 4,
    borderRadius: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  itemActive: {
    backgroundColor: 'rgba(212,175,55,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.22)',
  },
  itemPill: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 2,
    backgroundColor: ACCENT,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: { backgroundColor: ACCENT },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
    flex: 1,
  },
  labelActive: { color: '#FFFFFF', fontWeight: '800' },
  chevron: { marginLeft: 'auto' as any },

  // Logout
  logoutSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.22)',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
});
