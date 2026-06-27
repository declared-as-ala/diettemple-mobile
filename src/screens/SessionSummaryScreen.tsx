import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types';

type Route = RouteProp<RootStackParamList, 'SessionSummary'>;
type Nav = StackNavigationProp<RootStackParamList, 'SessionSummary'>;

const ACCENT = '#D4AF37';

export default function SessionSummaryScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const params = route.params ?? { workoutSessionId: '' };
  const { timeSpentMinutes = 0, setsCompleted = 0 } = params;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: colors.cardBackground }]}>
          <Ionicons name="checkmark-circle" size={64} color={ACCENT} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Séance terminée</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Bravo !</Text>
        <View style={styles.stats}>
          {timeSpentMinutes > 0 && (
            <View style={[styles.stat, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>{timeSpentMinutes}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>min</Text>
            </View>
          )}
          {setsCompleted > 0 && (
            <View style={[styles.stat, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>{setsCompleted}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>séries</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.cta}
          onPress={() => navigation.getParent()?.goBack() ?? navigation.navigate('Home')}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>Retour à l'accueil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  iconWrap: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 16, marginBottom: 32 },
  stats: { flexDirection: 'row', gap: 16, marginBottom: 40 },
  stat: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', minWidth: 80 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 4 },
  cta: { backgroundColor: ACCENT, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12 },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#000' },
});
