/**
 * Premium drawer content: header (avatar, name, subscription badge), menu items, logout.
 * Black + green theme; active route highlight.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { DrawerContentScrollView, DrawerItemList, DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import { resolveMediaUrl } from '../config/api.config';
import { useSubscription } from '../context/SubscriptionContext';
import { rootNavigationRef } from './rootNavigationRef';

const ACCENT = '#D4AF37';

export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const { state, navigation } = props;
  const { colors } = useTheme();
  const { user, logout } = useAuthStore();
  const { profile } = useProfileStore();
  const { subscriptionState } = useSubscription();

  const logoutBottomPadding = Math.max(24, insets.bottom + 16);
  const logoutMarginTop = 24;
  const displayName = profile?.name || user?.name || 'Warrior';
  const photoUri = user?.photoUri;
  const avatarUri = resolveMediaUrl(photoUri ?? null);

  const badgeStyle =
    subscriptionState.isActive
      ? styles.badgeActive
      : subscriptionState.isExpiringSoon
        ? styles.badgeExpiring
        : styles.badgeExpired;
  const badgeLabel = subscriptionState.labelFr;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.avatarWrap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.cardBackground }]}>
                <Ionicons name="person" size={40} color={colors.textSecondary} />
              </View>
            )}
          </View>
          <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={[styles.badge, badgeStyle]}>
            <Text style={[styles.badgeText, { color: subscriptionState.isActive ? '#000' : '#fff' }]}>{badgeLabel}</Text>
          </View>
        </View>

        {/* Drawer items from props (Main, Exercises, Recipes, etc.) */}
        <DrawerItemList
          {...({
            ...props,
            activeBackgroundColor: 'rgba(212,175,55,0.2)',
            activeTintColor: ACCENT,
            inactiveTintColor: colors.textSecondary,
            itemStyle: [styles.item, { borderBottomColor: colors.border }],
            labelStyle: [styles.label, { color: colors.text }],
          } as any)}
        />
      </DrawerContentScrollView>

      {/* Logout - safe area so it doesn't touch bottom button / home indicator */}
      <TouchableOpacity
        style={[
          styles.logoutBtn,
          { borderTopColor: colors.border, marginTop: logoutMarginTop, paddingBottom: logoutBottomPadding },
        ]}
        onPress={async () => { await logout(); if (rootNavigationRef.isReady()) rootNavigationRef.reset({ index: 0, routes: [{ name: 'Login' }] }); }}
        activeOpacity={0.85}
      >
        <Ionicons name="log-out-outline" size={22} color="#EF4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 8 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  avatarWrap: { marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeActive: { backgroundColor: ACCENT },
  badgeExpiring: { backgroundColor: '#EAB308' },
  badgeExpired: { backgroundColor: '#EF4444' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  item: { borderBottomWidth: 1, marginHorizontal: 12, marginVertical: 2, borderRadius: 10 },
  label: { fontSize: 16, fontWeight: '600' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    marginTop: 'auto',
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#EF4444' },
});
