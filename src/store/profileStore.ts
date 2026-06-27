import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { startupSteps } from '../utils/startupLogger';
import { profileService } from '../services/profileService';

interface ProfileData {
  name: string;
  photoUri: string | null;
  age: string;
  sexe: string;
  poids: string;
  taille: string;
  objectif: string;
}

interface ProfileStore {
  profile: ProfileData;
  updateProfile: (updates: Partial<ProfileData>) => Promise<void>;
  loadProfile: () => Promise<void>;
  syncWithBackend: () => Promise<void>;
}

const defaultProfile: ProfileData = {
  name: '',
  photoUri: null,
  age: '20',
  sexe: 'Homme',
  poids: '80',
  taille: '174',
  objectif: 'Maigrir',
};

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: defaultProfile,

  loadProfile: async () => {
    startupSteps.loadProfile();
    try {
      const savedProfile = await SecureStore.getItemAsync('profile_data');
      if (savedProfile && typeof savedProfile === 'string') {
        try {
          const parsed = JSON.parse(savedProfile);
          if (parsed && typeof parsed === 'object') {
            if (!parsed.name) parsed.name = '';
            set({ profile: { ...defaultProfile, ...parsed } });
          }
        } catch (_) {
          // Invalid JSON — keep default profile, never crash
        }
      }
      startupSteps.loadProfileDone();
    } catch (_) {
      startupSteps.loadProfileDone();
      // SecureStore/read failed — keep default profile, never crash
    }
  },

  updateProfile: async (updates) => {
    const newProfile = { ...get().profile, ...updates };
    set({ profile: newProfile });
    try {
      // Save locally first
      await SecureStore.setItemAsync('profile_data', JSON.stringify(newProfile));
      
      // Check authentication before syncing with backend
      const { useAuthStore } = await import('./authStore');
      const { token, isAuthenticated } = useAuthStore.getState();
      
      if (token && isAuthenticated) {
        const backendUpdates: any = { ...updates };
        if (backendUpdates.photoUri === null) {
          backendUpdates.photoUri = undefined;
        }
        const res = await profileService.updateProfile(backendUpdates);
        if (res?.user) {
          const { useAuthStore } = await import('./authStore');
          useAuthStore.getState().setUser(res.user as any);
        }
      } else {
        console.log('Not authenticated, profile update saved locally only');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      // Never throw — keep local changes; caller can show toast
    }
  },

  syncWithBackend: async () => {
    // Check authentication before making API call
    const { useAuthStore } = await import('./authStore');
    const { token, isAuthenticated } = useAuthStore.getState();
    
    if (!token || !isAuthenticated) {
      console.log('Not authenticated, skipping profile sync');
      return;
    }

    try {
      const response = await profileService.getProfile();
      const user = response.user;
      
      const backendProfile: ProfileData = {
        name: user.name || '',
        photoUri: (user as any).photoUri || null,
        age: (user as any).age || '20',
        sexe: (user as any).sexe || 'Homme',
        poids: (user as any).poids || '80',
        taille: (user as any).taille || '174',
        objectif: (user as any).objectif || 'Maigrir',
      };
      
      set({ profile: backendProfile });
      await SecureStore.setItemAsync('profile_data', JSON.stringify(backendProfile));
      // Single source of truth: keep auth store in sync so Drawer/Profile show latest photo everywhere
      const { useAuthStore } = await import('./authStore');
      useAuthStore.getState().setUser(user as any);
    } catch (error) {
      console.error('Error syncing profile with backend:', error);
      // Never throw — allow app to stay open
    }
  },
}));

