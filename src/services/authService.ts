import api from './api';
import { User } from '../types';

export interface LoginCredentials {
  emailOrPhone: string;
  password: string;
}

export interface SignupData {
  emailOrPhone: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordData {
  emailOrPhone: string;
}

export interface VerifyOTPData {
  emailOrPhone: string;
  otp: string;
}

export interface ResetPasswordData {
  emailOrPhone: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

export const authService = {
  register: async (data: SignupData) => {
    const response = await api.post<{ user: User; token: string }>('/auth/register', data);
    return response.data;
  },

  login: async (credentials: LoginCredentials) => {
    const response = await api.post<{ user: User; token: string }>('/auth/login', credentials);
    return response.data;
  },

  forgotPassword: async (data: ForgotPasswordData) => {
    const response = await api.post('/auth/forgot-password', data);
    return response.data;
  },

  verifyOTP: async (data: VerifyOTPData) => {
    const response = await api.post('/auth/verify-otp', data);
    return response.data;
  },

  resetPassword: async (data: ResetPasswordData) => {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
  },

  getMe: async () => {
    const response = await api.get<{ user: User }>('/auth/me');
    return response.data;
  },
};

