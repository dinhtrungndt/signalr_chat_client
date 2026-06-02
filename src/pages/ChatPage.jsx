import { useEffect, useState } from 'react';
import ChatWindow from '../components/layout/ChatWindow';
import Sidebar from '../components/layout/Sidebar';
import socketService from '../services/socket.service';
import useAuthStore from '../stores/auth.store';
import useChatStore from '../stores/chat.store';

const ChatPage = () => {
  const user = useAuthStore((s) => s.user);
  const activeConversation = useChatStore((s) => s.activeConversation);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    socketService.connect();
    return () => socketService.disconnect();
  }, []);

  return (
    <div className="h-screen overflow-hidden">
      <div className="flex h-full bg-transparent">
        {/* Sidebar desktop */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* Overlay + Drawer sidebar mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div
          className={`fixed z-50 inset-y-0 left-0 w-[18rem] transform transition-transform duration-200 md:hidden
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <Sidebar onItemClick={() => setSidebarOpen(false)} />
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeConversation ? (
            <ChatWindow onOpenSidebar={() => setSidebarOpen(true)} />
          ) : (
            <div className="flex-1 flex items-center justify-center px-6">
              <div className="text-center max-w-sm">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/80 border border-slate-200 shadow-sm flex items-center justify-center mx-auto mb-4">
                  <img src="https://dvntechnology.com/assets/logo.png" alt="DVN" className="w-10 h-10 opacity-80" />
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                  Chào mừng, {user?.fullName}!
                </h2>
                <p className="text-slate-500 text-sm mt-2">Chọn một cuộc trò chuyện để bắt đầu</p>

                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden mt-5 inline-flex items-center justify-center px-4 py-2 rounded-xl border border-slate-200 bg-white/70 hover:bg-white transition"
                >
                  Mở danh sách cuộc trò chuyện
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
