import axiosClient from './axiosClient';

const userApi = {
  searchUsers: (query) => axiosClient.get(`/users/search`, { params: { q: query } }),
  getRecentChats: () => axiosClient.get(`/users/recent-chats`),
  
  // Pinned Conversations
  getPinnedConversations: () => axiosClient.get('/users/pinned-conversations'),
  pinConversation: (type, entityId) => axiosClient.post('/users/pinned-conversations', { type, entityId }),
  unpinConversation: (type, entityId) => axiosClient.delete('/users/pinned-conversations', { data: { type, entityId } }),
};

export default userApi;
