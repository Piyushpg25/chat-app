import axios from "axios";
import useAuthStore from "../store/authStore";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL || "https://chat-app-ttrq.onrender.com/api",
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
