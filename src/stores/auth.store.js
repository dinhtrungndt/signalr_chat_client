import { create } from 'zustand';
import tokenStorage from '../utils/tokenStorage';
import authApi from '../api/auth.api';
import { registerPushSubscription } from '../utils/push';

// Khóa localStorage (obfuscated)
const STORAGE_KEY = btoa('dvn_chat_refresh_token');

// Mã hóa Base64 trước khi lưu (obfuscate - khó nhìn hơn plaintext)
const encodeToken = (token) => btoa(unescape(encodeURIComponent(token)));
const decodeToken = (encoded) => {
  try {
    return decodeURIComponent(escape(atob(encoded)));
  } catch {
    return null;
  }
};

const saveRefreshToken = (token) => {
  localStorage.setItem(STORAGE_KEY, encodeToken(token));
};

const loadRefreshToken = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? decodeToken(raw) : null;
};

const clearRefreshToken = () => {
  localStorage.removeItem(STORAGE_KEY);
};

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (credentials) => {
    const { data } = await authApi.login(credentials);
    const { user, accessToken, refreshToken, unitGroup } = data.data;

    tokenStorage.set(accessToken);
    saveRefreshToken(refreshToken);

    set({ user, isAuthenticated: true });

    // Tự động mở nhóm đơn vị ngay sau khi đăng nhập
    if (unitGroup) {
      import('./chat.store').then((module) => {
        module.default.getState().setActiveConversation({
          ...unitGroup,
          type: 'group',
        });
      });
    }

    // Đăng ký nhận thông báo nền (Web Push) sau khi đăng nhập thành công
    setTimeout(() => registerPushSubscription(), 1000);

    return data;
  },

  register: async (formData) => {
    const { data } = await authApi.register(formData);
    const { user, accessToken, refreshToken } = data.data;

    tokenStorage.set(accessToken);
    saveRefreshToken(refreshToken);

    set({ user, isAuthenticated: true });
    return data;
  },

  qrLogin: (authData) => {
    const { user, accessToken, refreshToken } = authData;
    tokenStorage.set(accessToken);
    saveRefreshToken(refreshToken);
    set({ user, isAuthenticated: true });
    setTimeout(() => registerPushSubscription(), 1000);
  },

  updateUser: (user) => set({ user }),

  checkAuth: async () => {
    set({ isLoading: true });
    const refreshToken = loadRefreshToken();

    if (!refreshToken) {
      // Không có refreshToken → chưa đăng nhập, không xóa gì cả
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const { data: refreshData } = await authApi.refreshToken({ refreshToken });
      const { accessToken: newAccess, refreshToken: newRefresh } = refreshData.data;

      tokenStorage.set(newAccess);
      // Cập nhật refreshToken mới (Token Rotation)
      if (newRefresh) saveRefreshToken(newRefresh);

      const { data: meData } = await authApi.getMe();
      const user = meData.data;
      set({ user, isAuthenticated: true, isLoading: false });

      // Tự động mở nhóm đơn vị khi load lại trang
      try {
        const groupApiModule = await import('../api/group.api');
        const { data: groupData } = await groupApiModule.default.getMyUnitGroup();
        if (groupData?.data) {
          const chatStoreModule = await import('./chat.store');
          chatStoreModule.default.getState().setActiveConversation({
            ...groupData.data,
            type: 'group',
          });
        }
      } catch (_) {
        // Không có nhóm đơn vị thì thôi, không ảnh hưởng
      }

      // Đảm bảo đã subscribe web push (trường hợp load lại trang)
      setTimeout(() => registerPushSubscription(), 2000);
    } catch (err) {
      const status = err?.response?.status;

      // Chỉ xóa token khi lỗi xác thực (401/403/422)
      // KHÔNG xóa khi lỗi mạng (network error) để tránh mất session
      if (status === 401 || status === 403 || status === 422) {
        tokenStorage.clear();
        clearRefreshToken();
        set({ user: null, isAuthenticated: false, isLoading: false });
      } else {
        // Lỗi mạng/server tạm thời → vẫn giữ trạng thái loading: false nhưng không xóa token
        set({ isLoading: false, isAuthenticated: false });
      }
    }
  },

  logout: () => {
    tokenStorage.clear();
    clearRefreshToken();
    set({ user: null, isAuthenticated: false });
    
    // Xóa bộ nhớ Zustand của Chat
    import('./chat.store').then((module) => {
      module.default.getState().clear();
    });

    // Xóa bộ nhớ đệm của React Query
    import('../App').then((module) => {
      module.queryClient.clear();
    });

    // Ép ngắt kết nối Socket ngay lập tức
    import('../services/socket.service').then((module) => {
      module.default.disconnect();
    });
  },

  setUser: (user) => set({ user }),
}));

export default useAuthStore;
