import axiosClient from './axiosClient';

const groupApi = {
  getMyGroups: () => axiosClient.get('/groups/me'),
  createGroup: (data) => axiosClient.post('/groups', data),
  getGroupTree: (groupId) => axiosClient.get(`/groups/${groupId}/users`),
  addUser: (groupId, data) => axiosClient.post(`/groups/${groupId}/users`, data),
  removeUser: (groupId, userId, silent = false) => axiosClient.delete(`/groups/${groupId}/users/${userId}${silent ? '?silent=true' : ''}`),
  deleteGroup: (groupId) => axiosClient.delete(`/groups/${groupId}`),
  toggleReadOnly: (groupId, isReadOnly) => axiosClient.put(`/groups/${groupId}/readonly`, { isReadOnly }),
  updateSettings: (groupId, data) => axiosClient.put(`/groups/${groupId}/settings`, data),
  changeRole: (groupId, targetUserId, role) => axiosClient.put(`/groups/${groupId}/users/${targetUserId}/role`, { role }),
};

export default groupApi;
