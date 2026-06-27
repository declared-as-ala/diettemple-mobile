import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Exercise } from '../types';
import { resolveVideoUrl } from '../config/api.config';

const { width, height } = Dimensions.get('window');

interface ExerciseCardProps {
  exercise: Exercise;
  currentSet: number;
  totalSets: number;
  completedSets: Set<number>;
  onCardPress: () => void;
  onSkip: () => void;
  onShowAlternatives: () => void;
}

export default function ExerciseCard({
  exercise,
  currentSet,
  totalSets,
  completedSets,
  onCardPress,
  onSkip,
  onShowAlternatives,
}: ExerciseCardProps) {
  const videoRef = useRef<Video>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Auto-play video if available
    if (exercise.videoUrl && videoRef.current) {
      videoRef.current.playAsync();
    }
  }, [exercise.videoUrl]);

  const placeholderImages = [
    require('../../assets/onboarding1.jpg'),
    require('../../assets/onboarding2.jpg'),
    require('../../assets/onboarding3.jpg'),
  ];

  const getImageSource = () => {
    if (exercise.imageUrl) {
      return { uri: exercise.imageUrl };
    }
    return placeholderImages[0];
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      activeOpacity={1}
      onPress={onCardPress}
    >
      {/* Video/Image Background */}
      {exercise.videoUrl ? (
        <Video
          ref={videoRef}
          source={{ uri: resolveVideoUrl(exercise.videoUrl) ?? exercise.videoUrl }}
          style={styles.background}
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay
          isMuted
        />
      ) : (
        <Image source={getImageSource()} style={styles.background} resizeMode="cover" />
      )}

      {/* Dark Overlay */}
      <View style={styles.overlay} />

      {/* Content */}
      <View style={styles.content}>
        {/* Top Bar - Progress & Skip */}
        <View style={styles.topBar}>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {currentSet}/{totalSets} Séries
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(currentSet / totalSets) * 100}%` },
                ]}
              />
            </View>
          </View>
          <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Exercise Info - Bottom */}
        <View style={styles.exerciseInfo}>
          <View style={styles.exerciseHeader}>
            <View>
              <Text style={styles.muscleGroup}>{exercise.muscleGroup}</Text>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
            </View>
            <TouchableOpacity onPress={onShowAlternatives} style={styles.alternativesButton}>
              <Ionicons name="swap-vertical" size={24} color="#D4AF37" />
              <Text style={styles.alternativesText}>Alternatives</Text>
            </TouchableOpacity>
          </View>

          {/* Sets Info */}
          <View style={styles.setsInfo}>
            {Array.from({ length: totalSets }).map((_, index) => {
              const setNum = index + 1;
              const isCompleted = completedSets.has(setNum);
              const isCurrent = setNum === currentSet;
              
              return (
                <View
                  key={setNum}
                  style={[
                    styles.setBadge,
                    isCompleted && styles.setBadgeCompleted,
                    isCurrent && styles.setBadgeCurrent,
                  ]}
                >
                  <Text style={styles.setBadgeText}>
                    {isCompleted ? '✓' : setNum}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Swipe Hint */}
          <View style={styles.swipeHint}>
            <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.5)" />
            <Text style={styles.swipeHintText}>Glisser pour naviguer</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    height,
    position: 'relative',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 100,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressContainer: {
    flex: 1,
    marginRight: 16,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: 2,
  },
  skipButton: {
    padding: 8,
  },
  exerciseInfo: {
    marginTop: 'auto',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  muscleGroup: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  exerciseName: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
  },
  alternativesButton: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    borderRadius: 12,
  },
  alternativesText: {
    color: '#D4AF37',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  setsInfo: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  setBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  setBadgeCompleted: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  setBadgeCurrent: {
    borderColor: '#D4AF37',
    borderWidth: 3,
  },
  setBadgeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  swipeHintText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
});
