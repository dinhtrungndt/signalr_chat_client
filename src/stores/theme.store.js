import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'system', // 'light' | 'dark' | 'system'

      setTheme: (newTheme) => {
        set({ theme: newTheme });
        get().applyTheme(newTheme);
      },

      applyTheme: (currentTheme) => {
        const root = document.documentElement;
        const isDark =
          currentTheme === 'dark' ||
          (currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

        if (isDark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      },

      initTheme: () => {
        const { theme, applyTheme } = get();
        applyTheme(theme);

        // Lắng nghe sự thay đổi của hệ thống nếu đang ở chế độ system
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
          if (get().theme === 'system') {
            applyTheme('system');
          }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      },
    }),
    {
      name: 'theme-storage', // Tên lưu trong localStorage
    }
  )
);

export default useThemeStore;
