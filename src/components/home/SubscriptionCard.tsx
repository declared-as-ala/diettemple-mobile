import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import type { MeSubscription } from '../../services/meService';
import { getSubscriptionState, type SubscriptionStateResult } from '../../utils/subscriptionState';

const ACCENT = '#D4AF37';

interface SubscriptionCardProps {
  subscription: MeSubscription | null;
  /** Pass store-backed state so label/days match Home and Drawer. If omitted, computed from subscription. */
  subscriptionState?: SubscriptionStateResult;
  onRenew?: () => void;
}

export function SubscriptionCard({ subscription, subscriptionState: subscriptionStateProp, onRenew }: SubscriptionCardProps) {
  const { colors } = useTheme();
  const subscriptionState = subscriptionStateProp ?? getSubscriptionState(subscription);

  if (!subscription) {
    return (
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={styles.row}>
          <Ionicons name="fitness-outline" size={24} color={colors.textSecondary} />
          <Text style={[styles.title, { color: colors.text }]}>No active plan</Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Subscribe to unlock workouts and nutrition plans.
        </Text>
      </View>
    );
  }

  const isActive = subscriptionState.isActive;
  const isExpired = subscriptionState.isExpired;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.cardBackground, borderColor: isActive ? ACCENT : colors.border },
        isExpired && styles.cardExpired,
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: isActive ? ACCENT : (isExpired ? '#EF4444' : '#6B7280') }]}>
          <Text style={[styles.badgeText, { color: isActive ? '#000' : '#FFF' }]}>
            {subscriptionState.labelFr}
          </Text>
        </View>
        {subscription.levelName && (
          <Text style={[styles.levelName, { color: colors.text }]} numberOfLines={1}>
            {subscription.levelName}
          </Text>
        )}
      </View>
      {(isActive || subscriptionState.isExpiringSoon) && subscriptionState.daysLeft >= 0 && (
        <Text style={[styles.daysRemaining, { color: ACCENT }]}>
          {subscriptionState.daysLeft} jour{subscriptionState.daysLeft !== 1 ? 's' : ''} restant{subscriptionState.daysLeft !== 1 ? 's' : ''}
        </Text>
      )}
      {subscriptionState.endDateLocal && (
        <Text style={[styles.endAt, { color: colors.textSecondary }]}>
          Fin {subscriptionState.endDateLocal.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      )}
      {isExpired && onRenew && (
        <TouchableOpacity style={styles.renewButton} onPress={onRenew} activeOpacity={0.8}>
          <Text style={styles.renewButtonText}>Renouveler</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  cardExpired: {
    borderColor: '#EF4444',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  levelName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  daysRemaining: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  endAt: {
    fontSize: 13,
    marginTop: 4,
  },
  renewButton: {
    marginTop: 12,
    backgroundColor: '#D4AF37',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  renewButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});
