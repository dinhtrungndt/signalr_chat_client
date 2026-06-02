import React from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import groupApi from '../../api/group.api';
import useChatStore from '../../stores/chat.store';

const GroupMembersModal = ({ isOpen, onClose, groupId }) => {
  const onlineUsers = useChatStore((s) => s.onlineUsers);

  const { data: membersData, isLoading } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: () => groupApi.getGroupTree(groupId).then((r) => r.data.data),
    enabled: isOpen && !!groupId,
  });

  const members = membersData || [];

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
            <h2 className="text-xl font-bold text-slate-900">Thành viên nhóm</h2>
            <p className="text-sm text-slate-500 mt-0.5">{members.length} người tham gia</p>
          </div>
          <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/50 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
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
                        <p className="text-sm font-medium text-slate-900 truncate">{m.user.fullName}</p>
                        {m.role === 'ADMIN' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">ADMIN</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{m.user.username}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default GroupMembersModal;
