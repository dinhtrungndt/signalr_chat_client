import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import userApi from '../../api/user.api';

const UserProfileModal = ({ isOpen, onClose, userId }) => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && userId) {
      const fetchProfile = async () => {
        setIsLoading(true);
        setError('');
        try {
          const res = await userApi.getUserProfile(userId);
          setProfile(res.data.data);
        } catch (err) {
          setError('Không thể tải thông tin người dùng');
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchProfile();
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up relative border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover Photo */}
        <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600 relative">
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Profile Info */}
        <div className="px-6 pb-6 relative">
          {/* Avatar (overlays cover) */}
          <div className="flex justify-center -mt-12 mb-3">
            {isLoading ? (
              <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse border-4 border-white dark:border-slate-900 shadow-md"></div>
            ) : profile?.avatar ? (
              <img 
                src={`${process.env.REACT_APP_SOCKET_URL}${profile.avatar}`} 
                alt="Avatar" 
                className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-slate-900 shadow-md bg-white dark:bg-slate-800"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white text-3xl font-bold shadow-md border-4 border-white dark:border-slate-900">
                {profile?.fullName?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mx-auto"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mx-auto"></div>
              <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded mt-6 w-full"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-500 text-sm py-4">{error}</div>
          ) : profile ? (
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{profile.fullName}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">@{profile.username}</p>
              
              <div className="mt-6 text-left space-y-4 bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Số điện thoại</p>
                    <p className={`text-sm font-semibold ${profile.phone ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500 italic'}`}>
                      {profile.phone || 'Chưa cập nhật'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Ngày tham gia</p>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {profile.createdAt ? format(new Date(profile.createdAt), 'dd MMMM, yyyy', { locale: vi }) : 'Không rõ'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button 
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-sm shadow-indigo-200"
                >
                  Đóng
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default UserProfileModal;
