import apiClient from './apiClient';

export const userApi = {
  getProfile: async () => {
    const response = await apiClient.get('/api/users/profile');
    // Backend trả về { success: true, message, data }
    return response.data.data || response.data;
  },

  updateProfile: async (data) => {
    const response = await apiClient.put('/api/users/profile', data);
    // Backend trả về { success: true, message, data }
    return response.data.data || response.data;
  },

  changePassword: async (data) => {
    try {
      const response = await apiClient.post('/api/users/change-password', data);
      return response.data.data || response.data;
    } catch (error) {
      // Trích xuất thông báo lỗi từ response
      const errorMessage = error.response?.data?.message || error.message || 'Đổi mật khẩu thất bại';
      throw new Error(errorMessage);
    }
  },

  getLeaderboard: async (gameId = 'caro') => {
    const response = await apiClient.get(`/api/users/leaderboard?gameId=${gameId}`);
    // Backend trả về { success: true, message, data }
    const data = response.data.data || response.data;
    // Đảm bảo luôn trả về array
    return Array.isArray(data) ? data : [];
  },

  getUserProfile: async (userId) => {
    const response = await apiClient.get(`/api/users/profile/${userId}`);
    return response.data.data || response.data;
  },

  // API lịch sử game
  getGameHistory: async (limit = 20, skip = 0) => {
    const response = await apiClient.get(`/api/users/game-history?limit=${limit}&skip=${skip}`);
    return response.data.data || response.data;
  },

  getUserGameHistory: async (userId, limit = 20, skip = 0) => {
    const response = await apiClient.get(`/api/users/game-history/${userId}?limit=${limit}&skip=${skip}`);
    return response.data.data || response.data;
  },

  getGameDetail: async (gameId) => {
    const response = await apiClient.get(`/api/users/game/${gameId}`);
    return response.data.data || response.data;
  },
};

export default userApi;
