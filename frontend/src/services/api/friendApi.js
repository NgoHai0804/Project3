import apiClient from './apiClient';

export const friendApi = {
  getFriends: async () => {
    const response = await apiClient.get('/api/friend');
    return response.data;
  },

  sendRequest: async (addresseeId) => {
    const response = await apiClient.post('/api/friend/request', { addresseeId });
    return response.data;
  },

  getRequests: async () => {
    const response = await apiClient.get('/api/friend/requests');
    return response.data.data || response.data;
  },

  acceptRequest: async (requesterId) => {
    const response = await apiClient.post('/api/friend/accept', { requesterId });
    return response.data;
  },

  cancelRequest: async (requesterId) => {
    const response = await apiClient.post('/api/friend/cancel', { requesterId });
    return response.data;
  },

  searchUser: async (nickname, userID) => {
    const response = await apiClient.post('/api/friend/search', { nickname, userID });
    return response.data;
  },

  removeFriend: async (friendId) => {
    const response = await apiClient.post('/api/friend/unfriend', { friendId });
    return response.data;
  },
};

export default friendApi;
