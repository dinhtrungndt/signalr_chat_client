import React, { useEffect } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const MessageReadersModal = ({ isOpen, onClose, readers }) => {
  // Đóng khi ấn Esc
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="font-semibold text-slate-800 dark:text-white">Đã xem bởi</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700 rounded-full transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-2 custom-scrollbar">
          {readers && readers.length > 0 ? (
            readers.map((r, index) => (
              <div key={index} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition">
                <div className="relative">
                  {r.avatar ? (
                    <img src={`${process.env.REACT_APP_SOCKET_URL}${r.avatar}`} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white font-bold text-sm">
                      {r.fullName?.charAt(0) || '?'}
                    </div>
                  )}
                  {/* Dấu tick nhỏ ở dưới góc avatar để biểu thị "Đã đọc" */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-xs shadow-sm">
                    <div className="bg-sky-500 w-3 h-3 rounded-full flex items-center justify-center">
                       <svg xmlns="http://www.w3.org/2000/svg" className="w-2 h-2 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{r.fullName}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-6">Chưa có ai xem</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageReadersModal;
