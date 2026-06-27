import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { RootStackParamList } from '../types';
import { getLocalDateKey } from '../utils/date';
import { homeService } from '../services/homeService';
import { workoutService } from '../services/workoutService';
import { checkinService } from '../services/checkinService';
import { useGymCheckinStore } from '../store/gymCheckinStore';
import { buildReelsSessionFromApiSession } from '../utils/buildReelsSessionFromApiSession';
import AppBackground from '../components/AppBackground';

const ACCENT = '#D4AF37';

type Route = RouteProp<RootStackParamList, 'GymVerification'>;
type Nav = StackNavigationProp<RootStackParamList, 'GymVerification'>;

const CAPTURE_CHECKLIST = [
  'haltères',
  'machine (poulie, banc, presse)',
  'rack / barres',
  'miroir + équipements',
];

export default function GymVerificationScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { sessionId } = route.params;
  const setVerified = useGymCheckinStore((s) => s.setVerified);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [capturedAt, setCapturedAt] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyTips, setVerifyTips] = useState<string[]>([]);
  const [attemptCount, setAttemptCount] = useState(0);
  const [nextAllowedMethod, setNextAllowedMethod] = useState<'photo' | 'gps' | undefined>();
  const [capturing, setCapturing] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    setLoadingSession(true);
    try {
      const res = await homeService.getSession(sessionId);
      setSession(res.session);
    } catch {
      setSession(null);
    } finally {
      setLoadingSession(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const buildReelsSession = useCallback(() => buildReelsSessionFromApiSession(session), [session]);

  const handleStep1Confirm = () => {
    if (!permission) {
      requestPermission();
      return;
    }
    if (!permission.granted) {
      requestPermission();
      return;
    }
    setStep(2);
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current || !permission?.granted) return;
    try {
      setCapturing(true);
      const result = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      if (result?.uri) {
        setCapturedAt(new Date().toISOString());
        setPhotoUri(result.uri);
        setStep(3);
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Impossible de prendre la photo.' });
    } finally {
      setCapturing(false);
    }
  };

  const handleReprendre = () => {
    setPhotoUri(null);
    setCapturedAt(null);
    setVerifyError(null);
    setVerifyTips([]);
    setAttemptCount(0);
    setNextAllowedMethod(undefined);
    setStep(2);
  };

  const getDeviceInfo = (): string => {
    try {
      const name = Constants.expoConfig?.name ?? Constants.deviceName ?? 'App';
      const platform = Constants.platform?.ios ? 'iOS' : Constants.platform?.android ? 'Android' : 'unknown';
      return `${name} (${platform})`;
    } catch {
      return 'Mobile';
    }
  };

  const handleValider = async () => {
    if (!photoUri || !sessionId) return;
    setUploading(true);
    setVerifyError(null);
    let checkinSucceeded = false;
    try {
      const dateKey = getLocalDateKey(new Date());
      const result = await checkinService.startGymCheckin(photoUri, dateKey, {
        sessionId,
        capturedAt: capturedAt ?? new Date().toISOString(),
        deviceInfo: getDeviceInfo(),
      });
      checkinSucceeded = true;
      // Always mark locally verified so the upcoming session isn't re-gated.
      // `forceEveryTime` only means "don't persist a daily cache for the next
      // app open" — it must NOT block the current session from starting.
      setVerified();
      Toast.show({ type: 'success', text1: 'Vérification réussie ✅', visibilityTime: 2500 });
      const { workoutSession } = await workoutService.startWorkout(sessionId);
      const reelsSession = buildReelsSession();
      if (reelsSession) {
        navigation.replace('SessionReels', {
          sessionTemplateId: sessionId,
          session: reelsSession,
        });
      } else {
        navigation.replace('SessionQuickStart', { sessionId });
      }
    } catch (e: any) {
      // Post-checkin workout/start failure: keep user signed-in, explain the issue.
      if (checkinSucceeded) {
        const status = e?.response?.status;
        const code = e?.response?.data?.code;
        console.warn('[GymVerification] workout/start failed after check-in success', { status, code });
        Toast.show({
          type: 'error',
          text1: 'Impossible de démarrer la séance',
          text2:
            code === 'GYM_CHECKIN_REQUIRED'
              ? 'Le serveur n’a pas reçu la preuve. Réessaie dans un instant.'
              : 'Réessaie dans quelques instants.',
          visibilityTime: 4000,
        });
        setUploading(false);
        return;
      }
      const data = e?.response?.data;
      const code = data?.code;
      const message = data?.message || e?.message;
      const tips: string[] = Array.isArray(data?.tips) ? data.tips : [];
      const attempt = typeof data?.attemptCount === 'number' ? data.attemptCount : 0;
      const nextMethod = data?.nextAllowedMethod;
      const status = e?.response?.status;
      const isProviderError = data?.reason === 'provider_error' || status === 503;

      if (code === 'GYM_VERIFY_FAILED' || isProviderError) {
        setVerifyError(
          message ||
            (isProviderError
              ? 'Le service de vérification est temporairement indisponible. Réessaie dans quelques instants.'
              : 'Impossible de confirmer la salle sur cette photo.')
        );
        setVerifyTips(
          Array.isArray(tips) && tips.length > 0
            ? tips
            : isProviderError
            ? ['Réessaie dans quelques instants.', 'Vérifie ta connexion internet.']
            : []
        );
        setAttemptCount(attempt);
        setNextAllowedMethod(nextMethod);
        // Provider errors: keep the photo so the user can re-tap "Valider" without retaking.
        Toast.show({
          type: 'error',
          text1: isProviderError ? 'Service indisponible' : 'Photo refusée',
          text2: isProviderError ? 'Réessaie dans quelques secondes.' : message,
          visibilityTime: 5000,
        });
      } else if (!e?.response && /network|timeout/i.test(String(e?.message ?? ''))) {
        setVerifyError('Connexion internet instable. Vérifie ta connexion et réessaie.');
        setVerifyTips(['Vérifie le Wi-Fi / données mobiles.', 'Réessaie dans quelques secondes.']);
        Toast.show({ type: 'error', text1: 'Connexion instable', text2: 'Réessaie.', visibilityTime: 4000 });
      } else {
        setVerifyError(null);
        setVerifyTips([]);
        Toast.show({
          type: 'error',
          text1:
            message && String(message).toLowerCase().includes('vérification')
              ? "Impossible d'envoyer la preuve"
              : 'Erreur',
          text2: message,
          visibilityTime: 4000,
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleAnnuler = () => {
    navigation.goBack();
  };

  const handleBackFromCamera = () => {
    setStep(1);
    setPhotoUri(null);
    setCapturedAt(null);
  };

  if (loadingSession && !session) {
    return (
      <AppBackground>
        <StatusBar style="light" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingLabel}>Chargement…</Text>
        </View>
      </AppBackground>
    );
  }

  // Step 1: intro (camera-only flow — no gallery)
  if (step === 1) {
    return (
      <AppBackground>
        <StatusBar style="light" />
        <LinearGradient
          colors={['rgba(212,175,55,0.14)', 'transparent', 'rgba(0,0,0,0.5)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.introScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={handleAnnuler} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.stepIndicator}>Vérification salle</Text>
          </View>

          <View style={styles.heroIconWrap}>
            <LinearGradient colors={[ACCENT, '#9A7B24']} style={styles.heroIconRing}>
              <Ionicons name="videocam" size={36} color="#000" />
            </LinearGradient>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Prouve que tu es à la salle</Text>
            <Text style={styles.subtitle}>
              Ouvre la caméra et cadre un équipement de musculation en direct. Pas d’import depuis la galerie — uniquement une capture immédiate.
            </Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>Caméra temps réel uniquement</Text>
            </View>
            <View style={styles.whatToCaptureCard}>
              <Text style={styles.whatToCaptureTitle}>Inclure au moins un de ces éléments :</Text>
              {CAPTURE_CHECKLIST.map((item, i) => (
                <View key={i} style={styles.checkItem}>
                  <Ionicons name="checkmark-circle" size={18} color={ACCENT} />
                  <Text style={styles.checkItemText}>{item}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleStep1Confirm} activeOpacity={0.85}>
              <Ionicons name="camera" size={20} color="#000" style={styles.primaryBtnLeadingIcon} />
              <Text style={styles.primaryBtnText}>Ouvrir la caméra</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleAnnuler} activeOpacity={0.85}>
              <Text style={styles.secondaryBtnText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </AppBackground>
    );
  }

  // Step 2: camera only (no gallery)
  if (step === 2) {
    if (!permission) {
      return (
        <AppBackground>
          <StatusBar style="light" />
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.loadingLabel}>Demande d’accès caméra…</Text>
          </View>
        </AppBackground>
      );
    }
    if (!permission.granted) {
      return (
        <AppBackground>
          <StatusBar style="light" />
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.permissionScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <TouchableOpacity onPress={handleBackFromCamera} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.stepIndicator}>Caméra</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.title}>Accès à la caméra requis</Text>
              <Text style={styles.subtitle}>
                Autorise l’accès à la caméra pour prendre une preuve sur place (pas de galerie).
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Autoriser la caméra</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleBackFromCamera} activeOpacity={0.85}>
                <Text style={styles.secondaryBtnText}>Retour</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </AppBackground>
      );
    }
    return (
      <View style={styles.cameraFullScreen}>
        <StatusBar style="light" />
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" mode="picture">
          <View style={styles.cameraOverlay}>
            <View style={[styles.cameraHeader, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
              <TouchableOpacity onPress={handleBackFromCamera} style={styles.cameraBackBtn}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.cameraTitle}>Prends une photo de la salle</Text>
              <View style={styles.placeholder} />
            </View>
            <View style={styles.cameraFrameGuide}>
              <View style={styles.frameRectangle} />
              <Text style={styles.cameraInstructionText}>Cadre une machine ou des haltères</Text>
            </View>
            <View style={styles.cameraInstructions}>
              <LinearGradient
                colors={['rgba(0,0,0,0.75)', 'transparent']}
                style={styles.cameraHintPill}
              >
                <Ionicons name="phone-portrait-outline" size={14} color="#fff" style={styles.cameraHintIcon} />
                <Text style={styles.cameraHintPillText}>
                  Capture instantanée — pas de galerie
                </Text>
              </LinearGradient>
              <Text style={styles.cameraInstructionText}>
                Machine, haltères, rack ou miroir visible
              </Text>
            </View>
          </View>
        </CameraView>
        <View style={[styles.cameraControls, { bottom: Math.max(insets.bottom, 12) + 16 }]}>
          <View style={styles.placeholder} />
          <TouchableOpacity
            style={styles.captureButton}
            onPress={handleTakePhoto}
            disabled={capturing}
          >
            {capturing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.captureButtonInner} />
            )}
          </TouchableOpacity>
          <View style={styles.placeholder} />
        </View>
      </View>
    );
  }

  // Step 3: preview + Valider / Reprendre (+ error state)
  return (
    <AppBackground>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.previewScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleReprendre} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.stepIndicator}>Étape 2/2</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.title}>Preuve à la salle</Text>
          <Text style={styles.subtitle}>Valide cette photo pour continuer.</Text>
          {verifyError ? (
            <>
              <View style={styles.errorBanner}>
                <Ionicons name="warning" size={20} color="#F87171" />
                <Text style={styles.errorBannerText}>{verifyError}</Text>
              </View>
              {verifyTips.length > 0 ? (
                <View style={styles.tipsList}>
                  {verifyTips.map((tip, i) => (
                    <Text key={i} style={styles.tipsText}>{`• ${tip}`}</Text>
                  ))}
                </View>
              ) : (
                <Text style={styles.tipsText}>Reprends une photo avec une machine ou des haltères bien visibles.</Text>
              )}
              {attemptCount >= 2 && nextAllowedMethod === 'photo' ? (
                <View style={styles.fallbackBanner}>
                  <Ionicons name="information-circle" size={20} color={ACCENT} />
                  <Text style={styles.fallbackBannerText}>
                    À cette tentative, cadre bien un équipement (machine, haltères) pour faciliter la validation.
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}
          <View style={styles.previewWrap}>
            <Image source={{ uri: photoUri! }} style={styles.previewImage} resizeMode="cover" />
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, uploading && styles.primaryBtnDisabled]}
            onPress={handleValider}
            disabled={uploading}
            activeOpacity={0.85}
          >
            {uploading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>Valider</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleReprendre} disabled={uploading} activeOpacity={0.85}>
            <Text style={styles.secondaryBtnText}>
              {attemptCount >= 2 ? 'Reprendre (cadre bien un équipement)' : 'Reprendre une photo'}
            </Text>
          </TouchableOpacity>
          {attemptCount >= 2 && nextAllowedMethod === 'photo' ? (
            <Text style={styles.fallbackHint}>Tu peux réessayer : la prochaine tentative sera un peu plus souple.</Text>
          ) : null}
        </View>
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  introScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 28,
  },
  permissionScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 28,
    justifyContent: 'flex-start',
  },
  previewScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 32,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingLabel: { marginTop: 12, fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { padding: 8, marginRight: 16 },
  stepIndicator: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5 },
  card: {
    backgroundColor: 'rgba(22,22,24,0.96)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  title: { fontSize: 23, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 10, letterSpacing: -0.3 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.82)', textAlign: 'center', lineHeight: 22, marginBottom: 18 },
  whatToCaptureCard: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
  },
  whatToCaptureTitle: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: 10 },
  checkItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  checkItemText: { fontSize: 14, color: 'rgba(255,255,255,0.85)', flex: 1 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248,113,113,0.15)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  errorBannerText: { flex: 1, flexShrink: 1, fontSize: 14, color: '#F87171', lineHeight: 20 },
  tipsList: { marginBottom: 16 },
  tipsText: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 6, paddingLeft: 4 },
  fallbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  fallbackBannerText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  fallbackHint: { fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 8 },
  previewWrap: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  previewImage: { width: '100%', aspectRatio: 4 / 3 },
  heroIconWrap: { alignItems: 'center', marginBottom: 16 },
  heroIconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 18,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  liveBadgeText: { fontSize: 12, fontWeight: '800', color: '#FECACA', letterSpacing: 0.3 },
  cameraHintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cameraHintPillText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  cameraHintIcon: { marginRight: 6 },
  primaryBtnLeadingIcon: { marginRight: 8 },
  primaryBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { fontSize: 18, fontWeight: '800', color: '#000' },
  secondaryBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  placeholder: { width: 40 },
  cameraFullScreen: { flex: 1, backgroundColor: '#000' },
  cameraOverlay: { flex: 1, justifyContent: 'space-between' },
  cameraHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  cameraBackBtn: { padding: 8 },
  cameraTitle: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center' },
  cameraFrameGuide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  frameRectangle: {
    width: '80%',
    aspectRatio: 4 / 3,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
    marginBottom: 12,
  },
  cameraInstructions: { paddingHorizontal: 24, paddingBottom: 32 },
  cameraInstructionText: { fontSize: 14, color: 'rgba(255,255,255,0.9)', textAlign: 'center' },
  cameraControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
});
