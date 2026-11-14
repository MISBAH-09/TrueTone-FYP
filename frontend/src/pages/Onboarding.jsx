import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  FileText,
  ChevronRight,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  BarChart3,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { submitOnboarding } from "../services/user";
import TrueToneLogo from "../components/TrueToneLogo";
import { Button, Textarea, InlineAlert, ReportPanel } from "../components/ui";

const DISEASE_LABELS = {
  common_acne: "Acne",
  cystic_acne: "Acne",
  eczema: "Eczema",
  healthy: "Healthy",
  psoriasis: "Psoriasis",
  rosacea: "Rosacea",
  tinea: "Tinea",
};

const RESULT_KEYS = [
  {
    key: "skin_type",
    title: "Skin Type Distribution",
    stepLabel: "Skin Type",
  },
  {
    key: "skin_tone",
    title: "Skin Tone Distribution",
    stepLabel: "Skin Tone",
  },
  {
    key: "skin_disease",
    title: "Condition Screening Distribution",
    stepLabel: "Condition",
  },
];

const labelFor = (key, value) => {
  if (!value) return "—";
  if (key === "skin_disease") return DISEASE_LABELS[value] || value.replace(/_/g, " ");
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const pctBar = (value) => `${Math.round(Number(value || 0) * 100)}%`;

function OnboardingDistributionCard({ metricKey, title, pred }) {
  if (!pred) {
    return (
      <div className="rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] p-4 text-sm text-[var(--tt-secondary)]">
        No prediction available for this model.
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--tt-radius)] bg-[var(--tt-primary-muted)] text-[var(--tt-primary)]">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--tt-ink)]">{title}</h3>
            <p className="text-xs text-[var(--tt-secondary)]">
              Top prediction:{" "}
              <span className="font-semibold text-[var(--tt-ink)]">
                {labelFor(metricKey, pred.label)}
              </span>{" "}
              ({Math.round((pred.confidence || 0) * 100)}%)
            </p>
          </div>
        </div>
        <span className="tt-mono rounded-[var(--tt-radius)] bg-[var(--tt-paper)] px-2 py-1 text-xs font-medium text-[var(--tt-ink)]">
          {Math.round((pred.confidence || 0) * 100)}%
        </span>
      </div>

      <div className="my-2 space-y-3">
        {Object.entries(pred.distribution || {})
          .sort(([, a], [, b]) => b - a)
          .map(([cls, prob]) => {
            const isTop = cls === pred.label;
            return (
              <div key={cls}>
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={`text-sm ${
                      isTop ? "font-semibold text-[var(--tt-ink)]" : "text-[var(--tt-secondary)]"
                    }`}
                  >
                    {labelFor(metricKey, cls)}
                    {isTop ? (
                      <CheckCircle2 className="ml-1.5 inline h-3.5 w-3.5 text-[var(--tt-primary)]" />
                    ) : null}
                  </span>
                  <span className="tt-mono text-xs text-[var(--tt-secondary)]">{pctBar(prob)}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-[var(--tt-radius)] bg-[var(--tt-border)]">
                  <div
                    className={`h-1.5 rounded-[var(--tt-radius)] transition-all duration-700 ${
                      isTop ? "bg-[var(--tt-primary)]" : "bg-[var(--tt-secondary)]/30"
                    }`}
                    style={{ width: pctBar(prob) }}
                  />
                </div>
              </div>
            );
          })}
      </div>

      {metricKey === "skin_disease" ? (
        <div
          className={`mt-4 rounded-[var(--tt-radius)] border px-3 py-2 text-sm font-medium ${
            pred.disease_detected
              ? "border-red-200 border-l-4 border-l-[var(--tt-avoid)] bg-red-50 text-[var(--tt-avoid)]"
              : pred.is_confident === false
              ? "border-amber-200 border-l-4 border-l-[var(--tt-caution)] bg-amber-50 text-[var(--tt-caution)]"
              : "border-[var(--tt-border)] border-l-4 border-l-[var(--tt-primary)] bg-[var(--tt-primary-muted)] text-[var(--tt-ink)]"
          }`}
        >
          {pred.disease_detected ? (
            <span className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              {labelFor(metricKey, pred.label)} detected. TrueTone is an AI screening aid.
            </span>
          ) : pred.is_confident === false ? (
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              We couldn&apos;t match this photo to a condition we screen for. Try a clearer photo, or
              consult a dermatologist if you have concerns.
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              No clinical skin conditions detected in scanned zones.
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}

const ageBrackets = [
  { value: "teen", label: "Teen", desc: "Under 18" },
  { value: "18-24", label: "18–24", desc: "" },
  { value: "25-34", label: "25–34", desc: "" },
  { value: "35+", label: "35+", desc: "" },
];

const skinTones = [
  { value: "fair", label: "Fair", color: "#FDEBD0" },
  { value: "medium", label: "Medium", color: "#D4A574" },
  { value: "dark", label: "Dark", color: "#8B5E3C" },
];

const skinTypes = [
  { value: "oily", label: "Oily", desc: "Shiny, enlarged pores" },
  { value: "combination", label: "Combination", desc: "Oily T-zone, dry cheeks" },
  { value: "dry", label: "Dry", desc: "Tight, flaky skin" },
  { value: "normal", label: "Normal", desc: "Balanced, few concerns" },
];

// values match pipeline_engine.py's SKIN_DISEASE_CLASSES exactly, so
// manual entries line up with what the CNN model would output for the
// same condition.
const skinDiseases = [
  { value: "common_acne", label: "Acne", desc: "Blackheads, whiteheads & breakouts" },
  { value: "common_acne", label: "Acne", desc: "Blackheads, whiteheads, pimples & deep breakouts" },
  { value: "psoriasis", label: "Psoriasis", desc: "Thick, scaly skin patches" },
  { value: "rosacea", label: "Rosacea", desc: "Facial redness & flushing" },
  { value: "tinea", label: "Tinea", desc: "Fungal skin infection" },
];

const TOTAL_STEPS = 4;

const optionClass = (selected) =>
  `rounded-[var(--tt-radius)] border px-4 py-4 text-left transition-colors ${
    selected
      ? "border-[var(--tt-primary)] bg-[var(--tt-primary-muted)] text-[var(--tt-ink)]"
      : "border-[var(--tt-border)] bg-[var(--tt-surface)] text-[var(--tt-ink)] hover:border-[var(--tt-primary)]"
  }`;

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [skinOnlyWarning, setSkinOnlyWarning] = useState("");
  const [skipFaceCheck, setSkipFaceCheck] = useState(false);
  const [phase, setPhase] = useState("form"); // form | results
  const [predictions, setPredictions] = useState(null);
  const [resultIndex, setResultIndex] = useState(0);

  // Form state
  const [ageBracket, setAgeBracket] = useState("");
  const [inputMethod, setInputMethod] = useState(""); // "image" or "manual"
  const [skinImage, setSkinImage] = useState(null);
  const [skinImagePreview, setSkinImagePreview] = useState("");
  const [skinTone, setSkinTone] = useState("");
  const [skinType, setSkinType] = useState("");
  const [selectedDiseases, setSelectedDiseases] = useState([]);
  const [gender, setGender] = useState("");
  const [allergiesText, setAllergiesText] = useState("");
  const [isPregnantOrBreastfeeding, setIsPregnantOrBreastfeeding] = useState(false);
  const [currentProductsText, setCurrentProductsText] = useState("");
  const fileInputRef = useRef(null);
  const showPregnancyQuestion = gender !== "male" && gender !== "";

  // ─── Image handling ───────────────────────────────────────
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSkinImage(reader.result);
      setSkinImagePreview(reader.result);
      setSkinOnlyWarning("");
      setSkipFaceCheck(false);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  // ─── Disease toggle ───────────────────────────────────────
  const toggleDisease = (value) => {
    setSelectedDiseases((prev) =>
      prev.includes(value)
        ? prev.filter((d) => d !== value)
        : [...prev, value]
    );
  };

  // ─── Navigation validation ────────────────────────────────
  const canProceed = () => {
    if (step === 1) return !!ageBracket && !!gender;
    if (step === 2) return !!inputMethod;
    if (step === 3) {
      if (inputMethod === "image") return !!skinImage;
      return !!skinTone && !!skinType;
    }
    if (step === 4) return true; // allergies/pregnancy/current products are all optional
    return false;
  };

  // ─── Submit ───────────────────────────────────────────────
  const handleSubmit = async (forceSkipFace = false) => {
    setLoading(true);
    setError("");
    if (!forceSkipFace) setSkinOnlyWarning("");

    const skipFace = forceSkipFace === true || skipFaceCheck === true;

    try {
      const payload = {
        age_bracket: ageBracket,
        gender,
        allergies: allergiesText,
        is_pregnant_or_breastfeeding: gender === "male" ? false : isPregnantOrBreastfeeding,
        current_products: currentProductsText,
      };

      if (inputMethod === "image") {
        payload.skin_image = skinImage;
        if (skipFace) payload.skip_face_check = true;
      } else {
        payload.skin_tone = skinTone;
        payload.skin_type = skinType;
        payload.skin_disease = selectedDiseases.join(",");
      }

      const res = await submitOnboarding(payload);

      // Image path: show model bars one-by-one before dashboard.
      // Manual path: no scan history / bars — go straight to dashboard.
      if (inputMethod === "image" && res?.data?.predictions) {
        setPredictions(res.data.predictions);
        setResultIndex(0);
        setPhase("results");
        setSkinOnlyWarning("");
      } else if (inputMethod === "image") {
        // Profile + tracking saved even if slim predictions were missing
        navigate("/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      const body = err.response?.data;
      const errorCode = body?.data?.error_code || body?.error_code;
      const msg = body?.data?.message || body?.message || "Failed to save onboarding data.";
      const isSkinOnly =
        errorCode === "NO_FACE_SKIN" ||
        /proceed with this skin image/i.test(msg || "");

      if (isSkinOnly) {
        setSkinOnlyWarning(msg);
        setError("");
      } else {
        setSkinOnlyWarning("");
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProceedAnyway = () => {
    setSkipFaceCheck(true);
    handleSubmit(true);
  };

  // ─── Step labels ──────────────────────────────────────────
  const stepLabels = ["Age", "Input Method", inputMethod === "image" ? "Upload Photo" : "Skin Info", "Safety Info"];
  const activeResult = RESULT_KEYS[resultIndex];
  const isLastResult = resultIndex >= RESULT_KEYS.length - 1;

  if (phase === "results" && predictions && activeResult) {
    return (
      <div className="min-h-screen bg-[var(--tt-paper)] px-4 py-10 sm:px-6">
        <div className="mx-auto w-full max-w-2xl">
          <TrueToneLogo className="mb-8" />

          <div className="mb-8">
            <p className="tt-mono text-xs font-medium uppercase tracking-[0.14em] text-[var(--tt-primary)]">
              Your scan results
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--tt-ink)] sm:text-3xl">
              {activeResult.stepLabel}
            </h1>
            <p className="mt-2 text-sm text-[var(--tt-secondary)]">
              Review each model result, then open your dashboard. This scan is already saved to Skin
              Tracking.
            </p>
          </div>

          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              {RESULT_KEYS.map((item, i) => {
                const done = i < resultIndex;
                const current = i === resultIndex;
                return (
                  <div key={item.key} className="flex flex-1 flex-col items-center">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-[var(--tt-radius)] text-xs font-medium ${
                        done || current
                          ? "bg-[var(--tt-primary)] text-white"
                          : "border border-[var(--tt-border)] bg-[var(--tt-surface)] text-[var(--tt-secondary)]"
                      }`}
                    >
                      {done ? <CheckCircle2 size={14} /> : i + 1}
                    </div>
                    <span className="mt-1 hidden text-[11px] text-[var(--tt-secondary)] sm:block">
                      {item.stepLabel}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="h-1 overflow-hidden rounded-[var(--tt-radius)] bg-[var(--tt-border)]">
              <div
                className="h-full bg-[var(--tt-primary)] transition-all duration-500"
                style={{ width: `${((resultIndex + 1) / RESULT_KEYS.length) * 100}%` }}
              />
            </div>
          </div>

          <ReportPanel>
            {skinImagePreview ? (
              <div className="mb-5 flex items-center gap-3">
                <img
                  src={skinImagePreview}
                  alt="Your scan"
                  className="h-14 w-14 rounded-[var(--tt-radius)] object-cover"
                />
                <div>
                  <p className="text-sm font-semibold text-[var(--tt-ink)]">Photo used for this scan</p>
                  <p className="text-xs text-[var(--tt-secondary)]">
                    Step {resultIndex + 1} of {RESULT_KEYS.length}
                  </p>
                </div>
              </div>
            ) : null}

            <OnboardingDistributionCard
              metricKey={activeResult.key}
              title={activeResult.title}
              pred={predictions[activeResult.key]}
            />

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-[var(--tt-border)] pt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setResultIndex((i) => Math.max(0, i - 1))}
                disabled={resultIndex === 0}
              >
                <ChevronLeft size={16} /> Back
              </Button>

              {isLastResult ? (
                <Button type="button" variant="primary" onClick={() => navigate("/dashboard")}>
                  Go to Dashboard <ChevronRight size={16} />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setResultIndex((i) => Math.min(RESULT_KEYS.length - 1, i + 1))}
                >
                  Next <ChevronRight size={16} />
                </Button>
              )}
            </div>
          </ReportPanel>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--tt-paper)] px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <TrueToneLogo className="mb-8" />

        <div className="mb-8">
          <p className="tt-mono text-xs font-medium uppercase tracking-[0.14em] text-[var(--tt-primary)]">
            Onboarding
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--tt-ink)] sm:text-3xl">
            Tell us about yourself
          </h1>
          <p className="mt-2 text-sm text-[var(--tt-secondary)]">
            Complete a few quick steps so TrueTone can personalize your experience.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            {stepLabels.map((label, i) => {
              const done = i + 1 < step;
              const current = i + 1 === step;
              return (
                <div key={i} className="flex flex-1 flex-col items-center">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-[var(--tt-radius)] text-xs font-medium ${
                      done || current
                        ? "bg-[var(--tt-primary)] text-white"
                        : "border border-[var(--tt-border)] bg-[var(--tt-surface)] text-[var(--tt-secondary)]"
                    }`}
                  >
                    {done ? <CheckCircle2 size={14} /> : i + 1}
                  </div>
                  <span className="mt-1 hidden text-[11px] text-[var(--tt-secondary)] sm:block">{label}</span>
                </div>
              );
            })}
          </div>
          <div className="h-1 overflow-hidden rounded-[var(--tt-radius)] bg-[var(--tt-border)]">
            <div
              className="h-full bg-[var(--tt-primary)] transition-all duration-500"
              style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
            />
          </div>
        </div>

        <ReportPanel>
          {error ? (
            <InlineAlert tone="error" className="mb-6">
              {error}
            </InlineAlert>
          ) : null}

          {skinOnlyWarning ? (
            <div className="mb-6 rounded-[var(--tt-radius)] border border-amber-200 border-l-4 border-l-[var(--tt-caution)] bg-amber-50 p-3 text-[var(--tt-caution)]">
              <p className="text-sm font-semibold">Skin detected, no face</p>
              <p className="mt-1 text-sm">{skinOnlyWarning}</p>
              <Button
                type="button"
                variant="primary"
                className="mt-3"
                disabled={loading}
                onClick={handleProceedAnyway}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                {loading ? "Saving..." : "Proceed anyway"}
              </Button>
            </div>
          ) : null}

          {/* ─── STEP 1: Age bracket ───────────────────────── */}
          {step === 1 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-semibold text-[var(--tt-ink)]">What's your age range?</h2>
                <p className="mt-1 mb-4 text-sm text-[var(--tt-secondary)]">
                  We only ask for a range, not your exact birthdate — it's enough to personalize recommendations.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {ageBrackets.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAgeBracket(opt.value)}
                      className={`${optionClass(ageBracket === opt.value)} flex flex-col items-center gap-1 px-5 py-5 text-center`}
                    >
                      <span className="text-base font-semibold">{opt.label}</span>
                      {opt.desc ? <span className="text-xs text-[var(--tt-secondary)]">{opt.desc}</span> : null}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-[var(--tt-ink)]">What gender best describes you?</h2>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { value: "female", label: "Woman" },
                    { value: "male", label: "Man" },
                    { value: "prefer_not_to_say", label: "Prefer not to say" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setGender(option.value);
                        if (option.value === "male") setIsPregnantOrBreastfeeding(false);
                      }}
                      className={`${optionClass(gender === option.value)} px-3 py-4 text-center text-sm font-medium`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 2: Choose Input Method ──────────────── */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold text-[var(--tt-ink)]">How would you like to share your skin info?</h2>
              <p className="mt-1 mb-4 text-sm text-[var(--tt-secondary)]">
                Upload a photo for AI analysis or enter details manually.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setInputMethod("image")}
                  className={`${optionClass(inputMethod === "image")} flex flex-col items-center gap-3 px-5 py-7 text-center`}
                >
                  <Upload
                    size={28}
                    className={inputMethod === "image" ? "text-[var(--tt-primary)]" : "text-[var(--tt-secondary)]"}
                  />
                  <span className="text-base font-semibold">Upload Image</span>
                  <span className="text-xs text-[var(--tt-secondary)]">Take or upload a photo of your skin</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInputMethod("manual")}
                  className={`${optionClass(inputMethod === "manual")} flex flex-col items-center gap-3 px-5 py-7 text-center`}
                >
                  <FileText
                    size={28}
                    className={inputMethod === "manual" ? "text-[var(--tt-primary)]" : "text-[var(--tt-secondary)]"}
                  />
                  <span className="text-base font-semibold">Manual Info</span>
                  <span className="text-xs text-[var(--tt-secondary)]">Answer a few questions about your skin</span>
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Image Upload OR Manual Questions ─── */}
          {step === 3 && inputMethod === "image" && (
            <div>
              <h2 className="text-lg font-semibold text-[var(--tt-ink)]">Upload a skin photo</h2>
              <p className="mt-1 mb-4 text-sm text-[var(--tt-secondary)]">
                Our AI will analyze your skin condition from the photo.
              </p>

              {skinImagePreview ? (
                <div className="relative">
                  <img
                    src={skinImagePreview}
                    alt="Skin preview"
                    className="max-h-72 w-full rounded-[var(--tt-radius)] border border-[var(--tt-border)] object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSkinImage(null);
                      setSkinImagePreview("");
                      setSkinOnlyWarning("");
                      setSkipFaceCheck(false);
                      setError("");
                    }}
                    className="absolute top-3 right-3 rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] px-3 py-1 text-xs font-medium text-[var(--tt-avoid)] hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/bmp"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-52 w-full cursor-pointer flex-col items-center justify-center rounded-[var(--tt-radius)] border border-dashed border-[var(--tt-border)] transition-colors hover:border-[var(--tt-primary)] hover:bg-[var(--tt-primary-muted)]/40"
                  >
                    <Upload size={32} className="mb-3 text-[var(--tt-secondary)]" />
                    <span className="text-sm font-medium text-[var(--tt-ink)]">Click to upload image</span>
                    <span className="mt-1 text-xs text-[var(--tt-secondary)]">JPG, PNG, WebP up to 10MB</span>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 3 && inputMethod === "manual" && (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-semibold text-[var(--tt-ink)]">Skin Tone</h2>
                <p className="mt-1 mb-4 text-sm text-[var(--tt-secondary)]">Select the closest match to your skin tone.</p>
                <div className="grid grid-cols-3 gap-3">
                  {skinTones.map((tone) => (
                    <button
                      key={tone.value}
                      type="button"
                      onClick={() => setSkinTone(tone.value)}
                      className={`${optionClass(skinTone === tone.value)} flex flex-col items-center gap-2 px-3 py-5`}
                    >
                      <div
                        className="h-9 w-9 rounded-[var(--tt-radius)] border border-[var(--tt-border)]"
                        style={{ backgroundColor: tone.color }}
                      />
                      <span className="text-sm font-medium">{tone.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-[var(--tt-ink)]">Skin Type</h2>
                <p className="mt-1 mb-4 text-sm text-[var(--tt-secondary)]">How does your skin usually feel?</p>
                <div className="grid gap-3">
                  {skinTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setSkinType(type.value)}
                      className={optionClass(skinType === type.value)}
                    >
                      <span className="text-base font-semibold">{type.label}</span>
                      <p className="mt-0.5 text-xs text-[var(--tt-secondary)]">{type.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-[var(--tt-ink)]">Skin Conditions</h2>
                <p className="mt-1 mb-4 text-sm text-[var(--tt-secondary)]">Select any that apply (optional).</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {skinDiseases.map((disease, index) => (
                    <button
                      key={`${disease.value}-${index}`}
                      type="button"
                      onClick={() => toggleDisease(disease.value)}
                      className={`${optionClass(selectedDiseases.includes(disease.value))} flex items-start gap-3`}
                    >
                      <div
                        className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[3px] border ${
                          selectedDiseases.includes(disease.value)
                            ? "border-[var(--tt-primary)] bg-[var(--tt-primary)]"
                            : "border-[var(--tt-border)] bg-[var(--tt-surface)]"
                        }`}
                      >
                        {selectedDiseases.includes(disease.value) ? (
                          <CheckCircle2 size={12} className="text-white" />
                        ) : null}
                      </div>
                      <div>
                        <span className="text-sm font-semibold">{disease.label}</span>
                        <p className="text-xs text-[var(--tt-secondary)]">{disease.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 4: Safety info (allergies, pregnancy, current products) ─── */}
          {step === 4 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-semibold text-[var(--tt-ink)]">Known allergies or ingredient sensitivities</h2>
                <p className="mt-1 mb-4 text-sm text-[var(--tt-secondary)]">
                  We'll never recommend a product containing these. Separate with commas (e.g. fragrance, parfum, tea tree oil).
                </p>
                <Textarea
                  value={allergiesText}
                  onChange={(e) => setAllergiesText(e.target.value)}
                  placeholder="e.g. fragrance, parfum"
                  rows={2}
                />
              </div>

              {showPregnancyQuestion && (
                <div>
                  <h2 className="text-lg font-semibold text-[var(--tt-ink)]">Are you pregnant or breastfeeding?</h2>
                  <p className="mt-1 mb-4 text-sm text-[var(--tt-secondary)]">
                    Some active ingredients (like retinoids) aren't recommended during pregnancy or breastfeeding.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPregnantOrBreastfeeding(true)}
                      className={`${optionClass(isPregnantOrBreastfeeding)} text-center text-sm font-medium`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPregnantOrBreastfeeding(false)}
                      className={`${optionClass(!isPregnantOrBreastfeeding)} text-center text-sm font-medium`}
                    >
                      No
                    </button>
                  </div>
                </div>
              )}

              <div>
                <h2 className="text-lg font-semibold text-[var(--tt-ink)]">Products you're currently using</h2>
                <p className="mt-1 mb-4 text-sm text-[var(--tt-secondary)]">
                  Optional — helps us avoid recommending something you already own.
                </p>
                <Textarea
                  value={currentProductsText}
                  onChange={(e) => setCurrentProductsText(e.target.value)}
                  placeholder="e.g. CeraVe Foaming Facial Cleanser"
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* ─── Navigation ──────────────────────────────────── */}
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-[var(--tt-border)] pt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
            >
              <ChevronLeft size={16} /> Back
            </Button>

            {step < TOTAL_STEPS ? (
              <Button type="button" variant="primary" onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
                Continue <ChevronRight size={16} />
              </Button>
            ) : skinOnlyWarning ? (
              <Button
                type="button"
                variant="primary"
                onClick={handleProceedAnyway}
                disabled={loading}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                {loading ? "Saving..." : "Proceed anyway"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={() => handleSubmit(false)}
                disabled={!canProceed() || loading}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                {loading ? "Saving..." : "Finish Onboarding"}
              </Button>
            )}
          </div>
        </ReportPanel>
      </div>
    </div>
  );
};

export default Onboarding;
