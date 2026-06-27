import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SetTrackingOverlayProps {
  visible: boolean;
  currentSet: number;
  totalSets: number;
  exerciseName: string;
  lastWeight?: number;
  lastReps?: number;
  targetReps?: number | { min: number; max: number };
  onComplete: (weight: number, reps: number) => void;
  onClose: () => void;
}

export default function SetTrackingOverlay({
  visible,
  currentSet,
  totalSets,
  exerciseName,
  lastWeight,
  lastReps,
  targetReps,
  onComplete,
  onClose,
}: SetTrackingOverlayProps) {
  const [weight, setWeight] = useState<string>(lastWeight?.toString() || '');
  const [reps, setReps] = useState<string>(lastReps?.toString() || '');
  const [recommendation, setRecommendation] = useState<string>('');
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setWeight(lastWeight?.toString() || '');
      setReps(lastReps?.toString() || '');
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, lastWeight, lastReps]);

  useEffect(() => {
    // Calculate recommendation based on reps
    if (reps) {
      const repsNum = parseInt(reps);
      const targetMax = typeof targetReps === 'object' ? targetReps.max : targetReps || 12;
      const targetMin = typeof targetReps === 'object' ? targetReps.min : targetReps || 8;

      if (repsNum >= targetMax) {
        const currentWeight = parseFloat(weight) || 0;
        const recommendedWeight = currentWeight + 2.5;
        setRecommendation(`💪 Augmenter le poids à ${recommendedWeight}kg pour la prochaine série`);
      } else if (repsNum <= 5) {
        setRecommendation('⚠️ Réduire le poids pour la sécurité');
      } else if (repsNum >= targetMin && repsNum < targetMax) {
        setRecommendation('✅ Maintenir le poids actuel');
      } else {
        setRecommendation('');
      }
    } else {
      setRecommendation('');
    }
  }, [reps, weight, targetReps]);

  const handleComplete = () => {
    const weightNum = parseFloat(weight);
    const repsNum = parseInt(reps);

    if (!weight || !reps || isNaN(weightNum) || isNaN(repsNum)) {
      Alert.alert('Champs requis', 'Veuillez entrer le poids et les répétitions.');
      return;
    }

    if (weightNum <= 0 || repsNum <= 0) {
      Alert.alert('Valeur invalide', 'Le poids et les répétitions doivent être positifs.');
      return;
    }

    onComplete(weightNum, repsNum);
    setWeight('');
    setReps('');
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              Série {currentSet}/{totalSets}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Exercise Name */}
          <Text style={styles.exerciseName}>{exerciseName}</Text>

          {/* Input Fields */}
          <View style={styles.inputsContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Poids (kg)</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.5)"
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Répétitions</Text>
              <TextInput
                style={styles.input}
                value={reps}
                onChangeText={setReps}
                placeholder="0"
                placeholderTextColor="rgba(255,255,255,0.5)"
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Recommendation */}
          {recommendation ? (
            <View style={styles.recommendationContainer}>
              <Text style={styles.recommendationText}>{recommendation}</Text>
            </View>
          ) : null}

          {/* Complete Button */}
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleComplete}
            activeOpacity={0.8}
          >
            <Text style={styles.completeButtonText}>Valider la série</Text>
            <Ionicons name="checkmark-circle" size={24} color="#000000" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  exerciseName: {
    color: '#D4AF37',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 24,
  },
  inputsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#333333',
  },
  recommendationContainer: {
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  recommendationText: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  completeButton: {
    backgroundColor: '#D4AF37',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  completeButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
  },
});
