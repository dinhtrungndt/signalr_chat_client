import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useUIStore } from '../../stores/ui.store';
import messageApi from '../../api/message.api';
import useChatStore from '../../stores/chat.store';

const ImageViewerModal = ({ previewData, onClose, onGoToMessage }) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState(null);
  
  const containerRef = useRef(null);

  const { url, message, isOwn } = previewData;

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Click ra ngoài để tắt Context Menu
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleWheel = (e) => {
    // Zoom on scroll
    e.preventDefault();
    const zoomSensitivity = 0.1;
    const newScale = e.deltaY < 0 ? scale + zoomSensitivity : scale - zoomSensitivity;
    setScale(Math.min(Math.max(0.5, newScale), 5)); // Limit zoom between 0.5x and 5x
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Chỉ lấy chuột trái
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `dvn_chat_image_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download error:', error);
      useUIStore.getState().showToast('Lỗi tải ảnh', 'error');
    }
  };

  const handleCopy = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new window.ClipboardItem({
          [blob.type]: blob
        })
      ]);
      useUIStore.getState().showToast('Đã copy ảnh vào Clipboard', 'success');
    } catch (error) {
      console.error('Copy error:', error);
      useUIStore.getState().showToast('Không thể copy ảnh trên trình duyệt này', 'error');
    }
  };

  const handleDeleteForMe = () => {
    // Phát event để kích hoạt bộ đếm 5s ở MessageItem thay vì xóa trực tiếp luôn
    if (message) {
      window.dispatchEvent(new CustomEvent('trigger-delete-for-me', { detail: { messageId: message.id } }));
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#000000] text-slate-300 select-none animate-fade-in">
      {/* Nút Đóng (Góc trên phải) */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-[110] w-10 h-10 flex items-center justify-center rounded-full bg-slate-800/50 hover:bg-slate-700/80 text-white transition-colors"
        title="Đóng (Esc)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Vùng xem ảnh */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden flex items-center justify-center relative cursor-move"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
      >
        <img 
          src={url} 
          alt="Preview" 
          draggable={false}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out'
          }}
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {/* Toolbar dưới cùng (Zalo style) */}
      <div className="h-16 bg-[#18191a] border-t border-slate-800 flex items-center justify-between px-4 sm:px-6 relative z-10">
        
        {/* Thông tin người gửi (Bên trái) */}
        <div className="flex items-center gap-3 w-1/3">
          {message?.sender && (
            <>
              {message.sender.avatar ? (
                <img src={`${process.env.REACT_APP_SOCKET_URL}${message.sender.avatar}`} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white font-bold">
                  {message.sender.fullName.charAt(0)}
                </div>
              )}
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-200">{message.sender.fullName}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{format(new Date(message.createdAt), "HH:mm dd/MM/yyyy", { locale: vi })}</p>
              </div>
            </>
          )}
        </div>

        {/* Các nút công cụ điều khiển (Ở giữa) */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 w-1/3">
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition" title="Thu nhỏ">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
          </button>
          
          <button onClick={() => { setScale(1); setPosition({x:0, y:0}); setRotation(0); }} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition" title="Khôi phục gốc">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
          </button>
          
          <button onClick={() => setScale(s => Math.min(5, s + 0.25))} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition" title="Phóng to">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
          </button>
          
          <div className="w-px h-6 bg-slate-700 mx-2"></div>

          <button onClick={() => setRotation(r => r - 90)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition" title="Xoay trái">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
          </button>
          
          <button onClick={() => setRotation(r => r + 90)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition" title="Xoay phải">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
          </button>
        </div>

        {/* Các nút hành động (Bên phải) */}
        <div className="flex items-center justify-end gap-2 sm:gap-3 w-1/3">
          <button onClick={handleDownload} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition hidden sm:block" title="Tải về máy">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          </button>
          <button onClick={handleCopy} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition hidden sm:block" title="Copy ảnh">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </button>
        </div>
      </div>

      {/* Context Menu (Chuột phải) */}
      {contextMenu && (
        <div 
          className="fixed z-[150] bg-[#242526] border border-slate-700 shadow-2xl rounded-xl w-48 py-2 animate-fade-in-up"
          style={{ 
            top: Math.min(contextMenu.y, window.innerHeight - 200), 
            left: Math.min(contextMenu.x, window.innerWidth - 200) 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => { handleCopy(); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 transition">Sao chép</button>
          <button onClick={() => { useUIStore.getState().showToast('Chức năng đang phát triển', 'info'); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 transition">Chia sẻ</button>
          
          {message && (
            <button onClick={() => { onGoToMessage(message.id); onClose(); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 transition border-b border-slate-700/50">Xem tin nhắn gốc</button>
          )}
          
          <button onClick={() => { handleDownload(); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 transition">Lưu về máy</button>
          {isOwn && (
             <button onClick={() => { handleDeleteForMe(); setContextMenu(null); }} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-slate-700 transition">Xóa</button>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageViewerModal;
