import axios from "axios";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/scanner`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("truetone_token");
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

export const scanProductImage = async (imageFile) => {
  const formData = new FormData();
  formData.append("image", imageFile);

  const { data } = await api.post("/scan/", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};
