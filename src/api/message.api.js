import axiosClient from './axiosClient';

const messageApi = {
  getGroupMessages: (groupId, params) =>
    axiosClient.get(`/messages/group/${groupId}`, { params }),

  getDirectMessages: (userId, params) =>
    axiosClient.get(`/messages/direct/${userId}`, { params }),
    
  recallMessage: (messageId) =>
    axiosClient.put(`/messages/${messageId}/recall`),
    
  getMedia: (params) =>
    axiosClient.get('/messages/media', { params }),
    
  searchMessages: (params) =>
    axiosClient.get('/messages/search', { params }),
};

export default messageApi;
