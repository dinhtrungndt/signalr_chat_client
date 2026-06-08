import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import EmojiPicker from 'emoji-picker-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import groupApi from '../../api/group.api';
import messageApi from '../../api/message.api';
import uploadApi from '../../api/upload.api';
import socketService from '../../services/socket.service';
import useAuthStore from '../../stores/auth.store';
import useCallStore from '../../stores/call.store';
import useChatStore from '../../stores/chat.store';
import useThemeStore from '../../stores/theme.store'; // For emoji-picker-react theme
import { useUIStore } from '../../stores/ui.store';
import WaveformPlayer from '../common/WaveformPlayer';
import AudioRecorder from './AudioRecorder';
import ChatNoteWidget from './ChatNoteWidget';
import ChatPollWidget from './ChatPollWidget';
import ChatReminderWidget from './ChatReminderWidget';
import GroupMembersModal from './GroupMembersModal';
import ImageViewerModal from './ImageViewerModal';
import MessageReadersModal from './MessageReadersModal';
import ReactionListModal from './ReactionListModal';
import ShareMessageModal from './ShareMessageModal';
import UserProfileModal from './UserProfileModal';

const STICKER_CATEGORIES = [
  { label: 'Gần đây', query: '' },
  { label: 'Ami Cat', query: 'ami cat' },
  { label: 'QooBee', query: 'qoobee' },
  { label: 'Meme', query: 'meme' },
  { label: 'Pepe', query: 'pepe frog' },
  { label: 'Pikachu', query: 'pikachu' },
];

const formatTime = (dateStr) => {
  try {
    return format(new Date(dateStr), 'HH:mm', { locale: vi });
  } catch {
    return '';
  }
};

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const renderTextWithLinks = (text, onUserClick, groupMembers = []) => {
  if (!text) return null;

  // Regex để tìm các URL hoặc @username
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/i;
  const mentionRegex = /(@[a-zA-Z0-9_]+)/i;
  const combinedRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|@[a-zA-Z0-9_]+)/gi;

  const parts = text.split(combinedRegex);

  return parts.map((part, i) => {
    if (!part) return null;

    if (part.match(urlRegex)) {
      const href = part.startsWith('http') ? part : `http://${part}`;
      // Cắt ngắn link nếu quá dài để giao diện gọn gàng hơn
      const displayPart = part.length > 40 ? part.substring(0, 37) + '...' : part;
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:opacity-80 transition-opacity break-all font-medium text-indigo-600 dark:text-indigo-400"
          onClick={(e) => e.stopPropagation()}
          title={part} // Hiện tooltip toàn bộ link khi hover
        >
          {displayPart}
        </a>
      );
    }

    if (part.match(mentionRegex)) {
      const usernameMatch = part.slice(1);
      const matchedUser = groupMembers.find(m => m.username === usernameMatch);

      if (matchedUser && onUserClick) {
        return (
          <span
            key={i}
            className="font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1 rounded inline-block cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onUserClick(matchedUser.id);
            }}
          >
            {part}
          </span>
        );
      }

      return (
        <span key={i} className="font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1 rounded inline-block">
          {part}
        </span>
      );
    }

    // Sử dụng dangerouslySetInnerHTML cho ngắt dòng nếu cần, hoặc đơn giản giữ nguyên
    return <span key={i}>{part}</span>;
  });
};

