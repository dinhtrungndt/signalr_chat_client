import React, { useEffect, useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import groupApi from '../../api/group.api';
import messageApi from '../../api/message.api';
import userApi from '../../api/user.api';
import useAuthStore from '../../stores/auth.store';
import { useUIStore } from '../../stores/ui.store';
import useChatStore from '../../stores/chat.store';
import noteApi from '../../api/note.api';
import reminderApi from '../../api/reminder.api';
import pollApi from '../../api/poll.api';
import GroupMembersModal from './GroupMembersModal';
import ImageViewerModal from './ImageViewerModal';
import CreateGroupModal from './CreateGroupModal';
import GroupSettingsModal from './GroupSettingsModal';
import CreateNoteModal from './CreateNoteModal';
import CreateReminderModal from './CreateReminderModal';
import CreatePollModal from './CreatePollModal';

const EMPTY_ARRAY = [];

// Component nút bấm tròn (ActionBtn)
const ActionBtn = ({ icon, label, onClick, isActive, activeIcon }) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 group w-18"
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
        isActive 
          ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
      }`}>
        {isActive && activeIcon ? activeIcon : icon}
      </div>
      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 text-center leading-tight">
        {label}
      </span>
    </button>
  );
};

const RightSidebar = ({ onClose, onImageClick }) => {
  const activeConversation = useChatStore((s) => s.activeConversation);
  const currentUser = useAuthStore((s) => s.user);

  const activeTab = useUIStore((s) => s.rightSidebarTab);
  const setActiveTab = useUIStore((s) => s.setRightSidebarTab);
  const [media, setMedia] = useState([]);
  const [files, setFiles] = useState([]);

  const conversationKey = activeConversation ? `${activeConversation.type}_${activeConversation.id}` : null;
  const messages = useChatStore((s) => s.messages[conversationKey] || EMPTY_ARRAY);

  // Search
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Accordion state cho Tab Info
  const [isMediaOpen, setIsMediaOpen] = useState(true);
  const [isFileOpen, setIsFileOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isPollsOpen, setIsPollsOpen] = useState(false);
  const [isSettingOpen, setIsSettingOpen] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  
  const [isCreateNoteModalOpen, setIsCreateNoteModalOpen] = useState(false);
  const [isCreateReminderModalOpen, setIsCreateReminderModalOpen] = useState(false);
  const [isCreatePollModalOpen, setIsCreatePollModalOpen] = useState(false);

  // Edit group state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const avatarInputRef = useRef(null);

  const queryClient = useQueryClient();

  // Gọi API lấy Pinned Conversations
  const { data: pinnedConversationsData } = useQuery({
    queryKey: ['pinned-conversations'],
    queryFn: () => userApi.getPinnedConversations().then((r) => r.data.data),
  });
  const pinnedConversations = pinnedConversationsData || [];

  // Gọi API lấy Muted Conversations
  const { data: mutedConversationsData } = useQuery({
    queryKey: ['muted-conversations'],
    queryFn: () => userApi.getMutedConversations().then((r) => r.data.data),
  });
  const mutedConversations = mutedConversationsData || [];

  const { data: notesData } = useQuery({
    queryKey: ['notes', activeConversation?.id],
    queryFn: () => noteApi.getNotes(activeConversation?.type === 'group' ? { groupId: activeConversation.id } : { partnerId: activeConversation.id }).then(r => r.data.data),
    enabled: !!activeConversation
  });
  const notesList = notesData || [];

  const { data: remindersData } = useQuery({
    queryKey: ['reminders', activeConversation?.id],
    queryFn: () => reminderApi.getReminders(activeConversation?.type === 'group' ? { groupId: activeConversation.id } : { partnerId: activeConversation.id }).then(r => r.data.data),
    enabled: !!activeConversation
  });
  const remindersList = remindersData || [];

  const { data: pollsData } = useQuery({
    queryKey: ['polls', activeConversation?.id],
    queryFn: () => pollApi.getPolls(activeConversation.id).then(r => r.data.data),
    enabled: activeConversation?.type === 'group'
  });
  const pollsList = pollsData || [];

  const isPinned = activeConversation ? pinnedConversations.some(p => String(p.type).toUpperCase() === String(activeConversation.type).toUpperCase() && Number(p.entityId) === Number(activeConversation.id)) : false;
  const isMuted = activeConversation ? mutedConversations.some(m => String(m.type).toUpperCase() === String(activeConversation.type).toUpperCase() && Number(m.entityId) === Number(activeConversation.id)) : false;

  const isAdmin = activeConversation?.type === 'group' && (activeConversation.role === 'ADMIN' || activeConversation.role === 'DEPUTY');
  const canEditGroupInfo = activeConversation?.type === 'group' && (isAdmin || activeConversation.canChangeGroupInfo);

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

  const handleTogglePin = async () => {
    if (!activeConversation) return;
    try {
      if (isPinned) {
        await userApi.unpinConversation(activeConversation.type.toUpperCase(), activeConversation.id);
      } else {
        await userApi.pinConversation(activeConversation.type.toUpperCase(), activeConversation.id);
      }
      queryClient.invalidateQueries(['pinned-conversations']);
    } catch (error) {
      const msg = error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật ghim';
      useUIStore.getState().showToast(msg, 'error');
    }
  };

  const handleToggleMute = async () => {
    if (!activeConversation) return;
    try {
      if (isMuted) {
        await userApi.unmuteConversation(activeConversation.type.toUpperCase(), activeConversation.id);
      } else {
        await userApi.muteConversation(activeConversation.type.toUpperCase(), activeConversation.id);
      }
      queryClient.invalidateQueries(['muted-conversations']);
    } catch (error) {
      const msg = error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật thông báo';
      useUIStore.getState().showToast(msg, 'error');
    }
  };

  useEffect(() => {
    if (!activeConversation) return;

    // Fetch Images
    const fetchMedia = async () => {
      try {
        const params = { type: 'IMAGE' };
        if (activeConversation.type === 'group') params.groupId = activeConversation.id;
        else params.partnerId = activeConversation.id;
        const res = await messageApi.getMedia(params);

        // Tách gộp mảng ảnh (vì có thể 1 tin nhắn có nhiều ảnh dạng url1|url2)

        let extractedUrls = [];
        res.data.data.forEach(msg => {
          if (msg.content) {
            const urls = msg.content.split('|');
            urls.forEach(url => {
              extractedUrls.push({ url, id: msg.id, message: msg });
            });
          }
        });
        setMedia(extractedUrls);
      } catch (error) {
        console.error(error);
      }
    };

    // Fetch Files
    const fetchFiles = async () => {
      try {
        const params = { type: 'FILE' };
        if (activeConversation.type === 'group') params.groupId = activeConversation.id;
        else params.partnerId = activeConversation.id;
        const res = await messageApi.getMedia(params);
        setFiles(res.data.data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchMedia();
    fetchFiles();
  }, [activeConversation]);

  // Handle Search
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!searchKeyword.trim()) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const params = { keyword: searchKeyword };
        if (activeConversation.type === 'group') params.groupId = activeConversation.id;
        else params.partnerId = activeConversation.id;
        const res = await messageApi.searchMessages(params);
        setSearchResults(res.data.data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsSearching(false);
      }
    }, 500); // debounce 500ms

    return () => clearTimeout(handler);
  }, [searchKeyword, activeConversation]);

  const handleDisbandGroup = async () => {
    if (await useUIStore.getState().confirm('CẢNH BÁO', 'Bạn có chắc chắn muốn giải tán nhóm này không? Mọi dữ liệu sẽ bị xóa!', 'Xóa nhóm')) {
      try {
        await groupApi.deleteGroup(activeConversation.id);
        useChatStore.getState().setActiveConversation(null);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleLeaveGroup = async () => {
    if (await useUIStore.getState().confirm('Rời nhóm', 'Bạn có chắc chắn muốn rời nhóm này không?', 'Rời khỏi')) {
      try {
        await groupApi.removeUser(activeConversation.id, currentUser.id);
        useChatStore.getState().setActiveConversation(null);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleToggleReadOnly = async () => {
    try {
      await groupApi.toggleReadOnly(activeConversation.id, !activeConversation.isReadOnly);
      useChatStore.getState().setActiveConversation({
        ...activeConversation,
        isReadOnly: !activeConversation.isReadOnly
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (!activeConversation) return null;

  return (
    <div className="flex flex-col w-full h-full bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0">
        <h2 className="text-base font-semibold text-slate-800 dark:text-white">Thông tin hội thoại</h2>
        <div className="flex items-center gap-1">
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Avatar & Name */}
        <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
          
          {/* AVATAR WITH UPLOAD */}
          <div className="relative group/avatar cursor-pointer" onClick={() => canEditGroupInfo && avatarInputRef.current?.click()}>
            {activeConversation.avatar ? (
              <img src={`${process.env.REACT_APP_SOCKET_URL}${activeConversation.avatar}`} alt="Avatar" className="w-20 h-20 rounded-full object-cover shadow-md mb-3" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white text-3xl font-bold shadow-md mb-3">
                {activeConversation.name?.charAt(0).toUpperCase()}
              </div>
            )}
            
            {canEditGroupInfo && (
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
            )}
            <input type="file" ref={avatarInputRef} hidden accept="image/*" onChange={handleAvatarChange} />
          </div>

          {/* NAME WITH EDITING */}
          <div className="flex items-center gap-2 group/name mt-2">
            {isEditingName ? (
              <input 
                type="text" 
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                autoFocus
                className="text-lg font-bold text-slate-800 dark:text-white bg-transparent border-b-2 border-indigo-500 outline-none px-1 text-center w-full min-w-[150px]"
              />
            ) : (
              <h3 
                className={`text-lg font-bold text-slate-800 dark:text-white ${canEditGroupInfo ? 'cursor-pointer hover:underline' : ''}`}
                onClick={() => {
                  if (canEditGroupInfo) {
                    setEditName(activeConversation.name);
                    setIsEditingName(true);
                  }
                }}
              >
                {activeConversation.name}
              </h3>
            )}
            
            {canEditGroupInfo && !isEditingName && (
              <button 
                onClick={() => {
                  setEditName(activeConversation.name);
                  setIsEditingName(true);
                }}
                className="opacity-0 group-hover/name:opacity-100 text-slate-400 hover:text-indigo-500 transition-opacity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
            )}
          </div>

          <div className="flex items-start justify-center gap-2 sm:gap-4 mt-6">
            {activeConversation.type === 'direct' ? (
              <>
                <ActionBtn 
                  icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
                  activeIcon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h3.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>}
                  label={isMuted ? "Bật thông báo" : "Tắt thông báo"} 
                  isActive={isMuted}
                  onClick={handleToggleMute} 
                />
                <ActionBtn 
                  icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>}
                  activeIcon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" /></svg>}
                  label={isPinned ? "Bỏ ghim hội thoại" : "Ghim hội thoại"} 
                  isActive={isPinned}
                  onClick={handleTogglePin} 
                />
                <ActionBtn 
                  icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>}
                  label="Tạo nhóm trò chuyện" 
                  onClick={() => setIsCreateGroupModalOpen(true)} 
                />
              </>
            ) : (
              <>
                <ActionBtn 
                  icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
                  activeIcon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h3.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>}
                  label={isMuted ? "Bật thông báo" : "Tắt thông báo"} 
                  isActive={isMuted}
                  onClick={handleToggleMute} 
                />
                <ActionBtn 
                  icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>}
                  activeIcon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" /></svg>}
                  label={isPinned ? "Bỏ ghim hội thoại" : "Ghim hội thoại"} 
                  isActive={isPinned}
                  onClick={handleTogglePin} 
                />
                <ActionBtn 
                  icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>}
                  label="Thêm thành viên" 
                  onClick={() => setIsMembersModalOpen(true)} 
                />
                <ActionBtn 
                  icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                  label="Quản lý nhóm" 
                  onClick={() => setIsSettingsModalOpen(true)} 
                />
              </>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button 
            className={`flex-1 py-3 text-[13px] font-semibold transition-colors relative ${activeTab === 'info' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
            onClick={() => setActiveTab('info')}
          >
            Thông tin
            {activeTab === 'info' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400"></div>}
          </button>
          <button 
            className={`flex-1 py-3 text-[13px] font-semibold transition-colors relative ${activeTab === 'search' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
            onClick={() => setActiveTab('search')}
          >
            Tìm kiếm
            {activeTab === 'search' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400"></div>}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'info' ? (
          <div className="flex flex-col pb-6">
            
            {/* Ảnh / Video Accordion */}
            <div className="border-b border-slate-200 dark:border-slate-700">
              <button 
                onClick={() => setIsMediaOpen(!isMediaOpen)}
                className="w-full flex items-center justify-between px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-white text-[15px]">Ảnh/Video ({media.length})</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 text-slate-400 transition-transform ${isMediaOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              
              {isMediaOpen && (
                <div className="px-4 pb-4">
                  {media.length > 0 ? (
                    <div className="grid grid-cols-3 gap-1">
                      {media.map((item, idx) => (
                        <div key={idx} className="aspect-square bg-slate-100 dark:bg-slate-800 rounded overflow-hidden cursor-pointer group/img relative" onClick={() => setLightboxUrl(`${process.env.REACT_APP_SOCKET_URL}${item.url}`)}>
                          <img src={`${process.env.REACT_APP_SOCKET_URL}${item.url}`} alt="Media" className="w-full h-full object-cover transition-transform group-hover/img:scale-110" />
                          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-500 text-[13px]">
                      Chưa có ảnh/video nào được chia sẻ
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tài liệu Accordion */}
            <div className="border-b border-slate-200 dark:border-slate-700">
              <button 
                onClick={() => setIsFileOpen(!isFileOpen)}
                className="w-full flex items-center justify-between px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-white text-[15px]">Tài liệu ({files.length})</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 text-slate-400 transition-transform ${isFileOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              
              {isFileOpen && (
                <div className="px-4 pb-4">
                  {files.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {files.map((file, idx) => {
                        const fileName = file.content.split('/').pop();
                        return (
                          <div key={idx} className="flex items-center gap-3 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => window.open(`${process.env.REACT_APP_SOCKET_URL}${file.content}`, '_blank')}>
                            <div className="w-10 h-10 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium text-slate-800 dark:text-white truncate">{fileName}</p>
                              <p className="text-[11px] text-slate-500 truncate">Gửi bởi {file.sender?.fullName}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-500 text-[13px]">
                      Chưa có tài liệu nào được chia sẻ
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Ghi chú & Nhắc hẹn Accordion */}
            <div className="border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <button onClick={() => setIsNotesOpen(!isNotesOpen)} className="flex items-center gap-3 flex-1 text-left">
                  <div className="w-8 h-8 rounded bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-white text-[15px]">Ghi chú, nhắc hẹn</span>
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsCreateNoteModalOpen(true)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition" title="Tạo ghi chú">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </button>
                  <button onClick={() => setIsCreateReminderModalOpen(true)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition" title="Tạo nhắc hẹn">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </button>
                  <svg onClick={() => setIsNotesOpen(!isNotesOpen)} xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 text-slate-400 cursor-pointer transition-transform ${isNotesOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
              
              {isNotesOpen && (
                <div className="px-4 pb-4">
                  {(notesList.length > 0 || remindersList.length > 0) ? (
                    <div className="flex flex-col gap-3">
                      {remindersList.map((reminder) => (
                        <div key={`r-${reminder.id}`} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                          <div className={`absolute top-0 left-0 w-1 h-full ${reminder.isDone ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <div className="pl-2">
                            <p className="text-[13px] font-semibold text-slate-800 dark:text-white mb-1">{reminder.content}</p>
                            <p className="text-[11px] text-slate-500">Tạo bởi: {reminder.creator?.fullName}</p>
                            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              {new Date(reminder.dueDate).toLocaleString()}
                            </p>
                            {!reminder.isDone && (
                              <button 
                                onClick={() => reminderApi.updateStatus(reminder.id, true).then(() => queryClient.invalidateQueries(['reminders']))}
                                className="mt-2 text-[11px] bg-green-100 text-green-700 px-2 py-1 rounded font-medium hover:bg-green-200"
                              >
                                Đánh dấu hoàn thành
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {notesList.map((note) => (
                        <div key={`n-${note.id}`} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-100 dark:border-yellow-900/30">
                          <p className="text-[13px] text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{note.content}</p>
                          <p className="text-[11px] text-slate-500 mt-2">Tạo bởi: {note.creator?.fullName}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-slate-500 text-[13px]">
                      Chưa có ghi chú, nhắc hẹn nào
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bình chọn Accordion (Chỉ hiện trong nhóm) */}
            {activeConversation.type === 'group' && (
              <div className="border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <button onClick={() => setIsPollsOpen(!isPollsOpen)} className="flex items-center gap-3 flex-1 text-left">
                    <div className="w-8 h-8 rounded bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-white text-[15px]">Bình chọn</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsCreatePollModalOpen(true)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition" title="Tạo bình chọn">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </button>
                    <svg onClick={() => setIsPollsOpen(!isPollsOpen)} xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 text-slate-400 cursor-pointer transition-transform ${isPollsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
                
                {isPollsOpen && (
                  <div className="px-4 pb-4">
                    {pollsList.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {pollsList.map((poll) => (
                          <div key={poll.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h4 className="text-[14px] font-bold text-slate-800 dark:text-white mb-3">{poll.question}</h4>
                            <div className="space-y-2">
                              {poll.options.map(opt => {
                                const totalVotes = poll.options.reduce((sum, o) => sum + o.votes.length, 0);
                                const percentage = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                                const isVotedByMe = opt.votes.some(v => v.userId === currentUser?.id);
                                
                                return (
                                  <div key={opt.id} 
                                    className="relative flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 cursor-pointer overflow-hidden group"
                                    onClick={() => {
                                      if (poll.isClosed) return;
                                      // Toggle vote logic
                                      const currentVotedIds = poll.options.filter(o => o.votes.some(v => v.userId === currentUser?.id)).map(o => o.id);
                                      let newVotes = [...currentVotedIds];
                                      if (isVotedByMe) {
                                        newVotes = newVotes.filter(id => id !== opt.id);
                                      } else {
                                        if (!poll.allowMultiple) newVotes = [opt.id];
                                        else newVotes.push(opt.id);
                                      }
                                      pollApi.votePoll(poll.id, newVotes).then(() => queryClient.invalidateQueries(['polls']));
                                    }}
                                  >
                                    <div className="absolute top-0 left-0 h-full bg-indigo-100 dark:bg-indigo-900/30 transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                                    <div className="relative z-10 flex items-center gap-2">
                                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isVotedByMe ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                        {isVotedByMe && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                                      </div>
                                      <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{opt.content}</span>
                                    </div>
                                    <div className="relative z-10 text-[12px] text-slate-500">
                                      {opt.votes.length} ({percentage}%)
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-3 text-right">Tạo bởi: {poll.creator?.fullName}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-slate-500 text-[13px]">
                        Chưa có bình chọn nào
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Thiết lập khác */}
            <div>
              <button 
                onClick={() => setIsSettingOpen(!isSettingOpen)}
                className="w-full flex items-center justify-between px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-white text-[15px]">Thiết lập khác</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 text-slate-400 transition-transform ${isSettingOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              
              {isSettingOpen && (
                <div className="px-2 pb-4 space-y-1">
                  {activeConversation.type === 'group' && (
                    <>
                      {isAdmin && (
                        <>
                          <button 
                            onClick={handleToggleReadOnly}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-left"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            <span className="text-[14px] text-slate-700 dark:text-slate-300 flex-1">
                              {activeConversation.isReadOnly ? 'Cho phép thành viên gửi tin nhắn' : 'Chỉ trưởng nhóm được gửi tin nhắn'}
                            </span>
                          </button>
                        </>
                      )}
                      
                      <button 
                        onClick={handleLeaveGroup}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-left group/btn"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        <span className="text-[14px] text-red-600 dark:text-red-400 flex-1 font-medium">Rời nhóm</span>
                      </button>

                      {isAdmin && (
                        <button 
                          onClick={handleDisbandGroup}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-left group/btn"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          <span className="text-[14px] text-red-600 dark:text-red-400 flex-1 font-medium">Giải tán nhóm</span>
                        </button>
                      )}
                    </>
                  )}

                  {activeConversation.type === 'direct' && (
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-left group/btn">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      <span className="text-[14px] text-red-600 dark:text-red-400 flex-1 font-medium">Xóa lịch sử trò chuyện</span>
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Search Input */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <input
                  type="text"
                  placeholder="Nhập từ khóa tìm kiếm..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-full pl-10 pr-4 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {isSearching ? (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent"></div>
                </div>
              ) : searchKeyword.trim() ? (
                searchResults.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {searchResults.map((msg) => (
                      <div 
                        key={msg.id} 
                        className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800"
                        onClick={() => {
                          const el = document.getElementById(`msg-${msg.id}`);
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            el.classList.add('bg-amber-100', 'dark:bg-amber-900/30', 'transition-colors', 'duration-1000');
                            setTimeout(() => el.classList.remove('bg-amber-100', 'dark:bg-amber-900/30'), 1500);
                          } else {
                            useUIStore.getState().showToast('Tin nhắn quá cũ, vui lòng kéo lên tải thêm tin nhắn trước!', 'warning');
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-[13px] text-slate-800 dark:text-white">{msg.sender?.fullName}</span>
                          <span className="text-[11px] text-slate-500">
                            {new Date(msg.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <p className="text-[13px] text-slate-600 dark:text-slate-300 line-clamp-2">
                          {msg.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <p className="text-slate-500 text-[14px]">Không tìm thấy tin nhắn nào</p>
                  </div>
                )
              ) : (
                <div className="text-center py-10">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-slate-500 text-[14px]">Nhập từ khóa để tìm kiếm tin nhắn trong hội thoại</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <GroupMembersModal 
        isOpen={isMembersModalOpen} 
        onClose={() => setIsMembersModalOpen(false)} 
        groupId={activeConversation.id}
        isAdmin={isAdmin}
      />
      <GroupSettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
        groupId={activeConversation.id}
        isReadOnly={activeConversation.isReadOnly}
        isAdmin={isAdmin}
      />
      <CreateGroupModal 
        isOpen={isCreateGroupModalOpen} 
        onClose={() => setIsCreateGroupModalOpen(false)} 
      />
      <CreateNoteModal isOpen={isCreateNoteModalOpen} onClose={() => setIsCreateNoteModalOpen(false)} />
      <CreateReminderModal isOpen={isCreateReminderModalOpen} onClose={() => setIsCreateReminderModalOpen(false)} />
      <CreatePollModal isOpen={isCreatePollModalOpen} onClose={() => setIsCreatePollModalOpen(false)} />
      
      {lightboxUrl && (
        <ImageViewerModal 
          previewData={{ url: lightboxUrl, isOwn: false }} 
          onClose={() => setLightboxUrl(null)} 
        />
      )}
    </div>
  );
};

export default RightSidebar;
