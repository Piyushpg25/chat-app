import axios from "axios";
import useAuthStore from "../store/authStore";

const resolveBaseURL = () => {
  const fromEnv = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "");

  if (fromEnv) {
    return fromEnv.endsWith("/api") ? fromEnv : `${fromEnv}/api`;
  }

  if (import.meta.env.DEV) {
    return "http://localhost:5000/api";
  }

  // Production: same-origin /api (proxied to Render via vercel.json)
  return "/api";
};

const api = axios.create({
  baseURL: resolveBaseURL(),
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  config.headers = config.headers || {};
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
