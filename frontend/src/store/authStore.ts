import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, LoginRequest, RegisterRequest } from "../types";
import { authService } from "../services/authService";
import { clearAccessToken, setAccessToken } from "../services/api";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  initialize: () => Promise<void>;
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
      isInitialized: false,
      error: null,

      // Called once on app load — silently refreshes access token using httpOnly cookie
      initialize: async () => {
        try {
          const response = await authService.refresh();
          setAccessToken(response.access_token);
          // Fetch current user profile to ensure it's up to date
          const { default: api } = await import("../services/api");
          const userRes = await api.get<User>("/api/v1/users/me");
          set({ user: userRes.data, isAuthenticated: true, isInitialized: true });
        } catch {
          // Refresh failed — clear persisted auth state
          clearAccessToken();
          set({ user: null, isAuthenticated: false, isInitialized: true });
        }
      },

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
        // Call server logout FIRST while the access token is still attached —
        // this invalidates the refresh token in Redis and clears the httpOnly cookie.
        try { await authService.logout(); } catch {}
        // Now clear local state
        clearAccessToken();
        sessionStorage.removeItem("ub_guest_email");
        sessionStorage.removeItem("ub_guest_token");
        set({ user: null, isAuthenticated: false });
      },

      setUser: (user) => set({ user, isAuthenticated: true }),
      clearError: () => set({ error: null }),
    }),
    {
      name: "ub-auth-storage",
      // Only persist nothing — auth state is always re-derived from the
      // httpOnly refresh token cookie on page load via initialize().
      // Persisting user/isAuthenticated caused signed-out users to be
      // re-authenticated because the refresh cookie was never revoked
      // (the logout API call was missing its auth header).
      partialize: () => ({}),
    }
  )
);
