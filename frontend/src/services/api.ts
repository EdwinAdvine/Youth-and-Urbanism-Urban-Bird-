import axios from "axios";
import type { AxiosInstance, AxiosError } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// Access token stored in memory only — never in localStorage (XSS protection)
let _accessToken = "";

export function setAccessToken(token: string) {
  _accessToken = token;
  api.defaults.headers.common.Authorization = token ? `Bearer ${token}` : "";
}

export function clearAccessToken() {
  _accessToken = "";
  delete api.defaults.headers.common.Authorization;
}

export function getAccessToken() {
  return _accessToken;
}

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
}

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
  withCredentials: true,
});

// Request interceptor: attach in-memory access token
api.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

// Response interceptor: handle 401 with token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    const isAuthEndpoint = originalRequest?.url?.includes("/api/v1/auth/");

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest) {
            originalRequest.headers!.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          }
        });
      }

      originalRequest!._retry = true;
      isRefreshing = true;

      try {
        const response = await api.post<{ access_token: string }>("/api/v1/auth/refresh");
        const { access_token } = response.data;
        setAccessToken(access_token);
        processQueue(null, access_token);
        if (originalRequest) {
          originalRequest.headers!.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAccessToken();
        // Redirect to the appropriate login page based on current route
        const isAdminRoute = window.location.pathname.startsWith("/admin");
        window.location.href = isAdminRoute ? "/admin/login" : "/account/login";
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
