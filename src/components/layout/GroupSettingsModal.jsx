import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import groupApi from '../../api/group.api';
import useAuthStore from '../../stores/auth.store';
import { useUIStore } from '../../stores/ui.store';
import { useQueryClient } from '@tanstack/react-query';
import useChatStore from '../../stores/chat.store';

const GroupSettingsModal = ({ isOpen, onClose, groupId, isReadOnly, isAdmin }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const activeConversation = useChatStore((s) => s.activeConversation);

  // State cục bộ để mock các thiết lập
  const [canChangeName, setCanChangeName] = useState(activeConversation?.canChangeGroupInfo ?? true);
  const [canPin, setCanPin] = useState(activeConversation?.canPinMessages ?? true);
  const [canNote, setCanNote] = useState(activeConversation?.canCreateNotes ?? true);
  const [canPoll, setCanPoll] = useState(activeConversation?.canCreatePolls ?? true);
  const [canSendMsg, setCanSendMsg] = useState(!isReadOnly);
  
  const [approvalMode, setApprovalMode] = useState(activeConversation?.requireApproval ?? false);
  const [highlightAdmin, setHighlightAdmin] = useState(activeConversation?.highlightAdminMessages ?? true);
  const [readHistory, setReadHistory] = useState(activeConversation?.joinerCanReadHistory ?? true);

  React.useEffect(() => {
    setCanChangeName(activeConversation?.canChangeGroupInfo ?? true);
    setCanPin(activeConversation?.canPinMessages ?? true);
    setCanNote(activeConversation?.canCreateNotes ?? true);
    setCanPoll(activeConversation?.canCreatePolls ?? true);
    setCanSendMsg(!activeConversation?.isReadOnly);
    setApprovalMode(activeConversation?.requireApproval ?? false);
    setHighlightAdmin(activeConversation?.highlightAdminMessages ?? true);
    setReadHistory(activeConversation?.joinerCanReadHistory ?? true);
  }, [activeConversation]);

  if (!isOpen) return null;

  const handleToggleReadOnly = async () => {
    if (!isAdmin) return;
    try {
      setIsSubmitting(true);
      await groupApi.toggleReadOnly(groupId, canSendMsg); 
      setCanSendMsg(!canSendMsg); 
      useChatStore.getState().setActiveConversation({
        ...activeConversation,
        isReadOnly: canSendMsg
      });
      queryClient.invalidateQueries(['my-groups']);
    } catch (err) {
      useUIStore.getState().showToast('Có lỗi khi thay đổi quyền gửi tin nhắn', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSetting = async (field, currentValue, setter) => {
    if (!isAdmin || isSubmitting) return;
    const newValue = !currentValue;
    
    // Tạm thời update UI cho mượt (Optimistic Update)
    setter(newValue);
    
    try {
      setIsSubmitting(true);
      await groupApi.updateSettings(groupId, { [field]: newValue });
      queryClient.invalidateQueries(['my-groups']);
    } catch (err) {
      // Revert UI nếu lỗi
      setter(currentValue);
      useUIStore.getState().showToast('Có lỗi xảy ra khi cập nhật cài đặt', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-6 bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="bg-slate-50 dark:bg-slate-900 w-full sm:max-w-md shadow-2xl overflow-hidden flex flex-col h-[90vh] sm:h-auto sm:max-h-[85vh] sm:rounded-3xl border border-slate-200 dark:border-slate-700 animate-slide-up sm:animate-fade-in relative">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-slate-800 border-b border-slate-700 text-white shrink-0">
          <button onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded-full transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-lg font-bold">Quản lý nhóm</h2>
          <div className="w-8"></div> {/* Spacer để căn giữa tiêu đề */}
        </div>

        {/* Cảnh báo quyền (Chỉ hiển thị với Admin) */}
        {isAdmin && (
          <div className="bg-slate-800 text-slate-300 py-2.5 px-4 text-xs font-medium flex items-center justify-center gap-2 border-b border-slate-700 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Tính năng chỉ dành cho quản trị viên
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-800 text-slate-200">
          
          {/* Section 1: Quyền thành viên */}
          <div className="p-4 border-b border-slate-700">
            <h3 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-4">Cho phép các thành viên trong nhóm:</h3>
            
            <div className="space-y-4">
              <CheckboxRow 
                label="Thay đổi tên & ảnh đại diện của nhóm" 
                checked={canChangeName} 
                onChange={() => handleUpdateSetting('canChangeGroupInfo', canChangeName, setCanChangeName)} 
                disabled={!isAdmin || isSubmitting}
              />
              <CheckboxRow 
                label="Ghim tin nhắn, ghi chú, bình chọn lên đầu hội thoại" 
                checked={canPin} 
                onChange={() => handleUpdateSetting('canPinMessages', canPin, setCanPin)} 
                disabled={!isAdmin || isSubmitting}
              />
              <CheckboxRow 
                label="Tạo mới ghi chú, nhắc hẹn" 
                checked={canNote} 
                onChange={() => handleUpdateSetting('canCreateNotes', canNote, setCanNote)} 
                disabled={!isAdmin || isSubmitting}
              />
              <CheckboxRow 
                label="Tạo mới bình chọn" 
                checked={canPoll} 
                onChange={() => handleUpdateSetting('canCreatePolls', canPoll, setCanPoll)} 
                disabled={!isAdmin || isSubmitting}
              />
              <CheckboxRow 
                label="Gửi tin nhắn" 
                checked={canSendMsg} 
                onChange={handleToggleReadOnly} 
                disabled={!isAdmin || isSubmitting}
              />
            </div>
          </div>

          {/* Section 2: Toggles */}
          <div className="px-4 py-2 border-b border-slate-700">
            <ToggleRow 
              label="Chế độ phê duyệt thành viên mới" 
              checked={approvalMode} 
              onChange={() => handleUpdateSetting('requireApproval', approvalMode, setApprovalMode)} 
              disabled={!isAdmin || isSubmitting}
            />
          </div>

          <div className="px-4 py-2 border-b border-slate-700">
            <ToggleRow 
              label="Đánh dấu tin nhắn từ trưởng/phó nhóm" 
              checked={highlightAdmin} 
              onChange={() => handleUpdateSetting('highlightAdminMessages', highlightAdmin, setHighlightAdmin)} 
              disabled={!isAdmin || isSubmitting}
            />
          </div>

          <div className="px-4 py-2">
            <ToggleRow 
              label="Cho phép thành viên mới đọc tin nhắn gần nhất" 
              checked={readHistory} 
              onChange={() => handleUpdateSetting('joinerCanReadHistory', readHistory, setReadHistory)} 
              disabled={!isAdmin || isSubmitting}
            />
          </div>

        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

// UI Components
const CheckboxRow = ({ label, checked, onChange, disabled }) => (
  <div className={`flex items-start justify-between gap-4 cursor-pointer ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-80'}`} onClick={() => !disabled && onChange()}>
    <span className="text-[15px] leading-snug">{label}</span>
    <div className={`w-5 h-5 rounded shrink-0 flex items-center justify-center transition-colors border mt-0.5 ${checked ? 'bg-blue-600 border-blue-600' : 'bg-transparent border-slate-500'}`}>
      {checked && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
    </div>
  </div>
);

const ToggleRow = ({ label, checked, onChange, disabled }) => (
  <div className={`flex items-center justify-between gap-4 py-3 cursor-pointer ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-80'}`} onClick={() => !disabled && onChange()}>
    <div className="flex items-center gap-2">
      <span className="text-[15px] font-medium">{label}</span>
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <div className={`w-11 h-6 rounded-full flex items-center p-1 transition-colors shrink-0 ${checked ? 'bg-blue-600' : 'bg-slate-600'}`}>
      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${checked ? 'translate-x-5' : ''}`}></div>
    </div>
  </div>
);

export default GroupSettingsModal;
