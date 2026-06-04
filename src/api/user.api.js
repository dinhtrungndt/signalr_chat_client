import axiosClient from './axiosClient';

const userApi = {
  searchUsers: (query) => axiosClient.get(`/users/search`, { params: { q: query } }),
  getRecentChats: () => axiosClient.get(`/users/recent-chats`),
  
  // Pinned Conversations
  getPinnedConversations: () => axiosClient.get('/users/pinned-conversations'),
  pinConversation: (type, entityId) => axiosClient.post('/users/pinned-conversations', { type, entityId }),
  unpinConversation: (type, entityId) => axiosClient.delete('/users/pinned-conversations', { data: { type, entityId } }),
  
  // Muted Conversations
  getMutedConversations: () => axiosClient.get('/users/muted-conversations'),
  muteConversation: (type, entityId) => axiosClient.post('/users/muted-conversations', { type, entityId }),
  unmuteConversation: (type, entityId) => axiosClient.delete('/users/muted-conversations', { data: { type, entityId } }),

  updateProfile: (data) => axiosClient.put('/users/profile', data),
  getUserProfile: (userId) => axiosClient.get(`/users/${userId}`),
};

export default userApi;
