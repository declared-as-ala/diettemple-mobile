import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../services/productsService';

interface FavoritesStore {
  favoriteProducts: Product[];
  loading: boolean;
  error: string | null;
  fetchFavorites: () => Promise<void>;
  addFavorite: (product: Product) => Promise<void>;
  removeFavorite: (productId: string) => Promise<void>;
  isFavorited: (productId: string) => boolean;
  checkFavorite: (productId: string) => Promise<boolean>;
}

const FAVORITES_STORAGE_KEY = '@diettemple_favorites';

// Helper functions for AsyncStorage
const loadFavoritesFromStorage = async (): Promise<Product[]> => {
  try {
    const favoritesData = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
    if (favoritesData) {
      return JSON.parse(favoritesData);
    }
    return [];
  } catch (error) {
    console.error('Error loading favorites from storage:', error);
    return [];
  }
};

const saveFavoritesToStorage = async (products: Product[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(products));
  } catch (error) {
    console.error('Error saving favorites to storage:', error);
  }
};

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  favoriteProducts: [],
  loading: false,
  error: null,

  fetchFavorites: async () => {
    set({ loading: true, error: null });
    try {
      const products = await loadFavoritesFromStorage();
      set({ favoriteProducts: products, loading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch favorites',
        favoriteProducts: [],
        loading: false,
      });
    }
  },

  addFavorite: async (product: Product) => {
    try {
      const currentProducts = get().favoriteProducts;
      if (!currentProducts.find((p) => p._id === product._id)) {
        const newProducts = [...currentProducts, product];
        await saveFavoritesToStorage(newProducts);
        set({ favoriteProducts: newProducts });
      }
    } catch (error: any) {
      throw error;
    }
  },

  removeFavorite: async (productId: string) => {
    try {
      const currentProducts = get().favoriteProducts;
      const newProducts = currentProducts.filter((p) => p._id !== productId);
      await saveFavoritesToStorage(newProducts);
      set({ favoriteProducts: newProducts });
    } catch (error: any) {
      throw error;
    }
  },

  isFavorited: (productId: string) => {
    return get().favoriteProducts.some((p) => p._id === productId);
  },

  checkFavorite: async (productId: string) => {
    // For local storage, just check synchronously
    return get().isFavorited(productId);
  },
}));


