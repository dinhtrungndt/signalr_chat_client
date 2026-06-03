import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import groupApi from '../../api/group.api';
import userApi from '../../api/user.api';
import useChatStore from '../../stores/chat.store';
import useAuthStore from '../../stores/auth.store';

const GroupMembersModal = ({ isOpen, onClose, groupId }) => {
  const queryClient = useQueryClient();
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const currentUser = useAuthStore((s) => s.user);
  
  const [activeTab, setActiveTab] = useState('members'); // 'members', 'add'
  const [searchQuery, setSearchQuery] = useState('');

  const { data: membersData, isLoading } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: () => groupApi.getGroupTree(groupId).then((r) => r.data.data),
    enabled: isOpen && !!groupId,
  });

  // Tìm kiếm user để thêm
  const { data: searchResults = [], isFetching: isSearching } = useQuery({
    queryKey: ['search-users', searchQuery],
    queryFn: () => userApi.searchUsers(searchQuery).then((r) => r.data.data),
    enabled: activeTab === 'add' && searchQuery.trim().length > 0,
  });

  // Tự động tải lại khi có sự thay đổi từ socket
  React.useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail?.groupId === groupId) {
        queryClient.invalidateQueries(['group-members', groupId]);
      }
    };
    window.addEventListener('group_members_updated', handleUpdate);
    return () => window.removeEventListener('group_members_updated', handleUpdate);
  }, [groupId, queryClient]);

  const members = React.useMemo(() => {
    if (!membersData) return [];
    // Hàm đệ quy làm phẳng cây
    const flatten = (nodes) => {
      let result = [];
      nodes.forEach((node) => {
        result.push(node);
        if (node.children && node.children.length > 0) {
          result = result.concat(flatten(node.children));
        }
      });
      return result;
    };
    
    const flattened = flatten(membersData);
    // Sắp xếp: Admin lên đầu, sau đó xếp theo tên
    return flattened.sort((a, b) => {
      if (a.role === 'ADMIN' && b.role !== 'ADMIN') return -1;
      if (a.role !== 'ADMIN' && b.role === 'ADMIN') return 1;
      return (a.user?.fullName || '').localeCompare(b.user?.fullName || '');
    });
  }, [membersData]);

  const myMemberInfo = members.find((m) => m.userId === currentUser?.id);
  const isAdmin = myMemberInfo?.role === 'ADMIN';

  // Thêm thành viên
  const addMutation = useMutation({
    mutationFn: (userId) => groupApi.addUser(groupId, { userId, role: 'MEMBER' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['group-members', groupId]);
    },
  });

  // Xoá thành viên
  const removeMutation = useMutation({
    mutationFn: (userId) => groupApi.removeUser(groupId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['group-members', groupId]);
      if (variables === currentUser?.id) {
        queryClient.invalidateQueries(['my-groups']);
      }
    },
  });

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative transform transition-all scale-100 opacity-100">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Quản lý nhóm</h2>
            <p className="text-sm text-slate-500 mt-0.5">{members.length} người tham gia</p>
          </div>
          <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/50 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-3 text-sm font-medium transition ${activeTab === 'members' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Thành viên
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-3 text-sm font-medium transition ${activeTab === 'add' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Thêm người
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {activeTab === 'members' && (
            <>
              {isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500 flex flex-col items-center gap-3">
              <svg className="animate-spin w-6 h-6 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Đang tải danh sách...
            </div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">Không có thành viên nào</div>
          ) : (
            <div className="space-y-1">
              {members.map((m) => {
                const isOnline = onlineUsers[m.userId];
                return (
                  <div key={m.userId} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                        {m.user.fullName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      {isOnline !== undefined && (
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {m.userId === currentUser?.id ? 'Bạn' : m.user.fullName}
                        </p>
                        {m.role === 'ADMIN' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">ADMIN</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{m.user.username}</p>
                    </div>

                    {/* Hành động (Chỉ Admin mới có quyền Kick, và không tự Kick chính mình) */}
                    {isAdmin && m.userId !== currentUser?.id && (
                      <button
                        onClick={() => {
                          if(window.confirm(`Xóa ${m.user.fullName} khỏi nhóm?`)) {
                            removeMutation.mutate(m.userId);
                          }
                        }}
                        disabled={removeMutation.isLoading}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-sm transition disabled:opacity-50"
                      >
                        Đuổi
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
            </>
          )}

          {activeTab === 'add' && (
            <div className="flex flex-col h-full p-2">
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Tìm theo Tên hoặc Tài khoản..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <div className="space-y-2">
                {isSearching ? (
                  <div className="text-center text-sm text-slate-500 py-4">Đang tìm kiếm...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((u) => {
                    // Kiểm tra xem user này đã có trong nhóm chưa
                    const isAlreadyMember = members.some(m => m.userId === u.id);

                    return (
                      <div key={u.id} className="flex items-center gap-3 p-2 bg-white border border-slate-100 rounded-xl">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white font-semibold text-sm">
                          {u.fullName?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{u.fullName}</p>
                          <p className="text-xs text-slate-500 truncate">{u.username}</p>
                        </div>
                        <button
                          onClick={() => addMutation.mutate(u.id)}
                          disabled={isAlreadyMember || addMutation.isLoading}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                            isAlreadyMember 
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                          }`}
                        >
                          {isAlreadyMember ? 'Đã thêm' : 'Thêm'}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  searchQuery && <div className="text-center text-sm text-slate-500 py-4">Không tìm thấy ai.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={() => {
              if(window.confirm('Bạn có chắc chắn muốn rời nhóm?')) {
                removeMutation.mutate(currentUser.id, {
                  onSuccess: () => {
                    onClose();
                  }
                });
              }
            }}
            className="w-full py-2.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-xl hover:bg-red-50 transition"
          >
            Rời nhóm
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default GroupMembersModal;
