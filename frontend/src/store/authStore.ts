import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  computeBudget: number;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, token: string) => void;
  setAccessToken: (token: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => set({ user, accessToken }),
      setAccessToken: accessToken => set({ accessToken }),
      clear: () => set({ user: null, accessToken: null }),
    }),
    { name: 'itad-auth', partialize: state => ({ user: state.user, accessToken: state.accessToken }) }
  )
);
