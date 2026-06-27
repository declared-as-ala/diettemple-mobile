/**
 * Mon Plan: all weeks in accordion, drawer header, session + exercise names.
 * Loads all weeks (1..durationWeeks), fetches session details for exercise names.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { meService, WeekPlanResponse } from '../services/meService';
import type { SessionItemConfig } from '../services/meService';
import AppLoader from '../components/AppLoader';
import DrawerScreenContainer from '../components/DrawerScreenContainer';
import { useSubscriptionStore } from '../store/subscriptionStore';

type WeekPlanRouteProp = RouteProp<RootStackParamList, 'WeekPlan'>;
type WeekPlanNavProp = StackNavigationProp<RootStackParamList, 'WeekPlan'>;

const DAY_LABELS: Record<string, string> = {
  mon: 'Lundi',
  tue: 'Mardi',
  wed: 'Mercredi',
  thu: 'Jeudi',
  fri: 'Vendredi',
  sat: 'Samedi',
  sun: 'Dimanche',
};

const ACCENT = '#D4AF37';

const sessionOverviewBg = require('../../assets/session_overview.png');

type WeekData = WeekPlanResponse['plan'];
type SessionDetail = { title?: string; durationMinutes?: number; exerciseNames: string[] };

export default function WeekPlanScreen() {
  const route = useRoute<WeekPlanRouteProp>();
  const navigation = useNavigation<WeekPlanNavProp>();
  const { colors } = useTheme();
  const planBounds = useSubscriptionStore((s) => s.plan);
  const durationWeeks = planBounds?.durationWeeks ?? 5;

  const [weeks, setWeeks] = useState<(WeekData & { weekNumber: number })[]>([]);
  const [sessionDetails, setSessionDetails] = useState<Record<string, SessionDetail>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));

  const loadAllWeeks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Promise.all(
        Array.from({ length: durationWeeks }, (_, i) => meService.getPlanWeek(i + 1))
      );
      const weekList: (WeekData & { weekNumber: number })[] = [];
      const sessionIds = new Set<string>();
      res.forEach((r, i) => {
        if (r.plan) {
          weekList.push({ ...r.plan, weekNumber: i + 1 });
          r.plan.days?.forEach((d) => {
            (d.sessions || []).forEach((s) => {
              if (s.sessionTemplateId) sessionIds.add(s.sessionTemplateId);
            });
          });
        }
      });
      setWeeks(weekList);

      const details: Record<string, SessionDetail> = {};
      await Promise.all(
        Array.from(sessionIds).map(async (id) => {
          try {
            const { session } = await meService.getSession(id);
            const items = (session?.items ?? []) as SessionItemConfig[];
            const exerciseNames = items
              .map((it) => (it.exerciseId as any)?.name)
              .filter(Boolean);
            details[id] = {
              title: session?.title,
              durationMinutes: session?.durationMinutes,
              exerciseNames,
            };
          } catch {
            details[id] = { exerciseNames: [] };
          }
        })
      );
      setSessionDetails(details);
    } catch {
      setWeeks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [durationWeeks]);

  useEffect(() => {
    loadAllWeeks();
  }, [loadAllWeeks]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAllWeeks();
  };

  const toggleWeek = (weekNum: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekNum)) next.delete(weekNum);
      else next.add(weekNum);
      return next;
    });
  };

  const levelName = weeks[0]?.levelName ?? planBounds ? undefined : undefined;

  return (
    <DrawerScreenContainer
      backgroundColor="transparent"
      headerBorderColor="rgba(255,255,255,0.2)"
      title="Mon Plan"
      subtitle={levelName}
      titleColor="#fff"
      subtitleColor="rgba(255,255,255,0.85)"
    >
      <View style={styles.container}>
        <ImageBackground
          source={sessionOverviewBg}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <View style={styles.overlay} />
          {loading && weeks.length === 0 ? (
            <View style={styles.centered}>
              <AppLoader variant="inline" size="lg" label="Chargement du plan…" />
            </View>
          ) : weeks.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="calendar-outline" size={56} color="rgba(255,255,255,0.6)" />
              <Text style={styles.emptyText}>Aucun plan disponible.</Text>
              <Text style={styles.emptySub}>Assurez-vous d'avoir un abonnement actif.</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
              }
            >
              {weeks.map((week) => (
                <View key={week.weekNumber} style={styles.weekAccordion}>
                  <TouchableOpacity
                    style={styles.weekHeader}
                    onPress={() => toggleWeek(week.weekNumber)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.weekHeaderTitle}>Semaine {week.weekNumber}</Text>
                    {week.levelName ? (
                      <Text style={styles.weekHeaderSub} numberOfLines={1}>{week.levelName}</Text>
                    ) : null}
                    <Ionicons
                      name={expandedWeeks.has(week.weekNumber) ? 'chevron-up' : 'chevron-down'}
                      size={22}
                      color="rgba(255,255,255,0.9)"
                    />
                  </TouchableOpacity>
                  {expandedWeeks.has(week.weekNumber) && (
                    <View style={styles.weekBody}>
                      {(week.days ?? []).map((day) => (
                        <View key={day.day} style={styles.dayCard}>
                          <View style={styles.dayCardHeader}>
                            <Ionicons name="calendar" size={18} color={ACCENT} />
                            <Text style={styles.dayTitle}>{DAY_LABELS[day.day] || day.day}</Text>
                          </View>
                          {day.sessions.length === 0 ? (
                            <View style={styles.restBlock}>
                              <Ionicons name="bed-outline" size={24} color="rgba(255,255,255,0.5)" />
                              <Text style={styles.restLabel}>Repos</Text>
                            </View>
                          ) : (
                            <View style={styles.sessionsList}>
                              {day.sessions.map((s, i) => {
                                const detail = s.sessionTemplateId ? sessionDetails[s.sessionTemplateId] : null;
                                const title = detail?.title ?? s.title ?? 'Session';
                                const duration = detail?.durationMinutes ?? s.durationMinutes;
                                const names = detail?.exerciseNames ?? [];
                                return (
                                  <View key={`${s.sessionTemplateId}-${i}`} style={styles.sessionBlock}>
                                    <View style={styles.sessionRow}>
                                      <View style={styles.sessionBullet} />
                                      <View style={styles.sessionContent}>
                                        <Text style={styles.sessionName} numberOfLines={2}>{title}</Text>
                                        {duration != null && (
                                          <Text style={styles.sessionMeta}>{duration} min</Text>
                                        )}
                                      </View>
                                    </View>
                                    {names.length > 0 && (
                                      <View style={styles.exerciseList}>
                                        {names.map((name, j) => (
                                          <Text key={j} style={styles.exerciseName} numberOfLines={1}>
                                            • {name}
                                          </Text>
                                        ))}
                                      </View>
                                    )}
                                  </View>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </ImageBackground>
      </View>
    </DrawerScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundImage: {
    flex: 1,
    width: '100%',
    minHeight: Dimensions.get('window').height,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginTop: 16, textAlign: 'center' },
  emptySub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 8, textAlign: 'center' },
  weekAccordion: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexWrap: 'wrap',
    gap: 4,
  },
  weekHeaderTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  weekHeaderSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', maxWidth: '60%' },
  weekBody: { paddingHorizontal: 14, paddingBottom: 14 },
  dayCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  dayTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  restBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
  },
  restLabel: { fontSize: 15, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)' },
  sessionsList: { gap: 12 },
  sessionBlock: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
    marginRight: 12,
  },
  sessionContent: { flex: 1, minWidth: 0 },
  sessionName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  sessionMeta: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  exerciseList: { marginTop: 8, marginLeft: 20, gap: 4 },
  exerciseName: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
});
