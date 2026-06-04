import React from 'react';
import { useUIStore } from '../../stores/ui.store';

const GlobalUI = () => {
  const { toast, confirmDialog } = useUIStore();

  return (
    <>
      {/* ===== CUSTOM TOAST NOTIFICATION ===== */}
      {toast && (
        <div className="fixed top-4 right-4 z-[9999] animate-fade-in-up">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md max-w-sm ${
              toast.type === 'success'
                ? 'bg-green-50/90 border-green-200 dark:bg-green-900/30 dark:border-green-800 text-green-800 dark:text-green-300'
                : toast.type === 'error'
                ? 'bg-red-50/90 border-red-200 dark:bg-red-900/30 dark:border-red-800 text-red-800 dark:text-red-300'
                : toast.type === 'warning'
                ? 'bg-amber-50/90 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                : 'bg-white/90 border-slate-200 dark:bg-slate-800/90 dark:border-slate-700 text-slate-800 dark:text-slate-200'
            }`}
          >
            {/* Icon */}
            {toast.type === 'success' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {(toast.type === 'info' || toast.type === 'warning') && (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        </div>
      )}

      {/* ===== CUSTOM CONFIRM DIALOG ===== */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up scale-100">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{confirmDialog.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{confirmDialog.message}</p>
            </div>
            
            <div className="flex border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={confirmDialog.onCancel}
                className="flex-1 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                {confirmDialog.cancelText || 'Hủy'}
              </button>
              <div className="w-px bg-slate-100 dark:bg-slate-700" />
              <button
                onClick={confirmDialog.onConfirm}
                className="flex-1 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                {confirmDialog.confirmText || 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalUI;
