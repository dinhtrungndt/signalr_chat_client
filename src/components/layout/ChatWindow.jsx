import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import React, { useState, useEffect, useRef } from 'react';
import GroupMembersModal from './GroupMembersModal';
import ReactionListModal from './ReactionListModal';
import AudioRecorder from './AudioRecorder';
import WaveformPlayer from '../common/WaveformPlayer';
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

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const MessageItem = ({ message, isOwn, readers, isAdmin, onReply, onPin, onImageClick, onReact, onShowReactions, isFirstInGroup = true, isLastInGroup = true }) => {
  if (message.type === 'SYSTEM') {
    let content = message.content;
    let isSilent = false;
    
    if (content.startsWith('[SILENT_LEAVE]')) {
      isSilent = true;
      content = content.replace('[SILENT_LEAVE]', '');
      if (!isAdmin) return null; // Ẩn hoàn toàn với Member
    }

    return (
      <div className="flex justify-center w-full my-4">
        <span className="text-xs font-medium bg-slate-100 text-slate-500 px-4 py-1.5 rounded-full text-center max-w-[85%] break-words">
          {content} {isSilent && <span className="ml-1 opacity-70 italic">(Âm thầm)</span>}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-2 ${isLastInGroup ? 'mb-3' : 'mb-1'} ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
    {/* Avatar người gửi (chỉ hiện khi không phải mình) */}
    {!isOwn && (
      isLastInGroup ? (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {message.sender?.fullName?.charAt(0) || '?'}
        </div>
      ) : (
        <div className="w-7 h-7 flex-shrink-0"></div>
      )
    )}

    <div className="max-w-[78%] sm:max-w-[70%] group relative" id={`msg-${message.id}`}>
      {/* Nút Hành Động (hiển thị khi hover) */}
      <div className={`absolute top-1/2 -translate-y-1/2 ${isOwn ? 'right-full mr-2' : 'left-full ml-2'} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-20`}>
        {/* Nút Trả Lời (hiện cho mọi tin nhắn chưa thu hồi) */}
        {message.type !== 'RECALLED' && (
          <button
            onClick={() => onReply(message)}
            className="p-1 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-full"
            title="Trả lời"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
        )}

        {/* Nút Ghim */}
        {message.type !== 'RECALLED' && (
          <button
            onClick={() => onPin(message)}
            className="p-1 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-full"
            title="Ghim tin nhắn"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        )}
        
        {/* Nút Thu Hồi (chỉ cho tin nhắn của mình) */}
        {isOwn && message.type !== 'RECALLED' && (
          <button
            onClick={() => {
              if (window.confirm('Bạn có chắc chắn muốn thu hồi tin nhắn này?')) {
                messageApi.recallMessage(message.id).catch(console.error);
              }
            }}
            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full"
            title="Thu hồi tin nhắn"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
        {/* Nút Thả cảm xúc */}
        {message.type !== 'RECALLED' && (
          <div className="relative group/react">
            <button
              className="p-1 text-slate-400 hover:text-pink-500 hover:bg-pink-50 rounded-full"
              title="Thả cảm xúc"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            {/* Glassmorphism Reaction Picker (đã đổi sang bottom-full để bật lên trên) */}
            <div className={`absolute bottom-full ${isOwn ? 'right-0' : 'left-0'} pb-1 hidden group-hover/react:block z-50 animate-fade-in-up`}>
              <div className="flex items-center gap-1 p-1.5 bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-xl rounded-full">
                {EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => onReact(message, emoji)}
                    className="w-8 h-8 flex items-center justify-center text-xl hover:scale-125 hover:-translate-y-1 transition-transform cursor-pointer"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tên người gửi (chỉ hiện với group chat, không phải mình) */}
      {!isOwn && message.groupId && isFirstInGroup && (
        <p className="text-xs text-slate-500 mb-1 ml-1">{message.sender?.fullName}</p>
      )}

      <div
        className={[
          message.type === 'IMAGE' ? 'bg-transparent' : 
          message.type === 'RECALLED' ? 'px-4 py-2.5 bg-slate-50 border border-slate-200 border-dashed text-slate-400 italic' : 'px-4 py-2.5',
          'rounded-2xl text-sm leading-relaxed break-words',
          message.type === 'RECALLED' ? (isOwn ? 'rounded-br-sm' : 'rounded-bl-sm') : 
          (message.type === 'IMAGE' || message.type === 'AUDIO') ? (isOwn ? 'rounded-br-sm' : 'rounded-bl-sm') :
          (isOwn ? 'msg-mine rounded-br-sm' : 'msg-other rounded-bl-sm'),
        ].join(' ')}
      >
        {/* Nếu có reply, hiển thị khối reply ở trên cùng */}
        {message.replyTo && (
          <div 
            onClick={() => {
              const el = document.getElementById(`msg-${message.replyToId}`);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('bg-indigo-100', 'transition-colors', 'duration-1000');
                setTimeout(() => el.classList.remove('bg-indigo-100'), 1500);
              }
            }}
            className="mb-2 p-2 rounded-lg bg-black/10 cursor-pointer hover:bg-black/20 transition-colors border-l-4 border-indigo-500/50"
          >
            <p className="text-[10px] font-semibold opacity-70 mb-0.5">
              {message.replyTo.sender?.fullName}
            </p>
            <p className="text-xs opacity-90 truncate max-w-[200px] sm:max-w-[250px]">
              {message.replyTo.type === 'TEXT' ? message.replyTo.content : (message.replyTo.type === 'IMAGE' ? '[Hình ảnh]' : '[Tập tin]')}
            </p>
          </div>
        )}

        {message.type === 'TEXT' && message.content}
        {message.type === 'RECALLED' && message.content}
        {message.type === 'IMAGE' && (() => {
          const urls = message.content.split('|');
          if (urls.length === 1) {
            return (
              <img 
                src={`${process.env.REACT_APP_SOCKET_URL}${urls[0]}`} 
                alt="Image" 
                className="max-w-xs sm:max-w-sm rounded-xl object-contain cursor-pointer max-h-64"
                onClick={() => onImageClick(`${process.env.REACT_APP_SOCKET_URL}${urls[0]}`)}
              />
            );
          } else {
            // Album layout (Grid)
            const gridCols = urls.length === 2 ? 'grid-cols-2' : 'grid-cols-3';
            return (
              <div className={`grid gap-1 ${gridCols} max-w-[260px] sm:max-w-xs overflow-hidden rounded-2xl ${isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'} border border-slate-200/50`}>
                {urls.map((url, idx) => (
                  <img
                    key={idx}
                    src={`${process.env.REACT_APP_SOCKET_URL}${url}`}
                    alt="Image"
                    className="w-full aspect-square object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => onImageClick(`${process.env.REACT_APP_SOCKET_URL}${url}`)}
                  />
                ))}
              </div>
            );
          }
        })()}
        {message.type === 'FILE' && (
          <a 
            href={`${process.env.REACT_APP_SOCKET_URL}${message.content}`}
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
        {message.type === 'AUDIO' && (
          <WaveformPlayer 
            audioUrl={`${process.env.REACT_APP_SOCKET_URL}${message.content}`} 
            isOwn={isOwn} 
          />
        )}
      </div>

      {/* Hiển thị danh sách Cảm xúc đã thả */}
      {message.reactions && message.reactions.length > 0 && (
        <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end mr-1' : 'justify-start ml-1'}`}>
          <div 
            onClick={() => onShowReactions(message.reactions)}
            className="flex items-center px-1.5 py-0.5 bg-white shadow-sm border border-slate-100 rounded-full cursor-pointer hover:bg-slate-50 transition"
          >
            {/* Lọc ra các emoji unique để hiển thị */}
            {[...new Set(message.reactions.map(r => r.emoji))].slice(0, 3).map((emoji, idx) => (
              <span key={idx} className="text-[11px] leading-none -ml-0.5 first:ml-0">{emoji}</span>
            ))}
            <span className="text-[10px] font-semibold text-slate-500 ml-1">{message.reactions.length}</span>
          </div>
        </div>
      )}

      {isLastInGroup && (
        <p
          className={[
            'text-[10px] text-slate-400 mt-1',
            isOwn ? 'text-right mr-1' : 'ml-1',
          ].join(' ')}
        >
          {formatTime(message.createdAt)}
        </p>
      )}

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
};

const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

const ChatWindow = ({ onOpenSidebar, onToggleRightSidebar }) => {
  const activeConversation = useChatStore((s) => s.activeConversation);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const userLastSeen = useChatStore((s) => s.userLastSeen);
  const conversationKey = activeConversation ? `${activeConversation.type}_${activeConversation.id}` : null;

  // Tránh lỗi Infinite Loop của useSyncExternalStore bằng cách dùng mảng hằng số (EMPTY_ARRAY)
  const messages = useChatStore((s) => s.messages[conversationKey] || EMPTY_ARRAY);
  const typing = useChatStore((s) => s.typingUsers[conversationKey] || EMPTY_ARRAY);
  const watermarks = useChatStore((s) => s.watermarks[conversationKey] || EMPTY_OBJECT);

  const initMessages = useChatStore((s) => s.initMessages);
  const addMessage = useChatStore((s) => s.addMessage);
  
  const pinnedMessages = useChatStore((s) => s.pinnedMessages[conversationKey] || EMPTY_ARRAY);
  const setPinnedMessages = useChatStore((s) => s.setPinnedMessages);

  const currentUser = useAuthStore((s) => s.user);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGroupMembersModalOpen, setIsGroupMembersModalOpen] = useState(false);
  const [isPinnedDropdownOpen, setIsPinnedDropdownOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [reactionsToShow, setReactionsToShow] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const queryClient = useQueryClient();

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

  // Fetch Pinned Messages
  useQuery({
    queryKey: ['pinned-messages', conversationKey],
    queryFn: async () => {
      const params = activeConversation.type === 'group' ? { groupId: activeConversation.id } : { partnerId: activeConversation.id };
      const res = await messageApi.getPinnedMessages(params);
      setPinnedMessages(activeConversation.type, activeConversation.id, res.data.data);
      return res.data.data;
    },
    enabled: !!activeConversation,
  });

  const handlePinMessage = async (message) => {
    try {
      const data = activeConversation.type === 'group' ? { groupId: activeConversation.id } : { partnerId: activeConversation.id };
      await messageApi.pinMessage(message.id, data);
    } catch (err) {
      if (err.response?.data?.message) {
        alert(err.response.data.message);
      } else {
        alert('Có lỗi xảy ra khi ghim tin nhắn.');
      }
    }
  };

  const handleUnpinMessage = async (messageId) => {
    if (!window.confirm('Bạn có chắc chắn muốn bỏ ghim tin nhắn này?')) return;
    try {
      await messageApi.unpinMessage(messageId);
    } catch (err) {
      console.error(err);
      alert('Không thể bỏ ghim tin nhắn.');
    }
  };

  // Khi load trang đầu, khởi tạo tin nhắn vào store
  useEffect(() => {
    if (data?.pages?.[0]) {
      const allMessages = data.pages.flatMap((p) => p.data);
      initMessages(activeConversation.type, activeConversation.id, allMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Lắng nghe sự kiện thu hồi tin nhắn để cập nhật query cache
  useEffect(() => {
    const handleMessageRecalled = () => {
      // Khi có tin nhắn bị thu hồi, ta xoá cache query để nếu scroll up nó sẽ lấy đúng dữ liệu mới
      queryClient.invalidateQueries(['messages', conversationKey]);
    };
    window.addEventListener('message_recalled', handleMessageRecalled);
    return () => window.removeEventListener('message_recalled', handleMessageRecalled);
  }, [conversationKey]);

  // Trạng thái lưu lại tin nhắn cũ để so sánh
  const previousMessagesLengthRef = useRef(messages.length);
  const previousConversationIdRef = useRef(activeConversation?.id);

  // Auto scroll xuống
  useEffect(() => {
    if (!messagesEndRef.current) return;

    // Nếu đổi hội thoại, scroll tức thì (auto). Nếu có tin nhắn mới (length tăng), scroll mượt (smooth).
    const isNewConversation = previousConversationIdRef.current !== activeConversation?.id;
    const isNewMessage = messages.length > previousMessagesLengthRef.current;
    
    if (isNewConversation) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    } else if (isNewMessage) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }

    previousConversationIdRef.current = activeConversation?.id;
    previousMessagesLengthRef.current = messages.length;
    
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
  }, [messages[messages.length - 1]?.id, activeConversation]);

  // Gửi tin nhắn
  const handleSend = async () => {
    const content = inputText.trim();
    if ((!content && pendingFiles.length === 0) || isSending) return;

    setIsSending(true);
    
    const replyToId = replyingTo ? replyingTo.id : null;

    try {
      // 1. Gửi tin nhắn Text trước (nếu có)
      if (content) {
        if (activeConversation.type === 'group') {
          await socketService.sendGroupMessage(activeConversation.id, content, 'TEXT', replyToId);
        } else {
          const msg = await socketService.sendDirectMessage(activeConversation.id, content, 'TEXT', replyToId);
          addMessage('direct', activeConversation.id, msg);
        }
      }

      // 2. Gửi file trong hàng chờ
      if (pendingFiles.length > 0) {
        setIsUploading(true);
        
        const imageFiles = pendingFiles.filter(f => f.file.type.startsWith('image/'));
        const otherFiles = pendingFiles.filter(f => !f.file.type.startsWith('image/'));

        // Xử lý ảnh: Gộp chung thành 1 chuỗi URL ngăn cách bởi '|'
        if (imageFiles.length > 0) {
          const imageUrls = [];
          for (const pendingFile of imageFiles) {
            const res = await uploadApi.uploadFile(pendingFile.file);
            imageUrls.push(res.data.data.url);
          }
          const combinedUrl = imageUrls.join('|');
          
          if (activeConversation.type === 'group') {
            await socketService.sendGroupMessage(activeConversation.id, combinedUrl, 'IMAGE', replyToId);
          } else {
            const msg = await socketService.sendDirectMessage(activeConversation.id, combinedUrl, 'IMAGE', replyToId);
            addMessage('direct', activeConversation.id, msg);
          }
        }

        // Xử lý file khác: Mỗi file 1 tin nhắn rời
        for (const pendingFile of otherFiles) {
          const res = await uploadApi.uploadFile(pendingFile.file);
          const fileData = res.data.data;
          
          if (activeConversation.type === 'group') {
            await socketService.sendGroupMessage(activeConversation.id, fileData.url, 'FILE', replyToId);
          } else {
            const msg = await socketService.sendDirectMessage(activeConversation.id, fileData.url, 'FILE', replyToId);
            addMessage('direct', activeConversation.id, msg);
          }
        }

        setIsUploading(false);
      }

      // 3. Reset mọi thứ sau khi gửi thành công
      setInputText('');
      setPendingFiles([]);
      setReplyingTo(null);
    } catch (err) {
      console.error('Gửi tin nhắn/file thất bại:', err);
      alert('Gửi tin nhắn hoặc file thất bại. Vui lòng thử lại!');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendAudio = async (audioBlob) => {
    setIsRecording(false);
    if (!audioBlob || audioBlob.size === 0) return;
    
    const file = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
    
    try {
      const res = await uploadApi.uploadFile(file);
      // res là Axios response, data thực sự nằm trong res.data
      const responseData = res.data;
      if (responseData.status === 'success') {
        const fileUrl = responseData.data ? responseData.data.url : responseData.url; // Xử lý cấu trúc response
        
        if (activeConversation.type === 'group') {
          await socketService.sendGroupMessage(activeConversation.id, fileUrl, 'AUDIO', replyingTo?.id || null);
        } else {
          const msg = await socketService.sendDirectMessage(activeConversation.id, fileUrl, 'AUDIO', replyingTo?.id || null);
          useChatStore.getState().addMessage('direct', activeConversation.id, msg);
        }
        setReplyingTo(null);
      }
    } catch (error) {
      console.error('Lỗi khi tải lên file thu âm:', error);
      alert('Gửi tin nhắn giọng nói thất bại. Vui lòng thử lại.');
    }
  };

  // Xử lý đưa file vào hàng chờ
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const newPendingFiles = files.map(file => {
      if (file.size > 20 * 1024 * 1024) {
        alert(`File ${file.name} vượt quá 20MB!`);
        return null;
      }
      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      };
    }).filter(f => f !== null);

    setPendingFiles(prev => [...prev, ...newPendingFiles]);
    e.target.value = '';
  };

  const removePendingFile = (id) => {
    setPendingFiles(prev => {
      const filtered = prev.filter(f => f.id !== id);
      // Thu hồi blob url để tránh leak memory
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove?.previewUrl) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      return filtered;
    });
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
              ? `Cộng đồng • ${activeConversation.memberCount || 0} thành viên`
              : (onlineUsers[activeConversation.id] 
                  ? 'Đang hoạt động' 
                  : (userLastSeen[activeConversation.id] 
                      ? `Hoạt động ${formatDistanceToNow(new Date(userLastSeen[activeConversation.id]), { addSuffix: true, locale: vi })}` 
                      : 'Không hoạt động'))}
          </p>
        </div>

        {/* Nút xem thông tin hội thoại (Right Sidebar) */}
        <button
          onClick={onToggleRightSidebar}
          title="Thông tin hội thoại"
          className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition ml-auto"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {/* Group Members Modal */}
      <GroupMembersModal
        isOpen={isGroupMembersModalOpen}
        onClose={() => setIsGroupMembersModalOpen(false)}
        groupId={activeConversation.type === 'group' ? activeConversation.id : null}
      />

      {/* Reaction List Modal */}
      <ReactionListModal
        isOpen={!!reactionsToShow}
        onClose={() => setReactionsToShow(null)}
        reactions={reactionsToShow}
      />

      {/* Pinned Header */}
      {pinnedMessages && pinnedMessages.length > 0 && (
        <div className="relative">
          <div 
            className="bg-amber-50/50 border-b border-amber-100 px-4 py-2 flex items-center justify-between group cursor-pointer hover:bg-amber-50 transition"
            onClick={() => setIsPinnedDropdownOpen(!isPinnedDropdownOpen)}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <div className="flex flex-col min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-amber-600">
                  Tin ghim ({pinnedMessages.length}/5)
                </p>
                <p className="text-xs text-slate-700 truncate hover:text-indigo-600 transition">
                  {pinnedMessages[0].message?.type === 'TEXT' ? pinnedMessages[0].message?.content : (pinnedMessages[0].message?.type === 'IMAGE' ? '[Hình ảnh]' : '[Tập tin]')}
                </p>
              </div>
            </div>
            
            <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-slate-400 transition-transform ${isPinnedDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Dropdown Menu */}
          {isPinnedDropdownOpen && (
            <div className="absolute top-full left-0 right-0 z-10 bg-white border-b border-slate-200 shadow-lg max-h-64 overflow-y-auto">
              {pinnedMessages.map((pin) => (
                <div key={pin.id} className="px-4 py-3 border-b border-slate-100 flex items-start gap-3 hover:bg-slate-50 transition group">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                    {pin.message?.sender?.fullName?.charAt(0) || '?'}
                  </div>
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      const el = document.getElementById(`msg-${pin.messageId}`);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.classList.add('bg-amber-100', 'transition-colors', 'duration-1000');
                        setTimeout(() => el.classList.remove('bg-amber-100'), 1500);
                        setIsPinnedDropdownOpen(false);
                      }
                    }}
                  >
                    <p className="text-xs font-semibold text-slate-800 mb-0.5">{pin.message?.sender?.fullName}</p>
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {pin.message?.type === 'TEXT' ? pin.message?.content : (pin.message?.type === 'IMAGE' ? '[Hình ảnh]' : '[Tập tin]')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnpinMessage(pin.messageId);
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-200 transition opacity-0 group-hover:opacity-100 flex-shrink-0"
                    title="Bỏ ghim"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

        {messages.map((msg, index) => {
          const prevMsg = messages[index - 1];
          const nextMsg = messages[index + 1];

          // Điều kiện gộp tin nhắn (cùng người gửi, không phải tin hệ thống, cách nhau dưới 5 phút)
          const isSameSenderAsPrev = prevMsg && prevMsg.senderId === msg.senderId && prevMsg.type !== 'SYSTEM';
          const isSameSenderAsNext = nextMsg && nextMsg.senderId === msg.senderId && nextMsg.type !== 'SYSTEM';

          const isTimeCloseToPrev = prevMsg && (new Date(msg.createdAt) - new Date(prevMsg.createdAt) < 5 * 60 * 1000);
          const isTimeCloseToNext = nextMsg && (new Date(nextMsg.createdAt) - new Date(msg.createdAt) < 5 * 60 * 1000);

          const isFirstInGroup = !(isSameSenderAsPrev && isTimeCloseToPrev);
          const isLastInGroup = !(isSameSenderAsNext && isTimeCloseToNext);

          const readers = Object.entries(watermarks)
            .filter(([uid, uData]) => uid !== String(currentUser?.id) && String(uData.lastReadMessageId) === String(msg.id))
            .map(([uid, uData]) => uData);

          return (
            <MessageItem 
              key={msg.id} 
              message={msg} 
              isOwn={msg.senderId === currentUser?.id} 
              readers={readers} 
              isAdmin={activeConversation?.role === 'ADMIN' || activeConversation?.role === 'DEPUTY'} 
              onReply={setReplyingTo} 
              onPin={handlePinMessage} 
              onImageClick={setPreviewImage} 
              onShowReactions={setReactionsToShow}
              onReact={(message, emoji) => {
                socketService.reactMessage(
                  message.id,
                  activeConversation.type === 'group' ? activeConversation.id : null,
                  activeConversation.type === 'direct' ? activeConversation.id : null,
                  emoji
                );
              }}
              isFirstInGroup={isFirstInGroup}
              isLastInGroup={isLastInGroup}
            />
          );
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
      {activeConversation.type === 'group' && activeConversation.isReadOnly && activeConversation.role === 'MEMBER' ? (
        <div className="px-3 sm:px-4 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-center">
          <p className="text-sm text-slate-500 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 inline-block mr-1.5 -mt-0.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Chỉ trưởng/phó cộng đồng được gửi tin nhắn vào cộng đồng. <span className="text-indigo-500 hover:underline cursor-pointer">Tìm hiểu thêm</span>
          </p>
        </div>
      ) : (
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
              multiple
              accept="image/*" 
              onChange={handleFileSelect}
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
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt" 
              onChange={handleFileSelect}
            />

            {isRecording ? (
              <AudioRecorder 
                onSend={handleSendAudio} 
                onCancel={() => setIsRecording(false)} 
              />
            ) : (
              <>
                <div className="flex-1 flex flex-col min-w-0 bg-slate-50 border border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 focus-within:bg-white rounded-2xl transition-all duration-200">
                {/* Thanh Preview File Hàng Chờ */}
              {pendingFiles.length > 0 && (
                <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-slate-200 overflow-x-auto custom-scrollbar">
                  {pendingFiles.map(pf => (
                    <div key={pf.id} className="relative flex-shrink-0 group">
                      {pf.previewUrl ? (
                        <img src={pf.previewUrl} alt="preview" className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removePendingFile(pf.id)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {/* Thanh Preview Trả Lời */}
              {replyingTo && (
                <div className="flex items-start justify-between px-4 pt-3 pb-2 border-b border-slate-200">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-[11px] font-semibold text-indigo-600 mb-0.5">
                      Đang trả lời {replyingTo.sender?.fullName}
                    </span>
                    <span className="text-xs text-slate-500 truncate">
                      {replyingTo.type === 'TEXT' ? replyingTo.content : (replyingTo.type === 'IMAGE' ? '[Hình ảnh]' : '[Tập tin]')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              <textarea
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={`Nhắn tin ${activeConversation.type === 'group' ? 'nhóm' : activeConversation.name}...`}
                className="w-full resize-none bg-transparent border-none focus:ring-0 px-4 py-3 min-h-[44px] max-h-32 text-sm leading-5 placeholder-slate-400"
              />
            </div>
            {/* Nút gửi hoặc thu âm */}
            {inputText.trim() || pendingFiles.length > 0 ? (
              <button
                onClick={handleSend}
                disabled={isSending}
                className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all duration-150"
                type="button"
                title="Gửi"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
              </button>
            ) : (
              !isRecording && (
                <button
                  onClick={() => setIsRecording(true)}
                  className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 active:scale-95 transition-all duration-150"
                  type="button"
                  title="Ghi âm giọng nói"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
              )
            )}
              </>
            )}
          </div>

          <p className="text-[10px] text-slate-400 mt-1.5 ml-1">Enter để gửi · Shift+Enter xuống dòng</p>
        </div>
      )}

      {/* Render Modal Xem Thành Viên */}
      {activeConversation.type === 'group' && (
        <GroupMembersModal
          isOpen={isGroupMembersModalOpen}
          onClose={() => setIsGroupMembersModalOpen(false)}
          groupId={activeConversation.id}
          groupName={activeConversation.name}
        />
      )}

      {/* Render Modal Xem Ảnh Phóng To */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-5xl max-h-screen w-full h-full flex items-center justify-center p-4 sm:p-8">
            <button 
              className="absolute top-4 right-4 sm:top-8 sm:right-8 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition backdrop-blur-md"
              onClick={() => setPreviewImage(null)}
              title="Đóng (Esc)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img 
              src={previewImage} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain drop-shadow-2xl rounded-sm"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
