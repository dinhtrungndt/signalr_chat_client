import { useInfiniteQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import React, { useState, useEffect, useRef } from 'react';
import GroupMembersModal from './GroupMembersModal';
import messageApi from '../../api/message.api';
import uploadApi from '../../api/upload.api';
import socketService from '../../services/socket.service';
import useAuthStore from '../../stores/auth.store';
import useChatStore from '../../stores/chat.store';

const formatTime = (dateStr) => {
  try {
    return format(new Date(dateStr), 'HH:mm', { locale: vi });
  } catch {
    return '';
  }
};

const MessageItem = ({ message, isOwn, readers }) => (
  <div className={`flex items-end gap-2 mb-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
    {/* Avatar người gửi (chỉ hiện khi không phải mình) */}
    {!isOwn && (
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
        {message.sender?.fullName?.charAt(0) || '?'}
      </div>
    )}

    <div className="max-w-[78%] sm:max-w-[70%] group">
      {/* Tên người gửi (chỉ hiện với group chat, không phải mình) */}
      {!isOwn && message.groupId && (
        <p className="text-xs text-slate-500 mb-1 ml-1">{message.sender?.fullName}</p>
      )}

      <div
        className={[
          message.type === 'IMAGE' ? 'p-0.5 bg-transparent border border-slate-200' : 'px-4 py-2.5',
          'rounded-2xl text-sm leading-relaxed break-words',
          isOwn ? 'msg-mine rounded-br-sm' : 'msg-other rounded-bl-sm',
        ].join(' ')}
      >
        {message.type === 'TEXT' && message.content}
        {message.type === 'IMAGE' && (
          <img 
            src={`http://localhost:1411${message.content}`} 
            alt="Image" 
            className="max-w-xs sm:max-w-sm rounded-xl object-contain cursor-pointer max-h-64"
            onClick={() => window.open(`http://localhost:1411${message.content}`, '_blank')}
          />
        )}
        {message.type === 'FILE' && (
          <a 
            href={`http://localhost:1411${message.content}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 underline"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span className="truncate max-w-[150px]">{message.content.split('/').pop()}</span>
          </a>
        )}
      </div>

      <p
        className={[
          'text-[10px] text-slate-400 mt-1',
          isOwn ? 'text-right mr-1' : 'ml-1',
        ].join(' ')}
      >
        {formatTime(message.createdAt)}
      </p>

      {/* Read Receipts */}
      {readers?.length > 0 && (
        <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end mr-1' : 'justify-start ml-1'}`}>
          {readers.slice(0, 3).map((reader, index) => (
            <div key={index} className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 border border-white flex items-center justify-center text-[7px] font-bold text-white shadow-sm" title={`Đã xem bởi ${reader.fullName}`}>
               {reader.fullName?.charAt(0) || '?'}
            </div>
          ))}
          {readers.length > 3 && (
            <span className="text-[9px] text-slate-400 font-medium ml-0.5">+{readers.length - 3}</span>
          )}
        </div>
      )}
    </div>
  </div>
);

const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

