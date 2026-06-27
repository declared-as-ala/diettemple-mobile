import api from './api';

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  discount?: number;
  /** UH Premium price — lower price for subscribed users */
  uhPrice?: number | null;
  /** If true, this product is exclusive to UH subscribers */
  isUhExclusive?: boolean;
  images: string[];
  category: string;
  stock: number;
  isFeatured: boolean;
  tags?: string[];
  nutritionInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProductsResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  sort?: 'price-asc' | 'price-desc' | 'popular' | 'newest';
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

export const productsService = {
  getProducts: async (filters?: ProductFilters): Promise<ProductsResponse> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    const response = await api.get<ProductsResponse>(`/products?${params.toString()}`);
    return response.data;
  },

  getProduct: async (id: string): Promise<Product> => {
    const response = await api.get<{ product: Product }>(`/products/${id}`);
    return response.data.product;
  },

  getFeaturedProducts: async (): Promise<Product[]> => {
    const response = await api.get<{ products: Product[] }>('/products/featured');
    return response.data.products;
  },

  getCategories: async (): Promise<string[]> => {
    const response = await api.get<{ categories: string[] }>('/products/categories');
    return response.data.categories;
  },

  searchSuggestions: async (query: string): Promise<string[]> => {
    const response = await api.get<{ suggestions: string[] }>(`/products/search/suggestions?q=${encodeURIComponent(query)}`);
    return response.data.suggestions;
  },
};


