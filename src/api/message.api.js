import axiosClient from './axiosClient';

const messageApi = {
  getGroupMessages: (groupId, params) =>
    axiosClient.get(`/messages/group/${groupId}`, { params }),

  getDirectMessages: (userId, params) =>
    axiosClient.get(`/messages/direct/${userId}`, { params }),
    
  recallMessage: (messageId) =>
    axiosClient.put(`/messages/${messageId}/recall`),
};

export default messageApi;
