import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { RootStackParamList } from '../types';
import { getApiBaseUrl } from '../config/api.config';

type Nav   = StackNavigationProp<RootStackParamList, 'GenderVideo'>;
type Route = RouteProp<RootStackParamList, 'GenderVideo'>;

const { width: SW, height: SH } = Dimensions.get('window');
const GOLD     = '#D4AF37';
const GOLD_DIM = 'rgba(212,175,55,0.15)';

const GOAL_OPTIONS = [
  { value: 'fat-loss',     label: 'Perte de masse grasse' },
  { value: 'muscle',       label: 'Prise de muscle' },
  { value: 'recomp',       label: 'Recomposition corporelle' },
  { value: 'performance',  label: 'Performance sportive' },
  { value: 'wellness',     label: 'Santé & longévité' },
];

export default function GenderVideoScreen() {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const insets     = useSafeAreaInsets();
  const { gender } = route.params;

  const isFemme = gender === 'femme';
  const label   = isFemme ? 'Femme' : 'Homme';
  const emoji   = isFemme ? '♀' : '♂';
  const subLabel = isFemme ? 'Forme & Vitalité' : 'Force & Muscle';
  const defaultDesc = isFemme
    ? 'Un programme pensé pour la femme moderne : silhouette, tonus et énergie durable.'
    : 'Programme conçu pour la transformation masculine : prise de masse, force et nutrition optimisées.';

  // ── Video ──────────────────────────────────────────────────────────────
  const [videoUrl,    setVideoUrl]    = useState('');
  const [videoTitle,  setVideoTitle]  = useState('');
  const [videoDesc,   setVideoDesc]   = useState('');
  const [videoReady,  setVideoReady]  = useState(false);

  useEffect(() => {
    const base     = getApiBaseUrl();
    const apiHost  = base.replace(/\/api\/?$/, '');
    fetch(`${base}/landing/videos`)
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then(data => {
        const cfg = data?.[gender];
        if (cfg?.streamUrl) setVideoUrl(`${apiHost}${cfg.streamUrl}`);
        else if (cfg?.videoUrl) setVideoUrl(cfg.videoUrl);
        if (cfg?.title)       setVideoTitle(cfg.title);
        if (cfg?.description) setVideoDesc(cfg.description);
        setVideoReady(true);
      });
  }, [gender]);

  const player = useVideoPlayer(videoUrl || null, p => {
    p.loop    = true;
    p.muted   = false;
    if (videoUrl) p.play();
  });

  useEffect(() => {
    if (!videoUrl) return;
    player.replace(videoUrl);
    player.play();
  }, [videoUrl]);

  // ── Form (step 1) ──────────────────────────────────────────────────────
  const [step,       setStep]       = useState<'video' | 'form' | 'success'>('video');
  const [form,       setForm]       = useState({ name: '', email: '', phone: '', goal: 'fat-loss' });
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const submit = useCallback(async () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await fetch(`${getApiBaseUrl()}/leads`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, gender, source: 'mobile' }),
      });
    } catch {}
    finally {
      setSubmitting(false);
      setStep('success');
    }
  }, [form, gender]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* Dark background */}
      <View style={styles.bg} />

      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: Math.max(14, insets.top + 4) }]}>
          <TouchableOpacity onPress={() => step === 'video' ? navigation.goBack() : setStep('video')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Image source={require('../../assets/logo-uh.png')} style={styles.topLogo} resizeMode="contain" />
          <View style={{ width: 38 }} />
        </View>

        {/* ════════ VIDEO STEP ════════ */}
        {step === 'video' && (
          <ScrollView contentContainerStyle={[styles.stage, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>

            {/* Gender badge */}
            <View style={styles.genderBadge}>
              <Text style={styles.genderEmoji}>{emoji}</Text>
              <View>
                <Text style={styles.genderLabel}>{label}</Text>
                <Text style={styles.genderSub}>{subLabel}</Text>
              </View>
            </View>

            {/* Video player */}
            <View style={styles.playerWrap}>
              {/* Header bar */}
              <View style={styles.playerHead}>
                <Text style={styles.playerHeadEmoji}>{emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.playerTitle} numberOfLines={1}>
                    {videoTitle || `Programme ${label} — DietTemple`}
                  </Text>
                  <Text style={styles.playerSubLabel}>Votre voie · Ultimate Human</Text>
                </View>
              </View>

              {/* Screen */}
              <View style={styles.playerScreen}>
                {!videoReady ? (
                  <View style={styles.playerSpinner}>
                    <ActivityIndicator color={GOLD} size="large" />
                    <Text style={styles.playerSpinnerText}>Chargement de la vidéo…</Text>
                  </View>
                ) : videoUrl ? (
                  <VideoView
                    player={player}
                    style={styles.videoView}
                    contentFit="contain"
                    nativeControls
                    allowsFullscreen
                  />
                ) : (
                  <View style={styles.playerSpinner}>
                    <Ionicons name="videocam-off-outline" size={36} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.playerSpinnerText}>Vidéo en cours de configuration</Text>
                  </View>
                )}
              </View>

              {/* Footer */}
              <View style={styles.playerFoot}>
                <Text style={styles.playerDesc}>
                  {videoDesc || defaultDesc}
                </Text>
                <View style={styles.playerCtas}>
                  <TouchableOpacity style={styles.ghostBtn} onPress={() => {}}>
                    <Ionicons name="call-outline" size={15} color="#fff" />
                    <Text style={styles.ghostBtnText}>Appeler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('form')} activeOpacity={0.85}>
                    <Text style={styles.primaryBtnText}>Commencer mon parcours</Text>
                    <Ionicons name="arrow-forward" size={15} color="#000" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

          </ScrollView>
        )}

        {/* ════════ FORM STEP ════════ */}
        {step === 'form' && (
          <ScrollView
            contentContainerStyle={[styles.stage, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.eyebrow}>— Demande de rendez-vous · Programme {label}</Text>
            <Text style={styles.title}>Vos informations</Text>
            <Text style={styles.sub}>
              Un conseiller DietTemple vous contacte sous 24h pour confirmer votre rendez-vous.
            </Text>

            <View style={styles.formCard}>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Nom complet *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Votre nom"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={form.name}
                  onChangeText={v => setForm({ ...form, name: v })}
                />
              </View>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Téléphone *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+216 50 123 456"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="phone-pad"
                  value={form.phone}
                  onChangeText={v => setForm({ ...form, phone: v })}
                />
              </View>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Email *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="vous@email.com"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  onChangeText={v => setForm({ ...form, email: v })}
                />
              </View>
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Objectif principal</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  <View style={styles.goalRow}>
                    {GOAL_OPTIONS.map(g => (
                      <TouchableOpacity
                        key={g.value}
                        style={[styles.goalChip, form.goal === g.value && styles.goalChipActive]}
                        onPress={() => setForm({ ...form, goal: g.value })}
                      >
                        <Text style={[styles.goalChipText, form.goal === g.value && styles.goalChipTextActive]}>
                          {g.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryBtn, styles.primaryBtnFull, submitting && styles.primaryBtnDisabled]}
              onPress={submit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Demander mon rendez-vous</Text>
                  <Ionicons name="calendar-outline" size={17} color="#000" />
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.consent}>
              En soumettant, vous acceptez d&apos;être contacté par DietTemple.
            </Text>
          </ScrollView>
        )}

        {/* ════════ SUCCESS STEP ════════ */}
        {step === 'success' && (
          <View style={[styles.successStage, { paddingBottom: insets.bottom + 24 }]}>
            <LinearGradient
              colors={['rgba(212,175,55,0.12)', 'transparent']}
              style={styles.successGlow}
            />
            <LinearGradient colors={[GOLD, '#b8922a']} style={styles.successIconBg}>
              <Ionicons name="checkmark" size={36} color="#000" />
            </LinearGradient>
            <Text style={styles.eyebrow}>— Rendez-vous enregistré</Text>
            <Text style={styles.title}>Le Temple vous a entendu.</Text>
            <Text style={styles.sub}>
              Un conseiller vous contacte au{' '}
              <Text style={{ color: GOLD, fontWeight: '700' }}>{form.phone}</Text>{' '}
              sous 24h ouvrées.
            </Text>

            <View style={styles.successCard}>
              {[
                { icon: 'person-outline',  val: form.name },
                { icon: 'call-outline',    val: form.phone },
                { icon: 'mail-outline',    val: form.email },
                { icon: isFemme ? 'woman-outline' : 'man-outline', val: `Programme ${label}` },
              ].map((row, i) => (
                <View key={i} style={[styles.successRow, i > 0 && styles.successRowBorder]}>
                  <Ionicons name={row.icon as any} size={15} color={GOLD} />
                  <Text style={styles.successRowText}>{row.val}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={[styles.primaryBtn, styles.primaryBtnFull]} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Retour à l&apos;accueil</Text>
            </TouchableOpacity>
          </View>
        )}

      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1 },
  bg:    { ...StyleSheet.absoluteFillObject, backgroundColor: '#070501' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 8,
    zIndex: 10,
  },
  backBtn: { padding: 4, width: 38 },
  topLogo: { width: 40, height: 40 },

  stage: { paddingHorizontal: 18, paddingTop: 4, flexGrow: 1 },

  // Gender badge
  genderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  genderEmoji: { fontSize: 26, color: GOLD },
  genderLabel: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
  genderSub:   { color: 'rgba(255,255,255,0.5)', fontSize: 12 },

  // Player card
  playerWrap: {
    backgroundColor: 'rgba(14,11,5,0.95)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.22)',
    overflow: 'hidden',
    marginBottom: 20,
  },
  playerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,175,55,0.10)',
  },
  playerHeadEmoji: { fontSize: 20, color: GOLD },
  playerTitle:     { color: '#fff', fontSize: 13, fontWeight: '700' },
  playerSubLabel:  { color: 'rgba(255,221,127,0.7)', fontSize: 10.5, marginTop: 1 },
  playerScreen: {
    width: '100%',
    height: SH * 0.32,
    backgroundColor: '#000',
  },
  videoView: { width: '100%', height: '100%' },
  playerSpinner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  playerSpinnerText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  playerFoot: {
    padding: 16,
    gap: 14,
  },
  playerDesc: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 12.5,
    lineHeight: 19,
  },
  playerCtas: {
    flexDirection: 'row',
    gap: 10,
  },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  ghostBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Form
  eyebrow: {
    color: GOLD,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  sub: {
    color: 'rgba(255,255,255,0.60)',
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  formCard: {
    backgroundColor: 'rgba(16,12,7,0.94)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.18)',
    padding: 18,
    marginBottom: 20,
    gap: 16,
  },
  fieldWrap: { gap: 6 },
  fieldLabel: {
    color: 'rgba(255,255,255,0.50)',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
  },
  goalRow: { flexDirection: 'row', gap: 8 },
  goalChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  goalChipActive:     { borderColor: GOLD, backgroundColor: GOLD_DIM },
  goalChipText:       { color: 'rgba(255,255,255,0.5)', fontSize: 11.5, fontWeight: '600' },
  goalChipTextActive: { color: GOLD },

  primaryBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    flex: 1,
  },
  primaryBtnFull:     { flex: 0, marginBottom: 12 },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText:     { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 0.2 },

  errorText: { color: '#FF6B6B', fontSize: 12, textAlign: 'center', marginBottom: 10 },
  consent: {
    color: 'rgba(255,255,255,0.32)',
    fontSize: 10.5,
    textAlign: 'center',
    lineHeight: 15,
  },

  // Success
  successStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  successGlow: {
    position: 'absolute',
    top: 0, left: -80, right: -80,
    height: 260,
    borderRadius: 260,
  },
  successIconBg: {
    width: 72, height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successCard: {
    backgroundColor: 'rgba(16,12,7,0.94)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.20)',
    padding: 16,
    width: '100%',
    marginBottom: 24,
    marginTop: 8,
    gap: 2,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  successRowBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  successRowText: { color: 'rgba(255,255,255,0.80)', fontSize: 13, flex: 1 },
});
