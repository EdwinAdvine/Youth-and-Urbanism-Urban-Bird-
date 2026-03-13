import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, LoginRequest, RegisterRequest } from "../types";
import { authService } from "../services/authService";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login(credentials);
          set({ user: response.user as User, isAuthenticated: true, isLoading: false });
        } catch (err: any) {
          set({ error: err.response?.data?.detail || "Login failed", isLoading: false });
          throw err;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.register(data);
          set({ user: response.user as User, isAuthenticated: true, isLoading: false });
        } catch (err: any) {
          set({ error: err.response?.data?.detail || "Registration failed", isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        // Clear state immediately so the UI responds at once,
        // regardless of whether the API call succeeds.
        set({ user: null, isAuthenticated: false });
        authService.logout().catch(() => {});
      },

      setUser: (user) => set({ user, isAuthenticated: true }),
      clearError: () => set({ error: null }),
    }),
    {
      name: "ub-auth-storage",
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
