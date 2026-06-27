import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../context/ThemeContext';
import { homeService, Session, Exercise } from '../services/homeService';
import { RootStackParamList } from '../types';
import AppLoader from '../components/AppLoader';

type SessionDetailScreenRouteProp = RouteProp<RootStackParamList, 'SessionDetail'>;
type SessionDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SessionDetail'>;

const { width } = Dimensions.get('window');

export default function SessionDetailScreen() {
  const navigation = useNavigation<SessionDetailScreenNavigationProp>();
  const route = useRoute<SessionDetailScreenRouteProp>();
  const { colors, isDarkMode } = useTheme();
  const { sessionId } = route.params;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      setLoading(true);
      // Ensure sessionId is a string
      const sessionIdString = typeof sessionId === 'string' ? sessionId : (sessionId as any)?._id || sessionId;
      const response = await homeService.getSession(sessionIdString);
      setSession(response.session);
    } catch (error: any) {
      console.error('Error loading session:', error);
      console.error('SessionId received:', sessionId);
      // Session will remain null, error state will be shown
    } finally {
      setLoading(false);
    }
  };

  const handleStartWorkout = () => {
    if (!session) return;
    navigation.navigate('WorkoutSession', { sessionId: session._id });
  };

  const handleExercisePress = (exercise: Exercise) => {
    navigation.navigate('ExerciseDetail', { exerciseId: exercise._id });
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={styles.loadingContainer}>
          <AppLoader variant="inline" size="lg" label="Chargement…" />
        </View>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        {/* Header with back button */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Session
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            Session introuvable
          </Text>
          <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>
            Impossible de charger les détails de la session
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {session.title}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {session.description && (
          <View style={styles.descriptionContainer}>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {session.description}
            </Text>
          </View>
        )}

        {session.duration && (
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Durée: {session.duration} minutes
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Exercices ({session.exercises.length})
          </Text>

          {session.exercises.map((exercise, index) => (
            <TouchableOpacity
              key={exercise._id || index}
              style={[styles.exerciseCard, { backgroundColor: colors.cardBackground }]}
              onPress={() => handleExercisePress(exercise)}
              activeOpacity={0.7}
            >
              <View style={styles.exerciseContent}>
                <View style={styles.exerciseInfo}>
                  <Text style={[styles.exerciseName, { color: colors.text }]}>
                    {exercise.name}
                  </Text>
                  <Text style={[styles.exerciseMuscle, { color: colors.textSecondary }]}>
                    {exercise.muscleGroup}
                  </Text>
                  {(exercise.sets || exercise.reps) && (
                    <View style={styles.exerciseStats}>
                      {exercise.sets && (
                        <Text style={[styles.statText, { color: colors.textSecondary }]}>
                          {exercise.sets} séries
                        </Text>
                      )}
                      {exercise.reps && (
                        <Text style={[styles.statText, { color: colors.textSecondary }]}>
                          {exercise.reps} répétitions
                        </Text>
                      )}
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  exerciseCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  exerciseContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  exerciseMuscle: {
    fontSize: 14,
    marginBottom: 8,
  },
  exerciseStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statText: {
    fontSize: 12,
  },
});

