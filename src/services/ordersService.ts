import api from './api';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface DeliveryAddress {
  fullName?: string;
  street: string;
  city: string;
  delegation?: string;
  phone?: string;
  email?: string;
  postalCode?: string;
  country?: string;
}

export interface Order {
  _id: string;
  userId?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  totalPrice: number;
  status: 'pending' | 'pending_payment' | 'paid' | 'failed' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  deliveryAddress?: DeliveryAddress;
  paymentMethod: 'CASH_ON_DELIVERY' | 'CLICKTOPAY' | null;
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED';
  paymentReference?: string;
  clickToPay?: {
    paymentId: string;
    reference: string;
    status: string;
  };
  promoCode?: string;
  reference: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderData {
  items: Array<{
    productId: string;
    name?: string;
    price?: number;
    quantity: number;
    image?: string;
  }>;
  deliveryAddress: DeliveryAddress;
  promoCode?: string;
}

export const ordersService = {
  createOrder: async (data: CreateOrderData): Promise<Order> => {
    const response = await api.post<{ order: Order }>('/orders', data);
    return response.data.order;
  },

  getOrders: async (): Promise<Order[]> => {
    const response = await api.get<{ orders: Order[] }>('/orders');
    return response.data.orders;
  },

  getOrder: async (orderId: string): Promise<Order> => {
    const response = await api.get<{ order: Order }>(`/orders/${orderId}`);
    return response.data.order;
  },

  downloadPDF: async (orderId: string): Promise<Blob> => {
    const response = await api.get(`/orders/${orderId}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
