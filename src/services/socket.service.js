import io from 'socket.io-client';
import tokenStorage from '../utils/tokenStorage';
import useChatStore from '../stores/chat.store';
import useAuthStore from '../stores/auth.store';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:1411';

let socket = null;

const socketService = {
  // Kết nối Socket với Token xác thực
  connect: () => {
    if (socket?.connected) return;

    const token = tokenStorage.get();
    if (!token) return;

    socket = io(SOCKET_URL, {
      auth: { token },            // Gửi token qua handshake (không qua URL)
      transports: ['websocket'],  // Dùng WebSocket thuần, không polling
      reconnectionAttempts: 5,    // Thử kết nối lại tối đa 5 lần
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Kết nối thành công:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Lỗi kết nối:', err.message);
      // Nếu lỗi auth thì logout
      if (err.message.includes('Authentication')) {
        useAuthStore.getState().logout();
      }
    });

    // --- LẮNG NGHE SỰ KIỆN TIN NHẮN ---
    const addMessage = useChatStore.getState().addMessage;
    const setTyping = useChatStore.getState().setTyping;

    // Nhận tin nhắn Group
    socket.on('receiveGroupMessage', (message) => {
      addMessage('group', message.groupId, message);
    });

    // Nhận tin nhắn 1-1
    socket.on('receiveDirectMessage', (message) => {
      const myId = useAuthStore.getState().user?.id;
      const otherId = message.senderId === myId ? message.receiverId : message.senderId;
      addMessage('direct', otherId, message);
      window.dispatchEvent(new Event('chat_updated')); // Báo cho Sidebar cập nhật
    });

    // Typing indicator
    socket.on('userTyping', ({ userId, groupId }) => {
      if (groupId) setTyping('group', groupId, userId, true);
      else setTyping('direct', userId, userId, true);
    });

    socket.on('userStopTyping', ({ userId, groupId }) => {
      if (groupId) setTyping('group', groupId, userId, false);
      else setTyping('direct', userId, userId, false);
    });
  },

  disconnect: () => {
    socket?.disconnect();
    socket = null;
  },

  // Gửi tin nhắn Group
  sendGroupMessage: (groupId, content, type = 'TEXT') => {
    return new Promise((resolve, reject) => {
      socket?.emit('sendGroupMessage', { groupId, content, type }, (res) => {
        if (res.success) resolve(res.data);
        else reject(new Error(res.error));
      });
    });
  },

  // Gửi tin nhắn 1-1
  sendDirectMessage: (receiverId, content, type = 'TEXT') => {
    return new Promise((resolve, reject) => {
      socket?.emit('sendDirectMessage', { receiverId, content, type }, (res) => {
        if (res.success) {
          resolve(res.data);
          window.dispatchEvent(new Event('chat_updated')); // Báo cho Sidebar cập nhật
        }
        else reject(new Error(res.error));
      });
    });
  },

  // Gửi sự kiện đang gõ
  sendTyping: (groupId, receiverId) => {
    socket?.emit('typing', { groupId, receiverId });
  },

  sendStopTyping: (groupId, receiverId) => {
    socket?.emit('stopTyping', { groupId, receiverId });
  },

  getSocket: () => socket,
};

export default socketService;
