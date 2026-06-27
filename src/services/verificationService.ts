/**
 * Gym Presence Verification API client.
 * POST /api/verification/gym-presence — image + GPS + timestamp.
 */
import api from './api';

export interface GymPresenceVerificationPayload {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  timestamp?: string; // ISO8601
}

export interface GymPresenceVerificationResult {
  verified: boolean;
  confidence: number;
  topPrediction: string;
  reason: string;
  checks: {
    aiScene: boolean;
    gpsProvided: boolean;
  };
  serverTimestamp: string;
}

export const verificationService = {
  verifyGymPresence: async (
    imageUri: string,
    payload?: GymPresenceVerificationPayload
  ): Promise<GymPresenceVerificationResult> => {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'gym-presence.jpg',
    } as any);
    if (payload?.latitude != null) formData.append('latitude', String(payload.latitude));
    if (payload?.longitude != null) formData.append('longitude', String(payload.longitude));
    if (payload?.accuracy != null) formData.append('accuracy', String(payload.accuracy));
    if (payload?.timestamp) formData.append('timestamp', payload.timestamp);

    const { data } = await api.post<GymPresenceVerificationResult>(
      '/verification/gym-presence',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return data;
  },
};
