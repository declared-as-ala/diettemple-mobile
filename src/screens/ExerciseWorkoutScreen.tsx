import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  Alert,
  Animated,
  PanResponder,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../context/ThemeContext';
import { Exercise } from '../types';
import { RootStackParamList } from '../types';
import { workoutService } from '../services/workoutService';
import { homeService } from '../services/homeService';
import ExerciseCard from '../components/ExerciseCard';
import SetTrackingOverlay from '../components/SetTrackingOverlay';
import AlternativeExercisesModal from '../components/AlternativeExercisesModal';
import RestTimer from '../components/RestTimer';
import AppLoader from '../components/AppLoader';
import ExerciseRecommendationCard from '../components/workout/ExerciseRecommendationCard';
import { useExerciseRecommendation } from '../hooks/useExerciseRecommendation';

type ExerciseWorkoutScreenRouteProp = RouteProp<RootStackParamList, 'ExerciseWorkout'>;
type ExerciseWorkoutScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ExerciseWorkout'>;

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.25;
const SWIPE_UP_THRESHOLD = height * 0.15;

export default function ExerciseWorkoutScreen() {
  const navigation = useNavigation<ExerciseWorkoutScreenNavigationProp>();
  const route = useRoute<ExerciseWorkoutScreenRouteProp>();
  const { colors, isDarkMode } = useTheme();
  const { sessionId, workoutSessionId, exercises: initialExercises, currentExerciseIndex } = route.params;

  const [exercises, setExercises] = useState<Exercise[]>(initialExercises || []);
  const [workoutSession, setWorkoutSession] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(currentExerciseIndex || 0);
  const [currentSet, setCurrentSet] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingWorkout, setLoadingWorkout] = useState(true);
  const [completedSets, setCompletedSets] = useState<Set<number>>(new Set());
  const [showSetOverlay, setShowSetOverlay] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [alternatives, setAlternatives] = useState<Exercise[]>([]);
  const [isResting, setIsResting] = useState(false);
  const [restSeconds, setRestSeconds] = useState(60);
  const [exerciseHistory, setExerciseHistory] = useState<any>(null);
  
  const pan = useRef(new Animated.ValueXY()).current;
  const exercisesRef = useRef<Exercise[]>(initialExercises || []);

  const currentExercise = exercises[currentIndex];
  const {
    data: recommendation,
    loading: recommendationLoading,
    error: recommendationError,
  } = useExerciseRecommendation(currentExercise?._id, currentExercise?.name);

  useEffect(() => {
    exercisesRef.current = exercises;
  }, [exercises]);

  // Load workout session
  useEffect(() => {
    loadWorkoutSession();
  }, [workoutSessionId]);

  // Load exercise history when exercise changes
  useEffect(() => {
    if (currentExercise?._id) {
      loadExerciseHistory();
      loadAlternatives();
      resetSetState();
    }
  }, [currentExercise?._id, currentIndex]);

  const loadWorkoutSession = async () => {
    if (!workoutSessionId) {
      setLoadingWorkout(false);
      return;
    }

    try {
      setLoadingWorkout(true);
      const response = await workoutService.getActiveWorkout();
      const session = response.workoutSession;
      setWorkoutSession(session);

      // Map exercises with their status
      const sessionResponse = await homeService.getSession(sessionId);
      const sessionExercises = sessionResponse.session.exercises;

      const exercisesWithStatus = sessionExercises.map((ex: Exercise) => {
        const exerciseSession = session.exercises.find(
          (es: any) => es.exerciseId.toString() === ex._id.toString()
        );
        return {
          ...ex,
          status: exerciseSession?.status || 'pending',
        };
      });

      setExercises(exercisesWithStatus);
      exercisesRef.current = exercisesWithStatus;
    } catch (error: any) {
      console.error('Error loading workout session:', error);
      if (initialExercises) {
        setExercises(initialExercises);
        exercisesRef.current = initialExercises;
      }
    } finally {
      setLoadingWorkout(false);
    }
  };

  const loadExerciseHistory = async () => {
    if (!currentExercise?._id) return;
    
    try {
      const response = await workoutService.getExerciseHistory(currentExercise._id);
      setExerciseHistory(response);
    } catch (error) {
      console.error('Error loading exercise history:', error);
    }
  };

  const loadAlternatives = async () => {
    if (!currentExercise?._id || !currentExercise?.muscleGroup) return;
    
    try {
      const response = await homeService.getAlternativeExercises(
        currentExercise._id,
        currentExercise.muscleGroup
      );
      setAlternatives(response.exercises);
    } catch (error) {
      console.error('Error loading alternatives:', error);
      setAlternatives([]);
    }
  };

  const resetSetState = () => {
    setCurrentSet(1);
    setCompletedSets(new Set());
    setShowSetOverlay(false);
    setIsResting(false);
    
    // Get completed sets from workout session
    if (workoutSession && currentExercise) {
      const exerciseSession = workoutSession.exercises.find(
        (es: any) => es.exerciseId.toString() === currentExercise._id.toString()
      );
      if (exerciseSession) {
        const completed = new Set<number>(
          exerciseSession.sets
            .filter((s: any) => s.completed)
            .map((s: any) => s.setNumber as number)
        );
        setCompletedSets(completed);
        
        // Set current set to first incomplete set
        const totalSets = currentExercise.sets || 3;
        for (let i = 1; i <= totalSets; i++) {
          if (!completed.has(i)) {
            setCurrentSet(i);
            break;
          }
        }
      }
    }
  };

  const totalSets = currentExercise?.sets || 3;
  const isLastSet = currentSet > totalSets;
  const isLastExercise = currentIndex === exercises.length - 1;

  // Get completed sets for current exercise
  const getCompletedSetsForExercise = () => {
    if (!workoutSession || !currentExercise) return new Set<number>();
    const exerciseSession = workoutSession.exercises.find(
      (es: any) => es.exerciseId.toString() === currentExercise._id.toString()
    );
    if (!exerciseSession) return new Set<number>();
    return new Set<number>(
      exerciseSession.sets
        .filter((s: any) => s.completed)
        .map((s: any) => s.setNumber as number)
    );
  };

  const exerciseCompletedSets = getCompletedSetsForExercise();

  // Swipe gesture handler
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !showSetOverlay && !isResting,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (showSetOverlay || isResting) return false;
        return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (showSetOverlay || isResting) return;
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (showSetOverlay || isResting) {
          pan.setValue({ x: 0, y: 0 });
          return;
        }

        const { dx, dy } = gestureState;

        // Swipe up - show alternatives
        if (dy < -SWIPE_UP_THRESHOLD && Math.abs(dx) < Math.abs(dy)) {
          setShowAlternatives(true);
          pan.setValue({ x: 0, y: 0 });
          return;
        }

        // Swipe right - previous exercise
        if (dx > SWIPE_THRESHOLD && currentIndex > 0) {
          Animated.timing(pan, {
            toValue: { x: width, y: 0 },
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setCurrentIndex((prev) => prev - 1);
            pan.setValue({ x: 0, y: 0 });
          });
          return;
        }

        // Swipe left - next exercise
        if (dx < -SWIPE_THRESHOLD && !isLastExercise) {
          Animated.timing(pan, {
            toValue: { x: -width, y: 0 },
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setCurrentIndex((prev) => prev + 1);
            pan.setValue({ x: 0, y: 0 });
          });
          return;
        }

        // Snap back
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const handleSetComplete = async (weight: number, reps: number) => {
    if (!workoutSessionId || !currentExercise) return;

    setLoading(true);
    try {
      await workoutService.updateExerciseSet(
        workoutSessionId,
        currentExercise._id,
        currentSet,
        weight,
        reps
      );

      // Mark set as completed
      setCompletedSets((prev) => new Set([...prev, currentSet]));
      
      // Reload workout session
      await loadWorkoutSession();

      // Close overlay
      setShowSetOverlay(false);

      // Check if last set
      if (currentSet >= totalSets) {
        // Complete exercise
        await handleCompleteExercise();
      } else {
        // Start rest timer with default from program
        const restTime = exerciseHistory?.program?.restSeconds || 60;
        setIsResting(true);
        setRestSeconds(restTime);
      }
    } catch (error: any) {
      console.error('Error completing set:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la série.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteExercise = async () => {
    if (!workoutSessionId || !currentExercise) return;

    setLoading(true);
    try {
      await workoutService.completeExercise(workoutSessionId, currentExercise._id);
      await loadWorkoutSession();
      
      // Move to next exercise or complete workout
      handleNext();
    } catch (error: any) {
      console.error('Error completing exercise:', error);
      Alert.alert('Erreur', 'Impossible de compléter l\'exercice.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipExercise = async () => {
    Alert.alert(
      'Passer l\'exercice',
      'Êtes-vous sûr de vouloir passer cet exercice ? Vous pourrez y revenir plus tard.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Passer',
          style: 'destructive',
          onPress: async () => {
            if (!workoutSessionId || !currentExercise) return;
            
            setLoading(true);
            try {
              await workoutService.skipExercise(workoutSessionId, currentExercise._id);
              await loadWorkoutSession();
              handleNext();
            } catch (error: any) {
              console.error('Error skipping exercise:', error);
              Alert.alert('Erreur', 'Impossible de passer l\'exercice.');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleNext = () => {
    const currentExercises = exercisesRef.current;
    
    // Find next pending or in_progress exercise
    const nextIndex = currentExercises.findIndex(
      (ex, idx) => idx > currentIndex && (ex.status === 'pending' || ex.status === 'in_progress')
    );

    if (nextIndex === -1) {
      // All exercises done - complete workout
      const completedCount = currentExercises.filter((ex) => ex.status === 'completed').length;
      navigation.replace('WorkoutCompletion', {
        sessionId,
        workoutSessionId,
        exercises: currentExercises,
        completedExercises: completedCount,
      });
    } else {
      // Move to next exercise
      setCurrentIndex(nextIndex);
    }
  };

  const handleRestComplete = () => {
    setIsResting(false);
    setCurrentSet((prev) => prev + 1);
    setShowSetOverlay(true);
  };

  const handleRestSkip = () => {
    setIsResting(false);
    setCurrentSet((prev) => prev + 1);
    setShowSetOverlay(true);
  };

  const handleAlternativeSelect = async (alternative: Exercise) => {
    // Replace current exercise with alternative
    const updatedExercises = [...exercises];
    updatedExercises[currentIndex] = alternative;
    setExercises(updatedExercises);
    exercisesRef.current = updatedExercises;
    setShowAlternatives(false);
    
    // Reset state for new exercise
    resetSetState();
  };

  const handleCardPress = () => {
    if (!isResting && !showSetOverlay) {
      setShowSetOverlay(true);
    }
  };

  // Get last weight and reps from history
  const lastWeight = exerciseHistory?.history?.lastWeight;
  const lastReps = exerciseHistory?.history?.lastSets?.[0]?.reps;
  const targetReps = exerciseHistory?.program?.targetReps;

  if (loadingWorkout) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={styles.loadingContainer}>
          <AppLoader variant="inline" size="lg" label="Chargement des exercices…" />
        </View>
      </View>
    );
  }

  if (!currentExercise || exercises.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>Exercice introuvable</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.recommendationLayer}>
        <ExerciseRecommendationCard
          loading={recommendationLoading}
          error={recommendationError}
          recommendation={recommendation}
        />
      </View>
      
      <Animated.View
        style={[
          styles.cardContainer,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <ExerciseCard
          exercise={currentExercise}
          currentSet={currentSet}
          totalSets={totalSets}
          completedSets={exerciseCompletedSets}
          onCardPress={handleCardPress}
          onSkip={handleSkipExercise}
          onShowAlternatives={() => setShowAlternatives(true)}
        />
      </Animated.View>

      {/* Set Tracking Overlay */}
      <SetTrackingOverlay
        visible={showSetOverlay}
        currentSet={currentSet}
        totalSets={totalSets}
        exerciseName={currentExercise.name}
        lastWeight={lastWeight}
        lastReps={lastReps}
        targetReps={targetReps}
        onComplete={handleSetComplete}
        onClose={() => setShowSetOverlay(false)}
      />

      {/* Alternative Exercises Modal */}
      <AlternativeExercisesModal
        visible={showAlternatives}
        currentExercise={currentExercise}
        alternatives={alternatives}
        onSelect={handleAlternativeSelect}
        onClose={() => setShowAlternatives(false)}
      />

      {/* Rest Timer */}
      <RestTimer
        visible={isResting}
        seconds={restSeconds}
        onComplete={handleRestComplete}
        onSkip={handleRestSkip}
      />

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <AppLoader variant="inline" size="lg" label="Chargement…" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cardContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  recommendationLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
});
