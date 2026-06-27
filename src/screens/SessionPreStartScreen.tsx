import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types';
import { getApiBaseUrl } from '../config/api.config';
import { homeService } from '../services/homeService';
import { useGymCheckinStore } from '../store/gymCheckinStore';
import { hydrateGymCheckinStore } from '../store/gymCheckinStore';
import { buildReelsSessionFromApiSession } from '../utils/buildReelsSessionFromApiSession';
import AppLoader from '../components/AppLoader';
import AppBackground from '../components/AppBackground';

type Route = RouteProp<RootStackParamList, 'SessionPreStart'>;
type Nav = StackNavigationProp<RootStackParamList, 'SessionPreStart'>;

const ACCENT = '#D4AF37';
const ACCENT_DIM = 'rgba(212,175,55,0.15)';

export default function SessionPreStartScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { sessionId } = route.params;

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const syncStatus = useGymCheckinStore((s) => s.syncStatus);
  const isGymVerifiedToday = useGymCheckinStore((s) => s.isGymVerifiedToday);

  const loadSession = useCallback(async () => {
    if (!sessionId) { setError('Session introuvable'); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await homeService.getSession(sessionId);
      setSession(res.session);
    } catch (e: any) {
      const status = e?.response?.status;
      const url = `${getApiBaseUrl()}/home/session/${sessionId}`;
      if (__DEV__) console.warn('[SessionPreStart] failed:', { url, status });
      setError(status === 404 ? 'Séance introuvable.' : 'Impossible de charger la séance');
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { loadSession(); }, [loadSession]);
  useEffect(() => { hydrateGymCheckinStore(); }, []);
  useEffect(() => { syncStatus(); }, [syncStatus]);

  const handleStartReels = async () => {
    if (!sessionId) return;
    if (isGymVerifiedToday()) {
      setStarting(true);
      setError(null);
      await startWorkoutAndGoToReels();
      setStarting(false);
      return;
    }
    navigation.navigate('GymVerification', { sessionId });
  };

  const startWorkoutAndGoToReels = useCallback(async () => {
    if (!sessionId || !session) return;
    try {
      const { workoutService } = await import('../services/workoutService');
      await workoutService.startWorkout(sessionId);
      const reelsSession = buildReelsSessionFromApiSession(session);
      if (reelsSession) {
        navigation.navigate('SessionReels', { sessionTemplateId: sessionId, session: reelsSession });
      }
    } catch (e: any) {
      if (e?.response?.status === 403 && e?.response?.data?.code === 'GYM_CHECKIN_REQUIRED') {
        syncStatus();
        navigation.navigate('GymVerification', { sessionId });
        return;
      }
      setError('Impossible de démarrer la séance. Réessayez.');
    }
  }, [sessionId, session, navigation, syncStatus]);

  if (loading) {
    return (
      <AppBackground>
        <StatusBar style="light" />
        <View style={styles.centered}>
          <AppLoader variant="inline" size="lg" label="Chargement de la séance…" />
        </View>
      </AppBackground>
    );
  }

  if (error && !session) {
    return (
      <AppBackground>
        <StatusBar style="light" />
        <View style={styles.centered}>
          <View style={styles.errorIcon}>
            <Ionicons name="alert-circle-outline" size={40} color={ACCENT} />
          </View>
          <Text style={styles.errorTitle}>Oups</Text>
          <Text style={styles.errorText}>{error}</Text>
          <View style={styles.errorActions}>
            <TouchableOpacity style={styles.retryBtn} onPress={loadSession}>
              <Text style={styles.retryBtnText}>Réessayer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backTextBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backTextBtnText}>Retour</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AppBackground>
    );
  }

  const difficultyLabel =
    session?.difficulty === 'beginner' ? 'Débutant' :
    session?.difficulty === 'intermediate' ? 'Intermédiaire' :
    session?.difficulty === 'advanced' ? 'Avancé' : null;
  const gymOk = isGymVerifiedToday();

  return (
    <AppBackground source={require('../../assets/apprecu_de_laseance.jpg')}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerLabel}>Aperçu de la séance</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Hero title block */}
        <View style={styles.heroBlock}>
          <Text style={styles.sessionTitle}>Prêt pour ta séance</Text>
          <Text style={styles.sessionSubtitle}>
            Échauffe-toi, reste concentré, puis démarre quand tu es prêt.
          </Text>
          {difficultyLabel && (
            <View style={styles.difficultyBadge}>
              <Ionicons name="flame" size={13} color={ACCENT} />
              <Text style={styles.difficultyText}>{difficultyLabel}</Text>
            </View>
          )}
        </View>

        {/* Gym verification status */}
        <View style={[styles.gymBadge, gymOk ? styles.gymBadgeOk : styles.gymBadgeWarn]}>
          <Ionicons name={gymOk ? 'checkmark-circle' : 'alert-circle-outline'} size={18} color={gymOk ? '#22c55e' : '#f59e0b'} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.gymBadgeTitle, { color: gymOk ? '#22c55e' : '#f59e0b' }]}>
              {gymOk ? 'Salle vérifiée' : 'Vérification requise'}
            </Text>
            <Text style={styles.gymBadgeSub}>
              {gymOk ? 'Tu peux démarrer directement.' : 'Tu seras redirigé pour vérifier ta présence.'}
            </Text>
          </View>
        </View>

        {/* Warm-up tip */}
        <View style={styles.tipCard}>
          <View style={styles.tipIconWrap}>
            <Ionicons name="flash" size={22} color={ACCENT} />
          </View>
          <Text style={styles.tipText}>
            Commence par 5 min de cardio léger ou mobilité articulaire avant de démarrer.
          </Text>
        </View>

        {error ? (
          <View style={styles.inlineBannerError}>
            <Ionicons name="warning-outline" size={16} color="#F87171" />
            <Text style={styles.bannerErrorText}>{error}</Text>
          </View>
        ) : null}

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* CTA Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.cta, starting && styles.ctaDisabled]}
          onPress={handleStartReels}
          disabled={!sessionId || starting}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={starting ? ['#a08020', '#a08020'] : [ACCENT, '#B8942E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            {starting ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <>
                <Ionicons name="play-circle" size={26} color="#000" />
                <Text style={styles.ctaText}>Démarrer la séance</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 56,
    paddingBottom: 12,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.3,
  },

  // Scroll
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  // Hero
  heroBlock: { marginBottom: 24, marginTop: 8 },
  sessionTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.8,
    marginBottom: 6,
    lineHeight: 36,
  },
  sessionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.62)',
    lineHeight: 20,
    marginBottom: 10,
    fontWeight: '500',
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: ACCENT_DIM,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  difficultyText: { fontSize: 13, fontWeight: '700', color: ACCENT },

  // Gym badge
  gymBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  gymBadgeOk: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' },
  gymBadgeWarn: { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' },
  gymBadgeTitle: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  gymBadgeSub: { fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 18 },

  // Tip
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: 'rgba(212,175,55,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  tipIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ACCENT_DIM,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  tipText: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 20 },

  // Errors
  inlineBannerError: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  bannerErrorText: { color: '#F87171', fontSize: 14 },
  errorIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: ACCENT_DIM,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 8 },
  errorText: { fontSize: 15, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 28, lineHeight: 22 },
  errorActions: { gap: 12, alignItems: 'center' },
  retryBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  retryBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },
  backTextBtn: { paddingVertical: 10 },
  backTextBtnText: { color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: 15 },

  // Footer CTA
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 16,
  },
  cta: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  ctaDisabled: { opacity: 0.65 },
  ctaText: { fontSize: 18, fontWeight: '900', color: '#000', letterSpacing: 0.2 },
});
