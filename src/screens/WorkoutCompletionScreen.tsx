import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../context/ThemeContext';
import { Exercise } from '../types';
import { RootStackParamList } from '../types';
import { workoutService } from '../services/workoutService';
import AppLoader from '../components/AppLoader';
import { usePreventScreenCapture } from '../hooks/usePreventScreenCapture';
import AsyncStorage from '@react-native-async-storage/async-storage';

type WorkoutCompletionScreenRouteProp = RouteProp<RootStackParamList, 'WorkoutCompletion'>;
type WorkoutCompletionScreenNavigationProp = StackNavigationProp<RootStackParamList, 'WorkoutCompletion'>;

const { width } = Dimensions.get('window');

export default function WorkoutCompletionScreen() {
  const navigation = useNavigation<WorkoutCompletionScreenNavigationProp>();
  const route = useRoute<WorkoutCompletionScreenRouteProp>();
  const { colors, isDarkMode } = useTheme();
  const { workoutSessionId, exercises, completedExercises } = route.params;
  usePreventScreenCapture(true);

  const [completing, setCompleting] = useState(true);

  const totalExercises = exercises.length;
  const completionPercentage = (completedExercises / totalExercises) * 100;

  useEffect(() => {
    completeWorkout();
  }, []);

  const RATTRAPAGE_STORAGE_KEY = '@dt_rattrapage_meta';

  const completeWorkout = async () => {
    if (!workoutSessionId) {
      setCompleting(false);
      return;
    }

    try {
      let options: { completionType?: 'normal' | 'rattrapage'; originalScheduledDate?: string } = {};
      const metaRaw = await AsyncStorage.getItem(RATTRAPAGE_STORAGE_KEY);
      if (metaRaw) {
        const meta = JSON.parse(metaRaw);
        if (meta.completionType) options.completionType = meta.completionType;
        if (meta.originalScheduledDate) options.originalScheduledDate = meta.originalScheduledDate;
        await AsyncStorage.removeItem(RATTRAPAGE_STORAGE_KEY);
      }
      await workoutService.completeWorkout(workoutSessionId, options);
    } catch (error: any) {
      console.error('Error completing workout:', error);
    } finally {
      setCompleting(false);
    }
  };

  // Calculate total calories and duration (estimated)
  const totalCalories = exercises.reduce((sum, ex) => {
    // Estimate: 10 calories per minute of exercise
    const exerciseCalories = ex.duration ? (ex.duration / 60) * 10 : 50;
    return sum + exerciseCalories;
  }, 0);

  const totalDuration = exercises.reduce((sum, ex) => {
    return sum + (ex.duration || 60);
  }, 0);

  const handleFinish = () => {
    // Navigate back to Home
    navigation.getParent()?.goBack();
    navigation.navigate('Home');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Icon */}
        <View style={styles.successContainer}>
          {completing ? (
            <AppLoader variant="inline" size="lg" label="Chargement…" />
          ) : (
            <>
              <View style={styles.successCircle}>
                <Ionicons name="checkmark" size={64} color="#000000" />
              </View>
<Text style={[styles.successTitle, { color: colors.text }]}>
                Séance réussie 🎉
              </Text>
              <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
                Excellent travail. Continue comme ca pour garder ton rythme.
              </Text>
            </>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Statistiques
          </Text>
          
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="checkmark-circle" size={32} color="#D4AF37" />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {completedExercises}/{totalExercises}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Exercices
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="flame" size={32} color="#FF6B35" />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {Math.round(totalCalories)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Kcal brûlées
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="time" size={32} color="#4A90E2" />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {Math.round(totalDuration / 60)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Minutes
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="trophy" size={32} color="#FFD700" />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {Math.round(completionPercentage)}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Complétion
              </Text>
            </View>
          </View>
        </View>

        {/* Completed Exercises List */}
        <View style={styles.exercisesSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Exercices complétés
          </Text>
          
          {exercises.map((exercise: Exercise, index: number) => (
            <View
              key={exercise._id || index}
              style={[styles.completedExerciseCard, { backgroundColor: colors.cardBackground }]}
            >
              <View style={styles.completedExerciseContent}>
                <View style={styles.completedExerciseInfo}>
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark" size={16} color="#D4AF37" />
                  </View>
                  <Text style={[styles.completedExerciseName, { color: colors.text }]}>
                    {exercise.name}
                  </Text>
                </View>
              </View>
              <View style={styles.completedProgressBar}>
                <View style={[styles.completedProgressFill, { width: '100%' }]} />
              </View>
            </View>
          ))}
        </View>

        {/* Finish Button */}
        <TouchableOpacity
          style={[styles.finishButton, { backgroundColor: '#D4AF37' }]}
          onPress={handleFinish}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={24} color="#000000" />
          <Text style={styles.finishButtonText}>Terminer</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  successContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 32,
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
successSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  photoSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsSection: {
    marginBottom: 32,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (width - 52) / 2,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  exercisesSection: {
    marginBottom: 32,
  },
  completedExerciseCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  completedExerciseContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  completedExerciseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  completedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1A3A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  completedExerciseName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  completedProgressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333333',
    overflow: 'hidden',
  },
  completedProgressFill: {
    height: '100%',
    backgroundColor: '#D4AF37',
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
    borderRadius: 16,
    marginTop: 16,
  },
  finishButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
});

