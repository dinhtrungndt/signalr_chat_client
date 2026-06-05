import React, { useState } from 'react';
import reminderApi from '../../api/reminder.api';
import useChatStore from '../../stores/chat.store';
import { useUIStore } from '../../stores/ui.store';

const CreateReminderModal = ({ isOpen, onClose }) => {
  const activeConversation = useChatStore((s) => s.activeConversation);
  const showToast = useUIStore((s) => s.showToast);

  const [content, setContent] = useState('');
  // Mặc định nhắc hẹn sau 1 giờ
  const defaultDate = new Date();
  defaultDate.setHours(defaultDate.getHours() + 1);
  const [dueDate, setDueDate] = useState(defaultDate.toISOString().slice(0, 16));
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !activeConversation) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || !dueDate) return;

    setIsSubmitting(true);
    try {
      const data = { 
        content: content.trim(),
        dueDate: new Date(dueDate).toISOString()
      };
      if (activeConversation.type === 'group') {
        data.groupId = activeConversation.id;
      } else {
        data.partnerId = activeConversation.id;
      }
      
      await reminderApi.createReminder(data);
      showToast('Tạo nhắc hẹn thành công!', 'success');
      setContent('');
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi khi tạo nhắc hẹn', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-up border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Tạo nhắc hẹn mới</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nội dung nhắc hẹn</label>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập nội dung nhắc hẹn..."
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Thời gian (Giờ & Ngày)</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
              Hủy
            </button>
            <button type="submit" disabled={isSubmitting || !content.trim() || !dueDate} className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition flex items-center gap-2">
              {isSubmitting ? 'Đang lưu...' : 'Tạo nhắc hẹn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateReminderModal;
