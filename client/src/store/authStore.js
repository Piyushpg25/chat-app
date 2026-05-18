import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => set({
        user,
        token,
        isAuthenticated: true
      }),

      logout: () => {
        localStorage.clear();
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'chat-auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useAuthStore;