const MessageItem = ({
  message, isOwn, readers, isAdmin,
  onReply, onPin, onShare, onEdit, onImageClick, onReact, onShowReactions, onShowReaders, onDeleteForMe, onUserClick, groupMembers,
  isFirstInGroup = true, isLastInGroup = true,
  isSelectionMode = false, isSelected = false, onToggleSelect = null, onEnableSelectionMode = null, isDraggingSelection = false
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [dropdownPos, setDropdownPos] = useState('bottom');
  const [isReactOpen, setIsReactOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const countdownIntervalRef = useRef(null);
  const reactRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (reactRef.current && !reactRef.current.contains(event.target)) {
        setIsReactOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMenuEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    if (rect.top > windowHeight / 2) {
      setDropdownPos('top');
    } else {
      setDropdownPos('bottom');
    }
  };

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleTriggerDelete = (e) => {
      if (e.detail.messageId === message.id) {
        handleDeleteForMe();
      }
    };
    window.addEventListener('trigger-delete-for-me', handleTriggerDelete);
    return () => window.removeEventListener('trigger-delete-for-me', handleTriggerDelete);
  }, [message.id]);

  const handleDeleteForMe = () => {
    setIsDeleting(true);
    setCountdown(5);

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);

          // Gọi callback và xử lý lỗi nếu có
          Promise.resolve(onDeleteForMe(message.id)).catch(() => {
            setIsDeleting(false);
            setCountdown(5);
          });

          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleUndoDelete = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    setIsDeleting(false);
    setCountdown(5);
  };

  if (isDeleting) {
    return (
      <div className="flex justify-center w-full my-2 animate-fade-in">
        <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 px-4 py-2 rounded-full flex items-center gap-3 shadow-sm">
          Tin nhắn sẽ bị xóa ở phía bạn trong <span className="font-bold text-red-500">{countdown}s</span>...
          <button onClick={handleUndoDelete} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-bold hover:underline">
            Hoàn tác
          </button>
        </span>
      </div>
    );
  }
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
        <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-4 py-1.5 rounded-full text-center max-w-[85%] break-words">
          {content} {isSilent && <span className="ml-1 opacity-70 italic">(Âm thầm)</span>}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-end group/select ${isSelectionMode ? 'cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/30 rounded-xl px-1 sm:px-2 py-0.5' : ''}`}
      onClick={(e) => {
        if (isSelectionMode && onToggleSelect) {
          e.stopPropagation();
          onToggleSelect(message.id);
        }
      }}
      onMouseEnter={() => {
        if (isSelectionMode && isDraggingSelection && onToggleSelect) {
          onToggleSelect(message.id, true); // true = force add to selection during drag
        }
      }}
    >
      {/* Checkbox (hiện bên trái) */}
      {isSelectionMode && (
        <div className="w-8 sm:w-10 flex-shrink-0 flex items-center justify-center pb-2">
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}>
            {isSelected && <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
          </div>
        </div>
      )}

      {/* Nội dung tin nhắn */}
      <div className={`flex items-end gap-2 flex-1 min-w-0 ${isLastInGroup ? 'mb-3' : 'mb-1'} ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${isSelectionMode ? 'pointer-events-none' : ''}`}>
      {/* Avatar người gửi (chỉ hiện khi không phải mình) */}
      {!isOwn && (
        isLastInGroup ? (
          <div className="relative flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onUserClick && onUserClick(message.senderId)}>
            {message.sender?.avatar ? (
              <img src={`${process.env.REACT_APP_SOCKET_URL}${message.sender.avatar}`} alt="Avatar" className={`w-7 h-7 rounded-full object-cover ${message.senderRole === 'ADMIN' ? 'border-[1.5px] border-amber-400' : (message.senderRole === 'DEPUTY' ? 'border-[1.5px] border-slate-400' : '')}`} />
            ) : (
              <div className={`w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white text-xs font-bold ${message.senderRole === 'ADMIN' ? 'border-[1.5px] border-amber-400' : (message.senderRole === 'DEPUTY' ? 'border-[1.5px] border-slate-400' : '')}`}>
                {message.sender?.fullName?.charAt(0) || '?'}
              </div>
            )}

            {/* Biểu tượng Chìa Khóa cho Admin / Phó nhóm */}
            {(message.senderRole === 'ADMIN' || message.senderRole === 'DEPUTY') && (
              <div
                className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 ${message.senderRole === 'ADMIN' ? 'bg-amber-400 text-white' : 'bg-slate-400 text-white'}`}
                title={message.senderRole === 'ADMIN' ? 'Trưởng nhóm' : 'Phó nhóm'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-2 h-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
        ) : (
          <div className="w-7 h-7 flex-shrink-0"></div>
        )
      )}

    <div className="max-w-[78%] sm:max-w-[70%] group relative" id={`msg-${message.id}`}>
      {/* Nút Hành Động (hiển thị khi hover) */}
      <div className={`absolute top-1/2 -translate-y-1/2 ${isOwn ? 'right-full mr-2 flex-row' : 'left-full ml-2 flex-row-reverse'} ${isMenuOpen || isReactOpen ? 'opacity-100 z-[100]' : 'opacity-0 group-hover:opacity-100 z-20'} transition-opacity flex items-center gap-1`}>
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

        {/* Nút Thả cảm xúc */}
        {message.type !== 'RECALLED' && (
          <div className="relative group/react" ref={reactRef}>
            <button
              onClick={(e) => {
                handleMenuEnter(e);
                setIsReactOpen(!isReactOpen);
                setIsMenuOpen(false);
              }}
              className="p-1 text-slate-400 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/30 rounded-full"
              title="Thả cảm xúc"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            {/* Glassmorphism Reaction Picker */}
            <div className={`absolute ${dropdownPos === 'top' ? 'bottom-full pb-1' : 'top-full pt-1'} ${isOwn ? 'right-0' : 'left-0'} ${isReactOpen ? 'block' : 'hidden'} z-[999] animate-fade-in w-max`}>
              <div className="grid grid-cols-3 gap-1 p-1.5 bg-white/80 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200/60 dark:border-slate-700/60 shadow-xl rounded-xl">
                {EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => onReact(message, emoji)}
                    className="w-6 h-6 flex items-center justify-center text-lg hover:scale-125 hover:-translate-y-1 transition-transform cursor-pointer"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Menu 3 Chấm */}
        <div className="relative group/more" ref={menuRef}>
          <button
            onClick={(e) => {
              handleMenuEnter(e);
              setIsMenuOpen(!isMenuOpen);
              setIsReactOpen(false);
            }}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            title="Thêm tùy chọn"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
          </button>
          {/* Dropdown Box */}
          <div className={`absolute ${dropdownPos === 'top' ? 'bottom-full pb-1' : 'top-full pt-1'} ${isOwn ? 'right-0' : 'left-0'} ${isMenuOpen ? 'block' : 'hidden'} z-[999] animate-fade-in w-max`}>
            <div className="bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden py-1.5 w-40 flex flex-col">
              <button
                onClick={() => navigator.clipboard.writeText(message.type === 'TEXT' ? message.content : 'Tin nhắn')}
                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
              >
                Copy tin nhắn
              </button>
              {isOwn && message.type === 'TEXT' && (
                <button
                  onClick={() => onEdit && onEdit(message)}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Chỉnh sửa
                </button>
              )}
              {message.type !== 'RECALLED' && (
                <>
                  <button
                    onClick={() => onShare && onShare(message)}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                  >
                    Chia sẻ
                  </button>
                  <button
                    onClick={() => onPin(message)}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                  >
                    Ghim tin nhắn
                  </button>
                </>
              )}
              {isOwn && message.type !== 'RECALLED' && (
                <button
                  onClick={async () => {
                    if (await useUIStore.getState().confirm('Thu hồi tin nhắn', 'Bạn có chắc chắn muốn thu hồi tin nhắn này với mọi người?')) {
                      messageApi.recallMessage(message.id).catch(console.error);
                    }
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-2 transition-colors"
                >
                  Thu hồi
                </button>
              )}
              <button
                onClick={handleDeleteForMe}
                className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
              >
                Xóa phía tôi
              </button>
              <button
                onClick={() => onEnableSelectionMode && onEnableSelectionMode(message.id)}
                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors border-t border-slate-100 dark:border-slate-700/50"
              >
                Chọn nhiều
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tên người gửi (chỉ hiện với group chat, không phải mình) */}
      {!isOwn && message.groupId && isFirstInGroup && (
        <p
          className="text-xs text-slate-500 dark:text-slate-400 mb-1 ml-1 inline-block cursor-pointer hover:underline hover:text-indigo-500 transition-colors"
          onClick={() => onUserClick && onUserClick(message.senderId)}
        >
          {message.sender?.fullName}
        </p>
      )}

      <div
        className={[
          (message.type === 'IMAGE' || message.type === 'POLL' || message.type === 'NOTE' || message.type === 'REMINDER') ? 'bg-transparent p-0' :
          message.type === 'RECALLED' ? 'px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-dashed text-slate-400 dark:text-slate-500 italic' : 'px-4 py-2.5',
          'rounded-2xl text-sm leading-relaxed break-words',
          message.type === 'RECALLED' ? (isOwn ? 'rounded-br-sm' : 'rounded-bl-sm') :
          (message.type === 'IMAGE' || message.type === 'POLL' || message.type === 'NOTE' || message.type === 'REMINDER') ? (isOwn ? 'rounded-br-sm' : 'rounded-bl-sm') :
          (isOwn ? 'msg-mine rounded-br-sm' : 'msg-other rounded-bl-sm'),
          !isOwn && message.type !== 'RECALLED' && message.senderRole === 'ADMIN' ? 'border-[1px] border-amber-300/60 dark:border-amber-700/60' : '',
          !isOwn && message.type !== 'RECALLED' && message.senderRole === 'DEPUTY' ? 'border-[1px] border-slate-300 dark:border-slate-600' : ''
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

        {message.type === 'TEXT' && (
          <div className="flex flex-col">
            <div>{renderTextWithLinks(message.content, onUserClick, groupMembers)}</div>
            {message.linkPreview && (() => {
              try {
                const preview = JSON.parse(message.linkPreview);
                return (
                  <a
                    href={preview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block mt-2 w-[240px] sm:w-[280px] bg-white dark:bg-slate-800 border ${isOwn ? 'border-indigo-200/50 dark:border-indigo-700/50' : 'border-slate-200 dark:border-slate-700'} rounded-xl overflow-hidden hover:opacity-90 transition shadow-sm`}
                  >
                    {preview.image && (
                      <div className="w-full h-32 bg-slate-100 dark:bg-slate-900 relative">
                        <img
                          src={preview.image}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Ẩn ảnh nếu ảnh bị lỗi (như Facebook chặn hotlink)
                            e.target.parentElement.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="p-2.5">
                      <h4 className="font-bold text-[13px] text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug">{preview.title || preview.domain}</h4>
                      {preview.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-snug">{preview.description}</p>
                      )}
                      <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium mt-1.5 uppercase tracking-wide">{preview.domain}</p>
                    </div>
                  </a>
                );
              } catch (e) { return null; }
            })()}
          </div>
        )}
        {message.type === 'POLL' && <ChatPollWidget pollId={message.content} />}
        {message.type === 'NOTE' && <ChatNoteWidget noteId={message.content} />}
        {message.type === 'REMINDER' && <ChatReminderWidget reminderId={message.content} />}
        {message.type === 'RECALLED' && message.content}
        {message.type === 'CALL_MISSED' && (
          <div className="flex items-center gap-2 font-medium text-red-500">
            <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
            </div>
            <span>Cuộc gọi nhỡ</span>
          </div>
        )}
        {message.type === 'CALL_ENDED' && (() => {
          let duration = 0;
          let callTypeStr = 'Thoại';
          try { 
            const contentData = JSON.parse(message.content); 
            duration = contentData.duration;
            callTypeStr = contentData.callType === 'VIDEO' ? 'Video' : 'Thoại';
          } catch { /* ignore */ }
          
          const m = Math.floor(duration / 60);
          const s = duration % 60;
          const durationText = m > 0 ? `${m} phút ${s} giây` : `${s} giây`;
          return (
            <div className="flex items-center gap-2 font-medium">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span>Cuộc gọi {callTypeStr}</span>
                <span className="opacity-80 text-[11px] font-normal">{durationText}</span>
              </div>
            </div>
          );
        })()}
        {message.type === 'IMAGE' && (() => {
          const urls = message.content.split('|');
          if (urls.length === 1) {
            const isExternal = urls[0].startsWith('http');
            const imgUrl = isExternal ? urls[0] : `${process.env.REACT_APP_SOCKET_URL}${urls[0]}`;
            return (
              <img
                src={imgUrl}
                alt={isExternal ? "Sticker" : "Image"}
                className={`rounded-xl object-contain ${isExternal ? 'w-24 h-24 sm:w-32 sm:h-32' : 'max-w-xs sm:max-w-sm max-h-64 cursor-pointer'}`}
                onClick={() => !isExternal && onImageClick({ url: imgUrl, message, isOwn })}
              />
            );
          } else {
            // Album layout (Grid)
            const gridCols = urls.length === 2 ? 'grid-cols-2' : 'grid-cols-3';
            return (
              <div className={`grid gap-1 ${gridCols} max-w-[260px] sm:max-w-xs overflow-hidden rounded-2xl ${isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'} border border-slate-200/50 dark:border-slate-700/50`}>
                {urls.map((url, idx) => {
                  const isExternal = url.startsWith('http');
                  const imgUrl = isExternal ? url : `${process.env.REACT_APP_SOCKET_URL}${url}`;
                  return (
                    <img
                      key={idx}
                      src={imgUrl}
                      alt="Image"
                      className="w-full h-24 sm:h-32 object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                      onClick={() => onImageClick({ url: imgUrl, message, isOwn })}
                    />
                  );
                })}
              </div>
            );
          }
        })()}
        {message.type === 'FILE' && (
          <a
            href={message.content.startsWith('http') ? message.content : `${process.env.REACT_APP_SOCKET_URL}${message.content}`}
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
            className="flex items-center px-1.5 py-0.5 bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 rounded-full cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            {/* Lọc ra các emoji unique để hiển thị */}
            {[...new Set(message.reactions.map(r => r.emoji))].slice(0, 3).map((emoji, idx) => (
              <span key={idx} className="text-[11px] leading-none -ml-0.5 first:ml-0">{emoji}</span>
            ))}
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 ml-1">{message.reactions.length}</span>
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
          {message.isEdited && <span className="mr-1 italic opacity-80">(Đã chỉnh sửa)</span>}
          {formatTime(message.createdAt)}
        </p>
      )}

      {/* Read Receipts */}
      {readers?.length > 0 && (
        <div
          onClick={() => onShowReaders && onShowReaders(readers)}
          className={`flex items-center gap-1 mt-1 cursor-pointer hover:opacity-80 transition-opacity ${isOwn ? 'justify-end mr-1' : 'justify-start ml-1'}`}
        >
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
    </div>
  );
};

const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

// Hook tự cập nhật mỗi 60 giây để hiển thị "Hoạt động X phút trước" chính xác
const useTick = (intervalMs = 60000) => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
};

const ChatWindow = ({ onOpenSidebar, onToggleRightSidebar }) => {
  const { theme } = useThemeStore();
  const activeConversation = useChatStore((s) => s.activeConversation);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const userLastSeen = useChatStore((s) => s.userLastSeen);
  const conversationKey = activeConversation ? `${activeConversation.type}_${activeConversation.id}` : null;
  // Tick mỗi 60s để component re-render và cập nhật "Hoạt động X phút trước"
  useTick();

  // Tránh lỗi Infinite Loop của useSyncExternalStore bằng cách dùng mảng hằng số (EMPTY_ARRAY)
  const messages = useChatStore((s) => s.messages[conversationKey] || EMPTY_ARRAY);
  const typing = useChatStore((s) => s.typingUsers[conversationKey] || EMPTY_ARRAY);
  const watermarks = useChatStore((s) => s.watermarks[conversationKey] || EMPTY_OBJECT);

  const initMessages = useChatStore((s) => s.initMessages);
  const addMessage = useChatStore((s) => s.addMessage);

  const pinnedMessages = useChatStore((s) => s.pinnedMessages[conversationKey] || EMPTY_ARRAY);
  const setPinnedMessages = useChatStore((s) => s.setPinnedMessages);
  const initiateCall = useCallStore((s) => s.initiateCall);
  const joinZegoCall = useCallStore((s) => s.joinZegoCall);

  const currentUser = useAuthStore((s) => s.user);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGroupMembersModalOpen, setIsGroupMembersModalOpen] = useState(false);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [profileUserId, setProfileUserId] = useState(null); // ID of user to show profile for
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [messagesToShare, setMessagesToShare] = useState([]);
  const [isPinnedDropdownOpen, setIsPinnedDropdownOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [reactionsToShow, setReactionsToShow] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [readersToShow, setReadersToShow] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiTab, setEmojiTab] = useState('EMOJI'); // 'STICKER' or 'EMOJI'
  const [stickers, setStickers] = useState([]);
  const [stickerQuery, setStickerQuery] = useState('');
  const [batchDeleteState, setBatchDeleteState] = useState(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  // Tag (Mention) state
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const batchDeleteIntervalRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch group members for Mentions
  const { data: groupMembersData } = useQuery({
    queryKey: ['group-members', activeConversation?.id],
    queryFn: () => groupApi.getGroupTree(activeConversation?.id).then((r) => r.data.data),
    enabled: activeConversation?.type === 'group' && !!activeConversation?.id,
  });

  const groupMembers = useMemo(() => {
    if (!groupMembersData) return [];

    // Flatten group members tree
    const flatten = (nodes) => {
      let result = [];
      nodes.forEach((node) => {
        if (node.user) result.push(node.user);
        if (node.children && node.children.length > 0) {
          result = result.concat(flatten(node.children));
        }
      });
      return result;
    };

    const flatUsers = flatten(groupMembersData);
    // Xoá trùng lặp nếu có
    return Array.from(new Map(flatUsers.map(item => [item.id, item])).values());
  }, [groupMembersData]);

  const mentionCandidates = useMemo(() => {
    if (mentionQuery === null || groupMembers.length === 0) return [];

    const q = mentionQuery.toLowerCase();
    return groupMembers.filter(u =>
      u.id !== currentUser?.id &&
      ((u.fullName || '').toLowerCase().includes(q) ||
       (u.username || '').toLowerCase().includes(q))
    ).slice(0, 10);
  }, [groupMembers, mentionQuery, currentUser?.id]);

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
        useUIStore.getState().showAlert(err.response.data.message, 'error');
      } else {
        useUIStore.getState().showAlert('Có lỗi xảy ra khi ghim tin nhắn.', 'error');
      }
    }
  };

  const handleUnpinMessage = async (messageId) => {
    if (!(await useUIStore.getState().confirm('Bỏ ghim', 'Bạn có chắc chắn muốn bỏ ghim tin nhắn này?'))) return;
    try {
      await messageApi.unpinMessage(messageId);
    } catch (err) {
      console.error(err);
      useUIStore.getState().showAlert('Không thể bỏ ghim tin nhắn.', 'error');
    }
  };

  const canEditGroupInfo = activeConversation?.type === 'group' && ((activeConversation.role === 'ADMIN' || activeConversation.role === 'DEPUTY') || activeConversation.canChangeGroupInfo);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await groupApi.updateGroupAvatar(activeConversation.id, formData);
      const updatedGroup = res.data.data;
      useChatStore.getState().setActiveConversation({
        ...activeConversation,
        avatar: updatedGroup.avatar
      });
      queryClient.invalidateQueries(['my-groups']);
      useUIStore.getState().showToast('Cập nhật ảnh đại diện thành công', 'success');
    } catch (err) {
      useUIStore.getState().showToast('Có lỗi khi cập nhật ảnh đại diện', 'error');
    } finally {
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleSaveName = async () => {
    if (!editName.trim() || editName.trim() === activeConversation.name) {
      setIsEditingName(false);
      return;
    }
    try {
      const res = await groupApi.updateGroupName(activeConversation.id, editName.trim());
      const updatedGroup = res.data.data;
      useChatStore.getState().setActiveConversation({
        ...activeConversation,
        name: updatedGroup.name
      });
      queryClient.invalidateQueries(['my-groups']);
      useUIStore.getState().showToast('Cập nhật tên nhóm thành công', 'success');
      setIsEditingName(false);
    } catch (err) {
      useUIStore.getState().showToast('Có lỗi khi cập nhật tên nhóm', 'error');
    }
  };

  useEffect(() => {
    if (emojiTab !== 'STICKER' || !showEmojiPicker) return;
    let isMounted = true;
    const fetchStickers = async () => {
      try {
        const query = stickerQuery.trim() ? encodeURIComponent(stickerQuery + ' sticker') : 'cute+cat+sticker';
        const res = await fetch(`https://g.tenor.com/v1/search?q=${query}&key=LIVDSRZULELA&limit=30`);
        const data = await res.json();
        if (isMounted && data.results) {
          setStickers(data.results.map(r => r.media[0].tinygif.url));
        }
      } catch (e) {
        console.error('Failed to fetch stickers:', e);
      }
    };
    const timer = setTimeout(fetchStickers, 500);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [stickerQuery, emojiTab, showEmojiPicker]);

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
      queryClient.invalidateQueries({ queryKey: ['messages', conversationKey] });
    };
    const handleMessageDeleted = (e) => {
      // Khi admin xóa, ta xoá message khỏi store
      const data = e.detail;
      if (data.groupId) {
        useChatStore.getState().removeMessageForMe('group', data.groupId, data.messageId);
      } else if (data.partnerId) {
        useChatStore.getState().removeMessageForMe('direct', data.partnerId, data.messageId);
      }
      queryClient.invalidateQueries({ queryKey: ['messages', conversationKey] });
    };
    window.addEventListener('message_recalled', handleMessageRecalled);
    window.addEventListener('message_deleted', handleMessageDeleted);
    return () => {
      window.removeEventListener('message_recalled', handleMessageRecalled);
      window.removeEventListener('message_deleted', handleMessageDeleted);
    };
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

    if (editingMessage) {
      try {
        await messageApi.editMessage(editingMessage.id, content);
        setEditingMessage(null);
        setInputText('');
      } catch (err) {
        console.error(err);
        useUIStore.getState().showAlert('Chỉnh sửa tin nhắn thất bại!', 'error');
      } finally {
        setIsSending(false);
      }
      return;
    }

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
      console.error(err);
      useUIStore.getState().showAlert('Gửi tin nhắn hoặc file thất bại. Vui lòng thử lại!', 'error');
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
      useUIStore.getState().showAlert('Gửi tin nhắn giọng nói thất bại. Vui lòng thử lại.', 'error');
    }
  };

  const handleSendSticker = async (stickerUrl) => {
    try {
      const replyToId = replyingTo ? replyingTo.id : null;
      if (activeConversation.type === 'group') {
        await socketService.sendGroupMessage(activeConversation.id, stickerUrl, 'IMAGE', replyToId);
      } else {
        const msg = await socketService.sendDirectMessage(activeConversation.id, stickerUrl, 'IMAGE', replyToId);
        useChatStore.getState().addMessage('direct', activeConversation.id, msg);
      }
      setShowEmojiPicker(false);
      setReplyingTo(null);
    } catch (error) {
      console.error(error);
      useUIStore.getState().showAlert('Có lỗi khi gửi nhãn dán!', 'error');
    }
  };

  // Xử lý đưa file vào hàng chờ
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const newPendingFiles = files.map(file => {
      if (file.size > 20 * 1024 * 1024) {
        useUIStore.getState().showAlert(`File ${file.name} vượt quá 20MB!`, 'warning');
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

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    // Xử lý Tag (@mention)
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPosition);
    const words = textBeforeCursor.split(/\s/);
    const currentWord = words[words.length - 1];

    if (activeConversation.type === 'group' && currentWord.startsWith('@')) {
      setMentionQuery(currentWord.slice(1));
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }

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

  const handleSelectMention = (user) => {
    if (!textareaRef.current) return;
    const cursorPosition = textareaRef.current.selectionStart;
    const textBeforeCursor = inputText.slice(0, cursorPosition);
    const textAfterCursor = inputText.slice(cursorPosition);

    const words = textBeforeCursor.split(/\s/);
    const currentWord = words[words.length - 1];

    if (currentWord.startsWith('@')) {
      const newTextBeforeCursor = textBeforeCursor.slice(0, -currentWord.length) + `@${user.username} `;
      setInputText(newTextBeforeCursor + textAfterCursor);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newTextBeforeCursor.length, newTextBeforeCursor.length);
        }
      }, 0);
    }

    setMentionQuery(null);
  };

  const handleKeyDown = (e) => {
    // Xử lý Mention Dropdown navigation
    if (mentionQuery !== null && mentionCandidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % mentionCandidates.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + mentionCandidates.length) % mentionCandidates.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectMention(mentionCandidates[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Xử lý dán (paste) ảnh từ clipboard
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        files.push(items[i].getAsFile());
      }
    }

    if (files.length > 0) {
      // Ngăn hành vi dán mặc định nếu có ảnh (tránh việc chèn URL ảnh nếu có)
      // Không preventDefault nếu người dùng dán text bình thường
      e.preventDefault();

      const newPendingFiles = files.map(file => {
        if (file.size > 20 * 1024 * 1024) {
          useUIStore.getState().showAlert(`File ảnh vượt quá 20MB!`, 'warning');
          return null;
        }
        return {
          id: Math.random().toString(36).substr(2, 9),
          file,
          previewUrl: URL.createObjectURL(file)
        };
      }).filter(f => f !== null);

      setPendingFiles(prev => [...prev, ...newPendingFiles]);
    }
  };

  const handleToggleSelectMessage = (messageId, forceAdd = false) => {
    setSelectedMessages(prev => {
      const next = new Set(prev);
      if (forceAdd) {
        next.add(messageId);
      } else {
        if (next.has(messageId)) next.delete(messageId);
        else next.add(messageId);
      }
      return next;
    });
  };

  const handleEnableSelectionMode = (messageId) => {
    setIsSelectionMode(true);
    setSelectedMessages(new Set([messageId]));
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedMessages(new Set());
  };

  const handleBatchCopy = async () => {
    if (selectedMessages.size === 0) return;

    // Thu thập nội dung các tin nhắn văn bản đã chọn (Sắp xếp theo thứ tự hiển thị)
    const textsToCopy = [...selectedMessages]
      .map(id => messages.find(m => m.id === id))
      .filter(m => m && m.type === 'TEXT')
      .map(m => `[${formatTime(m.createdAt)}] ${m.sender?.fullName}: ${m.content}`);

    if (textsToCopy.length === 0) {
      useUIStore.getState().showToast('Không có nội dung văn bản để copy.', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(textsToCopy.join('\n'));
      useUIStore.getState().showToast(`Đã copy ${textsToCopy.length} tin nhắn`, 'success');
      handleCancelSelection();
    } catch (e) {
      useUIStore.getState().showToast('Lỗi copy.', 'error');
    }
  };

  const handleBatchDelete = () => {
    if (selectedMessages.size === 0) return;

    const messagesToDelete = new Set(selectedMessages);
    handleCancelSelection();

    setBatchDeleteState({ messages: messagesToDelete, countdown: 5 });

    if (batchDeleteIntervalRef.current) clearInterval(batchDeleteIntervalRef.current);

    batchDeleteIntervalRef.current = setInterval(() => {
      setBatchDeleteState(prev => {
        if (!prev) return null;
        if (prev.countdown <= 1) {
          clearInterval(batchDeleteIntervalRef.current);

          // Thực hiện xóa thực sự
          const promises = [...prev.messages].map(id => messageApi.deleteForMe(id));
          Promise.all(promises).catch(console.error);
          [...prev.messages].forEach(id => {
            useChatStore.getState().removeMessageForMe(activeConversation.type, activeConversation.id, id);
          });

          return null;
        }
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);
  };

  const handleUndoBatchDelete = () => {
    if (batchDeleteIntervalRef.current) clearInterval(batchDeleteIntervalRef.current);
    setBatchDeleteState(null);
  };

  const handleBatchRecall = async () => {
    if (selectedMessages.size === 0) return;

    // Lọc ra các tin nhắn của chính mình
    const myMsgIds = [...selectedMessages].filter(id => {
      const msg = messages.find(m => m.id === id);
      return msg && msg.senderId === currentUser.id;
    });

    if (myMsgIds.length === 0) {
      useUIStore.getState().showToast('Chỉ có thể thu hồi tin nhắn do bạn gửi.', 'error');
      return;
    }

    if (await useUIStore.getState().confirm('Thu hồi tin nhắn', `Bạn sắp thu hồi ${myMsgIds.length} tin nhắn của mình. Có chắc chắn không?`)) {
      try {
        const promises = myMsgIds.map(id => messageApi.recallMessage(id));
        await Promise.all(promises);
        handleCancelSelection();
      } catch (error) {
        useUIStore.getState().showToast('Có lỗi xảy ra khi thu hồi.', 'error');
      }
    }
  };

  const handleBatchShare = () => {
    if (selectedMessages.size === 0) return;
    const msgs = [...selectedMessages].map(id => messages.find(m => m.id.toString() === id.toString())).filter(Boolean);
    setMessagesToShare(msgs);
    setIsShareModalOpen(true);
  };

  // Drag to select Handlers cho chuột
  const handleMouseDown = (e) => {
    if (isSelectionMode && e.button === 0) {
      setIsDraggingSelection(true);
    }
  };

  const handleMouseUp = () => {
    if (isSelectionMode) {
      setIsDraggingSelection(false);
    }
  };

  // Drag to select Handlers cho Touch (Mobile)
  const handleTouchMove = (e) => {
    if (!isSelectionMode || !isDraggingSelection) return;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);

    // Tìm message id từ id element
    if (el) {
      const msgWrapper = el.closest('[id^="msg-"]');
      if (msgWrapper) {
        const idStr = msgWrapper.id.replace('msg-', '');
        // Kiểm tra xem ID có phải số không
        const id = /^\d+$/.test(idStr) ? parseInt(idStr) : idStr;
        if (id) {
           handleToggleSelectMessage(id, true);
        }
      }
    }
  };

  if (!activeConversation) return null;

  return (
    <div className="flex flex-col h-full min-w-0">
      {/* Header hoặc Selection Toolbar */}
      {isSelectionMode ? (
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-slate-200/70 dark:border-slate-700/70 bg-indigo-50 dark:bg-slate-800/80 backdrop-blur-xl animate-fade-in z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancelSelection}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <span className="font-semibold text-slate-800 dark:text-white">
              Đã chọn: <span className="text-indigo-600 dark:text-indigo-400">{selectedMessages.size}</span>
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={handleBatchCopy} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition flex items-center gap-1" title="Sao chép văn bản">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              <span className="hidden sm:inline">Sao chép</span>
            </button>
            <button onClick={handleBatchShare} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              <span className="hidden sm:inline">Chia sẻ</span>
            </button>
            <button onClick={handleBatchRecall} className="p-2 text-amber-600 dark:text-amber-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition flex items-center gap-1">
              <span className="hidden sm:inline">Thu hồi</span>
            </button>
            <button onClick={handleBatchDelete} className="p-2 text-red-600 dark:text-red-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              <span className="hidden sm:inline">Xóa</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-slate-200/70 dark:border-slate-700/70 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl z-30">
        {/* Mobile: nút mở sidebar */}
        <button
          onClick={onOpenSidebar}
          className="md:hidden w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center justify-center"
          title="Mở danh sách"
          type="button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 text-slate-700 dark:text-slate-200"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M4 6.75A.75.75 0 014.75 6h14.5a.75.75 0 010 1.5H4.75A.75.75 0 014 6.75zM4 12a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H4.75A.75.75 0 014 12zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H4.75a.75.75 0 01-.75-.75z" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          {/* Avatar Area */}
          <div
            className={`relative group ${canEditGroupInfo ? 'cursor-pointer' : (activeConversation.type === 'direct' ? 'cursor-pointer hover:opacity-80 transition-opacity' : '')}`}
            onClick={() => {
              if (activeConversation.type === 'direct') setIsUserProfileModalOpen(true);
              else if (canEditGroupInfo) avatarInputRef.current?.click();
            }}
            title={activeConversation.type === 'direct' ? "Xem trang cá nhân" : (canEditGroupInfo ? "Thay đổi ảnh đại diện" : "")}
          >
            {activeConversation.avatar ? (
              <img src={`${process.env.REACT_APP_SOCKET_URL}${activeConversation.avatar}`} alt="Avatar" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 flex-shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white font-semibold text-sm">
                {activeConversation.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            {/* Hover overlay for changing avatar */}
            {canEditGroupInfo && (
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            {canEditGroupInfo && (
               <input
                 type="file"
                 ref={avatarInputRef}
                 className="hidden"
                 accept="image/*"
                 onChange={handleAvatarChange}
               />
            )}
          </div>

          {/* Name and Info Area */}
          <div className="min-w-0 flex-1 pr-4">
            {activeConversation.type === 'group' && isEditingName ? (
               <input
                 type="text"
                 autoFocus
                 value={editName}
                 onChange={(e) => setEditName(e.target.value)}
                 onBlur={handleSaveName}
                 onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                 className="w-full text-sm font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 border border-indigo-500 rounded px-2 py-0.5 outline-none focus:ring-2 focus:ring-indigo-500"
               />
            ) : (
              <p
                className={`font-semibold text-slate-900 dark:text-white text-sm truncate ${canEditGroupInfo ? 'cursor-pointer hover:text-indigo-600 transition-colors' : (activeConversation.type === 'direct' ? 'cursor-pointer hover:text-indigo-600 transition-colors' : '')}`}
                onClick={() => {
                  if (activeConversation.type === 'direct') setIsUserProfileModalOpen(true);
                  else if (canEditGroupInfo) {
                    setEditName(activeConversation.name);
                    setIsEditingName(true);
                  }
                }}
                title={activeConversation.type === 'direct' ? "Xem trang cá nhân" : (canEditGroupInfo ? "Nhấn để đổi tên" : "")}
              >
                {activeConversation.name}
              </p>
            )}

            <p
               className={`text-xs font-medium ${activeConversation.type === 'group' ? 'text-slate-500 dark:text-slate-400 cursor-pointer hover:underline inline-block' : (onlineUsers[activeConversation.id] ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500')} ${activeConversation.type === 'direct' ? 'cursor-pointer hover:opacity-80 transition-opacity inline-block' : ''}`}
               onClick={() => {
                 if (activeConversation.type === 'group') setIsGroupMembersModalOpen(true);
                 else setIsUserProfileModalOpen(true);
               }}
               title={activeConversation.type === 'group' ? "Xem thành viên nhóm" : "Xem trang cá nhân"}
            >
              {activeConversation.type === 'group'
                ? `${activeConversation.memberCount || 0} thành viên`
                : (onlineUsers[activeConversation.id]
                    ? 'Đang hoạt động'
                    : (userLastSeen[activeConversation.id]
                        ? `Hoạt động ${formatDistanceToNow(new Date(userLastSeen[activeConversation.id]), { addSuffix: true, locale: vi })}`
                        : 'Không hoạt động'))}
            </p>
          </div>
        </div>

        {/* Các nút công cụ */}
        <div className="flex items-center gap-1 sm:gap-2 ml-auto">
          {/* Nút Gọi Điện (Chỉ hiện khi gọi 1-1) */}
          {activeConversation.type === 'direct' && (
            <>
              <button
                onClick={() => initiateCall(activeConversation.id, { fullName: activeConversation.name, avatar: activeConversation.avatar }, 'AUDIO')}
                title="Gọi thoại"
                className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-500 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
              <button
                onClick={() => initiateCall(activeConversation.id, { fullName: activeConversation.name, avatar: activeConversation.avatar }, 'VIDEO')}
                title="Gọi Video"
                className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:bg-sky-50 dark:hover:bg-sky-900/30 hover:text-sky-500 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </>
          )}

          {/* Nút Gọi Nhóm (Chỉ hiện khi trong Group) */}
          {activeConversation.type === 'group' && (
            <button
              onClick={() => {
                joinZegoCall(activeConversation.id);
                // Broadcast to others
                socketService.getSocket()?.emit('group_call_started', {
                  groupId: activeConversation.id,
                  groupName: activeConversation.name,
                  callerName: currentUser.fullName
                });

                // Gửi một tin nhắn hệ thống báo hiệu có cuộc gọi nhóm
                socketService.getSocket()?.emit('sendGroupMessage', {
                  groupId: activeConversation.id,
                  content: 'Đã bắt đầu cuộc gọi nhóm',
                  type: 'SYSTEM'
                });
              }}
              title="Tham gia Gọi Nhóm"
              className="px-3 py-1.5 flex-shrink-0 rounded-lg flex items-center justify-center gap-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 transition font-medium text-xs sm:text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">Gọi nhóm</span>
            </button>
          )}

          {/* Nút tìm kiếm */}
          <button
            onClick={() => {
              useUIStore.getState().setRightSidebarTab('search');
              window.dispatchEvent(new CustomEvent('force-open-right-sidebar'));
            }}
            title="Tìm kiếm tin nhắn"
            className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>

          {/* Nút xem thông tin hội thoại (Right Sidebar) */}
          <button
            onClick={onToggleRightSidebar}
            title="Thông tin hội thoại"
            className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </div>
      )}

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
            className="bg-amber-50/50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/30 px-4 py-2 flex items-center justify-between group cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20 transition"
            onClick={() => setIsPinnedDropdownOpen(!isPinnedDropdownOpen)}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <div className="flex flex-col min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-500">
                  Tin ghim ({pinnedMessages.length}/5)
                </p>
                <p className="text-xs text-slate-700 dark:text-slate-300 truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition">
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
            <div className="absolute top-full left-0 right-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-lg max-h-64 overflow-y-auto">
              {pinnedMessages.map((pin) => (
                <div key={pin.id} className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition group">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                    {pin.message?.sender?.fullName?.charAt(0) || '?'}
                  </div>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      const el = document.getElementById(`msg-${pin.messageId}`);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.classList.add('bg-amber-100', 'dark:bg-amber-900/30', 'transition-colors', 'duration-1000');
                        setTimeout(() => el.classList.remove('bg-amber-100', 'dark:bg-amber-900/30'), 1500);
                        setIsPinnedDropdownOpen(false);
                      }
                    }}
                  >
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-0.5">{pin.message?.sender?.fullName}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
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
      <div
        ref={messagesContainerRef}
        id="scrollable-messages-container"
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-4 select-none custom-scrollbar"
        onScroll={(e) => {
          const { scrollTop, scrollHeight, clientHeight } = e.target;
          setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 300);
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={(e) => {
          if (isSelectionMode) setIsDraggingSelection(true);
        }}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
        onTouchCancel={handleMouseUp}
      >
        {/* Nút tải thêm tin cũ */}
        {hasNextPage && (
          <div className="flex justify-center mb-4">
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="px-4 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-full transition bg-white/70 dark:bg-slate-800/70"
              type="button"
            >
              {isFetchingNextPage ? 'Đang tải...' : 'Tải tin nhắn cũ hơn'}
            </button>
          </div>
        )}

        {messages.map((msg, index) => {
          if (batchDeleteState?.messages.has(msg.id)) return null;

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
              onUserClick={(userId) => {
                setProfileUserId(userId);
                setIsUserProfileModalOpen(true);
              }}
              groupMembers={groupMembers}
              onReply={setReplyingTo}
              onPin={handlePinMessage}
              onShare={(msg) => {
                setMessagesToShare([msg]);
                setIsShareModalOpen(true);
              }}
              onEdit={(msg) => {
                setEditingMessage(msg);
                setInputText(msg.type === 'TEXT' ? msg.content : '');
                setReplyingTo(null);
              }}
              onImageClick={setPreviewImage}
              onShowReactions={setReactionsToShow}
              onShowReaders={setReadersToShow}
              onReact={(message, emoji) => {
                socketService.reactMessage(
                  message.id,
                  activeConversation.type === 'group' ? activeConversation.id : null,
                  activeConversation.type === 'direct' ? activeConversation.id : null,
                  emoji
                );
              }}
              onDeleteForMe={async (messageId) => {
                try {
                  await messageApi.deleteForMe(messageId);
                  // Xóa khỏi danh sách tin nhắn
                  useChatStore.getState().removeMessageForMe(activeConversation.type, activeConversation.id, messageId);
                  // Ẩn khỏi danh sách ghim phía mình (pin vẫn tồn tại cho đối phương)
                  useChatStore.getState().removePinnedMessage(activeConversation.type, activeConversation.id, messageId);
                } catch (error) {
                  console.error('Lỗi khi xóa tin nhắn:', error);
                  useUIStore.getState().showAlert(error.response?.data?.message || 'Có lỗi xảy ra khi xóa tin nhắn', 'error');
                  throw error; // Ném ra để MessageItem bắt và reset UI
                }
              }}
              isFirstInGroup={isFirstInGroup}
              isLastInGroup={isLastInGroup}
              isSelectionMode={isSelectionMode}
              isSelected={selectedMessages.has(msg.id)}
              onToggleSelect={handleToggleSelectMessage}
              onEnableSelectionMode={handleEnableSelectionMode}
              isDraggingSelection={isDraggingSelection}
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

      {/* Nút Cuộn Xuống Cuối */}
      {showScrollBottom && (
        <button
          onClick={() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="absolute bottom-28 right-4 sm:right-8 z-40 w-10 h-10 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm text-indigo-600 dark:text-indigo-400 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition animate-fade-in-up hover:scale-105"
          title="Cuộn xuống cuối"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}

      {/* Batch Delete Undo Banner */}
      {batchDeleteState && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 animate-fade-in-up">
          <div className="bg-slate-800 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-4 border border-slate-700">
            <span className="text-sm">Đang xóa {batchDeleteState.messages.size} tin nhắn trong <span className="font-bold text-red-400">{batchDeleteState.countdown}s</span>...</span>
            <button onClick={handleUndoBatchDelete} className="text-sm font-bold text-indigo-400 hover:text-indigo-300 transition uppercase tracking-wider">Hoàn tác</button>
          </div>
        </div>
      )}

      {/* Input gửi tin nhắn */}
      {activeConversation.type === 'group' && activeConversation.isReadOnly && activeConversation.role === 'MEMBER' ? (
        <div className="px-3 sm:px-4 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 inline-block mr-1.5 -mt-0.5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Chỉ trưởng/phó cộng đồng được gửi tin nhắn vào cộng đồng. <span className="text-indigo-500 hover:underline cursor-pointer">Tìm hiểu thêm</span>
          </p>
        </div>
      ) : (
        <div className="px-3 sm:px-4 py-3 border-t border-slate-200/70 dark:border-slate-700/70 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl relative z-50">
          {/* Banner cảnh báo cho Trưởng/Phó nhóm */}
          {activeConversation.type === 'group' && activeConversation.isReadOnly && (
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex justify-center pointer-events-none z-10">
              <div className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 text-[10px] px-3 py-1 rounded-t-lg font-semibold flex items-center gap-1.5 shadow-sm border border-b-0 border-amber-200 dark:border-amber-800/50">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Chế độ: Chỉ Trưởng/Phó nhóm được nhắn tin
              </div>
            </div>
          )}

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
                <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 focus-within:bg-white dark:focus-within:bg-slate-900 rounded-2xl transition-all duration-200">
                {/* Thanh Preview File Hàng Chờ */}
              {pendingFiles.length > 0 && (
                <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto custom-scrollbar">
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
                <div className="flex items-start justify-between px-4 pt-3 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mb-0.5">
                      Đang trả lời {replyingTo.sender?.fullName}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
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
              {/* Thanh Preview Chỉnh Sửa */}
              {editingMessage && (
                <div className="flex items-start justify-between px-4 pt-3 pb-2 border-b border-slate-200 dark:border-slate-700 bg-amber-50/50 dark:bg-amber-900/10">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mb-0.5">
                      Đang chỉnh sửa tin nhắn
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {editingMessage.type === 'TEXT' ? editingMessage.content : '[Hình ảnh]'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setEditingMessage(null); setInputText(''); }}
                    className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-full transition-colors flex-shrink-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Gợi ý Tag (Mention) Dropdown */}
              {mentionQuery !== null && mentionCandidates.length > 0 && (
                <div className="absolute bottom-full left-4 mb-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50 animate-fade-in-up">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                    Tag thành viên
                  </div>
                  <div className="max-h-48 overflow-y-auto custom-scrollbar">
                    {mentionCandidates.map((user, idx) => (
                      <div
                        key={user.id}
                        onClick={() => handleSelectMention(user)}
                        className={`px-3 py-2 flex items-center gap-2 cursor-pointer transition-colors ${idx === mentionIndex ? 'bg-indigo-50 dark:bg-indigo-900/40' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                      >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white font-semibold text-[10px] shrink-0">
                          {user.fullName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.fullName}</span>
                          <span className="text-[10px] text-slate-500 truncate">@{user.username}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                rows={1}
                placeholder={`Nhắn tin ${activeConversation.type === 'group' ? 'nhóm' : activeConversation.name}...`}
                className="w-full resize-none bg-transparent border-none focus:ring-0 px-4 py-3 min-h-[44px] max-h-32 text-sm leading-5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
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
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl transition-all duration-150 ${showEmojiPicker ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 active:scale-95'}`}
                      type="button"
                      title="Biểu tượng cảm xúc"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    {showEmojiPicker && (
                      <>
                        <div className="fixed inset-0 z-[90]" onClick={() => setShowEmojiPicker(false)} />
                        <div className="absolute bottom-full right-[-10px] sm:right-0 mb-3 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 w-[300px] sm:w-[350px] max-w-[calc(100vw-24px)] h-[350px] sm:h-[400px] z-[100] animate-fade-in-up flex flex-col overflow-hidden">
                          {/* Tabs */}
                          <div className="flex items-center border-b border-slate-200 dark:border-slate-700">
                            <button
                              onClick={() => setEmojiTab('STICKER')}
                              className={`flex-1 py-3 text-sm font-semibold transition-colors ${emojiTab === 'STICKER' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                              STICKER
                            </button>
                            <button
                              onClick={() => setEmojiTab('EMOJI')}
                              className={`flex-1 py-3 text-sm font-semibold transition-colors ${emojiTab === 'EMOJI' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                              EMOJI
                            </button>
                          </div>

                          {/* Content */}
                          <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-900/50">
                            {emojiTab === 'EMOJI' ? (
                              <div className="w-full h-full flex items-center justify-center -m-[1px]">
                                <EmojiPicker
                                  onEmojiClick={(emojiData) => {
                                    setInputText(prev => prev + emojiData.emoji);
                                  }}
                                  width="100%"
                                  height="100%"
                                  theme={theme === 'dark' ? 'dark' : 'light'}
                                  searchPlaceHolder="Tìm kiếm Emoji..."
                                  skinTonesDisabled
                                  emojiStyle="native"
                                />
                              </div>
                            ) : (
                              <div className="flex flex-col h-full bg-white dark:bg-slate-900">
                                <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                                  <div className="relative mb-2">
                                    <input
                                      type="text"
                                      placeholder="Tìm kiếm nhãn dán..."
                                      value={stickerQuery}
                                      onChange={(e) => setStickerQuery(e.target.value)}
                                      className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                    />
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                  </div>
                                  {/* Phân loại */}
                                  <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
                                    {STICKER_CATEGORIES.map(cat => (
                                      <button
                                        key={cat.label}
                                        onClick={() => setStickerQuery(cat.query)}
                                        className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                                          (stickerQuery === cat.query || (!stickerQuery && !cat.query))
                                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400'
                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                      >
                                        {cat.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 grid grid-cols-4 gap-2">
                                  {stickers.map((stickerUrl, idx) => (
                                    <button
                                      key={`sticker_${idx}`}
                                      onClick={() => handleSendSticker(stickerUrl)}
                                      className="aspect-square flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-sm rounded-xl p-1 transition-all group cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                    >
                                      <img src={stickerUrl} alt="sticker" className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
                                    </button>
                                  ))}
                                  {stickers.length === 0 && (
                                    <div className="col-span-4 py-8 text-center text-sm text-slate-400">Đang tìm kiếm...</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

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
                </div>
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
        <ImageViewerModal
          previewData={previewImage}
          onClose={() => setPreviewImage(null)}
          onGoToMessage={(messageId) => {
            const el = document.getElementById(`msg-${messageId}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('bg-indigo-100/50', 'transition-colors', 'duration-1000');
              setTimeout(() => el.classList.remove('bg-indigo-100/50'), 2000);
            }
          }}
        />
      )}

      {/* Render User Profile Modal */}
      <UserProfileModal
        isOpen={isUserProfileModalOpen}
        onClose={() => { setIsUserProfileModalOpen(false); setProfileUserId(null); }}
        userId={profileUserId || (activeConversation.type === 'direct' ? activeConversation.id : null)}
      />

      {/* Render Share Message Modal */}
      <ShareMessageModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        messagesToShare={messagesToShare}
        onSuccess={handleCancelSelection}
      />

      {/* Render Message Readers Modal */}
      <MessageReadersModal
        isOpen={!!readersToShow}
        onClose={() => setReadersToShow(null)}
        readers={readersToShow}
      />
    </div>
  );
};

export default ChatWindow;
