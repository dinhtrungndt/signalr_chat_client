import { create } from 'zustand';

const useChatStore = create((set, get) => ({
  activeConversation: null, // { type: 'group'|'direct', id, name, avatar }

  // Map lưu tin nhắn theo key: "group_1" hoặc "direct_5"
  // { "group_1": [msg1, msg2, ...] }
  messages: {},

  // Danh sách người đang gõ: { "group_1": [userId1], "direct_5": [userId2] }
  typingUsers: {},

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
      const updated = isTyping
        ? [...new Set([...current, userId])]
        : current.filter((u) => u !== userId);
      return { typingUsers: { ...state.typingUsers, [key]: updated } };
    });
  },
}));

export default useChatStore;
