import axiosClient from './axiosClient';

const userApi = {
  searchUsers: (query) => axiosClient.get(`/users/search`, { params: { q: query } }),
  getRecentChats: () => axiosClient.get(`/users/recent-chats`),
};

export default userApi;
