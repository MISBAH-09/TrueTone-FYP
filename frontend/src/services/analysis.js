import axios from "axios";

// ─── Axios Instance ─────────────────────────────────────────────────────────
// Includes token interceptor to identify the user for profile saving operations.

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("truetone_token");
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

/**
 * Helper: wraps a File object in FormData under the key "image".
 */
const buildFormData = (file, skipFaceCheck = false) => {
  const fd = new FormData();
  fd.append("image", file);
  if (skipFaceCheck) {
    fd.append("skip_face_check", "true");
  }
  return fd;
};

// ─── Analysis APIs ──────────────────────────────────────────────────────────

/** Run all 3 models (skin type + tone + disease). */
export const analyzeAll = async (file, skipFaceCheck = false) => {
  const { data } = await api.post("/analyze_all", buildFormData(file, skipFaceCheck), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

/** Run skin type + skin tone (no disease). */
export const analyzeSkin = async (file, skipFaceCheck = false) => {
  const { data } = await api.post("/analyze_skin", buildFormData(file, skipFaceCheck), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

/** Run only skin type model. */
export const analyzeSkinType = async (file, skipFaceCheck = false) => {
  const { data } = await api.post("/analyze_skin_type", buildFormData(file, skipFaceCheck), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

/** Run only skin tone model. */
export const analyzeSkinTone = async (file, skipFaceCheck = false) => {
  const { data } = await api.post("/analyze_skin_tone", buildFormData(file, skipFaceCheck), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

/** Run only skin disease model. */
export const analyzeSkinDisease = async (file, skipFaceCheck = false) => {
  const { data } = await api.post("/analyze_skin_disease", buildFormData(file, skipFaceCheck), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

// ─── Confirm-update + history ───────────────────────────────────────────────

const usersApi = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/users`,
});
usersApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("truetone_token");
  if (token) config.headers.Authorization = token;
  return config;
});

/**
 * Confirms a fresh analyze_all result and saves it to the user's profile.
 * Only call this after the user has explicitly confirmed saving the scan.
 */
export const confirmSkinScan = async (predictions, originalFile, processedBase64) => {
  const formData = new FormData();
  formData.append("predictions", JSON.stringify(predictions));
  if (originalFile) {
    formData.append("original_image", originalFile);
  }
  if (processedBase64) {
    formData.append("processed_image", processedBase64);
  }
  
  const { data } = await usersApi.post("/skin-scan/confirm/", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
};

/** Fetches the logged-in user's confirmed scan history, newest first. */
export const getSkinScanHistory = async () => {
  const { data } = await usersApi.get("/skin-scan/history/");
  return data;
};
