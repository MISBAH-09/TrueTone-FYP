import axios from "axios";

// ─── Axios Instance ─────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/users`,
  headers: { "Content-Type": "application/json" },
});

// Attach token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("truetone_token");
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

// ─── Auth APIs ──────────────────────────────────────────────────────────────

export const RECOVERY_QUESTIONS = [
  { value: "first_school", label: "What was your first school's name?" },
  { value: "childhood_nickname", label: "What was your childhood nickname?" },
  { value: "first_pet", label: "What was the name of your first pet?" },
];

export const signupUser = async ({
  username,
  email,
  password,
  first_name,
  last_name,
  recovery_question,
  recovery_answer,
}) => {
  const { data } = await api.post("/signup/", {
    username,
    email,
    password,
    first_name,
    last_name,
    recovery_question,
    recovery_answer,
  });
  return data;
};

export const loginUser = async ({ username, email, password }) => {
  const payload = username ? { username, password } : { email, password };
  const { data } = await api.post("/login/", payload);
  
  localStorage.setItem("truetone_token", data.data.token);
  localStorage.setItem("truetone_user_id", data.data.id);

  return data;
};

export const getPasswordRecoveryQuestion = async ({ username, email }) => {
  const { data } = await api.post("/password-recovery/question/", { username, email });
  return data;
};

export const resetPassword = async ({
  username,
  email,
  recovery_question,
  recovery_answer,
  password,
}) => {
  const { data } = await api.post("/password-recovery/reset/", {
    username,
    email,
    recovery_question,
    recovery_answer,
    password,
  });
  localStorage.removeItem("truetone_token");
  localStorage.removeItem("truetone_user_id");
  return data;
};

export const setupPasswordRecovery = async ({
  current_password,
  recovery_question,
  recovery_answer,
}) => {
  const { data } = await api.post("/password-recovery/setup/", {
    current_password,
    recovery_question,
    recovery_answer,
  });
  return data;
};

// ─── Protected APIs ─────────────────────────────────────────────────────────

export const getUserProfile = async () => {
  const { data } = await api.get("/profile/");
  return data;
};

export const updateUser = async (updates) => {
  const { data } = await api.put("/update/", updates);
  return data;
};

export const fetchAllUsers = async () => {
  const { data } = await api.get("/all/");
  return data;
};

export const submitOnboarding = async (onboardingData) => {
  const { data } = await api.post("/onboarding/", onboardingData);
  return data;
};
