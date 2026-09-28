import axios from "axios";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/chatbot`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("truetone_token");
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

export const askChatbot = async (message, history) => {
  const { data } = await api.post("/ask/", { message, history });
  return data;
};
