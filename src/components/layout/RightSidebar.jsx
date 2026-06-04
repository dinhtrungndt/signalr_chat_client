import { useEffect, useState } from 'react';
import groupApi from '../../api/group.api';
import messageApi from '../../api/message.api';
import useAuthStore from '../../stores/auth.store';
import useChatStore from '../../stores/chat.store';
import GroupMembersModal from './GroupMembersModal';
const EMPTY_ARRAY = [];

const RightSidebar = ({ onClose, onImageClick }) => {
  const activeConversation = useChatStore((s) => s.activeConversation);
  const currentUser = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState('info'); // info | search
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
  const [isSettingOpen, setIsSettingOpen] = useState(true);

  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

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
              extractedUrls.push({ url, id: msg.id });
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
  }, [activeConversation, messages.length]);

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
    if (window.confirm('Bạn có chắc chắn muốn giải tán nhóm này không? Mọi dữ liệu sẽ bị xóa!')) {
      try {
        await groupApi.deleteGroup(activeConversation.id);
        useChatStore.getState().setActiveConversation(null);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleLeaveGroup = async () => {
    if (window.confirm('Bạn có chắc chắn muốn rời nhóm này không?')) {
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

  const isAdmin = activeConversation.type === 'group' && activeConversation.role === 'ADMIN';

  return (
    <div className="flex flex-col w-full h-full bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0">
        <h2 className="text-base font-semibold text-slate-800 dark:text-white">Thông tin hội thoại</h2>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Avatar & Name */}
        <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
          {activeConversation.avatar ? (
            <img src={`${process.env.REACT_APP_SOCKET_URL}${activeConversation.avatar}`} alt="Avatar" className="w-20 h-20 rounded-full object-cover shadow-md mb-3" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white text-3xl font-bold shadow-md mb-3">
              {activeConversation.type === 'group'
                ? activeConversation.name.charAt(0).toUpperCase()
                : activeConversation.name.charAt(0).toUpperCase()}
            </div>
          )}
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">{activeConversation.name}</h3>

          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setActiveTab('search')}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Tìm kiếm</span>
            </button>

            {activeConversation.type === 'group' && (
              <button
                onClick={() => setIsMembersModalOpen(true)}
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Thành viên</span>
              </button>
            )}
          </div>
        </div>

        {activeTab === 'search' ? (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setActiveTab('info')} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <h3 className="font-semibold text-slate-800 dark:text-white">Tìm kiếm tin nhắn</h3>
            </div>
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Nhập từ khóa tìm kiếm..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition text-slate-900 dark:text-white placeholder-slate-400"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>

            <div className="flex flex-col gap-3">
              {isSearching ? (
                <div className="text-center text-slate-500 dark:text-slate-400 text-sm py-4">Đang tìm kiếm...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map(msg => (
                  <div key={msg.id} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition" onClick={() => {
                    const el = document.getElementById(`msg-${msg.id}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      el.classList.add('bg-indigo-100', 'dark:bg-indigo-900', 'transition-colors', 'duration-1000');
                      setTimeout(() => el.classList.remove('bg-indigo-100', 'dark:bg-indigo-900'), 1500);
                    }
                  }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">{msg.sender.fullName}</span>
                      <span className="text-[10px] text-slate-400">{new Date(msg.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{msg.type === 'TEXT' ? msg.content : (msg.type === 'IMAGE' ? '[Hình ảnh]' : '[Tập tin]')}</p>
                  </div>
                ))
              ) : searchKeyword ? (
                <div className="text-center text-slate-500 dark:text-slate-400 text-sm py-4">Không tìm thấy kết quả phù hợp</div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="py-2">
            {/* Ảnh/Video */}
            <div className="border-b border-slate-200 dark:border-slate-700">
              <button
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                onClick={() => setIsMediaOpen(!isMediaOpen)}
              >
                <span className="font-semibold text-sm text-slate-800 dark:text-white">Ảnh/Video</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-slate-500 transition-transform ${isMediaOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {isMediaOpen && (
                <div className="px-4 pb-4">
                  {media.length > 0 ? (
                    <div className="grid grid-cols-3 gap-1.5">
                      {media.map((img, idx) => (
                        <div key={`${img.id}-${idx}`} className="aspect-square bg-slate-200 dark:bg-slate-700 rounded-md overflow-hidden cursor-pointer hover:opacity-90 transition" onClick={() => onImageClick(`${process.env.REACT_APP_SOCKET_URL}${img.url}`)}>
                          <img src={`${process.env.REACT_APP_SOCKET_URL}${img.url}`} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-sm text-slate-400 dark:text-slate-500 py-4">Chưa có ảnh/video nào</div>
                  )}
                </div>
              )}
            </div>

            {/* File */}
            <div className="border-b border-slate-200 dark:border-slate-700">
              <button
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                onClick={() => setIsFileOpen(!isFileOpen)}
              >
                <span className="font-semibold text-sm text-slate-800 dark:text-white">Tài liệu, Tệp tin</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-slate-500 transition-transform ${isFileOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {isFileOpen && (
                <div className="px-4 pb-4 flex flex-col gap-2">
                  {files.length > 0 ? (
                    files.map(f => (
                      <a key={f.id} href={`${process.env.REACT_APP_SOCKET_URL}${f.content}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition group">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{f.content.split('/').pop()}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">{new Date(f.createdAt).toLocaleDateString()}</p>
                        </div>
                      </a>
                    ))
                  ) : (
                    <div className="text-center text-sm text-slate-400 dark:text-slate-500 py-4">Chưa có tệp tin nào</div>
                  )}
                </div>
              )}
            </div>

            {/* Quản lý/Bảo mật */}
            {activeConversation.type === 'group' && (
              <div>
                <button
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  onClick={() => setIsSettingOpen(!isSettingOpen)}
                >
                  <span className="font-semibold text-sm text-slate-800 dark:text-white">Thiết lập bảo mật</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-slate-500 transition-transform ${isSettingOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {isSettingOpen && (
                  <div className="px-4 pb-4 flex flex-col gap-1">
                    {isAdmin && (
                      <>
                        <div className="flex items-center justify-between px-3 py-2.5 mb-1 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Chỉ Admin/Phó nhóm được gửi tin</span>
                          <button
                            onClick={handleToggleReadOnly}
                            className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${activeConversation.isReadOnly ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                          >
                            <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition-transform ${activeConversation.isReadOnly ? 'translate-x-5' : ''}`}></div>
                          </button>
                        </div>
                        <button
                          onClick={handleDisbandGroup}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition w-full"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        <span className="text-sm font-medium">Giải tán nhóm</span>
                      </button>
                      </>
                    )}
                    <button
                      onClick={handleLeaveGroup}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition w-full"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      <span className="text-sm font-medium">Rời nhóm</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {activeConversation.type === 'group' && (
        <GroupMembersModal
          isOpen={isMembersModalOpen}
          onClose={() => setIsMembersModalOpen(false)}
          groupId={activeConversation.id}
          groupName={activeConversation.name}
        />
      )}
    </div>
  );
};

export default RightSidebar;
