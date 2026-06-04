import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useEffect, useState, useMemo, useRef } from 'react';
import groupApi from '../../api/group.api';
import userApi from '../../api/user.api';
import useDebounce from '../../hooks/useDebounce';
import useAuthStore from '../../stores/auth.store';
import useChatStore from '../../stores/chat.store';
import { useUIStore } from '../../stores/ui.store';
import CreateGroupModal from './CreateGroupModal';
import ProfileModal from './ProfileModal';
import useThemeStore from '../../stores/theme.store';
import messageApi from '../../api/message.api';

const formatTime = (dateStr) => {
  try {
    return format(new Date(dateStr), 'HH:mm', { locale: vi });
  } catch {
    return '';
  }
};

const getSubtitle = (lastMessage, prefix) => {
  if (!lastMessage) return 'Nhấn để chat';
  let text = lastMessage.content;
  if (lastMessage.type === 'IMAGE') text = 'Đã gửi một hình ảnh';
  if (lastMessage.type === 'FILE') text = 'Đã gửi một tệp đính kèm';
  if (lastMessage.type === 'AUDIO') text = 'Đã gửi một tin nhắn thoại';
  return prefix ? `${prefix}: ${text}` : text;
};

const ConversationItem = ({ item, isActive, isPinned, onTogglePin, onClearConversation, onClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  return (
    <div className="relative group">
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if(e.key === 'Enter') onClick(); }}
        className={[
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left',
          'transition-all duration-150 border',
          isActive
            ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/40 dark:border-indigo-500/30'
            : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50',
        ].join(' ')}
      >
        {/* Avatar */}
        <div className="relative">
          {item.avatar ? (
            <img src={`${process.env.REACT_APP_SOCKET_URL}${item.avatar}`} alt="Avatar" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {item.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          {item.isOnline !== undefined && (
            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${item.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm truncate ${item.unreadCount > 0 ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-900 dark:text-slate-200'}`}>{item.name}</p>
          <p className={`text-xs truncate ${item.unreadCount > 0 ? 'font-semibold text-slate-800 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>{item.subtitle || 'Nhấn để chat'}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-1">
          {item.time && (
            <div className={`text-[10px] flex items-center gap-1 ${item.unreadCount > 0 ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
              {isPinned && (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
              )}
              {item.time}
            </div>
          )}
          {item.unreadCount > 0 && (
            <div className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center shadow-sm border border-white">
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </div>
          )}
        </div>
        
        {onTogglePin && (
          <div className={`relative flex items-center -mr-1 ${isMenuOpen ? 'opacity-100 z-10' : 'opacity-100 sm:opacity-0 group-hover:opacity-100'} transition-opacity`} ref={menuRef}>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
              className={`p-1 rounded-full shadow-sm transition-colors ${isMenuOpen ? 'bg-slate-200 text-slate-700' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-700 bg-transparent'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-8 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 py-1.5 z-50 overflow-hidden">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onTogglePin();
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center gap-2.5"
                >
                  {isPinned ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium text-amber-600">Bỏ ghim hội thoại</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      <span className="font-medium">Ghim hội thoại</span>
                    </>
                  )}
                </button>
                {onClearConversation && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMenuOpen(false);
                      onClearConversation();
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-2.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span className="font-medium">Xóa lịch sử hội thoại</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Sidebar = ({ onItemClick }) => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const activeConversation = useChatStore((s) => s.activeConversation);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const onlineUsers = useChatStore((s) => s.onlineUsers);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchTab, setSearchTab] = useState('all'); // all, contacts, messages
  const [activeTab, setActiveTab] = useState('direct'); // 'direct' hoặc 'group'
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  // Clear conversation state
  const [clearState, setClearState] = useState(null);
  const clearTimerRef = useRef(null);

  const debouncedSearch = useDebounce(searchQuery, 300);
  const { theme, setTheme } = useThemeStore();

  const userMenuRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Gọi API lấy Groups
  const { data: groupsData, isLoading: isLoadingGroups } = useQuery({
    queryKey: ['my-groups'],
    queryFn: () => groupApi.getMyGroups().then((r) => r.data.data),
  });
  const groups = groupsData || [];

  // Gọi API lấy Recent 1-1 Chats
  const { data: recentChatsData, isLoading: isLoadingChats } = useQuery({
    queryKey: ['recent-chats'],
    queryFn: () => userApi.getRecentChats().then((r) => r.data.data),
  });
  const recentChats = recentChatsData || [];

  const queryClient = useQueryClient();

  // Gọi API lấy Pinned Conversations
  const { data: pinnedConversationsData } = useQuery({
    queryKey: ['pinned-conversations'],
    queryFn: () => userApi.getPinnedConversations().then((r) => r.data.data),
  });
  const pinnedConversations = pinnedConversationsData || [];

  const handleTogglePin = async (type, id) => {
    const isPinned = pinnedConversations.some(p => String(p.type).toUpperCase() === String(type).toUpperCase() && Number(p.entityId) === Number(id));
    try {
      if (isPinned) {
        await userApi.unpinConversation(type.toUpperCase(), id);
      } else {
        await userApi.pinConversation(type.toUpperCase(), id);
      }
      queryClient.invalidateQueries(['pinned-conversations']);
    } catch (err) {
      useUIStore.getState().showAlert(err.response?.data?.message || 'Có lỗi xảy ra', 'error');
    }
  };

  const sortedChats = useMemo(() => {
    const pinned = [];
    const normal = [];
    recentChats.forEach(chat => {
      if (clearState && clearState.type === 'direct' && clearState.id === chat.id) return;
      const isPinned = pinnedConversations.some(p => String(p.type).toUpperCase() === 'DIRECT' && Number(p.entityId) === Number(chat.id));
      if (isPinned) pinned.push({ ...chat, isPinned });
      else normal.push(chat);
    });
    return [...pinned, ...normal];
  }, [recentChats, pinnedConversations, clearState]);

  const sortedGroups = useMemo(() => {
    const pinned = [];
    const normal = [];
    groups.forEach(group => {
      if (clearState && clearState.type === 'group' && clearState.id === group.id) return;
      const isPinned = pinnedConversations.some(p => String(p.type).toUpperCase() === 'GROUP' && Number(p.entityId) === Number(group.id));
      if (isPinned) pinned.push({ ...group, isPinned });
      else normal.push(group);
    });
    return [...pinned, ...normal];
  }, [groups, pinnedConversations, clearState]);

  const handleClearConversation = (type, id) => {
    setClearState({ type, id, countdown: 5 });
    if (clearTimerRef.current) clearInterval(clearTimerRef.current);
    
    let countdown = 5;
    clearTimerRef.current = setInterval(() => {
      countdown -= 1;
      
      if (countdown <= 0) {
        clearInterval(clearTimerRef.current);
        
        // Thực hiện xóa thực sự trên Backend
        const payload = type === 'group' ? { groupId: id } : { partnerId: id };
        messageApi.clearConversation(payload)
          .then(() => {
            useUIStore.getState().showToast('Đã xóa lịch sử hội thoại', 'success');
            
            // Yêu cầu React Query tải lại danh sách chat mới nhất từ Server
            queryClient.invalidateQueries({ queryKey: ['recent-chats'] });
            queryClient.invalidateQueries({ queryKey: ['my-groups'] });

            // Clear current active if match
            const currentActive = useChatStore.getState().activeConversation;
            if (currentActive && currentActive.type === type && currentActive.id === id) {
              useChatStore.getState().initMessages(type, id, []);
            }
          })
          .catch(err => {
            console.error(err);
            useUIStore.getState().showAlert('Có lỗi khi xóa lịch sử', 'error');
          })
          .finally(() => {
            setClearState(null);
          });
      } else {
        setClearState({ type, id, countdown });
      }
    }, 1000);
  };

  const handleUndoClear = () => {
    if (clearTimerRef.current) clearInterval(clearTimerRef.current);
    setClearState(null);
  };

  useEffect(() => {
    // Ép buộc React Query phải gọi lại API ngay cả khi trình duyệt không được focus
    const handleChatUpdate = () => queryClient.refetchQueries({ queryKey: ['recent-chats'] });
    const handleGroupUpdate = () => queryClient.refetchQueries({ queryKey: ['my-groups'] });

    window.addEventListener('chat_updated', handleChatUpdate);
    window.addEventListener('group_updated', handleGroupUpdate);

    return () => {
      window.removeEventListener('chat_updated', handleChatUpdate);
      window.removeEventListener('group_updated', handleGroupUpdate);
    };
  }, [queryClient]);

  // Tự động chọn cuộc hội thoại đầu tiên nếu chưa chọn
  useEffect(() => {
    if (!activeConversation) {
      if (activeTab === 'direct' && recentChats.length > 0) {
        setActiveConversation({ type: 'direct', id: recentChats[0].id, name: recentChats[0].fullName, avatar: recentChats[0].avatar });
      } else if (activeTab === 'group' && groups.length > 0) {
        setActiveConversation({ 
          type: 'group', 
          id: groups[0].id, 
          name: groups[0].name, 
          avatar: groups[0].avatar, 
          role: groups[0].role,
          isReadOnly: groups[0].isReadOnly,
          memberCount: groups[0].memberCount
        });
      }
    } else {
      // Nếu nhóm đang mở không còn trong danh sách (bị đuổi, giải tán, tự rời) thì clear nó
      if (activeConversation.type === 'group' && !isLoadingGroups) {
        const stillExists = groups.some(g => g.id === activeConversation.id);
        if (!stillExists) {
          setActiveConversation(null);
        }
      }
    }
  }, [activeConversation, activeTab, recentChats, groups, isLoadingGroups, setActiveConversation]);

  // Gọi API Tìm kiếm người dùng
  const { data: searchContactsData, isFetching: isSearchingContacts } = useQuery({
    queryKey: ['search-users', debouncedSearch],
    queryFn: () => userApi.searchUsers(debouncedSearch).then((r) => r.data.data),
    enabled: debouncedSearch.trim().length > 0 && (searchTab === 'all' || searchTab === 'contacts'),
  });
  const searchContacts = searchContactsData || [];

  // Gọi API Tìm kiếm tin nhắn
  const { data: searchMessagesData, isFetching: isSearchingMessages } = useQuery({
    queryKey: ['search-messages-global', debouncedSearch],
    queryFn: () => messageApi.searchMessages({ keyword: debouncedSearch }).then((r) => r.data.data),
    enabled: debouncedSearch.trim().length > 0 && (searchTab === 'all' || searchTab === 'messages'),
  });
  const searchMessageResults = searchMessagesData || [];

  const isSearching = isSearchingContacts || isSearchingMessages;

  const handleSelectConversation = (type, id, name, avatar = null, role = null, isReadOnly = false, memberCount = 0) => {
    setActiveConversation({ type, id, name, avatar, role, isReadOnly, memberCount });
    setSearchQuery(''); // Xóa text tìm kiếm
    onItemClick?.();
  };

  return (
    <div className="w-[18rem] sm:w-72 h-full flex flex-col border-r border-slate-200/70 dark:border-slate-700/70 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-200/70 dark:border-slate-700/70">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <img src="https://dvntechnology.com/assets/logo.png" alt="DVN" className="h-6 w-auto object-contain" />
            <span className="font-bold text-slate-900 dark:text-white text-lg">Trò Chuyện</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={logout}
              title="Đăng xuất"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-800 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        <div className="relative" ref={userMenuRef}>
          <div 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-3 p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition group"
          >
            <div className="relative">
              {user?.avatar ? (
                <img src={`${process.env.REACT_APP_SOCKET_URL}${user.avatar}`} alt="Avatar" className="w-10 h-10 rounded-full object-cover shadow-sm group-hover:opacity-90" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white font-bold shadow-sm group-hover:opacity-90">
                  {user?.fullName?.charAt(0)?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{user?.fullName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Đang hoạt động</span>
              </div>
            </div>
          </div>

          {isUserMenuOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 py-2 z-50 overflow-hidden">
              <button
                onClick={() => { setIsUserMenuOpen(false); setIsProfileModalOpen(true); }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Hồ sơ cá nhân
              </button>
              
              <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>
              
              <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Giao diện
              </div>
              <button
                onClick={() => setTheme('light')}
                className={`w-full text-left px-4 py-2 text-sm transition flex items-center gap-3 ${theme === 'light' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Sáng
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`w-full text-left px-4 py-2 text-sm transition flex items-center gap-3 ${theme === 'dark' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                Tối
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`w-full text-left px-4 py-2 text-sm transition flex items-center gap-3 ${theme === 'system' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Theo hệ thống
              </button>
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="relative mt-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm người dùng..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white dark:focus:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 transition-all"
          />
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Danh sách Chat */}
      <div className="flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">
        {searchQuery.trim().length > 0 ? (
          // Hiển thị kết quả tìm kiếm với Tabs
          <div className="flex flex-col h-full">
            <div className="flex bg-slate-100 dark:bg-slate-800/80 rounded-lg p-1 mb-3 flex-shrink-0">
              <button
                onClick={() => setSearchTab('all')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  searchTab === 'all' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setSearchTab('contacts')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  searchTab === 'contacts' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Liên hệ
              </button>
              <button
                onClick={() => setSearchTab('messages')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  searchTab === 'messages' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Tin nhắn
              </button>
            </div>

            {isSearching ? (
              <div className="text-center py-4 text-sm text-slate-500">Đang tìm...</div>
            ) : (
              <div className="space-y-4 pb-4">
                {/* Liên Hệ */}
                {(searchTab === 'all' || searchTab === 'contacts') && (
                  <div>
                    {(searchTab === 'all' && searchContacts.length > 0) && (
                      <div className="flex items-center justify-between px-1 mb-2 mt-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Người liên hệ</span>
                        {searchContacts.length > 3 && (
                          <button onClick={() => setSearchTab('contacts')} className="text-xs text-indigo-500 hover:underline">Xem thêm</button>
                        )}
                      </div>
                    )}
                    {searchTab === 'contacts' && searchContacts.length === 0 && (
                      <div className="text-center py-4 text-sm text-slate-500">Không tìm thấy liên hệ</div>
                    )}
                    <div className="space-y-1">
                      {(searchTab === 'all' ? searchContacts.slice(0, 3) : searchContacts).map((u) => (
                        <ConversationItem
                          key={`search_user_${u.id}`}
                          item={{
                              id: u.id,
                              name: u.fullName,
                              subtitle: u.username,
                              avatar: u.avatar,
                              isOnline: onlineUsers[u.id]
                          }}
                          isActive={false}
                          onClick={() => handleSelectConversation('direct', u.id, u.fullName, u.avatar)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Tin Nhắn */}
                {(searchTab === 'all' || searchTab === 'messages') && (
                  <div>
                    {(searchTab === 'all' && searchMessageResults.length > 0) && (
                      <div className="flex items-center justify-between px-1 mb-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tin nhắn</span>
                        {searchMessageResults.length > 3 && (
                          <button onClick={() => setSearchTab('messages')} className="text-xs text-indigo-500 hover:underline">Xem thêm</button>
                        )}
                      </div>
                    )}
                    {searchTab === 'messages' && searchMessageResults.length === 0 && (
                      <div className="text-center py-4 text-sm text-slate-500">Không tìm thấy tin nhắn</div>
                    )}
                    <div className="space-y-2 px-1">
                      {(searchTab === 'all' ? searchMessageResults.slice(0, 3) : searchMessageResults).map((msg) => {
                        const isGroup = msg.groupId != null;
                        const partnerName = isGroup ? msg.group?.name : (msg.senderId === user?.id ? msg.receiver?.fullName : msg.sender?.fullName);
                        const partnerAvatar = isGroup ? msg.group?.avatar : (msg.senderId === user?.id ? msg.receiver?.avatar : msg.sender?.avatar);
                        
                        return (
                          <div 
                            key={`search_msg_${msg.id}`} 
                            className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition" 
                            onClick={() => {
                              handleSelectConversation(isGroup ? 'group' : 'direct', isGroup ? msg.groupId : (msg.senderId === user?.id ? msg.receiver?.id : msg.sender?.id), partnerName, partnerAvatar);
                              // Timeout needed because ChatWindow might not be rendered yet with the new conversation
                              setTimeout(() => {
                                const el = document.getElementById(`msg-${msg.id}`);
                                if (el) {
                                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  el.classList.add('bg-indigo-100', 'dark:bg-indigo-900', 'transition-colors', 'duration-1000');
                                  setTimeout(() => el.classList.remove('bg-indigo-100', 'dark:bg-indigo-900'), 1500);
                                }
                              }, 1000);
                            }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                                  {partnerAvatar ? <img src={`${process.env.REACT_APP_SOCKET_URL}${partnerAvatar}`} alt="" /> : partnerName?.charAt(0)}
                                </div>
                                <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate max-w-[120px]">{partnerName}</span>
                              </div>
                              <span className="text-[10px] text-slate-400">{formatTime(msg.createdAt)}</span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
                              <span className="font-medium text-slate-700 dark:text-slate-300">{msg.sender?.fullName}: </span>
                              {msg.type === 'TEXT' ? msg.content : (msg.type === 'IMAGE' ? '[Hình ảnh]' : '[Tập tin]')}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {searchTab === 'all' && searchContacts.length === 0 && searchMessageResults.length === 0 && (
                   <div className="text-center py-4 text-sm text-slate-500">Không tìm thấy kết quả phù hợp</div>
                )}
              </div>
            )}
          </div>
        ) : (
          // Hiển thị mặc định (Tabs)
          <div className="flex flex-col h-full">
            {/* Tabs Selector */}
            <div className="flex bg-slate-100 dark:bg-slate-800/80 rounded-lg p-1 mb-4 flex-shrink-0">
              <button
                onClick={() => setActiveTab('direct')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'direct' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Trực tiếp
              </button>
              <button
                onClick={() => setActiveTab('group')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'group' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Nhóm
              </button>
            </div>

            {/* Nội dung Tab */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'direct' && (
                <div>
                  {isLoadingChats ? (
                    <div className="text-center py-4 text-sm text-slate-500">Đang tải...</div>
                  ) : recentChats.length === 0 ? (
                    <div className="text-center py-4 text-sm text-slate-500 italic">Chưa có tin nhắn</div>
                  ) : (
                    <div className="space-y-1">
                      {sortedChats.map((chat) => {
                        const prefix = chat.lastMessage?.isMine ? 'Bạn' : chat.fullName.split(' ').pop();
                        return (
                          <ConversationItem
                            key={`chat_${chat.id}`}
                            item={{
                              id: chat.id,
                              name: chat.fullName,
                              subtitle: getSubtitle(chat.lastMessage, prefix),
                              avatar: chat.avatar,
                              isOnline: onlineUsers[chat.id],
                              time: chat.lastMessage?.createdAt ? formatTime(chat.lastMessage.createdAt) : null,
                              unreadCount: chat.unreadCount || 0,
                            }}
                            isActive={activeConversation?.type === 'direct' && activeConversation?.id === chat.id}
                            isPinned={chat.isPinned}
                            onTogglePin={() => handleTogglePin('direct', chat.id)}
                            onClearConversation={() => handleClearConversation('direct', chat.id)}
                            onClick={() => handleSelectConversation('direct', chat.id, chat.fullName, chat.avatar)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'group' && (
                <div className="flex flex-col h-full">
                  <div className="mb-3 px-1">
                    <button
                      onClick={() => setIsCreateGroupModalOpen(true)}
                      className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 border border-indigo-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Tạo nhóm mới
                    </button>
                  </div>
                  {isLoadingGroups ? (
                    <div className="text-center py-4 text-sm text-slate-500">Đang tải...</div>
                  ) : groups.length === 0 ? (
                    <div className="text-center py-4 text-sm text-slate-500 italic">Chưa tham gia nhóm nào</div>
                  ) : (
                    <div className="space-y-1">
                      {sortedGroups.map((group) => {
                        const prefix = group.lastMessage?.senderName ? group.lastMessage.senderName.split(' ').pop() : '';
                        return (
                          <ConversationItem
                            key={`group_${group.id}`}
                            item={{
                              id: group.id,
                              name: group.name,
                              subtitle: getSubtitle(group.lastMessage, prefix),
                              avatar: group.avatar,
                              time: group.lastMessage?.createdAt ? formatTime(group.lastMessage.createdAt) : null,
                              unreadCount: group.unreadCount || 0,
                            }}
                            isActive={activeConversation?.type === 'group' && activeConversation?.id === group.id}
                            isPinned={group.isPinned}
                            onTogglePin={() => handleTogglePin('group', group.id)}
                            onClearConversation={() => handleClearConversation('group', group.id)}
                            onClick={() => handleSelectConversation('group', group.id, group.name, group.avatar, group.role, group.isReadOnly, group.memberCount)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer nhỏ */}
      <div className="px-4 py-3 border-t border-slate-200/70 dark:border-slate-700/70 text-[11px] text-slate-400">
        © {new Date().getFullYear()} DVN Chat
      </div>

      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['my-groups'] })}
      />

      <ProfileModal 
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Undo Clear Conversation Banner */}
      {clearState && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[100] animate-fade-in-up w-11/12 max-w-sm">
          <div className="bg-slate-800 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between gap-3 border border-slate-700">
            <span className="text-[13px]">
              Đang xóa hội thoại sau <span className="font-bold text-red-400">{clearState.countdown}s</span>...
            </span>
            <button onClick={handleUndoClear} className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition uppercase tracking-wider bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20">
              Hoàn tác
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
