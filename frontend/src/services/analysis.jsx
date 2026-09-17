import axios from "axios";

// ─── Axios Instance (no auth needed for analysis endpoints) ─────────────────

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/api`,
});

/**
 * Helper: wraps a File object in FormData under the key "image".
 */
const buildFormData = (file) => {
  const fd = new FormData();
  fd.append("image", file);
  return fd;
};

// ─── Analysis APIs ──────────────────────────────────────────────────────────

/** Run all 3 models (skin type + tone + disease). */
export const analyzeAll = async (file) => {
  const { data } = await api.post("/analyze_all", buildFormData(file), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

/** Run skin type + skin tone (no disease). */
export const analyzeSkin = async (file) => {
  const { data } = await api.post("/analyze_skin", buildFormData(file), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

/** Run only skin type model. */
export const analyzeSkinType = async (file) => {
  const { data } = await api.post("/analyze_skin_type", buildFormData(file), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

/** Run only skin tone model. */
export const analyzeSkinTone = async (file) => {
  const { data } = await api.post("/analyze_skin_tone", buildFormData(file), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

/** Run only skin disease model. */
export const analyzeSkinDisease = async (file) => {
  const { data } = await api.post("/analyze_skin_disease", buildFormData(file), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};
