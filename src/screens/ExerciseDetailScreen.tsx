import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../context/ThemeContext';
import { homeService, Exercise } from '../services/homeService';
import { RootStackParamList } from '../types';
import AppLoader from '../components/AppLoader';
import { useExerciseFavoritesStore } from '../store/exerciseFavoritesStore';
import { useSnackbar } from '../components/Snackbar';
import { resolveVideoUrl } from '../config/api.config';
import { usePreventScreenCapture } from '../hooks/usePreventScreenCapture';

type ExerciseDetailScreenRouteProp = RouteProp<RootStackParamList, 'ExerciseDetail'>;
type ExerciseDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ExerciseDetail'>;

const { width } = Dimensions.get('window');

export default function ExerciseDetailScreen() {
  const navigation = useNavigation<ExerciseDetailScreenNavigationProp>();
  const route = useRoute<ExerciseDetailScreenRouteProp>();
  const { colors, isDarkMode } = useTheme();
  const { showSnackbar } = useSnackbar();
  const { exerciseId } = route.params;
  const { isFavorited, toggleFavorite } = useExerciseFavoritesStore();
  usePreventScreenCapture(true);

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    loadExercise();
  }, [exerciseId]);

  const loadExercise = async () => {
    try {
      setLoading(true);
      const response = await homeService.getExercises();
      const foundExercise = response.exercises.find((e) => e._id === exerciseId);
      if (foundExercise) {
        setExercise(foundExercise);
      }
    } catch (error: any) {
      console.error('Error loading exercise:', error);
    } finally {
      setLoading(false);
    }
  };

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

  if (!exercise) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            Exercice introuvable
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
          {exercise.name}
        </Text>
        <TouchableOpacity
          style={styles.favBtn}
          onPress={() => {
            toggleFavorite(exercise._id).then(() => {
              const nowFav = useExerciseFavoritesStore.getState().isFavorited(exercise._id);
              showSnackbar({ message: nowFav ? 'Ajouté aux favoris' : 'Retiré des favoris', duration: 1800 });
            });
          }}
        >
          <Ionicons
            name={isFavorited(exercise._id) ? 'heart' : 'heart-outline'}
            size={26}
            color={isFavorited(exercise._id) ? '#E879F9' : colors.text}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Video Section */}
        {exercise.videoUrl && (
          <View style={styles.videoSection}>
            <TouchableOpacity
              style={styles.videoContainer}
              onPress={handleVideoPress}
              activeOpacity={0.9}
            >
              <Video
                ref={videoRef}
                source={{ uri: resolveVideoUrl(exercise.videoUrl) ?? exercise.videoUrl }}
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

        {/* Exercise Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="fitness-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Groupe musculaire:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{exercise.muscleGroup}</Text>
          </View>

          {exercise.sets && (
            <View style={styles.infoRow}>
              <Ionicons name="repeat-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Séries:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{exercise.sets}</Text>
            </View>
          )}

          {exercise.reps && (
            <View style={styles.infoRow}>
              <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Répétitions:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{exercise.reps}</Text>
            </View>
          )}

          {exercise.duration && (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Durée:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{exercise.duration}s</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {exercise.description && (
          <View style={styles.descriptionSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {exercise.description}
            </Text>
          </View>
        )}

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Conseils</Text>
          <View style={[styles.tipCard, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="bulb-outline" size={24} color="#D4AF37" />
            <View style={styles.tipContent}>
              <Text style={[styles.tipText, { color: colors.text }]}>
                Maintenez une forme correcte tout au long de l'exercice pour éviter les blessures.
              </Text>
            </View>
          </View>
          <View style={[styles.tipCard, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="bulb-outline" size={24} color="#D4AF37" />
            <View style={styles.tipContent}>
              <Text style={[styles.tipText, { color: colors.text }]}>
                Respirez correctement: expirez pendant l'effort, inspirez pendant la phase de repos.
              </Text>
            </View>
          </View>
          <View style={[styles.tipCard, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="bulb-outline" size={24} color="#D4AF37" />
            <View style={styles.tipContent}>
              <Text style={[styles.tipText, { color: colors.text }]}>
                Augmentez progressivement l'intensité pour continuer à progresser.
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
  favBtn: {
    padding: 8,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  videoSection: {
    marginBottom: 24,
  },
  videoContainer: {
    width: '100%',
    height: 250,
    position: 'relative',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  descriptionSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  tipsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  tipCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
    gap: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
  },
});






