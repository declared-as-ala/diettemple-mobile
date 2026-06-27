
import api from './api';
import { getAuthToken } from '../utils/authStorage';
import { User } from '../types';

export interface ProfileUpdateData {
  name?: string;
  photoUri?: string;
  age?: string;
  sexe?: string;
  poids?: string;
  taille?: string;
  objectif?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const checkAuth = async (): Promise<boolean> => {
  const token = await getAuthToken();
  if (!token) {
    console.log('⚠️ No token available, skipping profile API call');
    return false;
  }
  return true;
};

export const profileService = {
  getProfile: async () => {
    if (!(await checkAuth())) {
      throw new Error('Not authenticated');
    }
    const response = await api.get<{ user: User }>('/auth/profile');
    return response.data;
  },

  updateProfile: async (data: ProfileUpdateData) => {
    if (!(await checkAuth())) {
      throw new Error('Not authenticated');
    }
    const response = await api.put<{ message: string; user: User }>('/auth/profile', data);
    return response.data;
  },

  changePassword: async (data: ChangePasswordData) => {
    if (!(await checkAuth())) {
      throw new Error('Not authenticated');
    }
    const response = await api.post<{ message: string }>('/auth/change-password', data);
    return response.data;
  },

  uploadImage: async (base64Image: string): Promise<{ imageUrl: string; user: User }> => {
    if (!(await checkAuth())) {
      throw new Error('Not authenticated');
    }
    const response = await api.post<{ imageUrl: string; user: User; message: string }>('/auth/upload-image', {
      image: base64Image,
    });
    return {
      imageUrl: response.data.imageUrl,
      user: response.data.user,
    };
  },
};

