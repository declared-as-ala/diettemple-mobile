import api from './api';
import { Order, CreateOrderData } from './ordersService';

export const checkoutService = {
  createOrder: async (data: CreateOrderData): Promise<Order> => {
    const response = await api.post<{ order: Order }>('/orders/create', data);
    return response.data.order;
  },
};
