import axiosClient from './axiosClient';

const messageApi = {
  getGroupMessages: (groupId, params) =>
    axiosClient.get(`/messages/group/${groupId}`, { params }),

  getDirectMessages: (userId, params) =>
    axiosClient.get(`/messages/direct/${userId}`, { params }),
    
  recallMessage: (messageId) =>
    axiosClient.put(`/messages/${messageId}/recall`),
    
  deleteForMe: (messageId) =>
    axiosClient.delete(`/messages/${messageId}/for-me`),
    
  getMedia: (params) =>
    axiosClient.get('/messages/media', { params }),
    
  searchMessages: (params) =>
    axiosClient.get('/messages/search', { params }),
    
  // Pinned Messages
  getPinnedMessages: (params) => 
    axiosClient.get('/messages/pins', { params }),
    
  pinMessage: (messageId, data) => 
    axiosClient.post(`/messages/pins/${messageId}`, data),
    
  unpinMessage: (messageId) => 
    axiosClient.delete(`/messages/pins/${messageId}`),
};

export default messageApi;
