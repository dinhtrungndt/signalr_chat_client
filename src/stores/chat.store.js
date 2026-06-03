import { create } from 'zustand';

const useChatStore = create((set, get) => ({
  activeConversation: null, // { type: 'direct' | 'group', id: Number, name: String }
  messages: {}, // { "direct_1": [...], "group_2": [...] }
  typingUsers: {}, // { "direct_1": [...userIds] }
  onlineUsers: {}, // { [userId]: boolean } // Trạng thái online của user
  userLastSeen: {}, // { [userId]: Date string }
  watermarks: {}, // { "group_2": { "userId": lastReadMessageId } } // Mốc đã đọc của các thành viên
  pinnedMessages: {}, // { "group_2": [msg1, msg2] }

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
    set((state) => {
      const reversedMessages = [...messages].reverse();
      const existingMessages = state.messages[key] || [];
      
      // Nếu store đã có tin nhắn (qua socket), ta cần giữ lại những tin nhắn MỚI HƠN dữ liệu từ API (tránh bị cache cũ đè mất)
      const lastApiMessage = reversedMessages[reversedMessages.length - 1];
      if (lastApiMessage && existingMessages.length > 0) {
         try {
           const newerMessages = existingMessages.filter(m => window.BigInt(m.id) > window.BigInt(lastApiMessage.id));
           if (newerMessages.length > 0) {
              return {
                messages: { ...state.messages, [key]: [...reversedMessages, ...newerMessages] },
              };
           }
         } catch (e) {
           console.error("Error merging messages:", e);
         }
      }

      return {
        messages: { ...state.messages, [key]: reversedMessages },
      };
    });
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
      const msgs = state.messages[key] || [];
      const index = msgs.findIndex((m) => m.id === messageId || m.id === String(messageId));
      if (index === -1) return state;

      const newMsgs = [...msgs];
      newMsgs[index] = { ...newMsgs[index], ...updates };
      return { messages: { ...state.messages, [key]: newMsgs } };
    });
  },

  // Cập nhật Cảm xúc (Reactions) của một tin nhắn
  updateMessageReactions: (type, id, messageId, action, reaction) => {
    const key = `${type}_${id}`;
    set((state) => {
      const msgs = state.messages[key] || [];
      const index = msgs.findIndex((m) => m.id === String(messageId));
      if (index === -1) return state;

      const newMsgs = [...msgs];
      const msg = newMsgs[index];
      let newReactions = [...(msg.reactions || [])];

      if (action === 'added') {
        newReactions.push(reaction);
      } else if (action === 'updated') {
        const rIndex = newReactions.findIndex(r => r.userId === reaction.userId);
        if (rIndex !== -1) newReactions[rIndex] = reaction;
        else newReactions.push(reaction);
      } else if (action === 'removed') {
        newReactions = newReactions.filter(r => r.userId !== reaction.userId);
      }

      newMsgs[index] = { ...msg, reactions: newReactions };
      return { messages: { ...state.messages, [key]: newMsgs } };
    });
  },

  // === Pinned Messages ===
  setPinnedMessages: (type, id, pins) => {
    const key = `${type}_${id}`;
    set((state) => ({
      pinnedMessages: { ...state.pinnedMessages, [key]: pins }
    }));
  },

  addPinnedMessage: (type, id, pin) => {
    const key = `${type}_${id}`;
    set((state) => {
      const currentPins = state.pinnedMessages[key] || [];
      // Đưa ghim mới lên đầu
      return {
        pinnedMessages: { ...state.pinnedMessages, [key]: [pin, ...currentPins] }
      };
    });
  },

  removePinnedMessage: (type, id, messageId) => {
    const key = `${type}_${id}`;
    set((state) => {
      const currentPins = state.pinnedMessages[key] || [];
      return {
        pinnedMessages: { ...state.pinnedMessages, [key]: currentPins.filter(p => p.messageId !== String(messageId) && p.messageId !== messageId) }
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
