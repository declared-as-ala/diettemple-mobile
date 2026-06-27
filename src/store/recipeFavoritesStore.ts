import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFavoriteRecipeIds, addRecipeFavorite as apiAdd, removeRecipeFavorite as apiRemove } from '../services/recipesService';
import { useAuthStore } from './authStore';

const STORAGE_KEY = '@diettemple_recipe_favorites';

interface RecipeFavoritesStore {
  favoriteIds: string[];
  loading: boolean;
  fetchFavorites: () => Promise<void>;
  addFavorite: (recipeId: string) => Promise<void>;
  removeFavorite: (recipeId: string) => Promise<void>;
  isFavorited: (recipeId: string) => boolean;
}

export const useRecipeFavoritesStore = create<RecipeFavoritesStore>((set, get) => ({
  favoriteIds: [],
  loading: false,

  fetchFavorites: async () => {
    const userId = useAuthStore.getState().user?._id;
    set({ loading: true });
    try {
      const ids = await getFavoriteRecipeIds();
      set({ favoriteIds: ids, loading: false });
      if (userId) await AsyncStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(ids));
    } catch {
      try {
        if (userId) {
          const raw = await AsyncStorage.getItem(`${STORAGE_KEY}_${userId}`);
          const ids = raw ? JSON.parse(raw) : [];
          set({ favoriteIds: ids, loading: false });
        } else set({ loading: false });
      } catch {
        set({ loading: false });
      }
    }
  },

  addFavorite: async (recipeId: string) => {
    const userId = useAuthStore.getState().user?._id;
    try {
      await apiAdd(recipeId);
    } catch {
      // persist locally
    }
    let newIds: string[] = [];
    set((s) => {
      newIds = s.favoriteIds.includes(recipeId) ? s.favoriteIds : [...s.favoriteIds, recipeId];
      return { favoriteIds: newIds };
    });
    if (userId && newIds.length) await AsyncStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(newIds));
  },

  removeFavorite: async (recipeId: string) => {
    const userId = useAuthStore.getState().user?._id;
    try {
      await apiRemove(recipeId);
    } catch {}
    let newIds: string[] = [];
    set((s) => {
      newIds = s.favoriteIds.filter((id) => id !== recipeId);
      return { favoriteIds: newIds };
    });
    if (userId) await AsyncStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(newIds));
  },

  isFavorited: (recipeId: string) => get().favoriteIds.includes(recipeId),
}));
