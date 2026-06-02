import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import groupApi from '../../api/group.api';
import userApi from '../../api/user.api';
import useAuthStore from '../../stores/auth.store';
import useChatStore from '../../stores/chat.store';
import useDebounce from '../../hooks/useDebounce';

const ConversationItem = ({ item, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={[
      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left',
      'transition-all duration-150 border',
      isActive
        ? 'bg-indigo-50 border-indigo-200'
        : 'bg-transparent border-transparent hover:bg-slate-100',
    ].join(' ')}
  >
    {/* Avatar */}
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
      {item.name?.charAt(0)?.toUpperCase() || '?'}
    </div>

    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
      <p className="text-xs text-slate-500 truncate">{item.subtitle || 'Nhấn để chat'}</p>
    </div>
  </button>
);

const Sidebar = ({ onItemClick }) => {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const activeConversation = useChatStore((s) => s.activeConversation);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('direct'); // 'direct' hoặc 'group'
  const debouncedSearch = useDebounce(searchQuery, 300);

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
  useEffect(() => {
    const handleUpdate = () => queryClient.invalidateQueries({ queryKey: ['recent-chats'] });
    window.addEventListener('chat_updated', handleUpdate);
    return () => window.removeEventListener('chat_updated', handleUpdate);
  }, [queryClient]);

  // Gọi API Tìm kiếm (khi gõ phím)
  const { data: searchResultsData, isFetching: isSearching } = useQuery({
    queryKey: ['search-users', debouncedSearch],
    queryFn: () => userApi.searchUsers(debouncedSearch).then((r) => r.data.data),
    enabled: debouncedSearch.trim().length > 0,
  });
  const searchResults = searchResultsData || [];

  const handleSelectConversation = (type, id, name) => {
    setActiveConversation({ type, id, name });
    setSearchQuery(''); // Xóa text tìm kiếm
    onItemClick?.();
  };

  return (
    <div className="w-[18rem] sm:w-72 h-full flex flex-col border-r border-slate-200/70 bg-white/70 backdrop-blur-xl">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-200/70">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <img src="https://dvntechnology.com/assets/logo.png" alt="DVN" className="w-7 h-7" />
            <span className="font-bold text-slate-900 text-lg">DVN Chat</span>
          </div>
          <button
            onClick={logout}
            title="Đăng xuất"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2.5 px-1 mb-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white text-xs font-bold">
            {user?.fullName?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{user?.fullName}</p>
            <p className="text-xs text-emerald-600">● Đang hoạt động</p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm người dùng..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-all"
          />
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Danh sách Chat */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {searchQuery.trim().length > 0 ? (
          // Hiển thị kết quả tìm kiếm
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2">
              Kết quả tìm kiếm
            </p>
            {isSearching ? (
              <div className="text-center py-4 text-sm text-slate-500">Đang tìm...</div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-4 text-sm text-slate-500">Không tìm thấy ai</div>
            ) : (
              <div className="space-y-1">
                {searchResults.map((u) => (
                  <ConversationItem
                    key={`search_${u.id}`}
                    item={{ id: u.id, name: u.fullName, subtitle: u.username }}
                    isActive={false}
                    onClick={() => handleSelectConversation('direct', u.id, u.fullName)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          // Hiển thị mặc định (Tabs)
          <div className="flex flex-col h-full">
            {/* Tabs Selector */}
            <div className="flex bg-slate-100 rounded-lg p-1 mb-4 flex-shrink-0">
              <button
                onClick={() => setActiveTab('direct')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'direct' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Trực tiếp
              </button>
              <button
                onClick={() => setActiveTab('group')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'group' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
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
                      {recentChats.map((chat) => (
                        <ConversationItem
                          key={`chat_${chat.id}`}
                          item={{ 
                            id: chat.id, 
                            name: chat.fullName, 
                            subtitle: chat.lastMessage?.content || 'Nhấn để chat' 
                          }}
                          isActive={activeConversation?.type === 'direct' && activeConversation?.id === chat.id}
                          onClick={() => handleSelectConversation('direct', chat.id, chat.fullName)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'group' && (
                <div>
                  {isLoadingGroups ? (
                    <div className="text-center py-4 text-sm text-slate-500">Đang tải...</div>
                  ) : groups.length === 0 ? (
                    <div className="text-center py-4 text-sm text-slate-500 italic">Chưa tham gia nhóm nào</div>
                  ) : (
                    <div className="space-y-1">
                      {groups.map((group) => (
                        <ConversationItem
                          key={`group_${group.id}`}
                          item={{ id: group.id, name: group.name }}
                          isActive={activeConversation?.type === 'group' && activeConversation?.id === group.id}
                          onClick={() => handleSelectConversation('group', group.id, group.name)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer nhỏ */}
      <div className="px-4 py-3 border-t border-slate-200/70 text-[11px] text-slate-400">
        © {new Date().getFullYear()} DVN Chat
      </div>
    </div>
  );
};

export default Sidebar;
