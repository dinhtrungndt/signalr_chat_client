import axios from 'axios';
import tokenStorage from '../utils/tokenStorage';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:1411/api';

const axiosClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Cho phép gửi/nhận Cookie (refreshToken httpOnly)
});

// ===================================================
// REQUEST INTERCEPTOR: Tự động gắn Access Token
// ===================================================
axiosClient.interceptors.request.use(
  (config) => {
    const token = tokenStorage.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ===================================================
// RESPONSE INTERCEPTOR: Tự động làm mới Token khi hết hạn
// ===================================================
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Bỏ qua interceptor nếu API đang gọi là login, register, hoặc refresh
    if (originalRequest.url.includes('/auth/login') || originalRequest.url.includes('/auth/register') || originalRequest.url.includes('/auth/refresh-token')) {
      return Promise.reject(error);
    }

    // Nếu lỗi 401 (token hết hạn) và chưa thử refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Nếu đang refresh thì xếp hàng chờ
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Lấy refreshToken từ localStorage rồi gửi trong body
        const refreshToken = localStorage.getItem('dvn_rt');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(
          `${API_URL}/auth/refresh-token`,
          { refreshToken },
          { withCredentials: true }
        );
        const newToken = data.data.accessToken;
        const newRefresh = data.data.refreshToken;

        tokenStorage.set(newToken);
        if (newRefresh) localStorage.setItem('dvn_rt', newRefresh);

        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        tokenStorage.clear();
        // Đá user về trang login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
