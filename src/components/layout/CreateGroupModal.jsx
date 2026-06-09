import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import groupApi from '../../api/group.api';
import userApi from '../../api/user.api';
import useDebounce from '../../hooks/useDebounce';

const CreateGroupModal = ({ isOpen, onClose, onSuccess, initialSelectedUsers = [] }) => {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState(initialSelectedUsers);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const debouncedSearch = useDebounce(searchQuery, 300);
  const queryClient = useQueryClient();

  // Tìm kiếm user
  const { data: searchResultsData, isFetching } = useQuery({
    queryKey: ['search-users', debouncedSearch],
    queryFn: () => userApi.searchUsers(debouncedSearch).then((r) => r.data.data),
    enabled: debouncedSearch.trim().length > 0,
  });

  const searchResults = searchResultsData || [];

  if (!isOpen) return null;

  const toggleUser = (user) => {
    if (selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleCreate = async () => {
    setError('');
    const trimmedName = groupName.trim();

    if (!trimmedName) {
      setError('Vui lòng nhập tên nhóm');
      return;
    }

    if (selectedUsers.length === 0) {
      setError('Vui lòng chọn ít nhất 1 thành viên để tạo nhóm');
      return;
    }

    // Kiểm tra trùng tên nhóm (trong danh sách nhóm hiện tại của mình)
    const myGroups = queryClient.getQueryData(['my-groups']) || [];
    if (myGroups.some((g) => g.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError('Bạn đã có một nhóm với tên này rồi, vui lòng chọn tên khác!');
      return;
    }

    try {
      setIsSubmitting(true);
      // 1. Tạo Group (code để trống để backend tự sinh)
      const res = await groupApi.createGroup({
        code: '', // Backend sẽ tự sinh nếu trống
        name: groupName.trim(),
      });
      const newGroupId = res.data.data.id;

      // 2. Thêm từng thành viên
      if (selectedUsers.length > 0) {
        await Promise.all(
          selectedUsers.map((u) =>
            groupApi.addUser(newGroupId, { userId: u.id, role: 'MEMBER' })
          )
        );
      }

      onSuccess();
      onClose();
      // Reset form
      setGroupName('');
      setSelectedUsers(initialSelectedUsers);
      setSearchQuery('');
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi tạo nhóm');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={!isSubmitting ? onClose : undefined}
      />

      {/* Modal Box */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative transform transition-all scale-100 opacity-100 border border-slate-200 dark:border-slate-700">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Tạo nhóm chat</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Thêm bạn bè để cùng trò chuyện</p>
          </div>
          <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-start gap-2.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-6">
            {/* Tên nhóm */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tên nhóm</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="VD: Hội chém gió cuối tuần"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:bg-white dark:focus:bg-slate-900 outline-none transition text-slate-900 dark:text-white"
              />
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-700" />

            {/* Tìm kiếm thành viên */}
            <div>
              {/* <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Thêm thành viên</label>
                {selectedUsers.length > 0 && (
                  <span className="text-xs font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                    Đã chọn {selectedUsers.length}
                  </span>
                )}
              </div> */}

              <div className="relative mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm theo tên hoặc SĐT..."
                  className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white dark:focus:bg-slate-900 transition text-slate-900 dark:text-white"
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Danh sách tìm kiếm */}
              {searchQuery.trim().length > 0 && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl max-h-48 overflow-y-auto mb-5 bg-white dark:bg-slate-800 shadow-sm custom-scrollbar">
                  {isFetching ? (
                    <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Đang tìm...
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">Không tìm thấy người dùng nào</div>
                  ) : (
                    searchResults.map((u) => {
                      const isSelected = selectedUsers.some((selected) => selected.id === u.id);
                      return (
                        <div
                          key={`res_${u.id}`}
                          onClick={() => toggleUser(u)}
                          className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition border-b border-slate-50 dark:border-slate-700 last:border-0"
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600'}`}>
                            {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                          </div>

                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                            {u.fullName?.charAt(0)?.toUpperCase() || '?'}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{u.fullName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.username}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Danh sách đã chọn */}
              {selectedUsers.length > 0 && (
                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map(u => (
                      <div key={`sel_${u.id}`} className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 pl-3 pr-1.5 py-1.5 rounded-xl text-sm font-medium border border-indigo-100 dark:border-indigo-800">
                        <span className="truncate max-w-[120px]">{u.fullName}</span>
                        <button onClick={() => toggleUser(u)} className="hover:text-white hover:bg-indigo-400 p-1 rounded-lg transition-colors bg-indigo-200/50 dark:bg-indigo-800/50">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 bg-slate-50/80 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button onClick={onClose} disabled={isSubmitting} className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 bg-slate-200/50 dark:bg-slate-700/50 rounded-xl transition">
            Hủy
          </button>
          <button onClick={handleCreate} disabled={isSubmitting || !groupName.trim()} className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm shadow-indigo-200 transition flex items-center gap-2">
            {isSubmitting ? (
              <>
                <svg className="animate-spin w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Đang tạo...
              </>
            ) : 'Tạo nhóm'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default CreateGroupModal;
