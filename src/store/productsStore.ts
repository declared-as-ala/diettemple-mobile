import { create } from 'zustand';
import { productsService, Product, ProductFilters } from '../services/productsService';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface ProductsStore {
  products: Product[];
  featuredProducts: Product[];
  categories: string[];
  loading: boolean;
  error: string | null;
  filters: ProductFilters;
  lastFetchedAt: number | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  fetchProducts: (filters?: ProductFilters) => Promise<void>;
  fetchIfNeeded: (filters?: ProductFilters) => Promise<void>;
  fetchFeaturedProducts: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  setFilters: (filters: ProductFilters) => void;
  resetFilters: () => void;
  invalidate: () => void;
}

const defaultFilters: ProductFilters = {
  page: 1,
  limit: 20,
};

export const useProductsStore = create<ProductsStore>((set, get) => ({
  products: [],
  featuredProducts: [],
  categories: [],
  loading: false,
  error: null,
  filters: defaultFilters,
  lastFetchedAt: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },

  fetchProducts: async (filters?: ProductFilters) => {
    set({ loading: true, error: null });
    try {
      const currentFilters = filters || get().filters;
      const response = await productsService.getProducts(currentFilters);
      const validProducts = (response.products || []).filter(
        (product) => product && product._id && product.name
      );
      set({
        products: validProducts,
        pagination: response.pagination,
        filters: currentFilters,
        loading: false,
        lastFetchedAt: Date.now(),
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || error.message || 'Failed to fetch products',
        loading: false,
      });
    }
  },

  fetchIfNeeded: async (filters?: ProductFilters) => {
    const { lastFetchedAt, loading } = get();
    if (loading) return;
    const isStale = !lastFetchedAt || Date.now() - lastFetchedAt > CACHE_TTL_MS;
    if (!isStale && !filters) return;
    await get().fetchProducts(filters);
  },

  invalidate: () => set({ lastFetchedAt: null }),

  fetchFeaturedProducts: async () => {
    try {
      const products = await productsService.getFeaturedProducts();
      // Filter out any null or invalid products
      const validProducts = (products || []).filter(
        (product) => product && product._id && product.name
      );
      set({ featuredProducts: validProducts });
    } catch (error: any) {
      console.error('Error fetching featured products:', error);
    }
  },

  fetchCategories: async () => {
    try {
      const categories = await productsService.getCategories();
      set({ categories });
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    }
  },

  setFilters: (filters: ProductFilters) => {
    set({ filters: { ...get().filters, ...filters } });
  },

  resetFilters: () => {
    set({ filters: defaultFilters });
  },
}));

