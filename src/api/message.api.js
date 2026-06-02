import axiosClient from './axiosClient';

const messageApi = {
  getGroupMessages: (groupId, params) =>
    axiosClient.get(`/messages/group/${groupId}`, { params }),

  getDirectMessages: (userId, params) =>
    axiosClient.get(`/messages/direct/${userId}`, { params }),
};

export default messageApi;
