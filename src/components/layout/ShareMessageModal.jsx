import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import groupApi from '../../api/group.api';
import userApi from '../../api/user.api';
import socketService from '../../services/socket.service';
import useUIStore from '../../stores/ui.store';
import useAuthStore from '../../stores/auth.store';

const ShareMessageModal = ({ isOpen, onClose, messagesToShare, onSuccess }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDestinations, setSelectedDestinations] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const myId = useAuthStore((s) => s.user?.id);

  // Fetch groups (Sử dụng chung cache với Sidebar)
  const { data: groupsData, isLoading: isLoadingGroups } = useQuery({
    queryKey: ['my-groups'],
    queryFn: () => groupApi.getMyGroups().then((r) => r.data.data),
    enabled: isOpen,
  });

  // Fetch DM users (Sử dụng chung cache với Sidebar)
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['recent-chats'],
    queryFn: () => userApi.getRecentChats().then((r) => r.data.data),
    enabled: isOpen,
  });

  const allDestinations = useMemo(() => {
    const groups = (groupsData || []).map(g => ({ ...g, type: 'group', key: `group_${g.id}` }));
    const users = (usersData || []).map(u => ({ ...u, name: u.fullName, type: 'direct', key: `direct_${u.id}` }));
    
    // Gom chung lại và có thể sort theo thời gian tạo tin nhắn cuối (đã xử lý ở backend)
    return [...groups, ...users];
  }, [groupsData, usersData]);

  const filteredDestinations = useMemo(() => {
    if (!searchQuery.trim()) return allDestinations;
    const lowerQuery = searchQuery.toLowerCase();
    return allDestinations.filter(d => d.name?.toLowerCase().includes(lowerQuery));
  }, [allDestinations, searchQuery]);

  if (!isOpen) return null;

  const toggleDestination = (dest) => {
    if (selectedDestinations.find(d => d.key === dest.key)) {
      setSelectedDestinations(selectedDestinations.filter(d => d.key !== dest.key));
    } else {
      setSelectedDestinations([...selectedDestinations, dest]);
    }
  };

  const handleShare = async () => {
    if (selectedDestinations.length === 0 || messagesToShare.length === 0) return;
    
    try {
      setIsSubmitting(true);
      
      // Với mỗi đích đến (cuộc trò chuyện)
      for (const dest of selectedDestinations) {
        // Gửi từng tin nhắn theo thứ tự (từ cũ đến mới)
        for (const msg of [...messagesToShare].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))) {
          // Bỏ qua tin nhắn thu hồi
          if (msg.type === 'RECALLED') continue;
          
          if (dest.type === 'group') {
            await socketService.sendGroupMessage(dest.id, msg.content, msg.type, null);
          } else {
            await socketService.sendDirectMessage(dest.id, msg.content, msg.type, null);
          }
        }
      }
      
      useUIStore.getState().showToast(`Đã chia sẻ thành công đến ${selectedDestinations.length} cuộc trò chuyện.`, 'success');
      onSuccess?.();
      onClose();
      // Reset state
      setSelectedDestinations([]);
      setSearchQuery('');
    } catch (error) {
      useUIStore.getState().showToast('Có lỗi xảy ra khi chia sẻ tin nhắn.', 'error');
      console.error('Share error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={!isSubmitting ? onClose : undefined}
      />
      
      {/* Modal Box */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative transform transition-all scale-100 opacity-100 border border-slate-200 dark:border-slate-700">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Chia sẻ tin nhắn</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Chọn nơi muốn chuyển tiếp ({messagesToShare.length} tin nhắn)</p>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-0 flex flex-col custom-scrollbar">
          {/* Search Bar */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm người và nhóm..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:bg-white dark:focus:bg-slate-900 outline-none transition text-sm text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* List of Destinations */}
          <div className="flex-1 overflow-y-auto p-2">
            {isLoadingGroups || isLoadingUsers ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : filteredDestinations.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                Không tìm thấy kết quả nào.
              </div>
            ) : (
              <div className="space-y-1">
                {filteredDestinations.map(dest => {
                  const isSelected = !!selectedDestinations.find(d => d.key === dest.key);
                  return (
                    <div 
                      key={dest.key}
                      onClick={() => toggleDestination(dest)}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer transition"
                    >
                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}>
                        {isSelected && <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                      </div>
                      
                      {/* Avatar */}
                      <div className="relative">
                        {dest.avatar ? (
                          <img src={`${process.env.REACT_APP_SOCKET_URL}${dest.avatar}`} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white font-semibold text-sm">
                            {dest.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                        {dest.type === 'group' && (
                          <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-0.5">
                            <div className="bg-slate-200 dark:bg-slate-700 w-4 h-4 rounded-full flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5 text-slate-500 dark:text-slate-400" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{dest.name}</p>
                        {dest.type === 'group' && dest.memberCount && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{dest.memberCount} thành viên</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
          <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {selectedDestinations.length > 0 ? `Đã chọn ${selectedDestinations.length}` : 'Chọn người nhận'}
          </div>
          <button
            onClick={handleShare}
            disabled={isSubmitting || selectedDestinations.length === 0}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-900 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Đang gửi...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
                Gửi
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareMessageModal;
