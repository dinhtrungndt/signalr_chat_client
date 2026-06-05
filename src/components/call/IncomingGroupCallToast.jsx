import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import useCallStore from '../../stores/call.store';
import useChatStore from '../../stores/chat.store';

const IncomingGroupCallToast = () => {
  const { incomingGroupCall, clearIncomingGroupCall, joinZegoCall } = useCallStore();
  const setActiveConversation = useChatStore(s => s.setActiveConversation);

  const ringtoneRef = useRef(null);

  useEffect(() => {
    // Tự động tắt thông báo sau 30 giây nếu không bắt máy
    if (incomingGroupCall) {
      // Play ringtone
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3');
      audio.loop = true;
      audio.play().catch(() => {});
      ringtoneRef.current = audio;

      const timer = setTimeout(() => {
        clearIncomingGroupCall();
      }, 30000);

      return () => {
        clearTimeout(timer);
        if (ringtoneRef.current) {
          ringtoneRef.current.pause();
          ringtoneRef.current = null;
        }
      };
    }
  }, [incomingGroupCall, clearIncomingGroupCall]);

  if (!incomingGroupCall) return null;

  return createPortal(
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[99999] animate-fade-in-down shadow-2xl rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-indigo-500/30 w-[90%] max-w-sm p-4 text-white flex items-center gap-4">
      {/* Icon */}
      <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 relative shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
        </svg>
        <span className="absolute inset-0 rounded-full ring-2 ring-indigo-500 animate-ping opacity-50"></span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{incomingGroupCall.callerName}</p>
        <p className="text-xs text-slate-400 truncate">đang gọi nhóm: {incomingGroupCall.groupName}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 shrink-0">
        <button 
          onClick={clearIncomingGroupCall}
          className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition"
          title="Bỏ qua"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <button 
          onClick={() => {
            // Chuyển nhóm và tham gia call
            setActiveConversation({ id: incomingGroupCall.groupId, type: 'group', name: incomingGroupCall.groupName });
            joinZegoCall(incomingGroupCall.groupId);
          }}
          className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center transition shadow-lg shadow-emerald-500/20"
          title="Tham gia"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </button>
      </div>
    </div>,
    document.body
  );
};

export default IncomingGroupCallToast;
