import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './authStore';

const STORAGE_KEY = '@diettemple_exercise_favorites';

interface ExerciseFavoritesStore {
  favoriteIds: string[];
  loading: boolean;
  fetchFavorites: () => Promise<void>;
  addFavorite: (exerciseId: string) => Promise<void>;
  removeFavorite: (exerciseId: string) => Promise<void>;
  toggleFavorite: (exerciseId: string) => Promise<void>;
  isFavorited: (exerciseId: string) => boolean;
}

export const useExerciseFavoritesStore = create<ExerciseFavoritesStore>((set, get) => ({
  favoriteIds: [],
  loading: false,

  fetchFavorites: async () => {
    const userId = useAuthStore.getState().user?._id;
    set({ loading: true });
    try {
      const key = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
      const raw = await AsyncStorage.getItem(key);
      const ids: string[] = raw ? JSON.parse(raw) : [];
      set({ favoriteIds: ids, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addFavorite: async (exerciseId: string) => {
    const userId = useAuthStore.getState().user?._id;
    let newIds: string[] = [];
    set((s) => {
      newIds = s.favoriteIds.includes(exerciseId) ? s.favoriteIds : [...s.favoriteIds, exerciseId];
      return { favoriteIds: newIds };
    });
    const key = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
    await AsyncStorage.setItem(key, JSON.stringify(newIds));
  },

  removeFavorite: async (exerciseId: string) => {
    const userId = useAuthStore.getState().user?._id;
    let newIds: string[] = [];
    set((s) => {
      newIds = s.favoriteIds.filter((id) => id !== exerciseId);
      return { favoriteIds: newIds };
    });
    const key = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
    await AsyncStorage.setItem(key, JSON.stringify(newIds));
  },

  toggleFavorite: async (exerciseId: string) => {
    if (get().favoriteIds.includes(exerciseId)) {
      await get().removeFavorite(exerciseId);
    } else {
      await get().addFavorite(exerciseId);
    }
  },

  isFavorited: (exerciseId: string) => get().favoriteIds.includes(exerciseId),
}));
