import { create } from 'zustand';
import type { ScanMealItem, ScanMealSuggestedFood } from '../services/meService';
import type { FoodSearchItem } from '../services/meService';

export interface DraftItem {
  id: string;
  name: string;
  confidence: number;
  grams: number;
  selectedFood: {
    foodId: string;
    name: string;
    macrosPer100g: { kcal: number; protein: number; carbs: number; fat: number };
  } | null;
  suggestedFoods: ScanMealSuggestedFood[];
}

interface MealScanState {
  photoUri: string | null;
  items: DraftItem[];
  setPhotoUri: (uri: string | null) => void;
  setScanResult: (items: ScanMealItem[]) => void;
  updateItem: (id: string, updates: Partial<Pick<DraftItem, 'name' | 'grams' | 'selectedFood'>>) => void;
  removeItem: (id: string) => void;
  addManualItem: (food: FoodSearchItem, grams?: number) => void;
  clearDraft: () => void;
  getTotals: () => { kcal: number; protein: number; carbs: number; fat: number };
}

function makeId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function macrosForGrams(grams: number, per100: { kcal: number; protein: number; carbs: number; fat: number }): { kcal: number; protein: number; carbs: number; fat: number } {
  const r = grams / 100;
  return {
    kcal: Math.round(per100.kcal * r),
    protein: Math.round(per100.protein * r * 10) / 10,
    carbs: Math.round(per100.carbs * r * 10) / 10,
    fat: Math.round(per100.fat * r * 10) / 10,
  };
}

export const useMealScanStore = create<MealScanState>((set, get) => ({
  photoUri: null,
  items: [],

  setPhotoUri: (uri) => set({ photoUri: uri }),

  setScanResult: (apiItems) => {
    const items: DraftItem[] = apiItems.map((it) => {
      const first = it.suggestedFoods?.[0];
      const selectedFood = first && (first.macrosPer100g || (first as any).macrosPer100g)
        ? { foodId: first.foodId, name: first.name, macrosPer100g: (first.macrosPer100g || (first as any).macrosPer100g)! }
        : null;
      return {
        id: makeId(),
        name: it.label,
        confidence: it.confidence,
        grams: it.defaultGrams ?? 100,
        selectedFood,
        suggestedFoods: it.suggestedFoods || [],
      };
    });
    set({ items });
  },

  updateItem: (id, updates) => {
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    }));
  },

  removeItem: (id) => {
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
  },

  addManualItem: (food, grams = 100) => {
    const item: DraftItem = {
      id: makeId(),
      name: food.name,
      confidence: 1,
      grams,
      selectedFood: {
        foodId: food.foodId,
        name: food.name,
        macrosPer100g: food.macrosPer100g,
      },
      suggestedFoods: [],
    };
    set((s) => ({ items: [...s.items, item] }));
  },

  clearDraft: () => set({ photoUri: null, items: [] }),

  getTotals: () => {
    const { items } = get();
    return items.reduce(
      (acc, it) => {
        const per100 = it.selectedFood?.macrosPer100g;
        if (!per100) return acc;
        const m = macrosForGrams(it.grams, per100);
        acc.kcal += m.kcal;
        acc.protein += m.protein;
        acc.carbs += m.carbs;
        acc.fat += m.fat;
        return acc;
      },
      { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    );
  },
}));

export function getItemMacros(item: DraftItem): { kcal: number; protein: number; carbs: number; fat: number } {
  const per100 = item.selectedFood?.macrosPer100g;
  if (!per100) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  return macrosForGrams(item.grams, per100);
}
