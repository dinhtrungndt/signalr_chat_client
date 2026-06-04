import io from 'socket.io-client';
import useAuthStore from '../stores/auth.store';
import useChatStore from '../stores/chat.store';
import tokenStorage from '../utils/tokenStorage';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:1411';

let socket = null;

// Hàm phát âm thanh Ting (Pop nhẹ giống Messenger)
const playNotificationSound = () => {
  try {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {}); // Catch lỗi nếu browser block auto-play
  } catch (e) {}
};

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
      const myId = useAuthStore.getState().user?.id;
      addMessage('group', message.groupId, message);
      window.dispatchEvent(new Event('group_updated')); // Báo cho Sidebar cập nhật
      
      // Nếu không phải tin nhắn của mình gửi thì phát âm thanh
      if (message.senderId !== myId) {
        playNotificationSound();
      }
    });

    // Nhận tin nhắn 1-1
    socket.on('receiveDirectMessage', (message) => {
      const myId = useAuthStore.getState().user?.id;
      const otherId = message.senderId === myId ? message.receiverId : message.senderId;
      addMessage('direct', otherId, message);
      window.dispatchEvent(new Event('chat_updated')); // Báo cho Sidebar cập nhật

      // Nếu không phải tin nhắn của mình gửi thì phát âm thanh
      if (message.senderId !== myId) {
        playNotificationSound();
      }
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

    // ==========================================
    // NHẬN SỰ KIỆN TỪ GROUP
    // ==========================================
    socket.on('addedToGroup', ({ groupId }) => {
      // Báo server cho join phòng này
      socket.emit('joinNewGroupRoom', groupId);
      // Báo UI tải lại danh sách nhóm
      window.dispatchEvent(new Event('group_updated'));
    });

    socket.on('removedFromGroup', ({ groupId }) => {
      // Báo server rời phòng này
      socket.emit('leaveGroupRoom', groupId);

      // Xoá cuộc hội thoại hiện tại nếu đang mở nhóm đó
      const activeConversation = useChatStore.getState().activeConversation;
      if (activeConversation?.type === 'group' && activeConversation?.id === groupId) {
        useChatStore.getState().setActiveConversation(null);
      }

      // Báo UI tải lại danh sách nhóm
      window.dispatchEvent(new Event('group_updated'));
    });

    socket.on('group_member_added', ({ groupId }) => {
      window.dispatchEvent(new CustomEvent('group_members_updated', { detail: { groupId } }));
    });

    socket.on('group_member_removed', ({ groupId }) => {
      window.dispatchEvent(new CustomEvent('group_members_updated', { detail: { groupId } }));
    });

    socket.on('group_disbanded', ({ groupId }) => {
      socket.emit('leaveGroupRoom', groupId);

      const activeConversation = useChatStore.getState().activeConversation;
      if (activeConversation?.type === 'group' && activeConversation?.id === groupId) {
        useChatStore.getState().setActiveConversation(null);
      }

      window.dispatchEvent(new Event('group_updated'));
    });

    // ==========================================
    // SỰ KIỆN NHÓM (READONLY & ROLE)
    // ==========================================
    socket.on('group_readonly_changed', (data) => {
      const { groupId, isReadOnly } = data;
      const activeConversation = useChatStore.getState().activeConversation;
      if (activeConversation?.type === 'group' && activeConversation?.id === groupId) {
        useChatStore.getState().setActiveConversation({
          ...activeConversation,
          isReadOnly
        });
      }
      window.dispatchEvent(new Event('group_updated'));
    });

    socket.on('group_member_updated', (data) => {
      const { groupId, userId, role } = data;
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.id === userId) {
        const activeConversation = useChatStore.getState().activeConversation;
        if (activeConversation?.type === 'group' && activeConversation?.id === groupId) {
          useChatStore.getState().setActiveConversation({
            ...activeConversation,
            role
          });
        }
      }
      window.dispatchEvent(new CustomEvent('group_members_updated', { detail: { groupId } }));
      window.dispatchEvent(new Event('group_updated'));
    });

    // ==========================================
    // SỰ KIỆN THU HỒI TIN NHẮN
    // ==========================================
    socket.on('message_recalled', (data) => {
      // data = { messageId, groupId, partnerId }
      if (data.groupId) {
        useChatStore.getState().updateMessage('group', data.groupId, data.messageId, { type: 'RECALLED', content: 'Tin nhắn đã được thu hồi' });
      } else if (data.partnerId) {
        useChatStore.getState().updateMessage('direct', data.partnerId, data.messageId, { type: 'RECALLED', content: 'Tin nhắn đã được thu hồi' });
      }
      window.dispatchEvent(new CustomEvent('message_recalled', { detail: data }));
    });

    // ==========================================
    // SỰ KIỆN CHỈNH SỬA TIN NHẮN
    // ==========================================
    socket.on('message_edited', (data) => {
      // data = { messageId, groupId, partnerId, newContent }
      if (data.groupId) {
        useChatStore.getState().updateMessage('group', data.groupId, data.messageId, { content: data.newContent, isEdited: true });
      } else if (data.partnerId) {
        useChatStore.getState().updateMessage('direct', data.partnerId, data.messageId, { content: data.newContent, isEdited: true });
      }
      window.dispatchEvent(new CustomEvent('message_edited', { detail: data }));
    });

    // ==========================================
    // SỰ KIỆN GHIM TIN NHẮN
    // ==========================================
    socket.on('message_pinned', (pin) => {
      if (pin.groupId) {
        useChatStore.getState().addPinnedMessage('group', pin.groupId, pin);
      } else {
        const currentUser = useAuthStore.getState().user;
        const partnerId = pin.user1Id === currentUser?.id ? pin.user2Id : pin.user1Id;
        useChatStore.getState().addPinnedMessage('direct', partnerId, pin);
      }
    });

    socket.on('message_unpinned', (data) => {
      if (data.groupId) {
        useChatStore.getState().removePinnedMessage('group', data.groupId, data.messageId);
      } else {
        const currentUser = useAuthStore.getState().user;
        const partnerId = data.user1Id === currentUser?.id ? data.user2Id : data.user1Id;
        useChatStore.getState().removePinnedMessage('direct', partnerId, data.messageId);
      }
    });

    // ==========================================
    // SỰ KIỆN THẢ CẢM XÚC TIN NHẮN
    // ==========================================
    socket.on('message_reacted', (data) => {
      // data = { messageId, groupId, receiverId, action, reaction }
      const { messageId, groupId, receiverId, action, reaction } = data;
      
      const type = groupId ? 'group' : 'direct';
      let id = groupId;
      if (!groupId) {
        // Chat 1-1: Nếu receiverId là mình thì id hội thoại là người gửi (reaction.userId), ngược lại là receiverId
        const myId = useAuthStore.getState().user?.id;
        id = (receiverId === myId) ? reaction.userId : receiverId;
      }

      useChatStore.getState().updateMessageReactions(type, id, messageId, action, reaction);
    });

    // ==========================================
    // SỰ KIỆN ĐÃ ĐỌC (WATERMARK)
    // ==========================================
    socket.on('message_read', (data) => {
      const { groupId, partnerId, lastReadMessageId, user } = data;
      const { setWatermark } = useChatStore.getState();

      if (groupId) {
        setWatermark('group', groupId, user, lastReadMessageId);
      } else if (partnerId) {
        // user.userId là người vừa mới xem tin nhắn (tức là đối tác của mình trong chat 1-1)
        setWatermark('direct', user.userId, user, lastReadMessageId);
      }
    });

    // ==========================================
    // ONLINE/OFFLINE
    // ==========================================
    socket.on('userOnline', (userId) => {
      useChatStore.getState().setOnlineStatus(userId, true);
    });

    socket.on('userOffline', (data) => {
      // payload có thể là userId (number) hoặc object { userId, lastSeen }
      if (typeof data === 'object') {
        useChatStore.getState().setOnlineStatus(data.userId, false, data.lastSeen);
      } else {
        useChatStore.getState().setOnlineStatus(data, false);
      }
    });

    // ==========================================
    // SỰ KIỆN TYPING (Đang gõ...)
    // ==========================================
    socket.on('userTyping', (data) => {
      // data = { userId, groupId } hoặc { userId }
      if (data.groupId) {
        useChatStore.getState().setTyping('group', data.groupId, data.userId, true);
      } else {
        // Chat 1-1
        useChatStore.getState().setTyping('direct', data.userId, data.userId, true);
      }
    });

    socket.on('userStopTyping', (data) => {
      if (data.groupId) {
        useChatStore.getState().setTyping('group', data.groupId, data.userId, false);
      } else {
        useChatStore.getState().setTyping('direct', data.userId, data.userId, false);
      }
    });
  },

  disconnect: () => {
    socket?.disconnect();
    socket = null;
  },

  // Gửi tin nhắn Group
  sendGroupMessage: (groupId, content, type = 'TEXT', replyToId = null) => {
    return new Promise((resolve, reject) => {
      socket?.emit('sendGroupMessage', { groupId, content, type, replyToId }, (res) => {
        if (res.success) {
          resolve(res.data);
          window.dispatchEvent(new Event('group_updated')); // Báo cho Sidebar cập nhật
        }
        else reject(new Error(res.error));
      });
    });
  },

  // Gửi tin nhắn 1-1
  sendDirectMessage: (receiverId, content, type = 'TEXT', replyToId = null) => {
    return new Promise((resolve, reject) => {
      socket?.emit('sendDirectMessage', { receiverId, content, type, replyToId }, (res) => {
        if (res.success) {
          resolve(res.data);
          window.dispatchEvent(new Event('chat_updated')); // Báo cho Sidebar cập nhật
        }
        else reject(new Error(res.error));
      });
    });
  },

  // Đánh dấu đã đọc
  markRead: (groupId, partnerId, lastReadMessageId) => {
    return new Promise((resolve, reject) => {
      if (!socket) return resolve(); // Bỏ qua nếu chưa kết nối
      socket.emit('mark_read', { groupId, partnerId, lastReadMessageId }, (res) => {
        if (res.success) resolve(res.data);
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

  // Thả cảm xúc
  reactMessage: (messageId, groupId, receiverId, emoji) => {
    return new Promise((resolve, reject) => {
      socket?.emit('react_message', { messageId, groupId, receiverId, emoji }, (res) => {
        if (res.success) resolve(res.data);
        else reject(new Error(res.error));
      });
    });
  },

  getSocket: () => socket,
};

export default socketService;