const ChatWindow = ({ onOpenSidebar }) => {
  const activeConversation = useChatStore((s) => s.activeConversation);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const conversationKey = activeConversation ? `${activeConversation.type}_${activeConversation.id}` : null;

  // Tránh lỗi Infinite Loop của useSyncExternalStore bằng cách dùng mảng hằng số (EMPTY_ARRAY)
  const messages = useChatStore((s) => s.messages[conversationKey] || EMPTY_ARRAY);
  const typing = useChatStore((s) => s.typingUsers[conversationKey] || EMPTY_ARRAY);
  const watermarks = useChatStore((s) => s.watermarks[conversationKey] || EMPTY_OBJECT);

  const initMessages = useChatStore((s) => s.initMessages);
  const addMessage = useChatStore((s) => s.addMessage);

  const currentUser = useAuthStore((s) => s.user);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGroupMembersModalOpen, setIsGroupMembersModalOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Fetch lịch sử tin nhắn từ API
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['messages', conversationKey],
    queryFn: ({ pageParam }) => {
      const params = { limit: 50, ...(pageParam ? { cursor: pageParam } : {}) };
      if (activeConversation.type === 'group') {
        return messageApi.getGroupMessages(activeConversation.id, params).then((r) => r.data);
      }
      return messageApi.getDirectMessages(activeConversation.id, params).then((r) => r.data);
    },
    getNextPageParam: (lastPage) =>
      lastPage.pagination?.hasMore ? lastPage.pagination?.nextCursor : undefined,
    enabled: !!activeConversation,
  });

  // Khi load trang đầu, khởi tạo tin nhắn vào store
  useEffect(() => {
    if (data?.pages?.[0]) {
      const allMessages = data.pages.flatMap((p) => p.data);
      initMessages(activeConversation.type, activeConversation.id, allMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Auto scroll xuống khi có tin mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    // Đánh dấu đã đọc khi có tin nhắn mới hoặc mới mở chat
    if (messages.length > 0 && activeConversation) {
      const lastMessage = messages[messages.length - 1];
      const groupId = activeConversation.type === 'group' ? activeConversation.id : null;
      const partnerId = activeConversation.type === 'direct' ? activeConversation.id : null;
      
      socketService.markRead(groupId, partnerId, lastMessage.id).then(() => {
        // Sau khi đánh dấu đọc xong, báo cho Sidebar cập nhật lại unreadCount
        window.dispatchEvent(new Event(groupId ? 'group_updated' : 'chat_updated'));
      }).catch(console.error);
    }
  }, [messages.length, activeConversation]);

  // Gửi tin nhắn
  // Gửi tin nhắn
  const handleSend = async () => {
    const content = inputText.trim();
    if (!content || isSending) return;

    setInputText('');
    setIsSending(true);

    try {
      if (activeConversation.type === 'group') {
        await socketService.sendGroupMessage(activeConversation.id, content);
      } else {
        const msg = await socketService.sendDirectMessage(activeConversation.id, content);
        addMessage('direct', activeConversation.id, msg);
      }
    } catch (err) {
      console.error('Gửi tin nhắn thất bại:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Xử lý Upload
  const handleFileUpload = async (e, isImageOnly = false) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert('Kích thước file không được vượt quá 20MB!');
      e.target.value = '';
      return;
    }

    try {
      setIsUploading(true);
      const res = await uploadApi.uploadFile(file);
      const fileData = res.data.data;
      
      const isImage = fileData.mimetype.startsWith('image/');
      
      if (activeConversation.type === 'group') {
        await socketService.sendGroupMessage(activeConversation.id, fileData.url, isImage ? 'IMAGE' : 'FILE');
      } else {
        const msg = await socketService.sendDirectMessage(activeConversation.id, fileData.url, isImage ? 'IMAGE' : 'FILE');
        addMessage('direct', activeConversation.id, msg);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi khi upload file');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Xử lý typing indicator
  const handleInputChange = (e) => {
    setInputText(e.target.value);

    socketService.sendTyping(
      activeConversation.type === 'group' ? activeConversation.id : null,
      activeConversation.type === 'direct' ? activeConversation.id : null
    );

    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socketService.sendStopTyping(
        activeConversation.type === 'group' ? activeConversation.id : null,
        activeConversation.type === 'direct' ? activeConversation.id : null
      );
    }, 2000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!activeConversation) return null;

  return (
    <div className="flex flex-col h-full min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl">
        {/* Mobile: nút mở sidebar */}
        <button
          onClick={onOpenSidebar}
          className="md:hidden w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition flex items-center justify-center"
          title="Mở danh sách"
          type="button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 text-slate-700"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M4 6.75A.75.75 0 014.75 6h14.5a.75.75 0 010 1.5H4.75A.75.75 0 014 6.75zM4 12a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H4.75A.75.75 0 014 12zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H4.75a.75.75 0 01-.75-.75z" />
          </svg>
        </button>

        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white font-semibold text-sm">
          {activeConversation.name?.charAt(0)?.toUpperCase() || '?'}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 text-sm truncate">{activeConversation.name}</p>
          <p className={`text-xs font-medium ${activeConversation.type === 'group' ? 'text-slate-500' : (onlineUsers[activeConversation.id] ? 'text-emerald-600' : 'text-slate-400')}`}>
            {activeConversation.type === 'group' 
              ? 'Nhóm' 
              : (onlineUsers[activeConversation.id] ? 'Đang hoạt động' : 'Không hoạt động')}
          </p>
        </div>

        {/* Nút xem thông tin nhóm */}
        {activeConversation.type === 'group' && (
          <button
            onClick={() => setIsGroupMembersModalOpen(true)}
            title="Xem thành viên"
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition ml-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}
      </div>

      {/* Group Members Modal */}
      <GroupMembersModal
        isOpen={isGroupMembersModalOpen}
        onClose={() => setIsGroupMembersModalOpen(false)}
        groupId={activeConversation.type === 'group' ? activeConversation.id : null}
      />

      {/* Vùng tin nhắn */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4">
        {/* Nút tải thêm tin cũ */}
        {hasNextPage && (
          <div className="flex justify-center mb-4">
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="px-4 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-full transition bg-white/70"
              type="button"
            >
              {isFetchingNextPage ? 'Đang tải...' : 'Tải tin nhắn cũ hơn'}
            </button>
          </div>
        )}

        {messages.map((msg) => {
          const readers = Object.entries(watermarks)
            .filter(([uid, uData]) => uid !== String(currentUser?.id) && String(uData.lastReadMessageId) === String(msg.id))
            .map(([uid, uData]) => uData);

          return <MessageItem key={msg.id} message={msg} isOwn={msg.senderId === currentUser?.id} readers={readers} />;
        })}

        {/* Typing indicator */}
        {typing.length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex-shrink-0" />
            <div className="px-4 py-2.5 rounded-2xl rounded-bl-sm msg-other flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input gửi tin nhắn */}
      <div className="px-3 sm:px-4 py-3 border-t border-slate-200/70 bg-white/70 backdrop-blur-xl">
        <div className="flex items-end gap-2">
          
          {/* Nút Upload Ảnh */}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={isUploading}
            className="w-10 h-10 mb-0.5 flex-shrink-0 flex items-center justify-center rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition"
            title="Gửi hình ảnh"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <input 
            type="file" 
            ref={imageInputRef} 
            hidden 
            accept="image/*" 
            onChange={(e) => handleFileUpload(e, true)}
          />

          {/* Nút Upload Tệp */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-10 h-10 mb-0.5 flex-shrink-0 flex items-center justify-center rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition"
            title="Đính kèm tệp"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            hidden 
            accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt" 
            onChange={(e) => handleFileUpload(e, false)}
          />

          <textarea
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={`Nhắn tin ${activeConversation.type === 'group' ? 'nhóm' : activeConversation.name}...`}
            className="flex-1 input-field resize-none min-h-[44px] max-h-32 py-3 leading-5"
          />

          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isSending}
            className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl
              bg-gradient-to-r from-indigo-600 to-sky-500
              hover:from-indigo-500 hover:to-sky-400
              disabled:opacity-40 disabled:cursor-not-allowed
              active:scale-95 transition-all duration-150"
            type="button"
            title="Gửi"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>

        <p className="text-[10px] text-slate-400 mt-1.5 ml-1">Enter để gửi · Shift+Enter xuống dòng</p>
      </div>

      {/* Render Modal */}
      {activeConversation.type === 'group' && (
        <GroupMembersModal
          isOpen={isGroupMembersModalOpen}
          onClose={() => setIsGroupMembersModalOpen(false)}
          groupId={activeConversation.id}
          groupName={activeConversation.name}
        />
      )}
    </div>
  );
};

export default ChatWindow;
