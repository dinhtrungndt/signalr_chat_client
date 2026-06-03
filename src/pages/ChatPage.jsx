import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ChatWindow from '../components/layout/ChatWindow';
import Sidebar from '../components/layout/Sidebar';
import RightSidebar from '../components/layout/RightSidebar';
import socketService from '../services/socket.service';
import useAuthStore from '../stores/auth.store';
import useChatStore from '../stores/chat.store';

const ChatPage = () => {
  const user = useAuthStore((s) => s.user);
  const activeConversation = useChatStore((s) => s.activeConversation);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false); // Ở màn hình rộng, mặc định có thể mở hoặc đóng tuỳ ý. Mặc định đóng cho gọn.

  useEffect(() => {
    socketService.connect();
    return () => socketService.disconnect();
  }, []);

  return (
    <div className="h-screen overflow-hidden">
      <Helmet>
        <title>Tin nhắn | DVN Chat</title>
        <meta name="description" content="Nhắn tin nhóm và trực tiếp tốc độ cao với DVN Chat." />
      </Helmet>
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
            <ChatWindow 
              onOpenSidebar={() => setSidebarOpen(true)} 
              onToggleRightSidebar={() => setRightSidebarOpen(!rightSidebarOpen)}
            />
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

        {/* Right Sidebar Desktop */}
        {activeConversation && rightSidebarOpen && (
          <div className="hidden lg:block w-80 flex-shrink-0 border-l border-slate-200 shadow-sm z-10">
            <RightSidebar onClose={() => setRightSidebarOpen(false)} onImageClick={() => {}} />
          </div>
        )}

        {/* Overlay + Drawer Right Sidebar Mobile */}
        {activeConversation && rightSidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
              onClick={() => setRightSidebarOpen(false)}
            />
            <div
              className={`fixed z-50 inset-y-0 right-0 w-[20rem] sm:w-[24rem] transform transition-transform duration-200 lg:hidden
                ${rightSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
              <RightSidebar onClose={() => setRightSidebarOpen(false)} onImageClick={() => {}} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
