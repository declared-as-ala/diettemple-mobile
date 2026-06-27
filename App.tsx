import React, { useEffect, useRef, useState } from 'react';
import { View, Text, AppState, AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from './src/store/authStore';
import { useSubscriptionStore } from './src/store/subscriptionStore';
import { useNutritionStore } from './src/store/nutritionStore';
import { startupSteps } from './src/utils/startupLogger';
import { getLocalDateKey } from './src/utils/date';
import { hydrateGymCheckinStore } from './src/store/gymCheckinStore';
import { RootStackParamList } from './src/types';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import Toast from 'react-native-toast-message';
import { rootNavigationRef } from './src/navigation/rootNavigationRef';
import { SnackbarProvider } from './src/components/Snackbar';
import { registerUnauthorizedHandler } from './src/services/api';
import { RootErrorBoundary } from './src/components/RootErrorBoundary';
import LuxurySplash from './src/components/LuxurySplash';
import WorkoutResumeBar from './src/components/workout/WorkoutResumeBar';
import { usePreventScreenCapture } from './src/hooks/usePreventScreenCapture';
import {
  connectRealtimeSocket,
  disconnectRealtimeSocket,
  isRealtimeConnected,
  subscribeToRealtimeConnected,
  subscribeToUserUpdated,
} from './src/services/realtimeSocket';
import { isCompleteUserUpdatedPayload, type UserUpdatedRealtimePayload } from './src/realtime/events';

// Screens (Splash is NOT in stack – only shown during BOOTING in AuthGate)
import IntroScreen from './src/screens/IntroScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import GenderVideoScreen from './src/screens/GenderVideoScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import VerifyOTPScreen from './src/screens/VerifyOTPScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import TabNavigator from './src/navigation/TabNavigatorWrapper';
import EditProfileScreen from './src/screens/EditProfileScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import HelpSupportScreen from './src/screens/HelpSupportScreen';
import LegalNoticesScreen from './src/screens/LegalNoticesScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import SearchProductsScreen from './src/screens/SearchProductsScreen';
import FilterProductsScreen from './src/screens/FilterProductsScreen';
import CartScreen from './src/screens/CartScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import OrdersListScreen from './src/screens/OrdersListScreen';
import CheckoutCartScreen from './src/screens/CheckoutCartScreen';
import DeliveryAddressScreen from './src/screens/DeliveryAddressScreen';
import PaymentSuccessScreen from './src/screens/PaymentSuccessScreen';
import SessionDetailScreen from './src/screens/SessionDetailScreen';
import WorkoutSessionScreen from './src/screens/WorkoutSessionScreen';
import ExerciseWorkoutScreen from './src/screens/ExerciseWorkoutScreen';
import WorkoutCompletionScreen from './src/screens/WorkoutCompletionScreen';
import WeekPlanScreen from './src/screens/WeekPlanScreen';
import SessionPreStartScreen from './src/screens/SessionPreStartScreen';
import SessionQuickStartScreen from './src/screens/SessionQuickStartScreen';
import WarmupScreen from './src/screens/WarmupScreen';
import GymVerificationScreen from './src/screens/GymVerificationScreen';
import SessionSummaryScreen from './src/screens/SessionSummaryScreen';
import HomeDashboardScreen from './src/screens/HomeDashboardScreen';
import UHPreviewScreen from './src/screens/UHPreviewScreen';
import PremiumHomeScreen from './src/screens/PremiumHomeScreen';
import SubscribeScreen from './src/screens/SubscribeScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import DayGalleryDetailsScreen from './src/screens/DayGalleryDetailsScreen';
import RecettesScreen from './src/screens/RecettesScreen';
import MealScanScreen from './src/screens/MealScanScreen';
import GymPresenceVerificationScreen from './src/screens/GymPresenceVerificationScreen';

const Stack = createStackNavigator<RootStackParamList>();

const navTheme = (dark: boolean, bg: string) => ({
  dark,
  colors: {
    primary: '#D4AF37',
    background: bg,
    card: dark ? '#111111' : '#F6F7F9',
    text: dark ? '#FFFFFF' : '#0B0B0B',
    border: dark ? '#1F1F1F' : '#E5E7EB',
    notification: '#D4AF37',
  },
});

function AppContent() {
  const { isDarkMode, colors } = useTheme();
  usePreventScreenCapture(true);
  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <SnackbarProvider>
        <NavigationContainer
          ref={rootNavigationRef}
          theme={navTheme(isDarkMode, colors.background)}
        >
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: colors.background },
            }}
          >
          <Stack.Screen name="Intro" component={IntroScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="GenderVideo" component={GenderVideoScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen name="Home" component={TabNavigator} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
          <Stack.Screen name="LegalNotices" component={LegalNoticesScreen} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
          <Stack.Screen name="SearchProducts" component={SearchProductsScreen} />
          <Stack.Screen name="FilterProducts" component={FilterProductsScreen} />
          <Stack.Screen name="Cart" component={CartScreen} />
          <Stack.Screen name="Favorites" component={FavoritesScreen} />
          <Stack.Screen name="OrdersList" component={OrdersListScreen} />
          <Stack.Screen name="CheckoutCart" component={CheckoutCartScreen} />
          <Stack.Screen name="DeliveryAddress" component={DeliveryAddressScreen} />
          <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
          <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
          <Stack.Screen
            name="ExerciseDetail"
            getComponent={() => require('./src/screens/ExerciseDetailScreen').default}
          />
          <Stack.Screen name="WorkoutSession" component={WorkoutSessionScreen} />
          <Stack.Screen name="ExerciseWorkout" component={ExerciseWorkoutScreen} />
          <Stack.Screen name="WorkoutCompletion" component={WorkoutCompletionScreen} />
          <Stack.Screen name="WeekPlan" component={WeekPlanScreen} />
          <Stack.Screen
            name="SessionReels"
            getComponent={() => require('./src/screens/SessionReelsScreen').default}
          />
          <Stack.Screen name="SessionPreStart" component={SessionPreStartScreen} />
          <Stack.Screen name="SessionQuickStart" component={SessionQuickStartScreen} />
          <Stack.Screen name="Warmup" component={WarmupScreen} />
          <Stack.Screen name="GymVerification" component={GymVerificationScreen} />
          <Stack.Screen name="SessionSummary" component={SessionSummaryScreen} />
          <Stack.Screen name="UHPreview" component={UHPreviewScreen} />
          <Stack.Screen name="PremiumHome" component={PremiumHomeScreen} />
          <Stack.Screen name="Subscribe" component={SubscribeScreen} />
          <Stack.Screen name="Gallery" component={GalleryScreen} />
          <Stack.Screen name="DayGalleryDetails" component={DayGalleryDetailsScreen} />
          <Stack.Screen name="Recettes" component={RecettesScreen} />
          <Stack.Screen name="MealScan" component={MealScanScreen} />
          <Stack.Screen name="GymPresenceVerification" component={GymPresenceVerificationScreen} />
        </Stack.Navigator>
          <WorkoutResumeBar />
      </NavigationContainer>
      </SnackbarProvider>
      <Toast
        position="top"
        topOffset={60}
        config={{
          success: ({ text1, text2 }) => (
            <View
              style={{
                backgroundColor: '#D4AF37',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 8,
                marginHorizontal: 20,
                alignSelf: 'flex-end',
                maxWidth: '80%',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
              }}
            >
              <Text style={{ color: '#000000', fontSize: 14, fontWeight: '600' }}>
                {text1}
              </Text>
              {text2 && (
                <Text style={{ color: '#000000', fontSize: 12, marginTop: 4 }}>
                  {text2}
                </Text>
              )}
            </View>
          ),
        }}
      />
    </>
  );
}

