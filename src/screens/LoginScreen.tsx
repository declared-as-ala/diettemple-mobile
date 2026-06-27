import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { RootStackParamList } from '../types';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { authService } from '../services/authService';
import { meService } from '../services/meService';
import AppLoader from '../components/AppLoader';

const ACCENT = '#D4AF37';
const ACCENT_DIM = 'rgba(212,175,55,0.15)';
const POST_LOGIN_MIN_MS = 500;
const { width } = Dimensions.get('window');

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;
type LoginRouteProp = RouteProp<RootStackParamList, 'Login'>;

const loginSchema = z.object({
  emailOrPhone: z.string().min(1, 'Ce champ est requis'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const route = useRoute<LoginRouteProp>();
  const insets = useSafeAreaInsets();
  const redirectTo = route.params?.redirectTo;
  const { setUser, setToken } = useAuthStore();
  const { syncWithBackend } = useProfileStore();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [postLoginLoading, setPostLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => null,
      gestureEnabled: false,
    });
  }, [navigation]);

  const {
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { emailOrPhone: '', password: '' },
  });

  const emailOrPhone = watch('emailOrPhone');
  const password = watch('password');

  const handleLogin = async (data: LoginFormData) => {
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(data);
      await setToken(response.token);
      setUser(response.user);
      await SecureStore.setItemAsync('last_email_or_phone', data.emailOrPhone);

      setLoading(false);
      setPostLoginLoading(true);

      const start = Date.now();
      const redirectPromise = (async (): Promise<keyof RootStackParamList> => {
        if (redirectTo === 'PremiumHome' || redirectTo === 'UHPreview') return redirectTo;
        if (redirectTo === 'UH') {
          try {
            const { subscription } = await meService.getSubscription();
            useSubscriptionStore.getState().setSubscription(subscription ?? null);
            return subscription?.status === 'ACTIVE' ? 'PremiumHome' : 'UHPreview';
          } catch { return 'UHPreview'; }
        }
        return 'Home';
      })();

      const syncPromise = syncWithBackend().catch(() => {});
      const cartFavPromise = (async () => {
        try {
          const { useFavoritesStore } = await import('../store/favoritesStore');
          const { useCartStore } = await import('../store/cartStore');
          useFavoritesStore.getState().fetchFavorites();
          useCartStore.getState().fetchCart();
        } catch {}
      })();

      const [destination] = await Promise.all([redirectPromise, syncPromise, cartFavPromise]);
      const elapsed = Date.now() - start;
      if (elapsed < POST_LOGIN_MIN_MS) {
        await new Promise((r) => setTimeout(r, POST_LOGIN_MIN_MS - elapsed));
      }

      setPostLoginLoading(false);
      navigation.reset({ index: 0, routes: [{ name: destination as keyof RootStackParamList }] });
    } catch (err: any) {
      setLoading(false);
      setPostLoginLoading(false);
      let errorMessage = 'Une erreur est survenue';
      if (err.response?.data?.message) errorMessage = err.response.data.message;
      else if (err.message) errorMessage = err.message;
      if (errorMessage.toLowerCase().includes('password') && errorMessage.toLowerCase().includes('incorrect')) {
        errorMessage = 'Le mot de passe est incorrect';
      } else if (errorMessage.toLowerCase().includes('deactivated') || errorMessage.toLowerCase().includes('désactivé')) {
        errorMessage = 'Réservé aux membres. Clients est désactivé après plusieurs tentatives avec une mauvaise mot de passe.';
      }
      setError(errorMessage);
    }
  };

  const topSpace = Platform.OS === 'android'
    ? (insets.top > 0 ? insets.top : 16)
    : insets.top + 4;

  return (
    <>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <LinearGradient
          colors={['#0D0900', '#080603', '#000000']}
          style={styles.flex}
        >
          <ImageBackground source={require('../../assets/login.jpg')} style={styles.flex} resizeMode="cover">
            <LinearGradient
              colors={['rgba(0,0,0,0.82)', 'rgba(10,7,2,0.90)', 'rgba(0,0,0,0.95)']}
              style={styles.flex}
            >
              <ScrollView
                style={styles.flex}
                contentContainerStyle={[
                  styles.scrollContent,
                  { paddingTop: topSpace, paddingBottom: Math.max(12, insets.bottom + 8) },
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* ── Hero / Logo area ── */}
                <View style={styles.hero}>
                  <Image
                    source={require('../../assets/logo-uh.png')}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                  <Text style={styles.brandName}>DIET TEMPLE</Text>
                  <View style={styles.brandAccentRow}>
                    <View style={styles.brandLine} />
                    <Text style={styles.brandTagline}>The Ultimate Human Path</Text>
                    <View style={styles.brandLine} />
                  </View>
                </View>

                {/* ── Form card ── */}
                <View style={styles.card}>
                  <LinearGradient
                    colors={[ACCENT, 'rgba(212,175,55,0.3)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.cardTopAccent}
                  />

                  <Text style={styles.cardTitle}>Se connecter</Text>
                  <Text style={styles.cardSubtitle}>
                    Accédez à votre espace personnel
                  </Text>

                  <View style={styles.formFields}>
                    <Input
                      label="Adresse e-mail / Numéro de téléphone"
                      value={emailOrPhone}
                      onChangeText={(text) => {
                        setValue('emailOrPhone', text);
                        trigger('emailOrPhone');
                        setError('');
                      }}
                      placeholder="Entrez votre adresse ou numéro..."
                      keyboardType="default"
                      autoCapitalize="none"
                      error={errors.emailOrPhone?.message || (error && !password ? error : '')}
                      leftIcon={<Ionicons name="person-outline" size={18} color={ACCENT} />}
                      borderColor={emailOrPhone ? ACCENT : undefined}
                    />

                    <Input
                      label="Mot de passe"
                      value={password}
                      onChangeText={(text) => {
                        setValue('password', text);
                        trigger('password');
                        setError('');
                      }}
                      placeholder="Entrez votre mot de passe"
                      secureTextEntry={!showPassword}
                      error={errors.password?.message || (error && password ? error : '')}
                      leftIcon={<Ionicons name="lock-closed-outline" size={18} color={ACCENT} />}
                      rightIcon={
                        <Ionicons
                          name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                          size={18}
                          color="rgba(255,255,255,0.5)"
                        />
                      }
                      onRightIconPress={() => setShowPassword(!showPassword)}
                      borderColor={password ? 'rgba(255,255,255,0.2)' : undefined}
                    />

                    {!!(error && password && emailOrPhone) && (
                      <View style={styles.errorBox}>
                        <Ionicons name="alert-circle-outline" size={15} color="#FF6B6B" />
                        <Text style={styles.errorText}>{error}</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.forgotPassword}
                      onPress={() => navigation.navigate('ForgotPassword')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
                    </TouchableOpacity>

                    <Button
                      title="Se connecter"
                      onPress={handleSubmit(handleLogin)}
                      loading={loading}
                      icon={<Ionicons name="arrow-forward" size={20} color="#000" />}
                    />
                  </View>

                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>Pas encore membre ?</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <TouchableOpacity
                    style={styles.signupButton}
                    onPress={() => navigation.navigate('Signup')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="person-add-outline" size={18} color={ACCENT} />
                    <Text style={styles.signupButtonText}>Créer un compte</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.bottomActions}>
                  <View style={styles.footerDividerRow}>
                    <View style={styles.footerLine} />
                    <Text style={styles.footerDividerText}>ou</Text>
                    <View style={styles.footerLine} />
                  </View>
                  <TouchableOpacity
                    style={styles.boutiqueButton}
                    onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Home' as never }] })}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="storefront-outline" size={19} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.boutiqueButtonText}>Continuer sans compte</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </LinearGradient>
          </ImageBackground>
        </LinearGradient>
      </KeyboardAvoidingView>

      <AppLoader
        variant="fullscreen"
        visible={postLoginLoading}
        label="Connexion…"
        minDisplayMs={POST_LOGIN_MIN_MS}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },

  // ── Hero ──────────────────────────────────────────────────────────────
  hero: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 10,
  },
  logo: {
    width: 90,
    height: 90,
  },
  brandName: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 5,
    textAlign: 'center',
  },
  brandAccentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    paddingHorizontal: 8,
  },
  brandLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(212,175,55,0.35)',
  },
  brandTagline: {
    fontSize: 11,
    fontWeight: '600',
    color: ACCENT,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // ── Card ──────────────────────────────────────────────────────────────
  card: {
    backgroundColor: 'rgba(16,12,7,0.94)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.18)',
    paddingHorizontal: 18,
    paddingBottom: 14,
    paddingTop: 0,
    overflow: 'hidden',
  },
  cardTopAccent: {
    height: 2,
    marginBottom: 16,
    borderRadius: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 10,
  },

  formFields: {
    gap: 2,
  },

  // ── Error ──────────────────────────────────────────────────────────────
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#FF6B6B',
    lineHeight: 17,
  },

  // ── Forgot ────────────────────────────────────────────────────────────
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 2,
    marginBottom: 10,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT,
  },

  // ── Divider ───────────────────────────────────────────────────────────
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    marginBottom: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '500',
  },

  // ── Sign up ───────────────────────────────────────────────────────────
  signupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.5)',
    backgroundColor: ACCENT_DIM,
  },
  signupButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: ACCENT,
  },

  // ── Bottom actions ─────────────────────────────────────────────────────
  bottomActions: {
    paddingTop: 12,
    paddingHorizontal: 6,
    marginTop: 8,
  },
  footerDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  footerDividerText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  boutiqueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  boutiqueButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },
});
