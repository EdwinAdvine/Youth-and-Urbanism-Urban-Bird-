/**
 * api.ts — Shared Axios instance for all API calls.
 *
 * Security model:
 * - Access token: stored in module-level memory (never localStorage/sessionStorage).
 *   This prevents XSS attacks from stealing tokens via `localStorage.getItem`.
 * - Refresh token: stored in an httpOnly cookie set by the server.
 *   JavaScript cannot read or modify it, which makes it immune to XSS.
 *   Axios sends it automatically on every request thanks to `withCredentials: true`.
 *
 * Token refresh flow (silent re-authentication):
 * When any API call returns 401 (access token expired), the interceptor:
 *   1. Pauses all subsequent requests and queues them.
 *   2. Makes a single POST /auth/refresh call (uses the httpOnly cookie).
 *   3. On success: stores the new access token in memory and retries all queued requests.
 *   4. On failure (refresh token also expired): clears the token and redirects to login.
 */

import axios from "axios";
import type { AxiosInstance, AxiosError } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// ── In-memory token store ──────────────────────────────────────────────────────
// The access token lives only in this module-level variable.
// It is lost on page refresh, which is intentional — authStore.initialize()
// re-derives it from the httpOnly refresh cookie on every page load.
let _accessToken = "";

export function setAccessToken(token: string) {
  _accessToken = token;
  // Also set it as the default Authorization header so all future requests
  // use it without needing the request interceptor to attach it individually.
  api.defaults.headers.common.Authorization = token ? `Bearer ${token}` : "";
}

export function clearAccessToken() {
  _accessToken = "";
  delete api.defaults.headers.common.Authorization;
}

export function getAccessToken() {
  return _accessToken;
}

// ── Token refresh queue ────────────────────────────────────────────────────────
// When the access token expires, multiple requests can fail simultaneously
// with 401.  Without a queue, each would independently try to refresh,
// causing a race condition (multiple refresh calls, some of which would fail).
//
// Solution: the first 401 starts the refresh; all others are queued here.
// Once refresh completes, processQueue() resolves (or rejects) all queued
// promises, which then retry their original requests with the new token.
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

// ── Axios instance ─────────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    // Tell browsers and CDN proxies never to serve a stale cached API response.
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
  },
  timeout: 30000,        // 30-second timeout for slow mobile connections
  withCredentials: true, // essential: sends httpOnly refresh cookie on every request
});

// ── Request interceptor ────────────────────────────────────────────────────────
// Attaches the in-memory access token to every outgoing request.
// If setAccessToken() was already called, the default header handles it;
// this interceptor is a belt-and-suspenders backup.
api.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

// ── Response interceptor ───────────────────────────────────────────────────────
// Handles 401 (Unauthorized) responses by attempting a silent token refresh.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    // Never attempt to refresh on auth endpoints themselves — that would create
    // an infinite loop (e.g. /auth/refresh returning 401 → refresh → refresh…).
    const isAuthEndpoint = originalRequest?.url?.includes("/api/v1/auth/");

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint) {

      if (isRefreshing) {
        // Another refresh is already in-flight — queue this request and wait.
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest) {
            originalRequest.headers!.Authorization = `Bearer ${token}`;
            return api(originalRequest);  // retry with new token
          }
        });
      }

      // Mark the original request so it won't be retried more than once.
      originalRequest!._retry = true;
      isRefreshing = true;

      try {
        // POST /auth/refresh reads the httpOnly cookie; no body needed.
        const response = await api.post<{ access_token: string }>("/api/v1/auth/refresh");
        const { access_token } = response.data;
        setAccessToken(access_token);
        processQueue(null, access_token);  // unblock all queued requests

        // Retry the original failed request with the fresh token.
        if (originalRequest) {
          originalRequest.headers!.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token is expired or invalid — user must log in again.
        processQueue(refreshError, null);
        clearAccessToken();
        // Redirect to the appropriate login page based on the current route.
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
