import axiosClient from './axiosClient';

const authApi = {
  register: (data) => axiosClient.post('/auth/register', data),
  login: (data) => axiosClient.post('/auth/login', data),
  refreshToken: (data) => axiosClient.post('/auth/refresh-token', data),
  getMe: () => axiosClient.get('/auth/me'),
  
  // QR Login
  generateQrSession: () => axiosClient.get('/auth/qr/generate'),
  getQrStatus: (sessionId) => axiosClient.get(`/auth/qr/status/${sessionId}`),
  authorizeQrSession: (sessionId) => axiosClient.post(`/auth/qr/authorize/${sessionId}`),
};

export default authApi;
