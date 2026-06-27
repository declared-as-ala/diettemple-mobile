import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
  Modal,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useNutritionStore } from '../store/nutritionStore';
import { useSubscription } from '../context/SubscriptionContext';
import { resolveMediaUrl } from '../config/api.config';
import { homeService, DailyProgram, BodyProgressPhoto, CoachEvent } from '../services/homeService';
import type { TodayResponse } from '../services/meService';
import { RootStackParamList } from '../types';
import { getLocalDateKey } from '../utils/date';
import { useEnsureTodayNutrition } from '../hooks/useEnsureTodayNutrition';
import { SubscriptionCard } from '../components/home/SubscriptionCard';
import { TodayPlanCard } from '../components/home/TodayPlanCard';
import { NutritionCard } from '../components/home/NutritionCard';
import { ProgressSection } from '../components/home/ProgressSection';
import LevelModal from '../components/LevelModal';
import CalendarModal from '../components/CalendarModal';
import NutritionistModal from '../components/NutritionistModal';
import AppLoader from '../components/AppLoader';
import * as ImagePicker from 'expo-image-picker';
import * as FS from 'expo-file-system/legacy';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const { width } = Dimensions.get('window');

// Helper function to format date
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Helper function to get day name
const getDayName = (date: Date): string => {
  const days = ['Di', 'Lu', 'Ma', 'Me', 'Ju', 'Ve', 'Sa'];
  return days[date.getDay()];
};

