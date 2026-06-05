import { create } from 'zustand';
import socketService from '../services/socket.service';

export const rtcManager = {
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  remoteVideoRef: null,
  localVideoRef: null,
};

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

const useCallStore = create((set, get) => ({
  callState: 'IDLE', // 'IDLE' | 'RINGING' | 'IN_CALL'
  callType: 'AUDIO', // 'AUDIO' | 'VIDEO'
  remoteUser: null,
  isCaller: false,
  
  // Audio state
  isMuted: false,
  isVideoOff: false,

  setCallState: (state) => set({ callState: state }),
  
  initiateCall: async (receiverId, remoteUser, callType) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: callType === 'VIDEO' 
      });
      rtcManager.localStream = stream;
      
      set({ 
        callState: 'RINGING', 
        callType, 
        remoteUser: { ...remoteUser, id: receiverId }, 
        isCaller: true,
        isMuted: false,
        isVideoOff: false
      });
      
      socketService.getSocket()?.emit('call_request', { receiverId, callType });
    } catch (err) {
      console.error('Failed to get user media', err);
      alert('Không thể truy cập Microphone/Camera. Vui lòng cấp quyền trong cài đặt trình duyệt.');
    }
  },

  receiveCall: (callerId, callerInfo, callType) => {
    // If already in call, we should reject automatically (busy)
    if (get().callState !== 'IDLE') {
      socketService.getSocket()?.emit('call_reject', { callerId });
      return;
    }
    
    set({
      callState: 'RINGING',
      callType,
      remoteUser: { ...callerInfo, id: callerId },
      isCaller: false,
      isMuted: false,
      isVideoOff: false
    });
  },

  acceptCall: async () => {
    const { callType, remoteUser } = get();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: callType === 'VIDEO' 
      });
      rtcManager.localStream = stream;
      
      socketService.getSocket()?.emit('call_accept', { callerId: remoteUser.id });
      set({ callState: 'IN_CALL' });
      
      // Wait for the caller to send the Offer
      if (!get().isCaller) {
        await get().startPeerConnection();
      }
    } catch (err) {
      console.error('Failed to get user media', err);
      alert('Không thể truy cập Microphone/Camera');
      get().rejectCall();
    }
  },

  rejectCall: () => {
    const { remoteUser, isCaller } = get();
    if (remoteUser && !isCaller) {
      socketService.getSocket()?.emit('call_reject', { callerId: remoteUser.id });
    }
    get().resetCall();
  },

  endCall: () => {
    const { remoteUser } = get();
    if (remoteUser) {
      socketService.getSocket()?.emit('call_end', { peerId: remoteUser.id });
    }
    get().resetCall();
  },

  resetCall: () => {
    set({ callState: 'IDLE', remoteUser: null, isCaller: false });
    if (rtcManager.localStream) {
      rtcManager.localStream.getTracks().forEach(track => track.stop());
      rtcManager.localStream = null;
    }
    if (rtcManager.peerConnection) {
      rtcManager.peerConnection.close();
      rtcManager.peerConnection = null;
    }
    rtcManager.remoteStream = null;
  },

  // WebRTC Methods
  startPeerConnection: async () => {
    const { remoteUser } = get();
    rtcManager.peerConnection = new RTCPeerConnection(STUN_SERVERS);
    
    // Add local tracks
    rtcManager.localStream.getTracks().forEach(track => {
      rtcManager.peerConnection.addTrack(track, rtcManager.localStream);
    });

    // Listen for remote tracks
    rtcManager.peerConnection.ontrack = (event) => {
      rtcManager.remoteStream = event.streams[0];
      if (rtcManager.remoteVideoRef?.current) {
        rtcManager.remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Listen for ICE candidates
    rtcManager.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.getSocket()?.emit('webrtc_ice_candidate', {
          peerId: remoteUser.id,
          candidate: event.candidate
        });
      }
    };

    // If I am the caller, I create the offer
    const { isCaller } = get();
    if (isCaller) {
      const offer = await rtcManager.peerConnection.createOffer();
      await rtcManager.peerConnection.setLocalDescription(offer);
      socketService.getSocket()?.emit('webrtc_offer', {
        peerId: remoteUser.id,
        sdp: offer
      });
    }
  },

  handleOffer: async (sdp) => {
    if (!rtcManager.peerConnection) await get().startPeerConnection();
    await rtcManager.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await rtcManager.peerConnection.createAnswer();
    await rtcManager.peerConnection.setLocalDescription(answer);
    socketService.getSocket()?.emit('webrtc_answer', {
      peerId: get().remoteUser.id,
      sdp: answer
    });
  },

  handleAnswer: async (sdp) => {
    if (rtcManager.peerConnection) {
      await rtcManager.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
    }
  },

  handleIceCandidate: async (candidate) => {
    if (rtcManager.peerConnection) {
      try {
        await rtcManager.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding received ice candidate', e);
      }
    }
  },

  toggleMute: () => {
    const { isMuted } = get();
    if (rtcManager.localStream) {
      rtcManager.localStream.getAudioTracks().forEach(t => t.enabled = isMuted);
    }
    set({ isMuted: !isMuted });
  },

  toggleVideo: () => {
    const { isVideoOff } = get();
    if (rtcManager.localStream) {
      rtcManager.localStream.getVideoTracks().forEach(t => t.enabled = isVideoOff);
    }
    set({ isVideoOff: !isVideoOff });
  }
}));

export default useCallStore;
