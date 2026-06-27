import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Exercise } from '../types';

const { width } = Dimensions.get('window');

interface AlternativeExercisesModalProps {
  visible: boolean;
  currentExercise: Exercise;
  alternatives: Exercise[];
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

export default function AlternativeExercisesModal({
  visible,
  currentExercise,
  alternatives,
  onSelect,
  onClose,
}: AlternativeExercisesModalProps) {
  const placeholderImages = [
    require('../../assets/onboarding1.jpg'),
    require('../../assets/onboarding2.jpg'),
    require('../../assets/onboarding3.jpg'),
  ];

  const getImageSource = (exercise: Exercise) => {
    if (exercise.imageUrl) {
      return { uri: exercise.imageUrl };
    }
    return placeholderImages[0];
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Exercices alternatifs</Text>
              <Text style={styles.headerSubtitle}>
                Même groupe musculaire: {currentExercise.muscleGroup}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Current Exercise */}
          <View style={styles.currentExerciseCard}>
            <Text style={styles.currentLabel}>Exercice actuel</Text>
            <Text style={styles.currentExerciseName}>{currentExercise.name}</Text>
          </View>

          {/* Alternatives List */}
          <ScrollView style={styles.alternativesList} showsVerticalScrollIndicator={false}>
            {alternatives.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="fitness-outline" size={48} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyText}>Aucune alternative disponible</Text>
              </View>
            ) : (
              alternatives.map((exercise, index) => (
                <TouchableOpacity
                  key={exercise._id}
                  style={styles.alternativeCard}
                  onPress={() => onSelect(exercise)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={getImageSource(exercise)}
                    style={styles.alternativeImage}
                    resizeMode="cover"
                  />
                  <View style={styles.alternativeInfo}>
                    <Text style={styles.alternativeName}>{exercise.name}</Text>
                    <Text style={styles.alternativeMuscle}>{exercise.muscleGroup}</Text>
                    {exercise.sets && exercise.reps && (
                      <Text style={styles.alternativeSets}>
                        {exercise.sets} séries × {exercise.reps} répétitions
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#D4AF37" />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  currentExerciseCard: {
    backgroundColor: '#2A2A2A',
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  currentLabel: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  currentExerciseName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  alternativesList: {
    paddingHorizontal: 24,
  },
  alternativeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 16,
  },
  alternativeImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  alternativeInfo: {
    flex: 1,
  },
  alternativeName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  alternativeMuscle: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  alternativeSets: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 16,
    marginTop: 16,
  },
});
