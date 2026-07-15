import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

let getTokenFn = () => localStorage.getItem("token");
let onUnauthorizedFn = () => {};

export function registerAuthHandlers(handlers) {
  if (handlers.getToken) getTokenFn = handlers.getToken;
  if (handlers.onUnauthorized) onUnauthorizedFn = handlers.onUnauthorized;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getTokenFn();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      onUnauthorizedFn();
    }

    const apiError = error.response?.data?.error;
    return Promise.reject(
      new Error(apiError?.message || error.message || "Request failed"),
    );
  },
);