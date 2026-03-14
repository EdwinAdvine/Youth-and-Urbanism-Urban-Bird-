import api, { setAccessToken, clearAccessToken } from "./api";
import type { LoginRequest, RegisterRequest, TokenResponse } from "../types";

const BASE = "/api/v1/auth";

export const authService = {
  async login(data: LoginRequest): Promise<TokenResponse> {
    const res = await api.post<TokenResponse>(`${BASE}/login`, data);
    setAccessToken(res.data.access_token);
    return res.data;
  },

  async register(data: RegisterRequest): Promise<TokenResponse> {
    const res = await api.post<TokenResponse>(`${BASE}/register`, data);
    setAccessToken(res.data.access_token);
    return res.data;
  },

  async logout(): Promise<void> {
    clearAccessToken();
    sessionStorage.removeItem("ub_guest_email");
    sessionStorage.removeItem("ub_guest_token");
    await api.post(`${BASE}/logout`).catch(() => {});
  },

  async refresh(): Promise<{ access_token: string }> {
    const res = await api.post<{ access_token: string }>(`${BASE}/refresh`);
    return res.data;
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post(`${BASE}/forgot-password`, { email });
  },

  async resetPassword(token: string, new_password: string): Promise<void> {
    await api.post(`${BASE}/reset-password`, { token, new_password });
  },

  async changePassword(current_password: string, new_password: string): Promise<void> {
    await api.post(`${BASE}/change-password`, { current_password, new_password });
  },
};
