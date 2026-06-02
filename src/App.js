import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppRouter from './routers/AppRouter';

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
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AppRouter />
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
