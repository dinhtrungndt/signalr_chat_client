import { useQuery } from '@tanstack/react-query';
import groupApi from '../../api/group.api';
import useAuthStore from '../../stores/auth.store';
import useChatStore from '../../stores/chat.store';

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

  // Lấy danh sách group từ API
  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['my-groups'],
    queryFn: () => groupApi.getMyGroups().then((r) => r.data.data),
  });

  const groups = groupsData || [];

  return (
    <div className="w-[18rem] sm:w-72 h-full flex flex-col border-r border-slate-200/70 bg-white/70 backdrop-blur-xl">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-200/70">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <img src="https://dvntechnology.com/assets/logo.png" alt="DVN" className="w-7 h-7" />
            <span className="font-bold text-slate-900 text-lg">DVN Chat</span>
          </div>

          {/* Nút logout */}
          <button
            onClick={logout}
            title="Đăng xuất"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>

        {/* Info user hiện tại */}
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white text-xs font-bold">
            {user?.fullName?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{user?.fullName}</p>
            <p className="text-xs text-emerald-600">● Đang hoạt động</p>
          </div>
        </div>
      </div>

      {/* Danh sách nhóm */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2">
          Nhóm của bạn
        </p>

        {isLoading ? (
          // Skeleton loading
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl animate-pulse">
                <div className="w-10 h-10 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-slate-200 rounded w-3/4" />
                  <div className="h-2.5 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            <p>Chưa có nhóm nào</p>
          </div>
        ) : (
          <div className="space-y-1">
            {groups.map((group) => (
              <ConversationItem
                key={group.id}
                item={{ id: group.id, name: group.name }}
                isActive={activeConversation?.type === 'group' && activeConversation?.id === group.id}
                onClick={() => {
                  setActiveConversation({ type: 'group', id: group.id, name: group.name });
                  onItemClick?.();
                }}
              />
            ))}
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
