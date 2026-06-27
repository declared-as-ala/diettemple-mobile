import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../context/ThemeContext';
import { Exercise } from '../types';
import { RootStackParamList } from '../types';
import AppLoader from '../components/AppLoader';

type GymPhotoCaptureScreenRouteProp = RouteProp<RootStackParamList, 'GymPhotoCapture'>;
type GymPhotoCaptureScreenNavigationProp = StackNavigationProp<RootStackParamList, 'GymPhotoCapture'>;

const { width, height } = Dimensions.get('window');

export default function GymPhotoCaptureScreen() {
  const navigation = useNavigation<GymPhotoCaptureScreenNavigationProp>();
  const route = useRoute<GymPhotoCaptureScreenRouteProp>();
  const { colors, isDarkMode } = useTheme();
  const { sessionId, exercises, workoutSessionId } = route.params;

  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const handleTakePhoto = async () => {
    if (!cameraRef.current || !permission?.granted) {
      Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la caméra.');
      return;
    }

    try {
      setCapturing(true);
      const photoResult = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (photoResult?.uri) {
        setPhoto(photoResult.uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo.');
    } finally {
      setCapturing(false);
    }
  };

  const handleContinue = () => {
    // Photo is optional - allow continuing without photo
    navigation.navigate('ExerciseWorkout', {
      sessionId,
      workoutSessionId: workoutSessionId || '',
      exercises,
      gymPhoto: photo || undefined,
      currentExerciseIndex: 0,
    });
  };

  const handleSkip = () => {
    // Skip photo and continue to workout
    navigation.navigate('ExerciseWorkout', {
      sessionId,
      workoutSessionId: workoutSessionId || '',
      exercises,
      currentExerciseIndex: 0,
    });
  };

  const handleRetake = () => {
    setPhoto(null);
  };

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={styles.loadingContainer}>
          <AppLoader variant="inline" size="lg" label="Chargement…" />
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.permissionText, { color: colors.text }]}>
            Accès à la caméra requis
          </Text>
          <Text style={[styles.permissionSubtext, { color: colors.textSecondary }]}>
            Nous avons besoin de votre permission pour prendre une photo dans la salle de sport
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: '#D4AF37' }]}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Autoriser la caméra</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Photo dans la salle</Text>
        <View style={styles.placeholder} />
      </View>

      {photo ? (
        /* Photo Preview */
        <View style={styles.photoContainer}>
          <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
          <View style={styles.photoActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#333333' }]}
              onPress={handleRetake}
            >
              <Ionicons name="refresh" size={24} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Reprendre</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#D4AF37' }]}
              onPress={handleContinue}
            >
              <Ionicons name="checkmark" size={24} color="#000000" />
              <Text style={[styles.actionButtonText, { color: '#000000' }]}>Continuer</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Camera View */
        <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
              mode="picture"
            >
            <View style={styles.cameraOverlay}>
              <View style={styles.cameraInstructions}>
                <Text style={styles.instructionText}>
                  Prenez une photo de vous dans la salle de sport
                </Text>
              </View>
            </View>
          </CameraView>
          
          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.flipButton}
              onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
            >
              <Ionicons name="camera-reverse" size={32} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleTakePhoto}
              disabled={capturing}
            >
              {capturing ? (
                <AppLoader variant="button" size="sm" />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
            >
              <Text style={styles.skipButtonText}>Passer</Text>
            </TouchableOpacity>
            
            <View style={styles.placeholder} />
          </View>
        </View>
      )}
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
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionText: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
  },
  permissionButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  cameraInstructions: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
    borderRadius: 12,
    marginBottom: 100,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  flipButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#D4AF37',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D4AF37',
  },
  photoContainer: {
    flex: 1,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoActions: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skipButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: 20,
  },
  skipButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

