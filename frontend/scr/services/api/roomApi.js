import apiClient from './apiClient';

const API_ENDPOINTS = {
  LIST: '/api/rooms/list',
  CREATE: '/api/rooms/create',
  JOIN: '/api/rooms/join',
  LEAVE: '/api/rooms/leave',
  GET: (id) => `/api/rooms/${id}`,
  CHECK_USER_ROOM: '/api/rooms/check-user-room',
  VERIFY_PASSWORD: '/api/rooms/verify-password',
};

export const roomApi = {
  getRooms: async (params = {}) => {
    const response = await apiClient.get(API_ENDPOINTS.LIST, { params });
    return response.data.data || response.data;
  },

  createRoom: async (roomData) => {
    try {
      const response = await apiClient.post(API_ENDPOINTS.CREATE, roomData);
      if (response.data.success && response.data.data) {
        return { room: response.data.data };
      }
      return { room: response.data.data || response.data };
    } catch (error) {
      console.error('createRoom API error:', error);
      throw error;
    }
  },

  joinRoom: async (roomId, password = '') => {
    const response = await apiClient.post(API_ENDPOINTS.JOIN, { roomId, password });
    return response.data.data || response.data;
  },

  leaveRoom: async (roomId) => {
    const response = await apiClient.post(API_ENDPOINTS.LEAVE, { roomId });
    return response.data.data || response.data;
  },

  getRoom: async (roomId) => {
    const response = await apiClient.get(API_ENDPOINTS.GET(roomId));
    return response.data.data || response.data;
  },

  checkUserRoom: async () => {
    const response = await apiClient.get(API_ENDPOINTS.CHECK_USER_ROOM);
    return response.data.data || response.data;
  },

  verifyPassword: async (roomId, password) => {
    const response = await apiClient.post(API_ENDPOINTS.VERIFY_PASSWORD, { roomId, password });
    return response.data.data || response.data;
  },
};

export default roomApi;
