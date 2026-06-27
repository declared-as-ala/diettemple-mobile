/**
 * Gym Presence Verification (MVP).
 * "Verify I am at the gym" — capture/upload photo + optional GPS → show verified / not verified + confidence.
 * States: idle, loading, permission_denied, upload_error, success, failure.
 * TODO: Add camera capture (expo-camera) in addition to file upload; structure is ready.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types';
import { verificationService } from '../services/verificationService';
import AppBackground from '../components/AppBackground';

type NavProp = StackNavigationProp<RootStackParamList, 'GymPresenceVerification'>;

const ACCENT = '#D4AF37';

type UiState =
  | 'idle'
  | 'loading'
  | 'permission_denied'
  | 'upload_error'
  | 'success'
  | 'failure';

export default function GymPresenceVerificationScreen() {
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const [state, setState] = useState<UiState>('idle');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    verified: boolean;
    confidence: number;
    topPrediction: string;
    reason: string;
    checks: { aiScene: boolean; gpsProvided: boolean };
  } | null>(null);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null>(null);

  const requestLocation = async (): Promise<boolean> => {
    try {
      const Location = require('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionError('Location permission denied. You can still verify without GPS.');
        return false;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? undefined,
      });
      setPermissionError(null);
      return true;
    } catch (e: any) {
      if (e?.message?.includes('expo-location') || e?.code === 'MODULE_NOT_FOUND') {
        setPermissionError('Location not available. Install expo-location for GPS.');
      } else {
        setPermissionError('Location unavailable. Verification will continue without GPS.');
      }
      return false;
    }
  };

  const pickImage = async (useCamera: boolean) => {
    setState('idle');
    setUploadError(null);
    setResult(null);
    const { status } = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setState('permission_denied');
      setPermissionError(
        useCamera ? 'Camera permission is required to take a photo.' : 'Photo library permission is required.'
      );
      return;
    }
    const pickerResult = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
    if (pickerResult.canceled || !pickerResult.assets?.[0]) return;
    const uri = pickerResult.assets[0].uri;
    setPhotoUri(uri);
    setPermissionError(null);
    // Optionally request location (non-blocking)
    await requestLocation();
  };

  const submitVerification = async () => {
    if (!photoUri) return;
    setState('loading');
    setUploadError(null);
    setResult(null);
    try {
      const payload: Parameters<typeof verificationService.verifyGymPresence>[1] = {
        timestamp: new Date().toISOString(),
      };
      if (location) {
        payload.latitude = location.latitude;
        payload.longitude = location.longitude;
        payload.accuracy = location.accuracy;
      }
      const data = await verificationService.verifyGymPresence(photoUri, payload);
      setResult({
        verified: data.verified,
        confidence: data.confidence,
        topPrediction: data.topPrediction,
        reason: data.reason,
        checks: data.checks,
      });
      setState(data.verified ? 'success' : 'failure');
    } catch (e: any) {
      setState('upload_error');
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'Verification failed. Check your connection and try again.';
      setUploadError(msg);
    }
  };

  const reset = () => {
    setState('idle');
    setPhotoUri(null);
    setResult(null);
    setUploadError(null);
    setPermissionError(null);
  };

  return (
    <AppBackground>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text }]}>Verify I am at the gym</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Take or upload a photo of the gym. We'll check the scene and optionally use your location.
        </Text>

        {state === 'permission_denied' && permissionError && (
          <View style={styles.banner}>
            <Ionicons name="warning-outline" size={24} color="#F59E0B" />
            <Text style={styles.bannerText}>{permissionError}</Text>
          </View>
        )}

        {state === 'upload_error' && uploadError && (
          <View style={[styles.banner, styles.bannerError]}>
            <Ionicons name="alert-circle-outline" size={24} color="#EF4444" />
            <Text style={styles.bannerText}>{uploadError}</Text>
          </View>
        )}

        {!photoUri ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: ACCENT }]}
              onPress={() => pickImage(true)}
            >
              <Ionicons name="camera-outline" size={24} color="#000" />
              <Text style={styles.primaryBtnText}>Take photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: ACCENT }]}
              onPress={() => pickImage(false)}
            >
              <Ionicons name="images-outline" size={24} color={ACCENT} />
              <Text style={[styles.secondaryBtnText, { color: ACCENT }]}>Choose from gallery</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.previewWrap}>
              <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
            </View>
            {state === 'loading' && (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={ACCENT} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Verifying...
                </Text>
              </View>
            )}
            {(state === 'idle' || state === 'upload_error' || state === 'success' || state === 'failure') && (
              <View style={styles.resultActions}>
                {(state === 'idle' || state === 'upload_error') && (
                  <>
                    <TouchableOpacity
                      style={[styles.primaryBtn, { backgroundColor: ACCENT }]}
                      onPress={submitVerification}
                      disabled={false}
                    >
                      <Text style={styles.primaryBtnText}>Verify</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.secondaryBtn, { borderColor: colors.textSecondary }]}
                      onPress={reset}
                    >
                      <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>
                        Choose another photo
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
                {(state === 'success' || state === 'failure') && result && (
                  <>
                    <View
                      style={[
                        styles.resultCard,
                        {
                          backgroundColor: result.verified ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                          borderColor: result.verified ? '#22C55E' : '#EF4444',
                        },
                      ]}
                    >
                      <Ionicons
                        name={result.verified ? 'checkmark-circle' : 'close-circle'}
                        size={56}
                        color={result.verified ? '#22C55E' : '#EF4444'}
                      />
                      <Text style={[styles.resultTitle, { color: colors.text }]}>
                        {result.verified ? 'Verified' : 'Not verified'}
                      </Text>
                      <Text style={[styles.confidence, { color: colors.textSecondary }]}>
                        Confidence: {(result.confidence * 100).toFixed(0)}%
                      </Text>
                      <Text style={[styles.reason, { color: colors.textSecondary }]}>
                        {result.reason}
                      </Text>
                      {result.checks.gpsProvided && (
                        <Text style={[styles.checks, { color: colors.textSecondary }]}>
                          GPS was used for verification.
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[styles.primaryBtn, { backgroundColor: ACCENT }]}
                      onPress={reset}
                    >
                      <Text style={styles.primaryBtnText}>Verify again</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40,
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    top: 48,
    zIndex: 10,
    padding: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.15)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 10,
  },
  bannerError: {
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    color: '#0B0B0B',
  },
  actions: {
    gap: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewWrap: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    marginBottom: 20,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  resultActions: {
    gap: 12,
  },
  resultCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
  },
  confidence: {
    fontSize: 14,
    marginTop: 4,
  },
  reason: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  checks: {
    fontSize: 12,
    marginTop: 6,
  },
});