const BACKGROUND_REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_SPLASH_BOOT_MS = 12000;
const MIN_SPLASH_VISIBLE_MS = 2800;

function AppInner() {
  const { boot, token, authStatus, refreshMe, applyRealtimeUserUpdate } = useAuthStore();
  const lastActiveRef = useRef<number>(Date.now());
  const bootStartedRef = useRef(false);
  const [isAppReady, setIsAppReady] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const [bootProgress, setBootProgress] = useState(5);
  const [bootLabel, setBootLabel] = useState('Initialisation…');
  const splashStartedAtRef = useRef(Date.now());

  useEffect(() => {
    startupSteps.appRender();
  }, []);

  useEffect(() => {
    // Register 401/403 handler: logout + navigate to Login (avoids circular dep in api.ts)
    registerUnauthorizedHandler(() => {
      useAuthStore.getState().logout();
      if (rootNavigationRef.isReady()) {
        rootNavigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    });
  }, []);

  // P2-4: Silent background refresh when app returns to foreground after 10+ minutes
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        if (useAuthStore.getState().authStatus === 'LOGGED_IN') {
          const currentToken = useAuthStore.getState().token;
          if (currentToken && !isRealtimeConnected()) {
            connectRealtimeSocket(currentToken);
          }
          useAuthStore.getState().refreshMe().catch(() => {});
        }
        const elapsed = Date.now() - lastActiveRef.current;
        if (elapsed > BACKGROUND_REFRESH_INTERVAL_MS) {
          const authStatus = useAuthStore.getState().authStatus;
          if (authStatus === 'LOGGED_IN') {
            useSubscriptionStore.getState().bootSubscription().catch(() => {});
            const todayKey = getLocalDateKey(new Date());
            useNutritionStore.getState().fetchIfNeeded(todayKey).catch(() => {});
          }
        }
      } else if (nextState === 'background' || nextState === 'inactive') {
        lastActiveRef.current = Date.now();
        disconnectRealtimeSocket();
      }
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (authStatus !== 'LOGGED_IN' || !token) {
      disconnectRealtimeSocket();
      return;
    }

    connectRealtimeSocket(token);
    const unsubscribeConnected = subscribeToRealtimeConnected(() => {
      refreshMe().catch(() => {});
      useSubscriptionStore.getState().bootSubscription().catch(() => {});
    });

    const unsubscribe = subscribeToUserUpdated((payload: UserUpdatedRealtimePayload) => {
      if (!isCompleteUserUpdatedPayload(payload)) {
        refreshMe().catch(() => {});
        useSubscriptionStore.getState().bootSubscription().catch(() => {});
        return;
      }
      const applied = applyRealtimeUserUpdate(payload);
      if (!applied) return;
      // Safety sync for any non-realtime fields.
      refreshMe().catch(() => {});
    });

    return () => {
      unsubscribe();
      unsubscribeConnected();
    };
  }, [authStatus, token, applyRealtimeUserUpdate, refreshMe]);

  useEffect(() => {
    if (bootStartedRef.current) return;
    bootStartedRef.current = true;
    let cancelled = false;
    const markReady = () => {
      if (cancelled) return;
      const elapsed = Date.now() - splashStartedAtRef.current;
      const remaining = Math.max(0, MIN_SPLASH_VISIBLE_MS - elapsed);
      setTimeout(() => {
        if (cancelled) return;
        setBootProgress(100);
        setBootLabel('Prêt');
        setIsAppReady(true);
      }, remaining);
    };

    const fallbackTimer = setTimeout(() => {
      if (cancelled) return;
      markReady();
    }, MAX_SPLASH_BOOT_MS);

    const runBoot = async () => {
      setBootLabel('Vérification de session');
      setBootProgress(20);
      try {
        await boot();
      } catch {
        useAuthStore.setState({ authStatus: 'LOGGED_OUT', isLoading: false });
      }
      if (cancelled) return;

      const status = useAuthStore.getState().authStatus;
      if (status === 'LOGGED_IN') {
        setBootLabel('Synchronisation des données');
        setBootProgress(68);
        await Promise.allSettled([
          useAuthStore.getState().refreshMe(),
          hydrateGymCheckinStore(),
          useSubscriptionStore.getState().bootSubscription(),
          useNutritionStore.getState().fetchIfNeeded(getLocalDateKey(new Date())),
        ]);
      } else {
        setBootLabel("Préparation de l'interface");
        setBootProgress(78);
      }
      if (cancelled) return;
      markReady();
    };

    runBoot();
    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
    };
  }, [boot]);

  if (!isAppReady || splashVisible) {
    return (
      <LuxurySplash
        progress={bootProgress}
        label={bootLabel}
        done={isAppReady}
        onFinish={() => setSplashVisible(false)}
      />
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RootErrorBoundary>
        <AppInner />
      </RootErrorBoundary>
    </GestureHandlerRootView>
  );
}
