import api from './api';
import { Product } from './productsService';

export interface CartItem {
  productId: Product | string;
  quantity: number;
}

export interface Cart {
  _id: string;
  userId: string;
  items: CartItem[];
  updatedAt: string;
}

export interface CartTotals {
  subtotal: number;
  deliveryFee: number;
  total: number;
}

export const cartService = {
  getCart: async (): Promise<{ cart: Cart; totals: CartTotals }> => {
    const response = await api.get<{ cart: Cart; totals: CartTotals }>('/cart');
    return response.data;
  },

  addToCart: async (productId: string, quantity: number): Promise<{ cart: Cart; totals: CartTotals }> => {
    const response = await api.post<{ cart: Cart; totals: CartTotals }>('/cart', { productId, quantity });
    return response.data;
  },

  updateCartItem: async (productId: string, quantity: number): Promise<{ cart: Cart; totals: CartTotals }> => {
    const response = await api.put<{ cart: Cart; totals: CartTotals }>(`/cart/item/${productId}`, { quantity });
    return response.data;
  },

  removeFromCart: async (productId: string): Promise<{ cart: Cart; totals: CartTotals }> => {
    const response = await api.delete<{ cart: Cart; totals: CartTotals }>(`/cart/item/${productId}`);
    return response.data;
  },

  clearCart: async (): Promise<void> => {
    await api.delete('/cart');
  },
};

