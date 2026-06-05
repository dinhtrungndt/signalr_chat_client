import React, { useEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppRouter from './routers/AppRouter';
import useThemeStore from './stores/theme.store';
import GlobalUI from './components/common/GlobalUI';
import CallModal from './components/call/CallModal';
import ZegoGroupCallModal from './components/call/ZegoGroupCallModal';
import IncomingGroupCallToast from './components/call/IncomingGroupCallToast';

// Cấu hình React Query: cache dữ liệu thông minh
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // Giữ cache 5 phút
      retry: 1,                   // Thử lại 1 lần nếu lỗi
      refetchOnWindowFocus: false, // Không gọi lại khi chuyển tab
    },
  },
});

function App() {
  const initTheme = useThemeStore(s => s.initTheme);

  useEffect(() => {
    const cleanup = initTheme();
    return cleanup;
  }, [initTheme]);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <GlobalUI />
        <CallModal />
        <ZegoGroupCallModal />
        <IncomingGroupCallToast />
        <AppRouter />
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
