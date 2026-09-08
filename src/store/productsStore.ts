import { create } from 'zustand';
import { productsService, Product, ProductFilters } from '../services/productsService';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface ProductsStore {
  products: Product[];
  featuredProducts: Product[];
  categories: string[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  loadMoreError: string | null;
  filters: ProductFilters;
  lastFetchedAt: number | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  fetchProducts: (filters?: ProductFilters) => Promise<void>;
  loadMoreProducts: () => Promise<void>;
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

let latestRequest = 0;

export const useProductsStore = create<ProductsStore>((set, get) => ({
  products: [],
  featuredProducts: [],
  categories: [],
  loading: false,
  loadingMore: false,
  error: null,
  loadMoreError: null,
  filters: defaultFilters,
  lastFetchedAt: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },

  fetchProducts: async (filters?: ProductFilters) => {
    const request = ++latestRequest;
    const currentFilters = { ...(filters || get().filters) };
    set({ loading: true, loadingMore: false, error: null, loadMoreError: null });
    try {
      const response = await productsService.getProducts(currentFilters);
      if (request !== latestRequest) return;
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
      if (request !== latestRequest) return;
      set({
        error: error.response?.data?.message || error.message || 'Failed to fetch products',
        loading: false,
      });
    }
  },

  loadMoreProducts: async () => {
    const state = get();
    if (state.loading || state.loadingMore || state.pagination.page >= state.pagination.pages) return;
    const request = ++latestRequest;
    set({ loadingMore: true, loadMoreError: null });
    try {
      const response = await productsService.getProducts({ ...state.filters, page: state.pagination.page + 1 });
      if (request !== latestRequest) return;
      const products = new Map(get().products.map((product) => [product._id, product]));
      for (const product of response.products || []) {
        if (product?._id && product.name) products.set(product._id, product);
      }
      set({ products: [...products.values()], pagination: response.pagination, loadingMore: false });
    } catch (error: any) {
      if (request !== latestRequest) return;
      set({ loadMoreError: error.response?.data?.message || error.message || 'Impossible de charger la suite', loadingMore: false });
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
    if (Object.entries(filters).every(([key, value]) => get().filters[key as keyof ProductFilters] === value)) return;
    ++latestRequest;
    set({ filters: { ...get().filters, ...filters }, loading: false, loadingMore: false });
  },

  resetFilters: () => {
    ++latestRequest;
    set({ filters: defaultFilters, loading: false, loadingMore: false });
  },
}));

