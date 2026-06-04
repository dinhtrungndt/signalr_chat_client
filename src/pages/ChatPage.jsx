import { useEffect, useState, useRef } from 'react';
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

  const touchStart = useRef(null);
  const touchEnd = useRef(null);

  const handleTouchStart = (e) => {
    touchEnd.current = null;
    touchStart.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
  };

  const handleTouchMove = (e) => {
    touchEnd.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
  };

  const handleTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;
    const distanceX = touchStart.current.x - touchEnd.current.x;
    const distanceY = touchStart.current.y - touchEnd.current.y;
    
    // Bỏ qua nếu vuốt dọc (scroll) nhiều hơn vuốt ngang
    if (Math.abs(distanceY) > Math.abs(distanceX)) return;

    const isLeftSwipe = distanceX > 50;
    const isRightSwipe = distanceX < -50;

    // Vuốt sang phải từ mép trái màn hình (< 40px)
    if (isRightSwipe && touchStart.current.x < 40) {
      setSidebarOpen(true);
    }
    // Đóng menu trái
    if (isLeftSwipe && sidebarOpen) {
      setSidebarOpen(false);
    }
    
    // Vuốt sang trái từ mép phải màn hình
    if (isLeftSwipe && touchStart.current.x > window.innerWidth - 40 && activeConversation) {
      setRightSidebarOpen(true);
    }
    // Đóng menu phải
    if (isRightSwipe && rightSidebarOpen) {
      setRightSidebarOpen(false);
    }
  };

  useEffect(() => {
    socketService.connect();
    return () => socketService.disconnect();
  }, []);

  return (
    <div 
      className="h-screen overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
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
