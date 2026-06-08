import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import useCallStore from '../../stores/call.store';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:1411';

const IncomingCallToast = () => {
  const { callState, callType, remoteUser, isCaller, acceptCall, rejectCall } = useCallStore();
  const ringtoneRef = useRef(null);

  const isIncomingRinging = callState === 'RINGING' && !isCaller && remoteUser;

  useEffect(() => {
    if (isIncomingRinging) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3');
      audio.loop = true;
      audio.play().catch(() => {});
      ringtoneRef.current = audio;

      // Tự động từ chối sau 30 giây nếu không trả lời
      const timer = setTimeout(() => {
        rejectCall();
      }, 30000);

      return () => {
        clearTimeout(timer);
        if (ringtoneRef.current) {
          ringtoneRef.current.pause();
          ringtoneRef.current = null;
        }
      };
    }
  }, [isIncomingRinging, rejectCall]);

  if (!isIncomingRinging) return null;

  return createPortal(
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[99999] animate-fade-in-down shadow-2xl rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-indigo-500/30 w-[90%] max-w-sm p-4 text-white flex items-center gap-4">
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-500 bg-slate-800">
          {remoteUser.avatar ? (
            <img src={`${SOCKET_URL}${remoteUser.avatar}`} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-lg font-bold">
              {remoteUser.fullName?.charAt(0) || '?'}
            </div>
          )}
        </div>
        <span className="absolute inset-0 rounded-full ring-2 ring-indigo-500 animate-ping opacity-50"></span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{remoteUser.fullName}</p>
        <p className="text-xs text-slate-400 truncate">
          Cuộc gọi {callType === 'VIDEO' ? 'Video' : 'Thoại'} đến...
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 shrink-0">
        <button 
          onClick={rejectCall}
          className="w-10 h-10 rounded-full bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 flex items-center justify-center transition"
          title="Từ chối"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2.586-2.586a2 2 0 012.828 2.828l-2.586 2.586M8 16l-2.586 2.586a2 2 0 01-2.828-2.828l2.586-2.586m0 0L3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </button>
        <button 
          onClick={acceptCall}
          className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center transition shadow-lg shadow-emerald-500/30"
          title="Nghe máy"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </button>
      </div>
    </div>,
    document.body
  );
};

export default IncomingCallToast;
