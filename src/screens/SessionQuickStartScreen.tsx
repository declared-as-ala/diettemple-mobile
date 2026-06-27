/**
 * Zero-UI bridge: load session, sync gym status, then go straight to SessionReels
 * or GymVerification (no "aperçu" screen).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { homeService } from '../services/homeService';
import { workoutService } from '../services/workoutService';
import { hydrateGymCheckinStore, useGymCheckinStore } from '../store/gymCheckinStore';
import { buildReelsSessionFromApiSession } from '../utils/buildReelsSessionFromApiSession';
import AppBackground from '../components/AppBackground';
import AppLoader from '../components/AppLoader';

const ACCENT = '#D4AF37';

type Route = RouteProp<RootStackParamList, 'SessionQuickStart'>;
type Nav = StackNavigationProp<RootStackParamList, 'SessionQuickStart'>;

export default function SessionQuickStartScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { sessionId } = route.params;
  const [phase, setPhase] = useState<'loading' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const go = useCallback(async () => {
    if (!sessionId) {
      setErrorMessage('Séance introuvable.');
      setPhase('error');
      return;
    }
    setPhase('loading');
    setErrorMessage(null);
    try {
      await hydrateGymCheckinStore();
      await useGymCheckinStore.getState().syncStatus();
      const res = await homeService.getSession(sessionId);
      const session = res.session;
      if (!session) {
        setErrorMessage('Séance introuvable.');
        setPhase('error');
        return;
      }
      const gymOk = useGymCheckinStore.getState().isGymVerifiedToday();
      if (!gymOk) {
        navigation.replace('GymVerification', { sessionId });
        return;
      }
      try {
        await workoutService.startWorkout(sessionId);
      } catch (e: any) {
        if (e?.response?.status === 403 && e?.response?.data?.code === 'GYM_CHECKIN_REQUIRED') {
          await useGymCheckinStore.getState().syncStatus();
          navigation.replace('GymVerification', { sessionId });
          return;
        }
        throw e;
      }
      const reelsSession = buildReelsSessionFromApiSession(session);
      const hasWarmup = Array.isArray((session as any)?.warmup?.items) && (session as any).warmup.items.length > 0;
      if (hasWarmup) {
        navigation.replace('Warmup', { sessionTemplateId: sessionId });
        return;
      }
      if (reelsSession) {
        navigation.replace('SessionReels', { sessionTemplateId: sessionId, session: reelsSession });
      } else {
        setErrorMessage('Cette séance ne contient aucun exercice.');
        setPhase('error');
      }
    } catch (e: any) {
      const status = e?.response?.status;
      setErrorMessage(status === 404 ? 'Séance introuvable.' : 'Impossible de préparer la séance. Réessaie.');
      setPhase('error');
    }
  }, [navigation, sessionId]);

  useEffect(() => {
    go();
  }, [go]);

  if (phase === 'loading') {
    return (
      <AppBackground>
        <StatusBar style="light" />
        <View style={styles.centered}>
          <AppLoader variant="inline" size="lg" label="Préparation de ta séance…" />
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <StatusBar style="light" />
      <View style={styles.centered}>
        <View style={styles.iconWrap}>
          <Ionicons name="alert-circle-outline" size={40} color={ACCENT} />
        </View>
        <Text style={styles.title}>Oups</Text>
        <Text style={styles.sub}>{errorMessage}</Text>
        <TouchableOpacity style={styles.primary} onPress={go} activeOpacity={0.85}>
          <Text style={styles.primaryText}>Réessayer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.linkText}>Retour</Text>
        </TouchableOpacity>
      </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(212,175,55,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 8 },
  sub: { fontSize: 15, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  primary: {
    backgroundColor: ACCENT,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    marginBottom: 12,
  },
  primaryText: { color: '#000', fontWeight: '800', fontSize: 15 },
  link: { paddingVertical: 10 },
  linkText: { color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: 15 },
});
