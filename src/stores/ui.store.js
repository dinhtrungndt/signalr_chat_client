import { create } from 'zustand';

export const useUIStore = create((set, get) => ({
  toast: null,
  confirmDialog: null,
  rightSidebarTab: 'info', // 'info' | 'search'

  setRightSidebarTab: (tab) => set({ rightSidebarTab: tab }),

  // Hiển thị thông báo (toast)
  showToast: (message, type = 'info') => {
    // type: 'success' | 'error' | 'info' | 'warning'
    set({ toast: { message, type, id: Date.now() } });
    setTimeout(() => {
      set((state) => (state.toast?.id === get().toast?.id ? { toast: null } : state));
    }, 3000);
  },

  // Hàm dùng thay thế cho alert()
  showAlert: (message, type = 'error') => {
    get().showToast(message, type);
  },

  // Hiển thị hộp thoại xác nhận dạng Promise (dùng thay cho window.confirm)
  confirm: (title, message, confirmText = 'Xác nhận', cancelText = 'Hủy') => {
    return new Promise((resolve) => {
      set({
        confirmDialog: {
          title,
          message,
          confirmText,
          cancelText,
          onConfirm: () => {
            set({ confirmDialog: null });
            resolve(true);
          },
          onCancel: () => {
            set({ confirmDialog: null });
            resolve(false);
          },
        },
      });
    });
  },
}));

export default useUIStore;
