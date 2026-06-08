import React, { useEffect, useRef } from 'react';
import useCallStore, { rtcManager } from '../../stores/call.store';
import useAuthStore from '../../stores/auth.store';

const CallModal = () => {
  const { 
    callState, callType, remoteUser, isCaller,
    isMuted, isVideoOff,
    acceptCall, rejectCall, endCall, toggleMute, toggleVideo
  } = useCallStore();

  const currentUser = useAuthStore(s => s.user);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const ringtoneRef = useRef(null);

  useEffect(() => {
    // Chỉ phát nhạc chuông gọi đi (caller). Nhạc chuông gọi đến do IncomingCallToast xử lý.
    if (callState === 'RINGING' && isCaller) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2865/2865-preview.mp3');
      audio.loop = true;
      audio.play().catch(e => console.log('Audio autoplay blocked', e));
      ringtoneRef.current = audio;
    } else {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
        ringtoneRef.current = null;
      }
    }

    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current = null;
      }
    };
  }, [callState, isCaller]);

  useEffect(() => {
    // Attach refs to rtcManager
    rtcManager.localVideoRef = localVideoRef;
    rtcManager.remoteVideoRef = remoteVideoRef;
  }, []);

  useEffect(() => {
    // Autoplay local stream if it exists
    if (localVideoRef.current && rtcManager.localStream) {
      localVideoRef.current.srcObject = rtcManager.localStream;
    }
    // Autoplay remote stream if it exists
    if (remoteVideoRef.current && rtcManager.remoteStream) {
      remoteVideoRef.current.srcObject = rtcManager.remoteStream;
    }
  }, [callState]);

  if (callState === 'IDLE' || !remoteUser) return null;

  // Cuộc gọi đến đang đổ chuông → hiển thị bằng IncomingCallToast thay vì fullscreen
  if (callState === 'RINGING' && !isCaller) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/95 flex flex-col items-center justify-center text-white backdrop-blur-xl animate-fade-in">
      
      {/* Header Info */}
      <div className="absolute top-10 left-0 right-0 flex flex-col items-center z-20">
        {callState === 'RINGING' && (
          <div className="mb-6 relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-indigo-500 relative z-10 bg-slate-800">
              {remoteUser.avatar ? (
                <img src={`${process.env.REACT_APP_SOCKET_URL}${remoteUser.avatar}`} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-3xl font-bold">
                  {remoteUser.fullName?.charAt(0) || '?'}
                </div>
              )}
            </div>
            {/* Ripple effect */}
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500 opacity-50 animate-ping"></div>
          </div>
        )}
        
        <h2 className="text-3xl font-bold mb-2">{remoteUser.fullName}</h2>
        <p className="text-slate-400 text-lg">
          {callState === 'RINGING' 
            ? (isCaller ? `Đang gọi ${callType === 'VIDEO' ? 'Video' : 'Thoại'}...` : `Cuộc gọi ${callType === 'VIDEO' ? 'Video' : 'Thoại'} đến...`) 
            : `Cuộc gọi ${callType === 'VIDEO' ? 'Video' : 'Thoại'} đang diễn ra`}
        </p>
      </div>

      {/* Video Streams Container */}
      {callType === 'VIDEO' && callState === 'IN_CALL' && (
        <div className="relative w-full max-w-5xl aspect-video bg-black/50 rounded-2xl overflow-hidden shadow-2xl border border-white/10 mt-10">
          
          {/* Remote Video (Big) */}
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />

          {/* Local Video (Small Picture-in-Picture) */}
          <div className="absolute bottom-6 right-6 w-48 aspect-video bg-black rounded-xl overflow-hidden shadow-xl border-2 border-white/20 transition-transform hover:scale-105">
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'} scale-x-[-1]`} // Mirror local video
            />
            {isVideoOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                </svg>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audio Only Mode Avatar Display */}
      {callType === 'AUDIO' && callState === 'IN_CALL' && (
        <div className="flex items-center justify-center gap-16 mt-10">
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-700 bg-slate-800 mb-4">
              {currentUser?.avatar ? (
                <img src={`${process.env.REACT_APP_SOCKET_URL}${currentUser.avatar}`} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-4xl font-bold">
                  {currentUser?.fullName?.charAt(0) || '?'}
                </div>
              )}
            </div>
            <span className="text-slate-400">Bạn</span>
          </div>

          <div className="w-16 flex justify-center text-indigo-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-500 bg-slate-800 mb-4 relative">
              {remoteUser.avatar ? (
                <img src={`${process.env.REACT_APP_SOCKET_URL}${remoteUser.avatar}`} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-4xl font-bold">
                  {remoteUser.fullName?.charAt(0) || '?'}
                </div>
              )}
              {/* Audio visualizer ring */}
              <div className="absolute inset-0 rounded-full border-4 border-indigo-400 opacity-50 animate-ping"></div>
            </div>
            <span className="text-white">{remoteUser.fullName}</span>
          </div>
          
          {/* Hidden Audio Elements */}
          <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
          <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
        </div>
      )}

      {/* Control Buttons */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center items-center gap-6 z-20">
        
        {/* If Ringing and NOT caller, show Accept */}
        {callState === 'RINGING' && !isCaller && (
          <button 
            onClick={acceptCall}
            className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-transform hover:scale-110"
            title="Nghe máy"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
        )}

        {/* If in call, show Mute/Video controls */}
        {callState === 'IN_CALL' && (
          <>
            <button 
              onClick={toggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/50' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
              title={isMuted ? "Bật Mic" : "Tắt Mic"}
            >
              {isMuted ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>

            {callType === 'VIDEO' && (
              <button 
                onClick={toggleVideo}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${isVideoOff ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/50' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                title={isVideoOff ? "Bật Camera" : "Tắt Camera"}
              >
                {isVideoOff ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            )}
          </>
        )}

        {/* Decline/End Call Button */}
        <button 
          onClick={callState === 'RINGING' && !isCaller ? rejectCall : endCall}
          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 transition-transform hover:scale-110"
          title="Kết thúc cuộc gọi"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2.586-2.586a2 2 0 012.828 2.828l-2.586 2.586M8 16l-2.586 2.586a2 2 0 01-2.828-2.828l2.586-2.586m0 0L3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </button>

      </div>
    </div>
  );
};

export default CallModal;
