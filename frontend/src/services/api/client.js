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

function buildErrorMessage(error) {
  const status = error.response?.status;
  const data = error.response?.data;
  const backendMessage =
    data?.error?.message ||
    data?.detail ||
    (typeof data === "string" ? data : "");

  if (status === 404) {
    return backendMessage ? `API Error (404): ${backendMessage}` : "Requested API endpoint was not found (404).";
  }
  if (status === 401) {
    return backendMessage ? `Auth Error (401): ${backendMessage}` : "Authentication failed or session expired (401).";
  }
  if (status === 500) {
    return backendMessage ? `Server Error (500): ${backendMessage}` : "Server error occurred (500).";
  }

  if (error.code === "ERR_NETWORK" && !error.response) {
    return "Network or CORS Error: Please verify that the backend server is running and CORS origins are allowed.";
  }

  return backendMessage || error.message || "Request failed";
}

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

    const requestUrl = `${error.config?.baseURL || ""}${error.config?.url || ""}`;
    const status = error.response?.status || "NO_RESPONSE";
    const isCorsLikeFailure = error.code === "ERR_NETWORK" && !error.response;

    console.error("API request failed", {
      method: error.config?.method?.toUpperCase(),
      url: requestUrl,
      status,
      code: error.code,
      isCorsLikeFailure,
      response: error.response?.data,
      message: error.message,
    });

    const normalizedError = new Error(buildErrorMessage(error));
    normalizedError.status = error.response?.status || null;
    normalizedError.code = error.code || null;
    normalizedError.url = requestUrl;
    normalizedError.method = error.config?.method?.toUpperCase() || null;
    normalizedError.isCorsLikeFailure = isCorsLikeFailure;

    return Promise.reject(
      normalizedError,
    );
  },
);
