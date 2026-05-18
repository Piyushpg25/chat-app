import { create } from 'zustand';

const useChatStore = create((set) => ({
  currentRoom: 'general',
  messages: [],
  onlineUsers: [],
  typingUser: null,

  setRoom: (room) => set({ currentRoom: room, messages: [] }),

  addMessage: (message) => set((state) => {
    if (!message?._id) return { messages: [...state.messages, message] };
    if (state.messages.some((m) => m._id === message._id)) return state;
    if (message.room && message.room !== state.currentRoom) return state;
    return { messages: [...state.messages, message] };
  }),

  setMessages: (messages) => set({ messages: messages || [] }),
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  setTypingUser: (user) => set({ typingUser: user }),

  deleteMessage: (messageId) => set((state) => ({
    messages: state.messages.filter((m) => m._id !== messageId),
  })),

  editMessage: (updatedMsg) => set((state) => ({
    messages: state.messages.map((m) =>
      m._id === updatedMsg._id ? updatedMsg : m,
    ),
  })),
}));

export default useChatStore;
