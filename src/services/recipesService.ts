import api from './api';
import type { Recipe } from '../types';

export interface RecipeFilters {
  page?: number;
  limit?: number;
  maxPreparationTime?: number;
  mealPrepDays?: number;
  ingredients?: string[];
  matchMode?: 'all' | 'partial';
}

export async function getRecipes(filters: RecipeFilters = {}): Promise<{ recipes: Recipe[]; page: number; totalPages: number; total: number }> {
  const params: Record<string, string | number> = {};
  if (filters.page) params.page = filters.page;
  if (filters.limit) params.limit = filters.limit;
  if (filters.maxPreparationTime != null) params.maxPreparationTime = filters.maxPreparationTime;
  if (filters.mealPrepDays != null) params.mealPrepDays = filters.mealPrepDays;
  if (filters.ingredients && filters.ingredients.length > 0) params.ingredients = filters.ingredients.join(',');
  if (filters.matchMode) params.matchMode = filters.matchMode;
  const res = await api.get<{ recipes: Recipe[]; page: number; totalPages: number; total: number }>('/recipes', { params });
  return {
    recipes: res.data?.recipes || [],
    page: res.data?.page ?? 1,
    totalPages: res.data?.totalPages ?? 1,
    total: res.data?.total ?? 0,
  };
}

export async function getFavoriteRecipeIds(): Promise<string[]> {
  try {
    const res = await api.get<{ recipeIds: string[] }>('/me/recipes/favorites');
    if (Array.isArray(res.data?.recipeIds)) return res.data.recipeIds;
  } catch {
    // fallback
  }
  return [];
}

export async function addRecipeFavorite(recipeId: string): Promise<void> {
  try {
    await api.post(`/me/recipes/favorites/${recipeId}`);
  } catch {
    // store locally in store
  }
}

export async function removeRecipeFavorite(recipeId: string): Promise<void> {
  try {
    await api.delete(`/me/recipes/favorites/${recipeId}`);
  } catch {
    // remove locally in store
  }
}
