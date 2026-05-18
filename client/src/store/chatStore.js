import { create } from 'zustand';

const useChatStore = create((set) => ({
  currentRoom: 'general',
  messages: [],
  onlineUsers: [],
  typingUser: null,

  setRoom: (room) => set({ currentRoom: room, messages: [] }),
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  
  setMessages: (messages) => set({ messages }),
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  setTypingUser: (user) => set({ typingUser: user }),

  // ✅ Ye dono missing the
  deleteMessage: (messageId) => set((state) => ({
    messages: state.messages.filter((m) => m._id !== messageId)
  })),

  editMessage: (updatedMsg) => set((state) => ({
    messages: state.messages.map((m) =>
      m._id === updatedMsg._id ? updatedMsg : m
    )
  })),
}));

export default useChatStore;