import React, { useState, useCallback, useEffect,useMemo,
   useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Image,
  ImageBackground,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDrawerOpen } from '../navigation/DrawerOpenContext';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useNutritionStore } from '../store/nutritionStore';
import { getSubscriptionState } from '../utils/subscriptionState';
import { todayService } from '../services/today.service';
import { meService } from '../services/meService';
import type { TodayResponse, HomeWeeklySummaryResponse, WeekPlanResponse, WeekPlanDay, ActivePlanResponse } from '../services/meService';
import { RootStackParamList } from '../types';
import type { WeekDayInfo } from '../components/home/WeekPlanner';
import WeekCalendarStrip from '../components/home/WeekCalendarStrip';
import WeeklyValidationCard from '../components/home/WeeklyValidationCard';
import { useTodayWorkout } from '../hooks/useTodayWorkout';
import { workoutProgressStorage, type DayProgressStatus } from '../services/workoutProgressStorage';
import { getLevelImageSource } from '../utils/levelAssets';
import { getLocalDateKey, addDays, formatShortDateFr, formatWeekdayFr, getPlanWeekNumber, getPlanWeekDates } from '../utils/date';
import { useTodayNutritionData } from '../hooks/useTodayNutritionData';
import { useWeeklyValidation } from '../hooks/useWeeklyValidation';
import { startupSteps } from '../utils/startupLogger';
import Svg, { Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DrawerScreenContainer from '../components/DrawerScreenContainer';
import { homeColors, homeColorsSelectedDayBg } from '../constants/homeColors';
import { resolveVideoUrl } from '../config/api.config';

const SAFE_STARTUP_DEFER_MS = 500;
const SUB_STATUS_KEY = 'diettemple_sub_status';

const GOLD = '#D4AF37';
const SURFACE = '#131313';
const SURFACE_2 = '#1C1C1C';

type NavProp = StackNavigationProp<RootStackParamList, 'Home'>;

function isToday(d: Date): boolean {
  return getLocalDateKey(d) === getLocalDateKey(new Date());
}

function normalizeSessionTitle(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const title = raw.trim();
  if (!title) return null;
  const lowered = title.toLowerCase();
  const blocked = new Set(['rep', 'reps', 'set', 'sets', 'rest', 'sec', 'seconds', 'duration']);
  if (blocked.has(lowered)) return null;
  return title;
}

function getCurrentWeekDates(weekOffset: number = 0, refDate: Date = new Date()): Date[] {
  const y = refDate.getFullYear();
  const m = refDate.getMonth();
  const d = refDate.getDate();
  const dayOfWeek = refDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const mondayThisWeek = new Date(y, m, d + mondayOffset, 0, 0, 0, 0);
  const weekStartShifted = addDays(mondayThisWeek, weekOffset * 7);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    dates.push(addDays(weekStartShifted, i));
  }
  return dates;
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

const SK_BG = '#1A1A1A';
const SK_LINE = '#272727';
const SK_DIM = '#212121';

function SkBlock({ w, h, r = 8, style }: { w?: number | string; h: number; r?: number; style?: any }) {
  return <View style={[{ width: w ?? '100%', height: h, borderRadius: r, backgroundColor: SK_LINE }, style]} />;
}

function HomeSkeleton() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const shimmer = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.85] });

  return (
    <Animated.View style={{ flex: 1, opacity: shimmer }}>
      {/* ── Header row ─────────────────────────────────────────── */}
      <View style={sk.headerRow}>
        <View style={sk.menuBtn} />
        <View style={{ flex: 1, gap: 6 }}>
          <SkBlock w="55%" h={14} r={7} />
          <SkBlock w="38%" h={10} r={5} />
        </View>
        <View style={sk.avatar} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={sk.scroll}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Plan card ──────────────────────────────────────────── */}
        <View style={sk.planCard}>
          <View style={sk.planAccent} />
          <View style={{ flex: 1, gap: 8, paddingLeft: 14 }}>
            <SkBlock w="30%" h={9} r={4} />
            <SkBlock w="55%" h={16} r={7} />
            <SkBlock w="25%" h={10} r={5} />
            <View style={sk.progressBar}>
              <View style={[sk.progressFill, { width: '42%' }]} />
            </View>
          </View>
          <View style={{ alignItems: 'center', gap: 8 }}>
            <View style={sk.statusPill} />
            <SkBlock w={52} h={9} r={4} />
          </View>
        </View>

        {/* ── Session card ───────────────────────────────────────── */}
        <View style={sk.sessionCard}>
          {/* Header */}
          <View style={sk.sessionHeader}>
            <SkBlock w="35%" h={10} r={5} />
            <View style={sk.sessionBadge} />
          </View>
          {/* Title */}
          <SkBlock w="70%" h={20} r={9} style={{ marginTop: 10 }} />
          <SkBlock w="45%" h={14} r={7} style={{ marginTop: 6 }} />
          {/* Pills row */}
          <View style={sk.pillsRow}>
            <View style={sk.metaPill} />
            <View style={sk.metaPill} />
          </View>
          {/* Divider */}
          <View style={sk.divider} />
          {/* Buttons */}
          <View style={sk.btnsRow}>
            <View style={[sk.btn, { flex: 1, backgroundColor: SK_LINE }]} />
            <View style={[sk.btn, { width: 80, backgroundColor: SK_DIM }]} />
          </View>
        </View>

        {/* ── Week calendar ──────────────────────────────────────── */}
        <View style={sk.weekRow}>
          {Array.from({ length: 7 }).map((_, i) => (
            <View key={i} style={[sk.dayChip, i === 3 && sk.dayChipActive]} />
          ))}
        </View>

        {/* ── Nutrition card ─────────────────────────────────────── */}
        <View style={sk.nutritionCard}>
          <SkBlock w="38%" h={10} r={5} style={{ marginBottom: 16 }} />
          <View style={sk.nutritionInner}>
            {/* Ring placeholder */}
            <View style={sk.ring} />
            {/* Macro bars */}
            <View style={{ flex: 1, gap: 12 }}>
              {['68%', '45%', '55%'].map((w, i) => (
                <View key={i} style={{ gap: 5 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <SkBlock w="28%" h={9} r={4} />
                    <SkBlock w="16%" h={9} r={4} />
                  </View>
                  <View style={sk.barTrack}>
                    <View style={[sk.barFill, { width: w as any }]} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const sk = StyleSheet.create({
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  menuBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: SK_LINE },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: SK_LINE },

  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 100, gap: 14 },

  // Plan card
  planCard: {
    backgroundColor: SK_BG, borderRadius: 16, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)', padding: 16,
    flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
  },
  planAccent: { width: 3, height: 52, borderRadius: 2, backgroundColor: GOLD, opacity: 0.3 },
  progressBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 2, marginTop: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: GOLD, opacity: 0.35, borderRadius: 2 },
  statusPill: { width: 44, height: 20, borderRadius: 10, backgroundColor: SK_LINE },

  // Session card
  sessionCard: {
    backgroundColor: SK_BG, borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)', padding: 18, overflow: 'hidden',
  },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessionBadge: { width: 64, height: 20, borderRadius: 10, backgroundColor: SK_LINE },
  pillsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  metaPill: { width: 80, height: 26, borderRadius: 13, backgroundColor: SK_LINE },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 14 },
  btnsRow: { flexDirection: 'row', gap: 10 },
  btn: { height: 42, borderRadius: 12 },

  // Week row
  weekRow: {
    flexDirection: 'row', gap: 6,
  },
  dayChip: {
    flex: 1, height: 58, borderRadius: 14, backgroundColor: SK_DIM,
  },
  dayChipActive: { backgroundColor: SK_LINE },

  // Nutrition card
  nutritionCard: {
    backgroundColor: SK_BG, borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)', padding: 18,
  },
  nutritionInner: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  ring: { width: 110, height: 110, borderRadius: 55, borderWidth: 9, borderColor: SK_LINE },
  barTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, backgroundColor: SK_LINE },
});

