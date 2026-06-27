import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../services/productsService';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  loading: boolean;
  error: string | null;
  fetchCart: () => Promise<void>;
  addToCart: (product: Product, quantity: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  getTotalPrice: (isUhSubscribed?: boolean) => number;
  getDeliveryFee: (isUhSubscribed?: boolean) => number;
  getItemCount: () => number;
  getCartItem: (productId: string) => CartItem | undefined;
}

const CART_STORAGE_KEY = '@diettemple_cart';

// Helper functions for AsyncStorage
const loadCartFromStorage = async (): Promise<CartItem[]> => {
  try {
    const cartData = await AsyncStorage.getItem(CART_STORAGE_KEY);
    if (cartData) {
      return JSON.parse(cartData);
    }
    return [];
  } catch (error) {
    console.error('Error loading cart from storage:', error);
    return [];
  }
};

const saveCartToStorage = async (items: CartItem[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Error saving cart to storage:', error);
  }
};

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchCart: async () => {
    set({ loading: true, error: null });
    try {
      const items = await loadCartFromStorage();
      console.log('📦 Cart loaded from storage:', {
        itemsCount: items?.length || 0,
        items: items,
      });
      set({ items, loading: false });
    } catch (error: any) {
      console.error('❌ Error fetching cart:', error);
      set({
        error: error.message || 'Failed to fetch cart',
        loading: false,
      });
    }
  },

  addToCart: async (product: Product, quantity: number) => {
    try {
      const currentItems = get().items;
      const existingItemIndex = currentItems.findIndex(
        (item) => item.product._id === product._id
      );

      let newItems: CartItem[];
      if (existingItemIndex >= 0) {
        // Update existing item
        newItems = [...currentItems];
        newItems[existingItemIndex].quantity += quantity;
      } else {
        // Add new item
        newItems = [...currentItems, { product, quantity }];
      }

      await saveCartToStorage(newItems);
      set({ items: newItems });
    } catch (error: any) {
      throw error;
    }
  },

  updateQuantity: async (productId: string, quantity: number) => {
    try {
      const currentItems = get().items;
      const newItems = currentItems.map((item) =>
        item.product._id === productId ? { ...item, quantity: Math.max(0, quantity) } : item
      ).filter((item) => item.quantity > 0); // Remove items with 0 quantity

      await saveCartToStorage(newItems);
      set({ items: newItems });
    } catch (error: any) {
      throw error;
    }
  },

  removeFromCart: async (productId: string) => {
    try {
      const currentItems = get().items;
      const newItems = currentItems.filter((item) => item.product._id !== productId);

      await saveCartToStorage(newItems);
      set({ items: newItems });
    } catch (error: any) {
      throw error;
    }
  },

  clearCart: async () => {
    try {
      await AsyncStorage.removeItem(CART_STORAGE_KEY);
      set({ items: [] });
    } catch (error: any) {
      throw error;
    }
  },

  getTotalPrice: (isUhSubscribed = false) => {
    const items = get().items;
    if (!items || items.length === 0) return 0;

    return items.reduce((total, item) => {
      const product = item.product;
      if (!product || !product.price) return total;

      const discountedPrice = product.discount && typeof product.discount === 'number'
        ? product.price * (1 - product.discount / 100)
        : product.price;

      const hasUhPrice = !!(product.uhPrice && product.uhPrice > 0 && product.uhPrice < product.price);
      const price = isUhSubscribed && hasUhPrice ? product.uhPrice! : discountedPrice;

      return total + price * item.quantity;
    }, 0);
  },

  getDeliveryFee: (isUhSubscribed = false) => {
    const subtotal = get().getTotalPrice(isUhSubscribed);
    return subtotal < 200 ? 7 : 0;
  },

  getItemCount: () => {
    const items = get().items;
    if (!items || items.length === 0) return 0;
    return items.reduce((count, item) => count + item.quantity, 0);
  },

  getCartItem: (productId: string) => {
    const items = get().items;
    if (!items || !productId) return undefined;
    return items.find((item) => item.product._id === productId);
  },
}));

