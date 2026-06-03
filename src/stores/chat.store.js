import { create } from 'zustand';

const useChatStore = create((set, get) => ({
  activeConversation: null, // { type: 'direct' | 'group', id: Number, name: String }
  messages: {}, // { "direct_1": [...], "group_2": [...] }
  typingUsers: {}, // { "direct_1": [...userIds] }
  onlineUsers: {}, // { [userId]: boolean } // Trạng thái online của user
  userLastSeen: {}, // { [userId]: Date string }
  watermarks: {}, // { "group_2": { "userId": lastReadMessageId } } // Mốc đã đọc của các thành viên

  setOnlineStatus: (userId, isOnline, lastSeen = null) => set((state) => ({
    onlineUsers: {
      ...state.onlineUsers,
      [userId]: isOnline
    },
    ...(lastSeen ? {
      userLastSeen: {
        ...state.userLastSeen,
        [userId]: lastSeen
      }
    } : {})
  })),

  setActiveConversation: (conversation) =>
    set({ activeConversation: conversation }),

  // Lấy key cho map tin nhắn
  _getKey: (type, id) => `${type}_${id}`,

  // Khởi tạo tin nhắn ban đầu (từ API lịch sử)
  initMessages: (type, id, messages) => {
    const key = `${type}_${id}`;
    set((state) => ({
      messages: { ...state.messages, [key]: [...messages].reverse() },
    }));
  },

  // Thêm tin nhắn cũ hơn khi cuộn lên (prepend)
  prependMessages: (type, id, olderMessages) => {
    const key = `${type}_${id}`;
    set((state) => ({
      messages: {
        ...state.messages,
        [key]: [...[...olderMessages].reverse(), ...(state.messages[key] || [])],
      },
    }));
  },

  // Thêm tin nhắn mới vào cuối (realtime)
  addMessage: (type, id, message) => {
    const key = `${type}_${id}`;
    set((state) => ({
      messages: {
        ...state.messages,
        [key]: [...(state.messages[key] || []), message],
      },
    }));
  },

  // Cập nhật một tin nhắn cụ thể
  updateMessage: (type, id, messageId, updates) => {
    const key = `${type}_${id}`;
    set((state) => {
      const currentMessages = state.messages[key] || [];
      const newMessages = currentMessages.map(m => 
        m.id === messageId ? { ...m, ...updates } : m
      );
      return {
        messages: {
          ...state.messages,
          [key]: newMessages
        }
      };
    });
  },

  // Lấy tin nhắn của cuộc trò chuyện hiện tại
  getMessages: (type, id) => {
    const key = `${type}_${id}`;
    return get().messages[key] || [];
  },

  // Typing indicator
  setTyping: (type, id, userId, isTyping) => {
    const key = `${type}_${id}`;
    set((state) => {
      const current = state.typingUsers[key] || [];
      if (isTyping && !current.includes(userId)) {
        return { typingUsers: { ...state.typingUsers, [key]: [...current, userId] } };
      }
      if (!isTyping && current.includes(userId)) {
        return { typingUsers: { ...state.typingUsers, [key]: current.filter((u) => u !== userId) } };
      }
      return state;
    });
  },

  // Đánh dấu đã xem
  setWatermark: (type, id, user, lastReadMessageId) => {
    const key = `${type}_${id}`;
    set((state) => ({
      watermarks: {
        ...state.watermarks,
        [key]: {
          ...(state.watermarks[key] || {}),
          [user.userId]: { ...user, lastReadMessageId }
        }
      }
    }));
  },

  // Xóa toàn bộ dữ liệu khi đăng xuất
  clear: () => set({ activeConversation: null, messages: {}, typingUsers: {} }),
}));

export default useChatStore;