// ─── Component ───────────────────────────────────────────────────────────────

export default function HomeDashboardScreen() {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const { token, isAuthenticated, user, refreshMe } = useAuthStore();
  const subscription = useSubscriptionStore((s) => s.subscription);
  const subscriptionState = getSubscriptionState(subscription);
  const drawerContext = useDrawerOpen();
  const openDrawer = drawerContext?.openDrawer ?? (() => {});

  const [dashboard, setDashboard] = useState<TodayResponse | null>(null);
  const [activePlan, setActivePlan] = useState<ActivePlanResponse | null>(null);
  const [homeWeeklySummary, setHomeWeeklySummary] = useState<HomeWeeklySummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [safeMode, setSafeMode] = useState(true);
  const renderHomeLogged = useRef(false);

  const [weekOffset, setWeekOffset] = useState(0);
  // null = "auto" (follows today's plan week). Set explicitly when user taps nav arrows.
  const [selectedPlanWeek, setSelectedPlanWeek] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [weekPlan, setWeekPlan] = useState<{ weekNumber: number; levelName?: string; days?: WeekPlanDay[] } | null>(null);
  const [dayProgressMap, setDayProgressMap] = useState<Record<string, DayProgressStatus>>({});

  useEffect(() => {
    const t = setTimeout(() => setSafeMode(false), SAFE_STARTUP_DEFER_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!renderHomeLogged.current) {
      renderHomeLogged.current = true;
      startupSteps.renderHome();
      startupSteps.renderHomeDone();
    }
  }, []);

  const { data: todayNutritionData, loading: nutritionLoading } = useTodayNutritionData(!!token && !!isAuthenticated);
  const {
    data: weeklyValidation,
    loading: weeklyValidationLoading,
    refetch: refetchWeeklyValidation,
  } = useWeeklyValidation(!!token && !!isAuthenticated);

  const plan = dashboard?.plan;
  const activeAssignment = activePlan?.assignment;
  const planStartDate = activeAssignment?.startDate
    ? new Date(`${activeAssignment.startDate}T00:00:00`)
    : (plan?.planStartDate ? new Date(plan.planStartDate) : null);
  const planEndDate = activeAssignment?.endDate
    ? new Date(`${activeAssignment.endDate}T00:00:00`)
    : (plan?.planEndDate ? new Date(plan.planEndDate) : null);
  const durationWeeks = activeAssignment?.durationWeeks ?? plan?.durationWeeks ?? 5;
  const todayWeekNumber = dashboard?.today?.weekNumber ?? 1;
  const hasSessionToday = !!(dashboard?.today?.sessionTemplate ?? dashboard?.today?.sessionId);

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  // Plan week that contains today — computed at render time from planStartDate (no async needed)
  const planWeekForToday = planStartDate
    ? getPlanWeekNumber(planStartDate, now, durationWeeks)
    : 1;

  // If user hasn't manually navigated weeks, default to today's plan week
  const activePlanWeek = selectedPlanWeek ?? planWeekForToday;

  const usePlanCalendar = !!plan && !!planStartDate && !!planEndDate;
  const todayBeforePlanStart = !!(planStartDate && now < planStartDate);
  const planProgressPct = typeof activePlan?.progress?.completionPercent === 'number'
    ? Math.min(100, Math.max(0, activePlan.progress.completionPercent))
    : (planStartDate && planEndDate
      ? Math.min(100, Math.max(0, (Math.floor((now.getTime() - planStartDate.getTime()) / (24 * 60 * 60 * 1000)) / (durationWeeks * 7)) * 100))
      : 0);

  // If today is past the plan's end date, fall back to the regular calendar
  const todayAfterPlanEnd = !!(planEndDate && now > planEndDate);
  // When in plan calendar mode, always show the active plan week (no free navigation outside 5 weeks)
  const weekDates = usePlanCalendar && planStartDate
    ? getPlanWeekDates(planStartDate, activePlanWeek)
    : getCurrentWeekDates(weekOffset);
  const maxWeeks = usePlanCalendar ? durationWeeks : Math.max(5, durationWeeks);
  const displayWeekNumber = usePlanCalendar ? activePlanWeek : Math.min(maxWeeks, Math.max(1, todayWeekNumber + weekOffset));

  // Navigation boundary flags — prevent going outside the 5-week plan window
  const prevWeekDisabled = usePlanCalendar && activePlanWeek <= 1;
  const nextWeekDisabled = usePlanCalendar && activePlanWeek >= durationWeeks;


  const loadToday = useCallback(async (date?: string, isInitialLoad = false) => {
    if (!token || !isAuthenticated) return;
    setError(null);
    try {
      const [data, weeklySummary, planData] = await Promise.all([
        todayService.getToday(date),
        meService.getHomeWeeklySummary(),
        meService.getActivePlan(),
      ]);
      const prevStatus = await AsyncStorage.getItem(SUB_STATUS_KEY);
      const newStatus = data?.subscription?.status ?? 'EXPIRED';
      // Renewal detected — handled silently; subscription card updates automatically
      await AsyncStorage.setItem(SUB_STATUS_KEY, newStatus);
      setDashboard(data);
      setActivePlan(planData);
      // Only reset selected week to "auto-follow today" on initial load, not on refresh/refocus
      if (isInitialLoad) {
        setSelectedPlanWeek(null);
      }
      setHomeWeeklySummary(weeklySummary);
      useSubscriptionStore.getState().setSubscription(data?.subscription ?? null);
      useSubscriptionStore.getState().setPlan(data?.plan ?? null);
      if (data?.today?.date) {
        const dayData = { targets: data.today.nutritionTargets ?? null, log: data.today.log ?? null };
        useNutritionStore.getState().setNutritionForDate(data.today.date, dayData);
        const localTodayKey = getLocalDateKey(new Date());
        useNutritionStore.getState().setNutritionForDate(localTodayKey, dayData);
      }
      // selectedPlanWeek is now derived at render time from planStartDate — no manual set needed
    } catch (e) {
      setError('Erreur de chargement');
      setDashboard(null);
      setHomeWeeklySummary(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && token) {
      setLoading(true);
      loadToday(undefined, true);
    }
  }, [isAuthenticated, token]);

  // Stable key for the visible week — changes only when the week itself shifts
  const weekStartKey = weekDates.length > 0 ? getLocalDateKey(weekDates[0]) : '';

  // Only auto-select today on initial load or when week changes — NOT on day click
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (!weekDates.length) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = getLocalDateKey(today);
    const todayInWeek = weekDates.find(d => getLocalDateKey(d) === todayKey);
    
    if (todayInWeek && isFirstRender.current) {
      isFirstRender.current = false;
      setSelectedDate(todayInWeek);
    } else if (todayInWeek) {
      // Keep today selected if visible, otherwise update to make week/dates visible consistent
      setSelectedDate(prev => {
        if (!prev) return todayInWeek;
        const prevKey = getLocalDateKey(prev);
        // Only update to today if current selection is out of view
        if (!weekDates.some(d => getLocalDateKey(d) === prevKey)) {
          return todayInWeek;
        }
        return prev;
      });
    } else {
      // Today not in this week — select first day of the new week
      setSelectedDate(prev => {
        if (!prev) return weekDates[0];
        const prevKey = getLocalDateKey(prev);
        // If previous selection not in current week, update to first day of new week
        if (!weekDates.some(d => getLocalDateKey(d) === prevKey)) {
          return weekDates[0];
        }
        return prev;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartKey]);

  const loadWeekPlan = useCallback(async (weekNum: number) => {
    if (!token) return;
    try {
      const res = await meService.getPlanWeek(weekNum);
      setWeekPlan(res.plan ?? null);
    } catch {
      setWeekPlan(null);
    }
  }, [token]);

  useEffect(() => {
    if (displayWeekNumber >= 1 && displayWeekNumber <= 5 && token) {
      loadWeekPlan(displayWeekNumber);
    }
  }, [displayWeekNumber, loadWeekPlan, token]);

  const loadDayProgress = useCallback(async (dates: Date[]) => {
    const map: Record<string, DayProgressStatus> = {};
    await Promise.all(
      dates.map(async (d) => {
        const key = getLocalDateKey(d);
        map[key] = await workoutProgressStorage.getStatus(key);
      })
    );
    setDayProgressMap(map);
  }, []);

  useEffect(() => {
    if (weekDates.length) loadDayProgress(weekDates);
  }, [weekOffset, loadDayProgress, weekDates.length]);

  useFocusEffect(
    useCallback(() => {
      refreshMe().catch(() => {});
      loadToday();
      loadWeekPlan(displayWeekNumber);
      refetchWeeklyValidation();
      if (weekDates.length) loadDayProgress(weekDates);
    }, [weekDates.length, loadDayProgress, refreshMe, loadToday, loadWeekPlan, displayWeekNumber, refetchWeeklyValidation])
  );

  const activePlanWeekData = activePlan?.plan?.weeks?.find((w) => w.weekIndex === activePlanWeek - 1) ?? null;
  const dayInfo: WeekDayInfo[] = weekDates.map((d, i) => {
    const localKey = getLocalDateKey(d);
    // Match by local date key — backend dateKey is a UTC calendar date which equals
    // the local calendar date for any timezone (getLocalDateKey reads local y/m/d).
    const planDay = weekPlan?.days?.find((pd) => (pd.dateKey ?? pd.date) === localKey);
    const sessions = planDay?.sessions ?? [];
    const firstSession = sessions[0];
    const mappedDay = activePlanWeekData?.days?.find((day) => day.dayIndex === i);
    const mappedHasSession = !!mappedDay?.seance?.id;
    const mappedIsRest = mappedDay?.isRestDay ?? false;
    const planStatus = planDay?.status;
    const cleanTitle = normalizeSessionTitle(mappedDay?.seance?.name ?? firstSession?.title);
    const isRest = mappedDay ? mappedIsRest : !firstSession?.sessionTemplateId;
    const status = dayProgressMap[localKey] ?? 'none';
    return {
      date: d,
      dayIndex: i,
      isRest,
      sessionTitle: cleanTitle ?? (mappedHasSession || firstSession?.sessionTemplateId ? 'Séance du jour' : undefined),
      sessionTemplateId: (mappedDay?.seance?.id ?? firstSession?.sessionTemplateId ?? undefined) || undefined,
      status: planStatus === 'rattrapage' ? 'started' : status,
      isRattrapage: planStatus === 'rattrapage',
    };
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadToday();
    loadWeekPlan(displayWeekNumber);
    refetchWeeklyValidation();
    if (weekDates.length) loadDayProgress(weekDates);
  }, [loadToday, loadWeekPlan, displayWeekNumber, loadDayProgress, weekDates.length, refetchWeeklyValidation]);

  const selectedDayInfo = selectedDate
    ? dayInfo[weekDates.findIndex((d) => getLocalDateKey(d) === getLocalDateKey(selectedDate))]
    : null;
  const selectedSessionId = selectedDayInfo?.sessionTemplateId ?? null;
  const selectedIsToday = selectedDate ? isToday(selectedDate) : false;

  // Nutrition data
  const today = dashboard?.today;
  const todayWorkout = useTodayWorkout(dashboard);

  /**
   * When today is selected and the backend says we should run a make-up session, prefer that
   * sessionId (so user can do yesterday's missed workout from today). Otherwise use the
   * session attached to the selected day.
   */
  const RATTRAPAGE_STORAGE_KEY = '@dt_rattrapage_meta';

  const startSessionId = selectedIsToday
    ? (todayWorkout.startSessionId ?? selectedSessionId)
    : selectedSessionId;
  const canStartFromMainCard = selectedIsToday && !!startSessionId;

  // Missed sessions from THIS plan week (past days with sessions not completed)
  const missedThisWeek = useMemo(() => {
    if (!weekPlan?.days) return [];
    const todayLocalKey = getLocalDateKey(new Date());
    return weekPlan.days.filter(
      (d) => d.status === 'missed' && d.sessions.length > 0 && (d.dateKey ?? d.date ?? '') < todayLocalKey
    );
  }, [weekPlan]);

  const navigateToSessionQuickStart = useCallback((sessionId: string) => {
    (navigation as any).navigate('SessionQuickStart', { sessionId });
  }, [navigation]);

  const handleStartOrPreviewSession = () => {
    if (!startSessionId) return;
    navigateToSessionQuickStart(startSessionId);
  };

  const handleStartRattrapage = useCallback(async () => {
    const sid = todayWorkout.rattrapageSessionId;
    if (!sid) return;
    const originalDate = todayWorkout.missed?.originalDate;
    await AsyncStorage.setItem(
      RATTRAPAGE_STORAGE_KEY,
      JSON.stringify({ completionType: 'rattrapage', originalScheduledDate: originalDate ?? null })
    );
    navigateToSessionQuickStart(sid);
  }, [todayWorkout.rattrapageSessionId, todayWorkout.missed?.originalDate, RATTRAPAGE_STORAGE_KEY, navigateToSessionQuickStart]);

  const handleStartRattrapageForDay = useCallback(async (sessionId: string, originalDate: string) => {
    await AsyncStorage.setItem(
      RATTRAPAGE_STORAGE_KEY,
      JSON.stringify({ completionType: 'rattrapage', originalScheduledDate: originalDate })
    );
    navigateToSessionQuickStart(sessionId);
  }, [RATTRAPAGE_STORAGE_KEY, navigateToSessionQuickStart]);

  const handleOpenNutrition = () => {
    const parent = navigation.getParent() as any;
    const grandParent = parent?.getParent?.();
    parent?.navigate?.('Food');
    grandParent?.navigate?.('Food');
  };
  const todayDateKey = today?.date ?? getLocalDateKey(new Date());
  const targets = todayNutritionData?.targets ?? today?.nutritionTargets;
  const consumedCal = todayNutritionData?.log?.consumedCalories ?? today?.log?.consumedCalories ?? 0;
  const targetCal = targets?.dailyCalories ?? 2200;
  const caloriePct = targetCal > 0 ? Math.min(100, Math.round((consumedCal / targetCal) * 100)) : 0;
  const showCalorieSkeleton = nutritionLoading && todayNutritionData == null;

  const consumedProtein = todayNutritionData?.log?.consumedMacros?.proteinG ?? today?.log?.consumedMacros?.proteinG ?? 0;
  const consumedCarbs = todayNutritionData?.log?.consumedMacros?.carbsG ?? today?.log?.consumedMacros?.carbsG ?? 0;
  const consumedFat = todayNutritionData?.log?.consumedMacros?.fatG ?? today?.log?.consumedMacros?.fatG ?? 0;
  const targetProtein = targets?.proteinG ?? 0;
  const targetCarbs = targets?.carbsG ?? 0;
  const targetFat = targets?.fatG ?? 0;

  const sessionTemplate = today?.sessionTemplate;
  const progress = dashboard?.progress;
  const level = progress?.level ?? 1;
  const workoutStreak = progress?.streaks?.workout ?? 0;
  const nutritionStreak = progress?.streaks?.nutrition ?? 0;
  const todayStatus: DayProgressStatus = dayProgressMap[todayDateKey] ?? 'none';
  const weeklySessionsCompleted = homeWeeklySummary?.weeklySessions?.completed ?? 0;
  const weeklySessionsPlanned = Math.max(1, homeWeeklySummary?.weeklySessions?.planned ?? 1);
  const weeklyNutritionDays = homeWeeklySummary?.weeklyNutrition?.completeDays ?? 0;
  const weeklyNutritionCalories = homeWeeklySummary?.weeklyNutrition?.totalCalories ?? 0;
  const weeklySessionPct = Math.min(100, (weeklySessionsCompleted / weeklySessionsPlanned) * 100);
  const weeklyNutritionPct = Math.min(100, (weeklyNutritionDays / 7) * 100);
  const levelHomeContent = homeWeeklySummary?.levelHomeContent;
  const levelVideoUrl = resolveVideoUrl(levelHomeContent?.videoUrl);

  // Header meta
  const initials = user?.name
    ? user.name.split(' ').filter(Boolean).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  const todayLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const levelSrc = getLevelImageSource((user?.level as any) || 'Intiate');

  const isActive = subscriptionState.isActive;
  const isExpiringSoon = subscriptionState.isExpiringSoon;
  const isExpired = subscriptionState.isExpired;
  const isLocked = subscriptionState.isExpired;

  // ── Not authenticated ───────────────────────────────────────────────────────
  if (!token || !isAuthenticated) {
    return (
      <View style={styles.container}>
        {!safeMode && (
          <ImageBackground source={require('../../assets/background.png')} style={StyleSheet.absoluteFill} resizeMode="cover">
            <View style={styles.bgOverlay} />
          </ImageBackground>
        )}
        <StatusBar style="light" />
        <View style={styles.centered}>
          <Text style={styles.loginPrompt}>Connectez-vous pour accéder au tableau de bord.</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => (navigation.getParent() as any)?.getParent()?.navigate('Login')}>
            <Text style={styles.loginBtnText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Safe mode or loading skeleton ───────────────────────────────────────────
  if (safeMode || (loading && !dashboard)) {
    return (
      <View style={{ flex: 1, backgroundColor: '#050505' }}>
        <StatusBar style="light" />
        <HomeSkeleton />
      </View>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <DrawerScreenContainer
      backgroundColor="transparent"
      headerBorderColor="rgba(255,255,255,0.06)"
      renderHeader={() => (
        <View style={styles.headerRow}>
          {/* Menu button */}
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={openDrawer}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="menu" size={22} color={homeColors.offWhite} />
          </TouchableOpacity>

          {/* Greeting */}
          <View style={styles.headerGreeting}>
            <Text style={styles.headerDate} numberOfLines={1}>{todayLabel}</Text>
          </View>

          {/* Always show level logo (fallback to Intiate) */}
          <Image source={levelSrc} style={styles.headerLevelLogo} resizeMode="contain" />
        </View>
      )}
    >
      <View style={styles.container}>
        <ImageBackground
          source={require('../../assets/background.png')}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        <View style={styles.bgOverlay} />
        <StatusBar style="light" />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Expiring banner ─────────────────────────────────────── */}
          {isExpiringSoon && (
            <View style={styles.expiringBanner}>
              <Ionicons name="time-outline" size={16} color="#FBBF24" />
              <Text style={styles.expiringBannerText}>
                Abonnement expire dans{' '}
                <Text style={{ fontWeight: '800' }}>
                  {subscriptionState.daysLeft} jour{subscriptionState.daysLeft !== 1 ? 's' : ''}
                </Text>
              </Text>
              <TouchableOpacity onPress={() => {}} activeOpacity={0.8}>
                <Text style={styles.expiringBannerLink}>Renouveler</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Expired card ─────────────────────────────────────────── */}
          {isExpired && (
            <View style={styles.expiredCard}>
              <Ionicons name="lock-closed" size={28} color="#EF5350" />
              <View style={{ flex: 1 }}>
                <Text style={styles.expiredCardTitle}>Abonnement expiré</Text>
                <Text style={styles.expiredCardSub}>Renouvelez pour continuer votre programme.</Text>
              </View>
              <TouchableOpacity style={styles.expiredCardBtn} onPress={() => {}} activeOpacity={0.85}>
                <Text style={styles.expiredCardBtnText}>Renouveler</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Today's session card ─────────────────────────────────── */}
          <ImageBackground
            source={require('../../assets/background_card.png')}
            style={styles.sessionCard}
            imageStyle={styles.sessionCardImage}
            resizeMode="cover"
          >
            <View style={styles.sessionCardOverlay} />
            {/* Header row */}
            <View style={styles.sessionCardHeader}>
              <Text style={styles.sessionCardLabel}>
                {selectedDate
                  ? `SÉANCE DU ${selectedDate.toLocaleDateString('fr-FR', { weekday: 'long' }).toUpperCase()}`
                  : 'SÉANCE DU JOUR'}
              </Text>
              {selectedDayInfo?.sessionTemplateId ? (
                <View style={[
                  styles.sessionStatusBadge,
                  selectedDayInfo.status === 'completed' && styles.sessionStatusDone,
                  selectedDayInfo.status === 'started' && styles.sessionStatusStarted,
                  selectedDayInfo.isRattrapage && styles.sessionStatusRattrapage,
                ]}>
                  <Text style={[
                    styles.sessionStatusText,
                    selectedDayInfo.status === 'completed' && { color: '#4ADE80' },
                    selectedDayInfo.status === 'started' && { color: '#93C5FD' },
                    selectedDayInfo.isRattrapage && { color: '#FDBA74' },
                  ]}>
                    {selectedDayInfo.isRattrapage
                      ? '↺ Rattrapage'
                      : selectedDayInfo.status === 'completed'
                      ? '✓ Terminée'
                      : selectedDayInfo.status === 'started'
                        ? '● En cours'
                        : '○ À faire'}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Session title */}
            <Text style={styles.sessionTitle} numberOfLines={2}>
              {selectedDayInfo?.sessionTitle
                ? selectedDayInfo.sessionTitle
                : selectedDayInfo?.isRest
                  ? 'Repos'
                  : 'Aucune séance ce jour'}
            </Text>

            {/* Divider + start button — only for today's workout */}
            {canStartFromMainCard && (
              <>
                <View style={styles.sessionDivider} />
                <View style={styles.sessionBtns}>
                  <TouchableOpacity
                    style={[styles.sessionStartBtn, isLocked && styles.sessionStartBtnDisabled]}
                    onPress={handleStartOrPreviewSession}
                    disabled={isLocked}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name="play"
                      size={16}
                      color={isLocked ? homeColors.graphite : '#000'}
                    />
                    <Text style={[styles.sessionStartBtnText, isLocked && { color: homeColors.graphite }]}>
                      Démarrer
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ImageBackground>

          {/* ── Week planner (calendar under séance du jour) ─────────── */}
          <View style={styles.weekCard}>
            <View style={styles.weekNavRow}>
              <TouchableOpacity
                onPress={() => {
                  if (prevWeekDisabled) return;
                  if (usePlanCalendar) setSelectedPlanWeek(Math.max(1, activePlanWeek - 1));
                  else setWeekOffset((w: number) => w - 1);
                }}
                hitSlop={12}
                style={[styles.weekNavBtn, prevWeekDisabled && { opacity: 0.25 }]}
                disabled={prevWeekDisabled}
              >
                <Ionicons name="chevron-back" size={18} color={homeColors.graphite} />
              </TouchableOpacity>
              <View style={styles.weekNavCenter}>
                <Text style={styles.weekNavRange}>
                  {weekDates.length === 7
                    ? `${formatShortDateFr(weekDates[0])} — ${formatShortDateFr(weekDates[6])}`
                    : ''}
                </Text>
                {usePlanCalendar && (
                  <View style={styles.weekNavBottomRow}>
                    <Text style={styles.weekNavPlanWeek}>Semaine {activePlanWeek} / {durationWeeks}</Text>
                    {activePlanWeek !== planWeekForToday && (
                      <TouchableOpacity
                        onPress={() => setSelectedPlanWeek(null)}
                        style={styles.todayPill}
                      >
                        <Text style={styles.todayPillText}>Aujourd'hui</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (nextWeekDisabled) return;
                  if (usePlanCalendar) setSelectedPlanWeek(Math.min(durationWeeks, activePlanWeek + 1));
                  else setWeekOffset((w: number) => w + 1);
                }}
                hitSlop={12}
                style={[styles.weekNavBtn, nextWeekDisabled && { opacity: 0.25 }]}
                disabled={nextWeekDisabled}
              >
                <Ionicons name="chevron-forward" size={18} color={homeColors.graphite} />
              </TouchableOpacity>
            </View>
            <WeekCalendarStrip
              dates={weekDates}
              planDays={weekPlan?.days ?? null}
              localCompleted={Object.fromEntries(
                Object.entries(dayProgressMap).map(([k, v]) => [k, v === 'completed'])
              )}
              selectedDate={selectedDate}
              onSelectDay={(d) => setSelectedDate(d)}
            />
          </View>

          {/* ── Rattrapage card (always visible when available, regardless of selected day) ── */}
          {todayWorkout.hasRattrapage && (
            <View style={styles.rattrapageCard}>
              <View style={styles.rattrapageAccent} />
              <View style={styles.rattrapageContent}>
                <View style={styles.rattrapageHeaderRow}>
                  <View style={styles.rattrapagePill}>
                    <Ionicons name="return-down-back" size={11} color="#92400E" />
                    <Text style={styles.rattrapagePillText}>RATTRAPAGE</Text>
                  </View>
                  {todayWorkout.missed?.originalDate ? (
                    <Text style={styles.rattrapageDate}>
                      {(() => {
                        const d = new Date(todayWorkout.missed.originalDate + 'T12:00:00Z');
                        return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
                      })()}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.rattrapageTitle} numberOfLines={2}>
                  {todayWorkout.missed?.title ?? 'Séance à rattraper'}
                </Text>
                {(todayWorkout.missed?.durationMinutes || todayWorkout.missed?.exerciseCount) ? (
                  <View style={styles.rattrapageMeta}>
                    {!!todayWorkout.missed?.durationMinutes && (
                      <View style={styles.rattrapageMetaItem}>
                        <Ionicons name="time-outline" size={12} color="#B45309" />
                        <Text style={styles.rattrapageMetaText}>{todayWorkout.missed.durationMinutes} min</Text>
                      </View>
                    )}
                    {!!todayWorkout.missed?.exerciseCount && (
                      <View style={styles.rattrapageMetaItem}>
                        <Ionicons name="barbell-outline" size={12} color="#B45309" />
                        <Text style={styles.rattrapageMetaText}>{todayWorkout.missed.exerciseCount} exercices</Text>
                      </View>
                    )}
                  </View>
                ) : null}
              </View>
              <TouchableOpacity
                style={[styles.rattrapageBtn, isLocked && styles.rattrapageBtnDisabled]}
                onPress={handleStartRattrapage}
                disabled={isLocked}
                activeOpacity={0.85}
              >
                <Ionicons name="play" size={14} color={isLocked ? '#7C6520' : '#1C1100'} />
                <Text style={[styles.rattrapageBtnText, isLocked && { color: '#7C6520' }]}>
                  Rattraper
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Missed sessions this week ────────────────────────────── */}
          {missedThisWeek.length > 0 && (
            <View style={styles.missedWeekCard}>
              <View style={styles.missedWeekHeader}>
                <Ionicons name="alert-circle-outline" size={14} color="#F87171" />
                <Text style={styles.missedWeekTitle}>SÉANCES MANQUÉES CETTE SEMAINE</Text>
              </View>
              {missedThisWeek.map((day) => {
                const firstSession = day.sessions[0];
                const dateLabel = (() => {
                  try {
                    const d = new Date((day.dateKey ?? day.date ?? '') + 'T12:00:00Z');
                    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
                  } catch { return day.dateKey ?? ''; }
                })();
                return (
                  <View key={day.dateKey ?? day.date} style={styles.missedWeekRow}>
                    <View style={styles.missedWeekRowLeft}>
                      <Text style={styles.missedWeekDate}>{dateLabel}</Text>
                      <Text style={styles.missedWeekSession} numberOfLines={1}>
                        {firstSession.title ?? 'Séance'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.missedWeekBtn, isLocked && styles.rattrapageBtnDisabled]}
                      disabled={isLocked}
                      onPress={() => handleStartRattrapageForDay(
                        firstSession.sessionTemplateId,
                        day.dateKey ?? day.date ?? ''
                      )}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="play" size={12} color={isLocked ? '#7C6520' : '#1C1100'} />
                      <Text style={[styles.missedWeekBtnText, isLocked && { color: '#7C6520' }]}>
                        Rattraper
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* ── Nutrition overview card ───────────────────────────────── */}
          <TouchableOpacity style={styles.nutritionCard} activeOpacity={0.88} onPress={handleOpenNutrition}>
            <View style={styles.nutritionHeaderRow}>
              <Text style={styles.nutritionCardLabel}>NUTRITION DU JOUR</Text>
              <View style={styles.nutritionOpenBadge}>
                <Text style={styles.nutritionOpenText}>Voir</Text>
                <Ionicons name="chevron-forward" size={14} color={homeColors.graphite} />
              </View>
            </View>

            <View style={styles.nutritionContent}>
              {/* Calorie ring */}
              <View style={styles.ringWrap}>
                {showCalorieSkeleton ? (
                  <View style={styles.ringSkeleton} />
                ) : (
                  <Svg width={110} height={110}>
                    {/* Track */}
                    <Circle cx={55} cy={55} r={46} stroke="rgba(255,255,255,0.07)" strokeWidth={9} fill="none" />
                    {/* Progress */}
                    <Circle
                      cx={55} cy={55} r={46}
                      stroke={caloriePct >= 100 ? '#EF5350' : GOLD}
                      strokeWidth={9}
                      fill="none"
                      strokeDasharray={Math.PI * 92}
                      strokeDashoffset={Math.PI * 92 * (1 - caloriePct / 100)}
                      transform="rotate(-90 55 55)"
                      strokeLinecap="round"
                    />
                  </Svg>
                )}
                <View style={styles.ringCenter}>
                  <Text style={styles.ringValue}>{showCalorieSkeleton ? '—' : consumedCal}</Text>
                  <Text style={styles.ringUnit}>kcal</Text>
                  <Text style={styles.ringTarget}>/ {showCalorieSkeleton ? '—' : targetCal}</Text>
                </View>
              </View>

              {/* Macro bars */}
              <View style={styles.macroCol}>
                {[
                  { label: 'Prot.', consumed: consumedProtein, target: targetProtein, color: '#FF6B9D' },
                  { label: 'Gluc.', consumed: consumedCarbs, target: targetCarbs, color: '#60A5FA' },
                  { label: 'Lip.', consumed: consumedFat, target: targetFat, color: GOLD },
                ].map(({ label, consumed, target, color }) => {
                  const pct = target > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0;
                  return (
                    <View key={label} style={styles.macroRow}>
                      <Text style={styles.macroLabel}>{label}</Text>
                      <View style={styles.macroBarBg}>
                        <View style={[styles.macroBarFill, { width: `${pct}%`, backgroundColor: color }]} />
                      </View>
                      <Text style={styles.macroValue}>
                        {showCalorieSkeleton ? '—' : `${Math.round(consumed)}g`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </TouchableOpacity>

          <WeeklyValidationCard
            loading={weeklyValidationLoading}
            data={weeklyValidation}
          />

          {/* ── Level media + instructions (always visible; placeholders if empty) ─ */}
          <View style={styles.levelContentCard}>
            <Text style={styles.levelContentLabel}>VIDÉO & INSTRUCTIONS</Text>
            {levelVideoUrl ? (
              <View style={styles.levelVideoWrap}>
                <Video
                  source={{ uri: levelVideoUrl }}
                  style={styles.levelVideo}
                  resizeMode={ResizeMode.COVER}
                  useNativeControls
                />
              </View>
            ) : (
              <View style={styles.levelVideoPlaceholder}>
                <Ionicons name="videocam-outline" size={36} color={homeColors.graphite} />
                <Text style={styles.levelPlaceholderText}>
                  Aucune vidéo pour le moment. L’équipe peut en ajouter depuis l’admin (contenu par niveau).
                </Text>
              </View>
            )}
            {!!levelHomeContent?.instructions?.trim() ? (
              <Text style={styles.levelContentText}>{levelHomeContent.instructions}</Text>
            ) : (
              <Text style={styles.levelPlaceholderHint}>
                Les consignes et instructions de votre coach apparaîtront ici lorsqu’elles seront publiées pour votre
                niveau.
              </Text>
            )}
          </View>

          {/* ── Plan card (programme progress) moved lower priority ───── */}
          {(usePlanCalendar && planStartDate && planEndDate) && (
            <LinearGradient
              colors={['#1A1200', '#201800', '#1A1200']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.planCard}
            >
              <View style={styles.planCardAccent} />

              <View style={styles.planCardLeft}>
                <Text style={styles.planCardLabel}>MON PROGRAMME</Text>
                <Text style={styles.planCardWeek}>
                  Semaine {activePlanWeek} / {durationWeeks}
                </Text>
                <View style={styles.planProgressBg}>
                  <View style={[styles.planProgressFill, { width: `${planProgressPct}%` }]} />
                </View>
                <Text style={styles.planProgressPct}>
                  {Math.round(planProgressPct)}% complété
                </Text>
              </View>

              <View style={styles.planCardRight}>
                {isExpired ? (
                  <View style={[styles.planStatusPill, styles.planStatusExpired]}>
                    <Text style={styles.planStatusText}>Expiré</Text>
                  </View>
                ) : isExpiringSoon ? (
                  <View style={[styles.planStatusPill, styles.planStatusExpiring]}>
                    <Text style={styles.planStatusText}>{subscriptionState.daysLeft}j</Text>
                  </View>
                ) : (
                  <View style={[styles.planStatusPill, styles.planStatusActive]}>
                    <Text style={styles.planStatusText}>Actif</Text>
                  </View>
                )}
                <Text style={styles.planEndDate}>
                  Fin {formatShortDateFr(planEndDate)}
                </Text>
              </View>
            </LinearGradient>
          )}

          {/* ── Error ───────────────────────────────────────────────── */}
          {error && (
            <View style={styles.errorRow}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => loadToday()} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Réessayer</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </DrawerScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.78)',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 0 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },

  // ── Header ──────────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    minHeight: 56,
    gap: 10,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  headerGreeting: {
    flex: 1,
    minWidth: 0,
  },
  headerGreetingText: {
    fontSize: 17,
    fontWeight: '800',
    color: homeColors.offWhite,
    letterSpacing: 0.1,
  },
  headerDate: {
    fontSize: 12,
    color: homeColors.graphite,
    marginTop: 1,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  headerLevelLogo: { width: 38, height: 38 },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderWidth: 1.5,
    borderColor: GOLD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: '800',
    color: GOLD,
    letterSpacing: 0.5,
  },

  // ── Login fallback ───────────────────────────────────────────────────────────
  loginPrompt: {
    fontSize: 16,
    color: homeColors.offWhite,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  loginBtn: {
    backgroundColor: GOLD,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  loginBtnText: { fontSize: 16, fontWeight: '800', color: '#000' },

  // ── Banners ─────────────────────────────────────────────────────────────────
  expiringBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  expiringBannerText: { flex: 1, fontSize: 13, color: '#FDE68A', fontWeight: '500' },
  expiringBannerLink: { fontSize: 13, fontWeight: '700', color: '#FBBF24' },
  expiredCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(239,83,80,0.1)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,83,80,0.25)',
    padding: 14,
    marginBottom: 12,
  },
  expiredCardTitle: { fontSize: 14, fontWeight: '800', color: '#F87171', marginBottom: 2 },
  expiredCardSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  expiredCardBtn: {
    backgroundColor: '#EF5350',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  expiredCardBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // ── Plan card ────────────────────────────────────────────────────────────────
  planCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.18)',
    overflow: 'hidden',
  },
  planCardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: GOLD,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  planCardLeft: { flex: 1, paddingLeft: 8 },
  planCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: homeColors.graphite,
    letterSpacing: 1,
    marginBottom: 4,
  },
  planCardWeek: {
    fontSize: 13,
    color: homeColors.graphite,
    marginBottom: 12,
    fontWeight: '500',
  },
  planProgressBg: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  planProgressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: GOLD,
  },
  planProgressPct: {
    fontSize: 11,
    color: homeColors.graphite,
    fontWeight: '600',
  },
  planCardRight: { alignItems: 'center', gap: 6, marginLeft: 12 },
  planStatusPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    minWidth: 64,
    alignItems: 'center',
  },
  planStatusActive: { backgroundColor: 'rgba(212,175,55,0.2)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.4)' },
  planStatusExpiring: { backgroundColor: 'rgba(251,191,36,0.15)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.35)' },
  planStatusExpired: { backgroundColor: 'rgba(239,83,80,0.15)', borderWidth: 1, borderColor: 'rgba(239,83,80,0.35)' },
  planStatusText: { fontSize: 12, fontWeight: '700', color: GOLD },
  planEndDate: { fontSize: 11, color: homeColors.graphite, fontWeight: '500' },

  // ── Rattrapage card ───────────────────────────────────────────────────────────
  rattrapageCard: {
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
    backgroundColor: '#1A0F00',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  rattrapageAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#F59E0B',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  rattrapageContent: { flex: 1 },
  rattrapageHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  rattrapagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245,158,11,0.18)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.4)',
  },
  rattrapagePillText: { fontSize: 9, fontWeight: '800', color: '#F59E0B', letterSpacing: 0.8 },
  rattrapageDate: { fontSize: 11, color: '#B45309', fontWeight: '500' },
  rattrapageTitle: { fontSize: 15, fontWeight: '700', color: '#FDE68A', marginBottom: 6, letterSpacing: 0.2 },
  rattrapageMeta: { flexDirection: 'row', gap: 12 },
  rattrapageMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rattrapageMetaText: { fontSize: 11, color: '#B45309', fontWeight: '500' },
  rattrapageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rattrapageBtnDisabled: { backgroundColor: '#2A1F00' },
  rattrapageBtnText: { fontSize: 13, fontWeight: '700', color: '#1C1100' },

  // ── Missed week card ───────────────────────────────────────────────────────
  missedWeekCard: {
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.32)',
    backgroundColor: '#170B0B',
    padding: 14,
    gap: 8,
  },
  missedWeekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  missedWeekTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FCA5A5',
    letterSpacing: 0.8,
  },
  missedWeekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: 'rgba(248,113,113,0.14)',
  },
  missedWeekRowLeft: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  missedWeekDate: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FCA5A5',
    textTransform: 'capitalize',
  },
  missedWeekSession: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FEE2E2',
  },
  missedWeekBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FB7185',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  missedWeekBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2A0B10',
  },

  // ── Session card ─────────────────────────────────────────────────────────────
  sessionCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  sessionCardImage: {
    borderRadius: 16,
  },
  sessionCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  sessionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sessionCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: homeColors.graphite,
    letterSpacing: 1,
  },
  sessionStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: 'rgba(156,163,175,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(156,163,175,0.2)',
  },
  sessionStatusDone: {
    backgroundColor: 'rgba(74,222,128,0.1)',
    borderColor: 'rgba(74,222,128,0.25)',
  },
  sessionStatusStarted: {
    backgroundColor: 'rgba(147,197,253,0.1)',
    borderColor: 'rgba(147,197,253,0.25)',
  },
  sessionStatusRattrapage: {
    backgroundColor: 'rgba(251,146,60,0.12)',
    borderColor: 'rgba(251,146,60,0.35)',
  },
  sessionStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: homeColors.graphite,
  },
  sessionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: homeColors.offWhite,
    letterSpacing: 0.1,
    lineHeight: 26,
    marginBottom: 10,
  },
  sessionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 14,
  },
  sessionBtns: { flexDirection: 'row', gap: 10 },
  sessionStartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: GOLD,
    height: 48,
    borderRadius: 13,
  },
  sessionStartBtnDisabled: { backgroundColor: '#222' },
  sessionStartBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.2,
  },
  sessionPreviewBtn: {
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sessionPreviewBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: homeColors.offWhite,
  },

  // ── Nutrition card ───────────────────────────────────────────────────────────
  nutritionCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  nutritionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  nutritionCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: homeColors.graphite,
    letterSpacing: 1,
  },
  nutritionOpenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.28)',
  },
  nutritionOpenText: {
    fontSize: 11,
    fontWeight: '700',
    color: homeColors.graphite,
  },
  nutritionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ringWrap: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringSkeleton: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: SURFACE_2,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontSize: 20,
    fontWeight: '800',
    color: homeColors.offWhite,
    letterSpacing: 0.2,
    lineHeight: 24,
  },
  ringUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: homeColors.graphite,
    letterSpacing: 0.5,
  },
  ringTarget: {
    fontSize: 10,
    color: homeColors.graphite,
    fontWeight: '500',
  },
  macroCol: { flex: 1, gap: 10 },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  macroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: homeColors.graphite,
    width: 36,
    letterSpacing: 0.3,
  },
  macroBarBg: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  macroValue: {
    fontSize: 11,
    fontWeight: '600',
    color: homeColors.offWhite,
    width: 36,
    textAlign: 'right',
  },

  // ── Progress row ─────────────────────────────────────────────────────────────
  progressRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  progressCard: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  progressCardLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: homeColors.graphite,
    letterSpacing: 1,
    marginBottom: 6,
  },
  progressCardValue: {
    fontSize: 24,
    fontWeight: '800',
    color: homeColors.offWhite,
    marginBottom: 8,
  },
  progressCardTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: homeColors.graphite,
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: GOLD,
  },
  progressCardSub: {
    fontSize: 11,
    color: homeColors.graphite,
    fontWeight: '500',
  },
  levelContentCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  levelContentLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: homeColors.graphite,
    letterSpacing: 1,
    marginBottom: 12,
  },
  levelVideoWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 10,
    backgroundColor: '#0f0f0f',
  },
  levelVideo: {
    width: '100%',
    height: 180,
  },
  levelVideoPlaceholder: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderStyle: 'dashed',
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 10,
  },
  levelPlaceholderText: {
    fontSize: 12,
    lineHeight: 18,
    color: homeColors.graphite,
    textAlign: 'center',
    fontWeight: '500',
  },
  levelPlaceholderHint: {
    fontSize: 12,
    lineHeight: 18,
    color: homeColors.graphite,
    fontWeight: '500',
    opacity: 0.85,
  },
  levelContentText: {
    fontSize: 13,
    lineHeight: 20,
    color: homeColors.graphite,
    fontWeight: '500',
  },

  // ── Week card ────────────────────────────────────────────────────────────────
  weekCard: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    paddingTop: 14,
    paddingBottom: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  weekNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 14,
  },
  weekNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekNavRange: {
    fontSize: 12,
    fontWeight: '700',
    color: homeColors.graphite,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  weekNavCenter: {
    flex: 1,
    alignItems: 'center',
  },
  weekNavPlanWeek: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D4AF37',
    marginTop: 2,
  },
  weekNavBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  todayPill: {
    backgroundColor: '#D4AF37',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  todayPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#000',
  },
  dayChipsRow: {
    flexDirection: 'row',
    gap: 5,
  },
  dayChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    gap: 3,
    minWidth: 0,
  },
  dayChipSelected: {
    backgroundColor: 'rgba(212,175,55,0.18)',
    borderColor: 'rgba(212,175,55,0.55)',
  },
  dayChipToday: {
    borderColor: 'rgba(212,175,55,0.4)',
    borderWidth: 1.5,
  },
  dayChipCompleted: {
    backgroundColor: 'rgba(74,222,128,0.06)',
    borderColor: 'rgba(74,222,128,0.2)',
  },
  dayChipLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: homeColors.graphite,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  dayChipLabelActive: { color: GOLD },
  dayChipLabelCompleted: { color: '#4ADE80' },
  dayChipNum: {
    fontSize: 15,
    fontWeight: '800',
    color: homeColors.offWhite,
  },
  dayChipNumActive: { color: GOLD },
  dayChipNumCompleted: { color: '#4ADE80' },
  dayChipRest: {
    fontSize: 9,
    color: homeColors.graphite,
    fontWeight: '600',
  },
  dayChipDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginTop: 1,
  },
  dayChipDotActive: { backgroundColor: GOLD },
  dayChipDotStarted: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#60A5FA',
    marginTop: 1,
  },

  // ── Ma semaine link ──────────────────────────────────────────────────────────
  weekLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 14,
  },
  weekLinkText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: homeColors.offWhite,
  },

  // ── Error ────────────────────────────────────────────────────────────────────
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  errorText: { fontSize: 14, color: '#EF5350', fontWeight: '600' },
  retryBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  retryBtnText: { fontSize: 14, color: GOLD, fontWeight: '700' },
});
