import axiosClient from './axiosClient';

const authApi = {
  register: (data) => axiosClient.post('/auth/register', data),
  login: (data) => axiosClient.post('/auth/login', data),
  refreshToken: (data) => axiosClient.post('/auth/refresh-token', data),
  getMe: () => axiosClient.get('/auth/me'),
};

export default authApi;
