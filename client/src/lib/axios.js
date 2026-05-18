import axios from "axios";
import useAuthStore from "../store/authStore";

const api = axios.create({
  baseURL: "https://chat-app-ttrq.onrender.com/api",
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