// Helper function to get month name
const getMonthName = (date: Date): string => {
  const months = [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre',
  ];
  return months[date.getMonth()];
};

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { colors, isDarkMode } = useTheme();
  const { token, isAuthenticated, user } = useAuthStore();
  const { profile } = useProfileStore();
  const { subscription, subscriptionState } = useSubscription();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dailyProgram, setDailyProgram] = useState<DailyProgram | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [programInfo, setProgramInfo] = useState<{
    startDate: string | null;
    endDate: string | null;
    nextNutritionistVisit: string | null;
  } | null>(null);
  const [currentProgram, setCurrentProgram] = useState<any>(null);
  const [programHistory, setProgramHistory] = useState<any[]>([]);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showNutritionistModal, setShowNutritionistModal] = useState(false);
  const [bodyPhoto, setBodyPhoto] = useState<BodyProgressPhoto | null>(null);
  const [coachEvent, setCoachEvent] = useState<CoachEvent | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [todayDashboard, setTodayDashboard] = useState<TodayResponse | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const todayDateKey = getLocalDateKey(selectedDate);
  const nutritionFromStore = useNutritionStore((s) => s.nutritionByDate[todayDateKey]);
  useEnsureTodayNutrition(!!token && !!isAuthenticated);

  // Video ref - stable, won't reload on refresh
  const videoRef = useRef<Video>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Generate calendar days (7 days: 3 before, today, 3 after)
  const getCalendarDays = (): Date[] => {
    const days: Date[] = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 3);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  };

  // Load program info (dates and history)
  const loadProgramInfo = async () => {
    if (!token || !isAuthenticated) return;

    try {
      const response = await homeService.getProgram();
      if (response.current_program) {
        setCurrentProgram(response.current_program);
        setProgramInfo({
          startDate: response.current_program.startDate,
          endDate: response.current_program.endDate,
          nextNutritionistVisit: response.current_program.nextNutritionistVisit,
        });
      }

      // Load program history
      try {
        const historyResponse = await homeService.getProgramHistory();
        if (historyResponse.programs) {
          // Filter out current program from history
          const history = historyResponse.programs.filter((p: any) => p._id !== response.current_program?._id);
          setProgramHistory(history);
        }
      } catch (historyError) {
        console.error('Error loading program history:', historyError);
      }
    } catch (err) {
      console.error('Error loading program info:', err);
      // Try to get from daily program if available
      if (dailyProgram) {
        setProgramInfo({
          startDate: dailyProgram.programStartDate || null,
          endDate: dailyProgram.programEndDate || null,
          nextNutritionistVisit: dailyProgram.nextNutritionistVisit || null,
        });
      }
    }
  };

  // Load daily program for selected date
  const loadDailyProgram = useCallback(
    async (date: Date) => {
      // Security: Never call API if not authenticated
      if (!token || !isAuthenticated) {
        setError('Non authentifié');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const dateStr = formatDate(date);
        const response = await homeService.getDailyProgram(dateStr);
        setDailyProgram(response.dailyProgram ?? null);

        // Update program info from daily program if available
        const dp = response.dailyProgram;
        if (dp && (dp.programStartDate || dp.nextNutritionistVisit)) {
          setProgramInfo({
            startDate: dp.programStartDate || null,
            endDate: dp.programEndDate || null,
            nextNutritionistVisit: dp.nextNutritionistVisit || null,
          });
        }
      } catch (err: any) {
        console.error('Error loading daily program:', err);

        // Handle 401 Unauthorized
        if (err.response?.status === 401 || err.message === 'Not authenticated') {
          setError('Session expirée');
        } else if (err.response?.status === 404) {
          // No program for this date - this is OK, just clear the data
          setDailyProgram(null);
        } else {
          setError('Erreur lors du chargement des données');
        }
      } finally {
        setLoading(false);
      }
    },
    [token, isAuthenticated]
  );

  // Load profile data and program info on mount
  useEffect(() => {
    if (isAuthenticated && token) {
      const { loadProfile } = useProfileStore.getState();
      loadProfile();
      loadProgramInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]);

  // Load "me" today dashboard (subscription, today plan, nutrition)
  const loadTodayDashboard = useCallback(async () => {
    if (!token || !isAuthenticated) return;
    setDashboardLoading(true);
    try {
      const dateStr = formatDate(selectedDate);
      const data = await homeService.getTodayDashboard(dateStr);
      setTodayDashboard(data);
      useSubscriptionStore.getState().setSubscription(data?.subscription ?? null);
      useSubscriptionStore.getState().setPlan(data?.plan ?? null);
      if (data?.today?.date) {
        useNutritionStore.getState().setNutritionForDate(data.today.date, {
          targets: data.today.nutritionTargets ?? null,
          log: data.today.log ?? null,
        });
      }
    } catch {
      setTodayDashboard(null);
    } finally {
      setDashboardLoading(false);
    }
  }, [token, isAuthenticated, selectedDate]);

  useEffect(() => {
    if (isAuthenticated && token) {
      loadTodayDashboard();
    }
  }, [isAuthenticated, token, loadTodayDashboard]);

  // Body photo: only load when user adds/views photo (lazy). Home does not call /home/body-photo on mount/date change.
  const loadBodyPhoto = useCallback(
    async (date: Date) => {
      if (!token || !isAuthenticated) return;
      try {
        const dateStr = formatDate(date);
        const res = await homeService.getBodyPhoto(dateStr);
        setBodyPhoto(res?.photo || null);
      } catch {
        setBodyPhoto(null);
      }
    },
    [token, isAuthenticated]
  );

  // Load coach event for selected date
  const loadCoachEvent = useCallback(
    async (date: Date) => {
      if (!token || !isAuthenticated) return;
      try {
        const dateStr = formatDate(date);
        const res = await homeService.getCoachEvent(dateStr);
        setCoachEvent(res?.event || null);

        if (res?.event && res.event.type === 'nutrition_visit') {
          const today = new Date();
          const eventDate = new Date(res.event.date);
          if (
            today.getDate() === eventDate.getDate() &&
            today.getMonth() === eventDate.getMonth() &&
            today.getFullYear() === eventDate.getFullYear()
          ) {
            setShowNutritionistModal(true);
          }
        }
      } catch {
        setCoachEvent(null);
      }
    },
    [token, isAuthenticated]
  );

  // No /home/* on date change: home uses only /me/today (loadTodayDashboard) as single source of truth.
  // loadDailyProgram / loadBodyPhoto / loadCoachEvent only used elsewhere or on explicit user action (e.g. add photo).

  // Handle photo upload
  const handleAddPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission nécessaire pour accéder à la galerie');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        try {
          const base64 = await FS.readAsStringAsync(imageUri, {
            encoding: 'base64',
          });
          const dateStr = formatDate(selectedDate);
          await homeService.uploadBodyPhoto(dateStr, base64);
          await loadBodyPhoto(selectedDate);
        } catch (err) {
          console.error('Error uploading photo:', err);
          alert("Erreur lors de l'upload de la photo");
        }
      }
    } catch (err) {
      console.error('Error picking image:', err);
    }
  };

  // Handle refresh: single source of truth /me/today only
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTodayDashboard();
    setRefreshing(false);
  }, [loadTodayDashboard]);

  // Handle video play/pause
  const handleVideoPress = async () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        await videoRef.current.pauseAsync();
        setIsVideoPlaying(false);
      } else {
        await videoRef.current.playAsync();
        setIsVideoPlaying(true);
      }
    }
  };

  // Handle session navigation - Navigate directly to WorkoutSession
  const handleSessionPress = async (sessionIdFromDashboard?: string) => {
    const sessionId = sessionIdFromDashboard;
    if (sessionId) {
      navigation.navigate('WorkoutSession', { sessionId });
      return;
    }
    if (!dailyProgram?.sessionId) return;

    // Extract sessionId - it might be a string or an object (if populated)
    let sessionIdLegacy: string;
    if (typeof dailyProgram.sessionId === 'string') {
      sessionIdLegacy = dailyProgram.sessionId;
    } else if (dailyProgram.sessionId && typeof dailyProgram.sessionId === 'object' && '_id' in dailyProgram.sessionId) {
      sessionIdLegacy = (dailyProgram.sessionId as any)._id;
    } else if (dailyProgram.session?._id) {
      sessionIdLegacy = dailyProgram.session._id;
    } else {
      console.error('Invalid sessionId format:', dailyProgram.sessionId);
      return;
    }

    navigation.navigate('WorkoutSession', { sessionId: sessionIdLegacy });
  };

  // Get user level for season placement
  const getUserLevel = (): 'Intiate' | 'Fighter' | 'Warrior' | 'Champion' | 'Elite' => {
    return (user?.level as any) || 'Intiate';
  };

  // Get level order for progression display
  const getLevelOrder = (level: string): number => {
    const order: Record<string, number> = {
      Intiate: 0,
      Fighter: 1,
      Warrior: 2,
      Champion: 3,
      Elite: 4,
    };
    return order[level] ?? 0;
  };

  // Security: Show login prompt if not authenticated
  if (!token || !isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={styles.centerContainer}>
          <Text style={[styles.loginMessage, { color: colors.text }]}>Vous devez être connecté pour accéder à cette page</Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: (colors as any).primary || '#D4AF37' }]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const calendarDays = getCalendarDays();
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return formatDate(date) === formatDate(today);
  };
  const headerAvatarUri = resolveMediaUrl(user?.photoUri ?? null);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" colors={['#D4AF37']} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Premium Header ─────────────────────────────────────────── */}
        <LinearGradient
          colors={['rgba(212,175,55,0.12)', 'rgba(0,0,0,0)']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.header}>
            {/* Left: avatar + info */}
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => setShowLevelModal(true)} activeOpacity={0.8}>
                {headerAvatarUri ? (
                  <View style={styles.avatarRing}>
                    <Image source={{ uri: headerAvatarUri }} style={styles.profileImage} />
                  </View>
                ) : (
                  <View style={styles.avatarRing}>
                    <View style={[styles.profilePlaceholder, { backgroundColor: colors.cardBackground }]}>
                      <Ionicons name="person" size={22} color="#D4AF37" />
                    </View>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.headerUserInfo}>
                <Text style={styles.greeting}>Bonjour 👋</Text>
                <Text style={[styles.userName, { color: colors.text }]}>
                  {profile.name || user?.name || 'Athlète'}
                </Text>
                {user?.level && (
                  <TouchableOpacity
                    style={styles.levelPill}
                    onPress={() => setShowLevelModal(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trophy" size={10} color="#D4AF37" />
                    <Text style={styles.levelPillText}>{user.level}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Right: action icons */}
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setShowCalendarModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={20} color="rgba(255,255,255,0.85)" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8}>
                <Ionicons name="notifications-outline" size={20} color="rgba(255,255,255,0.85)" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconBtn, styles.iconBtnCart]}
                onPress={() => navigation.navigate('Cart')}
                activeOpacity={0.8}
              >
                <Ionicons name="bag-outline" size={20} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* ─── Date Selector ────────────────────────────────────────────── */}
        <View style={styles.dateSection}>
          <View style={styles.dateSectionRow}>
            <Text style={[styles.monthYear, { color: colors.text }]}>
              {getMonthName(selectedDate)} {selectedDate.getFullYear()}
            </Text>
            {currentProgram && (
              <View style={styles.weekBadge}>
                <Text style={styles.weekBadgeText}>
                  {currentProgram.lengthWeeks} sem.
                </Text>
              </View>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.calendarContainer}
          >
            {calendarDays.map((date, index) => {
              const isSelected = formatDate(date) === formatDate(selectedDate);
              const isTodayDate = isToday(date);

              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedDate(date)}
                  activeOpacity={0.8}
                  style={styles.dateBoxWrap}
                >
                  {isSelected ? (
                    <LinearGradient
                      colors={['#D4AF37', '#B8942E']}
                      style={styles.dateBoxSelected}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.dayNameSelected}>{getDayName(date)}</Text>
                      <Text style={styles.dayNumberSelected}>{date.getDate()}</Text>
                    </LinearGradient>
                  ) : (
                    <View
                      style={[
                        styles.dateBox,
                        { borderColor: colors.border },
                        isTodayDate && styles.dateBoxToday,
                      ]}
                    >
                      <Text style={[styles.dayName, { color: colors.textSecondary }]}>
                        {getDayName(date)}
                      </Text>
                      <Text style={[styles.dayNumber, { color: isTodayDate ? '#D4AF37' : colors.text }]}>
                        {date.getDate()}
                      </Text>
                      {isTodayDate && <View style={styles.todayDot} />}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Loading State */}
        {loading && !dailyProgram && (
          <View style={styles.loadingContainer}>
            <AppLoader variant="inline" size="lg" label="Chargement…" />
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          </View>
        )}

        {/* New "me" dashboard */}
        {todayDashboard && (
          <View style={styles.dashboardSection}>
            <SubscriptionCard subscription={subscription} subscriptionState={subscriptionState} onRenew={() => {}} />

            <View style={styles.dashboardCardSpacer}>
              <TodayPlanCard
                levelName={todayDashboard.subscription?.levelName ?? undefined}
                weekNumber={todayDashboard.today.weekNumber}
                dayName={todayDashboard.today.dayName}
                sessionTemplate={todayDashboard.today.sessionTemplate}
                onStartSession={() => {
                  const id = todayDashboard.today.sessionId ?? todayDashboard.today.sessionTemplate?.sessionTemplateId;
                  if (id) handleSessionPress(id);
                }}
                onViewWeek={() => navigation.navigate('WeekPlan', { weekNumber: todayDashboard.today.weekNumber })}
                locked={subscriptionState.isExpired}
              />
            </View>

            <View style={styles.dashboardCardSpacer}>
              <NutritionCard
                targets={nutritionFromStore?.targets ?? todayDashboard.today.nutritionTargets}
                meals={todayDashboard.today.meals}
                consumedCalories={nutritionFromStore?.log?.consumedCalories ?? todayDashboard.today.log?.consumedCalories}
                waterMl={nutritionFromStore?.log?.waterMl ?? todayDashboard.today.log?.waterMl}
                locked={subscriptionState.isExpired}
              />
            </View>

            <View style={styles.dashboardCardSpacer}>
              <ProgressSection
                streaks={todayDashboard.progress?.streaks}
                level={todayDashboard.progress?.level}
                lastWorkout={(todayDashboard.progress?.lastWorkout as string | null) ?? null}
              />
            </View>
          </View>
        )}

        {/* Lock overlay when subscription expired */}
        {subscriptionState.isExpired && todayDashboard && (
          <View style={styles.lockOverlay} pointerEvents="box-none">
            <View style={styles.lockOverlayContent}>
              <Ionicons name="lock-closed" size={48} color="#EF4444" />
              <Text style={styles.lockOverlayTitle}>Abonnement expiré</Text>
              <Text style={styles.lockOverlaySubtitle}>Renouvelez pour débloquer entraînement et nutrition</Text>
            </View>
          </View>
        )}

        {/* Program Completion Message */}
        {!loading && dailyProgram && dailyProgram.isProgramCompleted && (
          <View style={[styles.completionBanner, { backgroundColor: '#FF6B35' }]}>
            <Ionicons name="checkmark-circle" size={32} color="#FFFFFF" />
            <View style={styles.completionTextContainer}>
              <Text style={styles.completionTitle}>Programme du jour terminé</Text>
              <Text style={styles.completionSubtitle}>RDV nutritionniste aujourd'hui</Text>
            </View>
          </View>
        )}

        {/* Content (legacy when me/today not used) */}
        {!todayDashboard && !loading && dailyProgram && (
          <>
            {/* Objectif Principal */}
            {dailyProgram.mainObjective && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Objectif principal</Text>
                <TouchableOpacity style={[styles.mainObjectiveCard, { backgroundColor: colors.cardBackground }]} activeOpacity={0.9} onPress={handleVideoPress}>
                  <Video
                    ref={videoRef}
                    source={require('../../assets/video_objectif.mp4')}
                    style={styles.videoPlayer}
                    resizeMode={ResizeMode.COVER}
                    isLooping
                    shouldPlay={false}
                    useNativeControls={false}
                    onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                      if (status.isLoaded) {
                        setIsVideoPlaying(status.isPlaying);
                      }
                    }}
                  />
                  {!isVideoPlaying && (
                    <View style={styles.playButtonOverlay}>
                      <Ionicons name="play-circle" size={64} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Objectif du Jour */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Objectif du jour</Text>

              {(dailyProgram.waterTarget || dailyProgram.calorieTarget) && (
                <View style={styles.statsRow}>
                  {dailyProgram.waterTarget && (
                    <View style={[styles.statCard, { backgroundColor: '#1E3A5F' }]}>
                      <Ionicons name="water" size={24} color="#4A90E2" />
                      <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{dailyProgram.waterTarget}ml</Text>
                      <Text style={[styles.statLabel, { color: '#B0C4DE' }]}>Eau</Text>
                      <View style={styles.waterWave} />
                    </View>
                  )}
                  {dailyProgram.calorieTarget && (
                    <View style={[styles.statCard, { backgroundColor: '#FF6B35', opacity: 0.9 }]}>
                      <Ionicons name="flame" size={24} color="#FFFFFF" />
                      <Text style={[styles.statValue, { color: '#FFFFFF' }]}>{dailyProgram.calorieTarget} Kcal</Text>
                      <Text style={[styles.statLabel, { color: '#FFE5D9' }]}>Calories</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Session Card */}
              {dailyProgram.sessionId ? (
                (() => {
                  const today = new Date();
                  const programDate = new Date(dailyProgram.date);
                  const isTodayDate =
                    today.getDate() === programDate.getDate() &&
                    today.getMonth() === programDate.getMonth() &&
                    today.getFullYear() === programDate.getFullYear();

                  const isCompleted = !!dailyProgram.completed;

                  return (
                    <TouchableOpacity
                      style={[styles.sessionCard, { backgroundColor: colors.cardBackground }]}
                      onPress={() => handleSessionPress()}
                      activeOpacity={0.8}
                    >
                      <View style={styles.sessionCardHeader}>
                        <View style={styles.sessionCardLeft}>
                          <Ionicons name={isCompleted ? 'checkmark-circle' : 'fitness-outline'} size={24} color="#D4AF37" />
                          <View style={styles.sessionCardInfo}>
                            <Text style={[styles.sessionCardTitle, { color: colors.text }]}>{dailyProgram.session?.title || 'Ma Séance'}</Text>
                            {dailyProgram.session?.duration && (
                              <Text style={[styles.sessionCardDuration, { color: colors.textSecondary }]}>{dailyProgram.session.duration} min</Text>
                            )}
                          </View>
                        </View>
                        {isCompleted && (
                          <View style={styles.completedBadge}>
                            <Text style={styles.completedBadgeText}>Terminé</Text>
                          </View>
                        )}
                      </View>

                      {dailyProgram.session?.exercises && dailyProgram.session.exercises.length > 0 && (
                        <View style={styles.sessionCardExercises}>
                          <Text style={[styles.sessionCardExercisesText, { color: colors.textSecondary }]}>
                            {dailyProgram.session.exercises.length} exercice{dailyProgram.session.exercises.length > 1 ? 's' : ''}
                          </Text>
                        </View>
                      )}

                      <TouchableOpacity
                        style={[styles.sessionCardButton, { backgroundColor: isCompleted ? '#666666' : '#D4AF37' }]}
                        onPress={() => handleSessionPress()}
                        activeOpacity={0.8}
                      >
                        <Ionicons name={isCompleted ? 'checkmark-circle' : 'play-circle'} size={20} color={isCompleted ? '#FFFFFF' : '#000000'} />
                        <Text style={[styles.sessionCardButtonText, { color: isCompleted ? '#FFFFFF' : '#000000' }]}>
                          {isCompleted ? 'Séance terminée' : isTodayDate ? 'Commencer la séance' : 'Voir la séance'}
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })()
              ) : (
                <View style={[styles.restCard, { backgroundColor: colors.cardBackground }]}>
                  <Ionicons name="moon-outline" size={24} color={colors.textSecondary} />
                  <Text style={[styles.restCardText, { color: colors.textSecondary }]}>Jour de repos</Text>
                </View>
              )}
            </View>

            {/* Body Progression Photo */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Photo de progression</Text>
              {bodyPhoto ? (
                <TouchableOpacity style={[styles.photoCard, { backgroundColor: colors.cardBackground }]} onPress={() => setShowPhotoModal(true)} activeOpacity={0.8}>
                  <Image source={{ uri: bodyPhoto.imageUrl }} style={styles.photoThumbnail} resizeMode="cover" />
                  <View style={styles.photoInfo}>
                    <Ionicons name="camera" size={20} color={colors.textSecondary} />
                    <Text style={[styles.photoDate, { color: colors.textSecondary }]}>{new Date(bodyPhoto.date).toLocaleDateString('fr-FR')}</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.addPhotoButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
                  onPress={handleAddPhoto}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera-outline" size={24} color={colors.textSecondary} />
                  <Text style={[styles.addPhotoText, { color: colors.textSecondary }]}>+ Photo du jour</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Program Period & Next Nutritionist Visit */}
            {(programInfo?.startDate || programInfo?.nextNutritionistVisit) && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Programme en cours</Text>

                {programInfo?.startDate && programInfo?.endDate && (
                  <View style={[styles.programCard, { backgroundColor: colors.cardBackground }]}>
                    <View style={styles.programRow}>
                      <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                      <Text style={[styles.programText, { color: colors.textSecondary }]}>
                        Du{' '}
                        {new Date(programInfo.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au{' '}
                        {new Date(programInfo.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </Text>
                    </View>
                  </View>
                )}

                {programInfo?.nextNutritionistVisit && (
                  <View style={[styles.nutritionistCard, { backgroundColor: '#A855F7', opacity: 0.9 }]}>
                    <View style={styles.nutritionistRow}>
                      <Ionicons name="medical-outline" size={24} color="#FFFFFF" />
                      <View style={styles.nutritionistTextContainer}>
                        <Text style={styles.nutritionistTitle}>Prochain RDV nutritionniste</Text>
                        <Text style={styles.nutritionistDate}>
                          {new Date(programInfo.nextNutritionistVisit).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Emplacement de la saison */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Emplacement de la saison</Text>

              <View style={styles.seasonPlacementContainer}>
                {['Intiate', 'Fighter', 'Warrior', 'Champion', 'Elite'].map((level, index) => {
                  const levelKey = level as 'Intiate' | 'Fighter' | 'Warrior' | 'Champion' | 'Elite';
                  const currentLevel = getUserLevel();
                  const isCompleted = getLevelOrder(levelKey) <= getLevelOrder(currentLevel);
                  const isCurrent = levelKey === currentLevel;

                  const levelIcons: Record<string, any> = {
                    Intiate: require('../../assets/level/Intiate.png'),
                    Fighter: require('../../assets/level/Fighter.png'),
                    Warrior: require('../../assets/level/Fighter.png'),
                    Champion: require('../../assets/level/Champion.png'),
                    Elite: require('../../assets/level/Elite.png'),
                  };

                  const levelColors: Record<string, string> = {
                    Intiate: '#CD7F32',
                    Fighter: '#C0C0C0',
                    Warrior: '#FFD700',
                    Champion: '#FFD700',
                    Elite: '#E8E8E8',
                  };

                  return (
                    <View key={level} style={styles.levelItem}>
                      {index > 0 && <View style={[styles.levelConnector, { backgroundColor: isCompleted ? '#D4AF37' : '#333333' }]} />}
                      <View style={styles.levelPedestal}>
                        <View
                          style={[
                            styles.levelBadgeContainer,
                            { borderColor: isCurrent ? '#D4AF37' : isCompleted ? levelColors[levelKey] : '#333333' },
                            isCurrent && styles.levelBadgeCurrent,
                            isCompleted && styles.levelBadgeCompleted,
                          ]}
                        >
                          <Image source={levelIcons[levelKey]} style={[styles.levelBadgeImage, !isCompleted && { opacity: 0.3 }]} resizeMode="contain" />
                        </View>

                        <View style={styles.levelBadgeLabel}>
                          <Text
                            style={[
                              styles.levelBadgeLabelText,
                              { color: isCurrent ? '#D4AF37' : isCompleted ? levelColors[levelKey] : colors.textSecondary },
                            ]}
                          >
                            UH {level.toUpperCase()}
                          </Text>
                          {isCurrent && <Text style={[styles.currentLevelText, { color: '#D4AF37' }]}>(Actuel)</Text>}
                        </View>

                        {isCompleted && (
                          <View style={styles.checkmarkContainer}>
                            <Ionicons name="checkmark-circle" size={20} color="#D4AF37" />
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              {currentProgram && (
                <View style={[styles.programPeriodCard, { backgroundColor: colors.cardBackground }]}>
                  <View style={styles.programPeriodHeader}>
                    <Ionicons name="calendar" size={24} color="#D4AF37" />
                    <Text style={[styles.programPeriodTitle, { color: colors.text }]}>Programme {currentProgram.lengthWeeks} semaines</Text>
                  </View>

                  <View style={styles.programProgressContainer}>
                    <View style={[styles.programProgressBar, { backgroundColor: colors.cardBackground }]}>
                      <View style={[styles.programProgressFill, { width: `${currentProgram.progressPercentage}%`, backgroundColor: '#D4AF37' }]} />
                    </View>
                    <Text style={[styles.programProgressText, { color: colors.text }]}>{currentProgram.progressPercentage}%</Text>
                  </View>

                  <View style={styles.programDayCounter}>
                    <Text style={[styles.programDayText, { color: colors.text }]}>
                      Jour {currentProgram.currentDay} / {currentProgram.totalDays}
                    </Text>
                    {currentProgram.daysRemaining > 0 && (
                      <Text style={[styles.programDaysRemaining, { color: colors.textSecondary }]}>
                        {currentProgram.daysRemaining} jour{currentProgram.daysRemaining > 1 ? 's' : ''} restant
                        {currentProgram.daysRemaining > 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>

                  <View style={styles.programDatesInfo}>
                    <View style={styles.programDateInfoRow}>
                      <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                      <Text style={[styles.programDateInfoLabel, { color: colors.textSecondary }]}>Début:</Text>
                      <Text style={[styles.programDateInfoValue, { color: colors.text }]}>
                        {new Date(currentProgram.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>

                    <View style={styles.programDateInfoRow}>
                      <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                      <Text style={[styles.programDateInfoLabel, { color: colors.textSecondary }]}>Fin:</Text>
                      <Text style={[styles.programDateInfoValue, { color: colors.text }]}>
                        {new Date(currentProgram.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                  </View>

                  {currentProgram.nextNutritionistVisit && (
                    <View style={[styles.nextVisitCard, { backgroundColor: '#A855F7', opacity: 0.9 }]}>
                      <Ionicons name="medical-outline" size={20} color="#FFFFFF" />
                      <View style={styles.nextVisitTextContainer}>
                        <Text style={styles.nextVisitLabel}>Prochain RDV nutritionniste</Text>
                        <Text style={styles.nextVisitDate}>
                          {new Date(currentProgram.nextNutritionistVisit).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          </>
        )}

        {/* Empty State */}
        {!todayDashboard && !loading && !dailyProgram && !error && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucun programme disponible pour cette date</Text>
          </View>
        )}
      </ScrollView>

      {/* Level Modal */}
      <LevelModal visible={showLevelModal} onClose={() => setShowLevelModal(false)} />

      {/* Calendar Modal */}
      <CalendarModal
        visible={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        programStartDate={programInfo?.startDate || null}
        programEndDate={programInfo?.endDate || null}
      />

      {/* Nutritionist Modal */}
      <NutritionistModal visible={showNutritionistModal} onClose={() => setShowNutritionistModal(false)} event={coachEvent} />

      {/* Photo Preview Modal */}
      <Modal visible={showPhotoModal} transparent animationType="fade" onRequestClose={() => setShowPhotoModal(false)}>
        <View style={styles.photoModalOverlay}>
          <TouchableOpacity style={styles.photoModalClose} onPress={() => setShowPhotoModal(false)}>
            <Ionicons name="close" size={32} color="#FFFFFF" />
          </TouchableOpacity>
          {bodyPhoto && <Image source={{ uri: bodyPhoto.imageUrl }} style={styles.photoModalImage} resizeMode="contain" />}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  dashboardSection: { paddingHorizontal: 20, marginTop: 20 },
  dashboardCardSpacer: { marginTop: 20 },

  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: 200,
    left: 20,
    right: 20,
    bottom: undefined,
    height: 220,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  lockOverlayContent: { alignItems: 'center' },
  lockOverlayTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginTop: 12 },
  lockOverlaySubtitle: { fontSize: 14, color: '#CCCCCC', marginTop: 6 },

  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  loginMessage: { fontSize: 18, textAlign: 'center', marginBottom: 24 },
  loginButton: { paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12 },
  loginButtonText: { color: '#000000', fontSize: 16, fontWeight: '700' },

  // ─── Header ───────────────────────────────────────────────────────────────
  headerGradient: {
    paddingTop: 56,
    paddingBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  headerUserInfo: { flex: 1 },

  // Avatar
  avatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#D4AF37',
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: { width: 44, height: 44, borderRadius: 22 },
  profilePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // User info
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 1 },
  userName: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  levelPillText: { fontSize: 11, fontWeight: '700', color: '#D4AF37' },
  programName: { fontSize: 12, marginTop: 2 },

  // Header right icons
  headerRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnCart: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  // legacy alias
  iconButton: { padding: 8 },

  // ─── Date Section ──────────────────────────────────────────────────────────
  dateSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  dateSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthYear: { fontSize: 20, fontWeight: '800' },
  weekBadge: {
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  weekBadgeText: { fontSize: 12, fontWeight: '700', color: '#D4AF37' },

  calendarContainer: { flexDirection: 'row', gap: 10 },
  dateBoxWrap: {},
  dateBox: {
    width: 56,
    height: 68,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  dateBoxToday: {
    borderColor: 'rgba(212,175,55,0.4)',
    backgroundColor: 'rgba(212,175,55,0.06)',
  },
  dateBoxSelected: {
    width: 56,
    height: 68,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  dayName: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  dayNameSelected: { fontSize: 11, fontWeight: '700', color: '#000', marginBottom: 4 },
  dayNumber: { fontSize: 18, fontWeight: '800' },
  dayNumberSelected: { fontSize: 18, fontWeight: '900', color: '#000' },
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#D4AF37', position: 'absolute', bottom: 7 },

  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },

  mainObjectiveCard: { width: '100%', height: 200, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  videoPlayer: { width: '100%', height: '100%' },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },

  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 120,
  },
  waterWave: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'rgba(74, 144, 226, 0.3)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  statValue: { fontSize: 20, fontWeight: '700', marginTop: 8, marginBottom: 4, zIndex: 1 },
  statLabel: { fontSize: 14, zIndex: 1 },

  sessionCard: { marginTop: 16, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#333333' },
  sessionCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sessionCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  sessionCardInfo: { flex: 1 },
  sessionCardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  sessionCardDuration: { fontSize: 14 },
  completedBadge: { backgroundColor: '#D4AF37', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  completedBadgeText: { color: '#000000', fontSize: 12, fontWeight: '700' },
  sessionCardExercises: { marginBottom: 16 },
  sessionCardExercisesText: { fontSize: 14 },
  sessionCardButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 8 },
  sessionCardButtonText: { fontSize: 16, fontWeight: '700' },

  restCard: {
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  restCardText: { fontSize: 16, fontWeight: '600' },

  loadingContainer: { paddingVertical: 60, alignItems: 'center' },
  errorContainer: { padding: 20, alignItems: 'center' },
  errorText: { fontSize: 16, textAlign: 'center' },

  completionBanner: { flexDirection: 'row', alignItems: 'center', padding: 20, marginHorizontal: 20, marginTop: 20, borderRadius: 16, gap: 16 },
  completionTextContainer: { flex: 1 },
  completionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  completionSubtitle: { fontSize: 14, color: '#FFFFFF', opacity: 0.9 },

  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, textAlign: 'center' },

  levelButton: { marginRight: 8 },
  levelBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#D4AF37' },
  levelBadgeText: { fontSize: 12, fontWeight: '700' },

  programCard: { padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#333333' },
  programRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  programText: { fontSize: 14, flex: 1 },

  nutritionistCard: { padding: 16, borderRadius: 12, marginTop: 8 },
  nutritionistRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nutritionistTextContainer: { flex: 1 },
  nutritionistTitle: { fontSize: 12, fontWeight: '600', color: '#FFFFFF', opacity: 0.9, marginBottom: 4 },
  nutritionistDate: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  seasonPlacementContainer: { alignItems: 'center', paddingVertical: 20, marginBottom: 24 },
  levelItem: { alignItems: 'center', marginBottom: 8, position: 'relative' },
  levelConnector: { width: 2, height: 30, marginBottom: 4 },
  levelPedestal: { alignItems: 'center', position: 'relative' },
  levelBadgeContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    padding: 4,
  },
  levelBadgeCompleted: { borderColor: '#D4AF37' },
  levelBadgeCurrent: {
    borderColor: '#D4AF37',
    borderWidth: 4,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  levelBadgeImage: { width: '100%', height: '100%' },
  levelBadgeLabel: { marginTop: 8, alignItems: 'center' },
  levelBadgeLabelText: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  currentLevelText: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  checkmarkContainer: { position: 'absolute', top: -5, right: -5 },

  programPeriodCard: { borderRadius: 16, padding: 20, marginTop: 16, borderWidth: 1, borderColor: '#333333' },
  programPeriodHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  programPeriodTitle: { fontSize: 18, fontWeight: '700' },
  programProgressContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  programProgressBar: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  programProgressFill: { height: '100%', borderRadius: 5 },
  programProgressText: { fontSize: 16, fontWeight: '700', minWidth: 50, textAlign: 'right' },
  programDayCounter: { marginBottom: 16 },
  programDayText: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  programDaysRemaining: { fontSize: 14, fontWeight: '500' },

  programDatesInfo: { gap: 8, marginBottom: 16 },
  programDateInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  programDateInfoLabel: { fontSize: 14, fontWeight: '500', minWidth: 50 },
  programDateInfoValue: { fontSize: 14, fontWeight: '600', flex: 1 },

  nextVisitCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, gap: 12 },
  nextVisitTextContainer: { flex: 1 },
  nextVisitLabel: { fontSize: 12, fontWeight: '600', color: '#FFFFFF', opacity: 0.9, marginBottom: 4 },
  nextVisitDate: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  photoCard: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#333333' },
  photoThumbnail: { width: '100%', height: 200 },
  photoInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  photoDate: { fontSize: 14 },

  addPhotoButton: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addPhotoText: { fontSize: 16, fontWeight: '600' },

  photoModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)', justifyContent: 'center', alignItems: 'center' },
  photoModalClose: { position: 'absolute', top: 60, right: 20, zIndex: 1, padding: 8 },
  photoModalImage: { width: width, height: "100%" },
});
