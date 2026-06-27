import api from './api';

export interface PromoCodeValidation {
  valid: boolean;
  code?: string;
  type?: 'percentage' | 'fixed';
  value?: number;
  discount?: number;
  message: string;
}

export const promoService = {
  validatePromoCode: async (code: string, subtotal: number): Promise<PromoCodeValidation> => {
    const response = await api.post<PromoCodeValidation>('/promo/validate', { code, subtotal });
    return response.data;
  },
};


