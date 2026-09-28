import axios from "axios";

// ─── Axios Instance ─────────────────────────────────────────────────────────
// Matches services/user.jsx's pattern exactly - same base URL env var,
// same token-attaching interceptor, just a different path segment.

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/recommendations`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("truetone_token");
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

// ─── API ─────────────────────────────────────────────────────────────────

export const getRecommendations = async () => {
  const { data } = await api.post("/get/");
  return data.data || data;
};
