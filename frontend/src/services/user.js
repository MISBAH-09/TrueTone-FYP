import axios from "axios";

// ─── Axios Instance ─────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/users`,
  headers: { "Content-Type": "application/json" },
});

export const PROFILE_UPDATED_EVENT = "truetone-profile-updated";

/** Never render raw response bodies or Error objects in the UI. */
export function parseApiError(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;

  if (!err?.response) {
    return {
      status: 0,
      message: "Something went wrong. Please try again.",
      errors: {},
      isServerError: true,
    };
  }

  if (status >= 500) {
    return {
      status,
      message: "Something went wrong. Please try again.",
      errors: {},
      isServerError: true,
    };
  }

  const errors =
    data?.errors && typeof data.errors === "object" && !Array.isArray(data.errors)
      ? Object.fromEntries(
          Object.entries(data.errors).map(([k, v]) => [
            k,
            Array.isArray(v) ? v.map(String) : [String(v)],
          ])
        )
      : {};

  const message =
    (typeof data?.message === "string" && data.message) ||
    (typeof data?.detail === "string" && data.detail) ||
    (Object.values(errors)[0]?.[0]) ||
    "Please check the form and try again.";

  // Reject anything that looks like a SQL / Integrity dump
  const unsafe =
    /null value in column|integrityerror|relation "|duplicate key|traceback|psycopg|django\.db/i.test(
      message
    );

  return {
    status,
    message: unsafe ? "Something went wrong. Please try again." : message,
    errors: unsafe ? {} : errors,
    isServerError: false,
  };
}

export function rememberProfileNames({ first_name, last_name } = {}) {
  if (typeof first_name === "string") {
    localStorage.setItem("truetone_first_name", first_name);
  }
  if (typeof last_name === "string") {
    localStorage.setItem("truetone_last_name", last_name);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(PROFILE_UPDATED_EVENT, {
        detail: { first_name, last_name },
      })
    );
  }
}

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

export const MODE_CHANGE_EVENT = "truetone-view-mode-change";

export const getActiveViewMode = () => {
  const authRole = localStorage.getItem("truetone_role") || "end_user";
  if (authRole !== "evaluator") return "end_user";
  return localStorage.getItem("truetone_view_mode") || "evaluator";
};

export const setActiveViewMode = (mode) => {
  const authRole = localStorage.getItem("truetone_role") || "end_user";
  const next = authRole === "evaluator" && mode === "evaluator" ? "evaluator" : "end_user";
  localStorage.setItem("truetone_view_mode", next);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(MODE_CHANGE_EVENT, { detail: next }));
  }
  return next;
};

export const loginUser = async ({
  username,
  email,
  password,
  login_as_evaluator = false,
  evaluator_code = "",
}) => {
  const payload = username ? { username, password } : { email, password };
  if (login_as_evaluator) {
    payload.login_as_evaluator = true;
    payload.evaluator_code = evaluator_code;
  }
  const { data } = await api.post("/login/", payload);

  const role = data.data.role || "end_user";
  localStorage.setItem("truetone_token", data.data.token);
  localStorage.setItem("truetone_user_id", data.data.id);
  localStorage.setItem("truetone_role", role);
  localStorage.setItem("truetone_view_mode", role === "evaluator" ? "evaluator" : "end_user");
  rememberProfileNames({
    first_name: data.data.first_name || "",
    last_name: data.data.last_name || "",
  });

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
  localStorage.removeItem("truetone_role");
  localStorage.removeItem("truetone_view_mode");
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
  if (data?.data?.role) {
    localStorage.setItem("truetone_role", data.data.role);
    if (data.data.role !== "evaluator") {
      localStorage.setItem("truetone_view_mode", "end_user");
    } else if (!localStorage.getItem("truetone_view_mode")) {
      localStorage.setItem("truetone_view_mode", "evaluator");
    }
  }
  if (data?.data) {
    rememberProfileNames({
      first_name: data.data.first_name || "",
      last_name: data.data.last_name || "",
    });
  }
  return data;
};

export const isEvaluatorRole = () =>
  localStorage.getItem("truetone_role") === "evaluator";

export const updateUser = async (updates) => {
  const { data } = await api.patch("/update/", updates);
  if (data?.data) {
    rememberProfileNames({
      first_name: data.data.first_name || "",
      last_name: data.data.last_name || "",
    });
  }
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
