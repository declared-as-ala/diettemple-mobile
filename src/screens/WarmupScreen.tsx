import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { RootStackParamList } from '../types';
import { homeService } from '../services/homeService';
import { workoutService } from '../services/workoutService';
import { buildReelsSessionFromApiSession } from '../utils/buildReelsSessionFromApiSession';
import AppBackground from '../components/AppBackground';
import { usePreventScreenCapture } from '../hooks/usePreventScreenCapture';

type Route = RouteProp<RootStackParamList, 'Warmup'>;
type Nav = StackNavigationProp<RootStackParamList, 'Warmup'>;

const ACCENT = '#D4AF37';

export default function WarmupScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { sessionTemplateId } = route.params;
  usePreventScreenCapture(true);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [index, setIndex] = useState(0);

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const res = await homeService.getSession(sessionTemplateId);
      setSession(res.session);
    } finally {
      setLoading(false);
    }
  }, [sessionTemplateId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const warmupItems = useMemo(
    () => (session?.warmup?.items || []).filter((x: any) => x?.title).sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)),
    [session]
  );
  const warmupTitle = session?.warmup?.title || 'Échauffement';
  const current = warmupItems[index];
  const progress = warmupItems.length > 0 ? ((index + 1) / warmupItems.length) * 100 : 0;

  const startWorkout = useCallback(async () => {
    if (!session) return;
    setStarting(true);
    try {
      await workoutService.startWorkout(sessionTemplateId);
      const reelsSession = buildReelsSessionFromApiSession(session);
      if (reelsSession) {
        navigation.replace('SessionReels', { sessionTemplateId, session: reelsSession });
      } else {
        navigation.goBack();
      }
    } finally {
      setStarting(false);
    }
  }, [navigation, session, sessionTemplateId]);

  if (loading) {
    return (
      <AppBackground>
        <StatusBar style="light" />
        <View style={styles.center}>
          <ActivityIndicator color={ACCENT} size="large" />
          <Text style={styles.loadingText}>Préparation de l'échauffement...</Text>
        </View>
      </AppBackground>
    );
  }

  if (!session || warmupItems.length === 0) {
    return (
      <AppBackground>
        <StatusBar style="light" />
        <View style={styles.center}>
          <Text style={styles.title}>Pas d'échauffement défini</Text>
          <TouchableOpacity style={styles.cta} onPress={startWorkout} disabled={starting}>
            <Text style={styles.ctaText}>{starting ? 'Démarrage...' : 'Démarrer la séance'}</Text>
          </TouchableOpacity>
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.kicker}>WARM-UP</Text>
          <Text style={styles.title}>{warmupTitle}</Text>
          <Text style={styles.sub}>{session?.warmup?.notes || 'Prépare ton corps avant la séance principale.'}</Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>Étape {index + 1} / {warmupItems.length}</Text>

        <LinearGradient colors={['rgba(212,175,55,0.16)', 'rgba(0,0,0,0.3)']} style={styles.card}>
          <Text style={styles.cardTitle}>{current?.title}</Text>
          <View style={styles.metaRow}>
            {current?.durationSeconds ? (
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={14} color={ACCENT} />
                <Text style={styles.metaText}>{current.durationSeconds}s</Text>
              </View>
            ) : null}
            {current?.reps ? (
              <View style={styles.metaChip}>
                <Ionicons name="repeat-outline" size={14} color={ACCENT} />
                <Text style={styles.metaText}>{current.reps} reps</Text>
              </View>
            ) : null}
          </View>
          {current?.notes ? <Text style={styles.notes}>{current.notes}</Text> : null}
        </LinearGradient>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.skipBtn} onPress={startWorkout} disabled={starting}>
            <Text style={styles.skipText}>Passer échauffement</Text>
          </TouchableOpacity>
          {index < warmupItems.length - 1 ? (
            <TouchableOpacity style={styles.nextBtn} onPress={() => setIndex((i) => Math.min(i + 1, warmupItems.length - 1))}>
              <Text style={styles.nextText}>Suivant</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.nextBtn} onPress={startWorkout} disabled={starting}>
              <Text style={styles.nextText}>{starting ? 'Démarrage...' : 'Terminer & démarrer'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 60, paddingBottom: 28 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  loadingText: { color: 'rgba(255,255,255,0.75)', marginTop: 12, fontSize: 14, fontWeight: '600' },
  header: { marginBottom: 16 },
  kicker: { color: ACCENT, fontSize: 12, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 4 },
  sub: { color: 'rgba(255,255,255,0.6)', marginTop: 6, lineHeight: 20 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: ACCENT },
  progressText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 6, marginBottom: 14, fontWeight: '600' },
  card: { borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)', borderRadius: 18, padding: 16, minHeight: 200 },
  cardTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
  },
  metaText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  notes: { marginTop: 12, color: 'rgba(255,255,255,0.72)', lineHeight: 20, fontSize: 14 },
  actions: { marginTop: 'auto', flexDirection: 'row', gap: 10 },
  skipBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  skipText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '700' },
  nextBtn: { flex: 1.4, height: 52, borderRadius: 14, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
  nextText: { color: '#000', fontSize: 15, fontWeight: '900' },
  cta: { marginTop: 16, backgroundColor: ACCENT, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 12 },
  ctaText: { color: '#000', fontWeight: '900', fontSize: 15 },
});
