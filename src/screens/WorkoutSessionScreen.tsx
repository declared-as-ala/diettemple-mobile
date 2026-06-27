import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ImageBackground,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../context/ThemeContext';
import { homeService, Session, DailyProgram } from '../services/homeService';
import { meService } from '../services/meService';
import { workoutService } from '../services/workoutService';
import { RootStackParamList } from '../types';
import AppLoader from '../components/AppLoader';

type WorkoutSessionScreenRouteProp = RouteProp<RootStackParamList, 'WorkoutSession'>;
type WorkoutSessionScreenNavigationProp = StackNavigationProp<RootStackParamList, 'WorkoutSession'>;

const { width } = Dimensions.get('window');

export default function WorkoutSessionScreen() {
  const navigation = useNavigation<WorkoutSessionScreenNavigationProp>();
  const route = useRoute<WorkoutSessionScreenRouteProp>();
  const { colors, isDarkMode } = useTheme();
  const { sessionId } = route.params;

  const [session, setSession] = useState<Session | null>(null);
  const [dailyProgram, setDailyProgram] = useState<DailyProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const sessionRef = useRef<Session | null>(null);
  const buttonScale = useRef(new Animated.Value(1)).current;
  
  // Keep sessionRef in sync with session state
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const sessionIdString = typeof sessionId === 'string' ? sessionId : (sessionId as any)?._id || sessionId;
      const response = await homeService.getSession(sessionIdString);
      setSession(response.session);
      
      // Also load today's daily program for calorie target
      try {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const dailyResponse = await homeService.getDailyProgram(dateStr);
        setDailyProgram(dailyResponse.dailyProgram);
      } catch (error) {
        // Ignore if daily program not found
      }
    } catch (error: any) {
      console.error('Error loading session:', error);
      setLoadError(error.response?.data?.message || 'Impossible de charger la session');
    } finally {
      setLoading(false);
    }
  };


  const handleStartWorkout = async () => {
    // Use ref to get current session value
    const currentSession = sessionRef.current;
    
    if (!currentSession) {
      console.log('Cannot start workout: session not loaded');
      // Try to reload session
      await loadSession();
      // Wait a moment and try again
      setTimeout(async () => {
        const retrySession = sessionRef.current;
        if (retrySession && !starting) {
          await startWorkoutWithSession(retrySession);
        }
      }, 500);
      return;
    }
    
    if (starting) {
      console.log('Workout already starting...');
      return;
    }
    
    // Animate button press
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    await startWorkoutWithSession(currentSession);
  };

  const startWorkoutWithSession = async (currentSession: Session) => {
    try {
      setStarting(true);
      const response = await workoutService.startWorkout(currentSession._id);
      navigation.navigate('ExerciseWorkout', {
        sessionId: currentSession._id,
        workoutSessionId: response.workoutSession._id,
        exercises: currentSession.exercises,
        currentExerciseIndex: 0,
      });
    } catch (error: any) {
      console.error('Error starting workout:', error);
      navigation.navigate('ExerciseWorkout', {
        sessionId: currentSession._id,
        workoutSessionId: '',
        exercises: currentSession.exercises,
        currentExerciseIndex: 0,
      });
    } finally {
      setStarting(false);
    }
  };

  // Calculate estimated calories and duration
  const estimatedCalories = session?.exercises.length ? session.exercises.length * 100 : 500;
  const estimatedDuration = session?.duration || Math.ceil((session?.exercises.length || 0) * 5 / 60); // Convert minutes to hours
  const totalExercises = session?.exercises.length || 0;
  const currentDate = new Date();
  const formattedDate = `${currentDate.getDate()}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;

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
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            {loadError || 'Session introuvable'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: '#D4AF37' }]}
            onPress={() => loadSession()}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Get muscle group for difficulty badge
  const muscleGroup = (session.exercises && session.exercises[0]?.muscleGroup) || 'Bas';

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
          Programme semaine
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!starting}
      >
        {/* Main Workout Card */}
        <View style={styles.workoutCard}>
          <ImageBackground
            source={require('../../assets/intro.jpg')} // Using existing asset, replace with workout image
            style={styles.workoutCardBackground}
            imageStyle={styles.workoutCardImage}
          >
            {/* Overlay gradient */}
            <View style={styles.workoutCardOverlay} />
            
            {/* Top Row: Date and Progress */}
            <View style={styles.workoutCardTopRow}>
              <View style={styles.dateContainer}>
                <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
                <Text style={styles.dateText}>{formattedDate}</Text>
              </View>
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>0%</Text>
              </View>
            </View>

            {/* Difficulty Badge */}
            <View style={styles.difficultyBadge}>
              <Text style={styles.difficultyText}>{muscleGroup}</Text>
            </View>

            {/* Workout Title */}
            <Text style={styles.workoutTitle}>{session.title}</Text>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="barbell-outline" size={20} color="#FFFFFF" />
                <Text style={styles.statText}>{totalExercises} Exercices</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="time-outline" size={20} color="#FFFFFF" />
                <Text style={styles.statText}>{estimatedDuration}h</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="flame" size={20} color="#FFFFFF" />
                <Text style={styles.statText}>{estimatedCalories} Kcal</Text>
              </View>
            </View>

            {/* Start Button */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={[styles.startButton, starting && styles.startButtonDisabled]}
                onPress={handleStartWorkout}
                disabled={starting}
                activeOpacity={0.9}
              >
                {starting ? (
                  <AppLoader variant="button" size="sm" />
                ) : (
                  <>
                    <View style={styles.startButtonLeft}>
                      <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                      <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                      <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                    </View>
                    <Text style={styles.startButtonText}>Appuyer pour Commencer</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </ImageBackground>
        </View>

        {/* Objective Reminder Section */}
        <View style={styles.objectiveSection}>
          <Text style={[styles.objectiveTitle, { color: colors.text }]}>
            Rappel Objectif
          </Text>
          <View style={[styles.objectiveCard, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.objectiveContent}>
              <View style={styles.objectiveIcon}>
                <Ionicons name="flag" size={24} color="#A855F7" />
              </View>
              <Text style={[styles.objectiveText, { color: colors.text }]}>
                Calories : {dailyProgram?.calorieTarget || 2200} Kcal
              </Text>
            </View>
          </View>
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
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
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
  workoutCard: {
    width: '100%',
    height: 400,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
  },
  workoutCardBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
    padding: 20,
  },
  workoutCardImage: {
    borderRadius: 20,
  },
  workoutCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 20,
  },
  workoutCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#A855F7',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 1,
  },
  difficultyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  workoutTitle: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    zIndex: 1,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
    zIndex: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  startButton: {
    width: '100%',
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D4AF37',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonDisabled: {
    opacity: 0.7,
  },
  startButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  startButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  objectiveSection: {
    marginTop: 8,
  },
  objectiveTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  objectiveCard: {
    borderRadius: 16,
    padding: 20,
  },
  objectiveContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  objectiveIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  objectiveText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
