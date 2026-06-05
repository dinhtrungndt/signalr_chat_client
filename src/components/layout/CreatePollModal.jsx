import React, { useState } from 'react';
import pollApi from '../../api/poll.api';
import useChatStore from '../../stores/chat.store';
import { useUIStore } from '../../stores/ui.store';

const CreatePollModal = ({ isOpen, onClose }) => {
  const activeConversation = useChatStore((s) => s.activeConversation);
  const showToast = useUIStore((s) => s.showToast);

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(true);
  const [allowAddOption, setAllowAddOption] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Polls are only for groups based on our schema
  if (!isOpen || !activeConversation || activeConversation.type !== 'group') return null;

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleAddOptionField = () => {
    setOptions([...options, '']);
  };

  const handleRemoveOptionField = (index) => {
    if (options.length <= 2) return;
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return showToast('Vui lòng nhập câu hỏi bình chọn', 'error');
    
    const validOptions = options.map(o => o.trim()).filter(o => o.length > 0);
    if (validOptions.length < 2) return showToast('Cần ít nhất 2 lựa chọn hợp lệ', 'error');

    setIsSubmitting(true);
    try {
      const data = { 
        groupId: activeConversation.id,
        question: question.trim(),
        options: validOptions,
        allowMultiple,
        allowAddOption
      };
      
      await pollApi.createPoll(data);
      showToast('Tạo bình chọn thành công!', 'success');
      
      // Reset
      setQuestion('');
      setOptions(['', '']);
      setAllowMultiple(true);
      setAllowAddOption(true);
      
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi khi tạo bình chọn', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md my-auto overflow-hidden animate-scale-up border border-slate-200 dark:border-slate-700 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Tạo bình chọn</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar" style={{ maxHeight: '60vh' }}>
          <div className="mb-5">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Chủ đề bình chọn</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Đặt câu hỏi bình chọn..."
              className="w-full px-4 py-3 text-lg font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition placeholder:text-indigo-300 dark:placeholder:text-indigo-700"
              required
              autoFocus
            />
          </div>

          <div className="mb-5">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Các lựa chọn</label>
            <div className="space-y-3">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Lựa chọn ${idx + 1}`}
                    className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition text-slate-900 dark:text-white"
                    required={idx < 2} // At least 2 options required
                  />
                  {options.length > 2 && (
                    <button type="button" onClick={() => handleRemoveOptionField(idx)} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            <button 
              type="button" 
              onClick={handleAddOptionField}
              className="mt-3 flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Thêm lựa chọn
            </button>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={allowMultiple}
                onChange={(e) => setAllowMultiple(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition">Chọn nhiều phương án</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={allowAddOption}
                onChange={(e) => setAllowAddOption(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition">Cho phép thành viên thêm phương án</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 sticky bottom-0">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition">
            Hủy
          </button>
          <button 
            type="button" 
            onClick={handleSubmit}
            disabled={isSubmitting} 
            className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition shadow-sm hover:shadow-md"
          >
            {isSubmitting ? 'Đang tạo...' : 'Tạo bình chọn'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePollModal;
