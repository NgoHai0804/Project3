import apiClient from './apiClient';
import { API_ENDPOINTS } from '../../utils/constants';

export const authApi = {
  login: async (credentials) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
      return response.data.data || response.data;
    } catch (error) {
      // Trích xuất thông báo lỗi từ response
      const errorMessage = error.response?.data?.message || error.message || 'Đăng nhập thất bại';
      throw new Error(errorMessage);
    }
  },

  register: async (userData) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, userData);
    return response.data.data || response.data;
  },

  logout: async () => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    return response.data;
  },

  refresh: async (refreshToken) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH, { refreshToken });
      return response.data.data || response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Refresh token thất bại';
      throw new Error(errorMessage);
    }
  },

  forgotPassword: async (email) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
    return response.data;
  },

  resetPassword: async (email, code, newPassword) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, { 
      email, 
      code, 
      newPassword 
    });
    return response.data;
  },
};

export default authApi;

