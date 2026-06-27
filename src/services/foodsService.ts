import api from './api';
import type { FoodSearchItem } from './meService';

export const foodsService = {
  search: async (q: string, limit?: number): Promise<{ foods: FoodSearchItem[] }> => {
    const res = await api.get<{ foods: FoodSearchItem[] }>('/foods', { params: { q: q.trim(), limit: limit ?? 30 } });
    return res.data;
  },
};
