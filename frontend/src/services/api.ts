import axios from "axios";
import type { AxiosInstance, AxiosError } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

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

// Request interceptor: attach access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ub_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 with token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest?._retry) {
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
        localStorage.setItem("ub_access_token", access_token);
        api.defaults.headers.common.Authorization = `Bearer ${access_token}`;
        processQueue(null, access_token);
        if (originalRequest) {
          originalRequest.headers!.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem("ub_access_token");
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
