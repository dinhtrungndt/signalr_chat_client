import React, { useEffect, useRef } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import useCallStore from '../../stores/call.store';
import useAuthStore from '../../stores/auth.store';

const APP_ID = 320449415;
const SERVER_SECRET = '9de2a45541a62bff33f50efebdc1ddfd';

const ZegoGroupCallModal = () => {
  const { zegoRoomId, leaveZegoCall } = useCallStore();
  const currentUser = useAuthStore(s => s.user);
  const zpRef = useRef(null);

  const myMeeting = async (element) => {
    // If element is null, component is unmounting
    if (!element) {
      if (zpRef.current) {
        zpRef.current.destroy();
        zpRef.current = null;
      }
      return;
    }

    // Prevent double initialization in Strict Mode
    if (zpRef.current) return;

    // 1. Generate Kit Token
    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
      APP_ID, 
      SERVER_SECRET, 
      zegoRoomId.toString(), // RoomID must be a string
      currentUser.id.toString(), // UserID must be a string
      currentUser.fullName || currentUser.username || 'Khách' // UserName
    );

    // 2. Create instance
    zpRef.current = ZegoUIKitPrebuilt.create(kitToken);
    
    // 3. Join room
    zpRef.current.joinRoom({
      container: element,
      maxUsers: 50,
      showPreJoinView: false,
      scenario: {
        mode: ZegoUIKitPrebuilt.GroupCall, // Group call mode
      },
      showUserList: true,
      showTextChat: false, // We already have our own chat
      showScreenSharingButton: true,
      onReturnToHomeScreen: () => {
        leaveZegoCall();
      },
    });
  };

  if (!zegoRoomId || !currentUser) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black animate-fade-in flex flex-col">
      {/* Header bar for our own controls (optional, Zego has its own) */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center px-4 pointer-events-none">
        <button 
          onClick={() => {
            if (zpRef.current) {
              zpRef.current.destroy();
              zpRef.current = null;
            }
            leaveZegoCall();
          }}
          className="text-white hover:text-red-400 bg-black/50 hover:bg-black/80 rounded-full p-2 transition flex items-center gap-2 text-sm pointer-events-auto"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Thoát phòng họp
        </button>
      </div>

      {/* ZegoCloud Container */}
      <div ref={myMeeting} className="w-full h-full flex-1" />
    </div>
  );
};

export default ZegoGroupCallModal;
