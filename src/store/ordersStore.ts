/**
 * Persists the last confirmed order so PaymentSuccessScreen never loses it
 * when navigation params are cleared or the screen is revisited.
 *
 * Usage:
 *   // Before navigating to PaymentSuccess:
 *   useOrdersStore.getState().setLastOrder(order);
 *   navigation.navigate('PaymentSuccess', { orderId: order._id });
 *
 *   // In PaymentSuccessScreen:
 *   const lastOrder = useOrdersStore(s => s.lastOrder);
 *   const order = lastOrder?._id === orderId ? lastOrder : orderFromParams;
 */
import { create } from 'zustand';
import { ordersService, type Order } from '../services/ordersService';

interface OrdersStore {
  orders: Order[];
  lastOrder: Order | null;
  isLoading: boolean;

  /** Save the just-confirmed order before navigating to PaymentSuccess. */
  setLastOrder: (order: Order) => void;
  /** Fetch full orders list. */
  fetchOrders: () => Promise<void>;
  /** Find order by ID from local cache. */
  getOrderById: (id: string) => Order | undefined;
  /** Clear on logout. */
  clear: () => void;
}

export const useOrdersStore = create<OrdersStore>((set, get) => ({
  orders: [],
  lastOrder: null,
  isLoading: false,

  setLastOrder: (order) => set({ lastOrder: order }),

  fetchOrders: async () => {
    set({ isLoading: true });
    try {
      const orders = await ordersService.getOrders();
      set({ orders, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  getOrderById: (id) => {
    const { orders, lastOrder } = get();
    if (lastOrder?._id === id) return lastOrder;
    return orders.find((o) => o._id === id);
  },

  clear: () => set({ orders: [], lastOrder: null, isLoading: false }),
}));
