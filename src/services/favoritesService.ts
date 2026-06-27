import api from './api';
import { Product } from './productsService';

export interface Favorite {
  _id: string;
  userId: string;
  productId: Product | string;
  createdAt: string;
}

export const favoritesService = {
  getFavorites: async (): Promise<Favorite[]> => {
    const response = await api.get<{ favorites: Favorite[] }>('/favorites');
    return response.data.favorites;
  },

  addFavorite: async (productId: string): Promise<Favorite> => {
    const response = await api.post<{ favorite: Favorite }>('/favorites', { productId });
    return response.data.favorite;
  },

  removeFavorite: async (favoriteId: string): Promise<void> => {
    await api.delete(`/favorites/${favoriteId}`);
  },

  removeFavoriteByProduct: async (productId: string): Promise<void> => {
    await api.delete(`/favorites/product/${productId}`);
  },

  checkFavorite: async (productId: string): Promise<boolean> => {
    const response = await api.get<{ isFavorited: boolean }>(`/favorites/check/${productId}`);
    return response.data.isFavorited;
  },
};


