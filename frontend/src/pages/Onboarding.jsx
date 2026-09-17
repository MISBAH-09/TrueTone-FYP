import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, ChevronRight, ChevronLeft, Loader2, CheckCircle2 } from "lucide-react";
import { submitOnboarding } from "../services/user";

const genderOptions = [
  { value: "male", label: "Male", emoji: "👨" },
  { value: "female", label: "Female", emoji: "👩" },
  { value: "prefer_not_to_say", label: "Prefer not to say", emoji: "🤐" },
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
];

const skinDiseases = [
  { value: "comedonal_acne", label: "Comedonal Acne", desc: "Blackheads & whiteheads" },
  { value: "cystic_acne", label: "Cystic Acne", desc: "Deep, painful breakouts" },
  { value: "eczema", label: "Eczema", desc: "Itchy, inflamed patches" },
  { value: "psoriasis", label: "Psoriasis", desc: "Thick, scaly skin patches" },
  { value: "rosacea", label: "Rosacea", desc: "Facial redness & flushing" },
  { value: "tinea", label: "Tinea", desc: "Fungal skin infection" },
];

const TOTAL_STEPS = 4;

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [inputMethod, setInputMethod] = useState(""); // "image" or "manual"
  const [skinImage, setSkinImage] = useState(null);
  const [skinImagePreview, setSkinImagePreview] = useState("");
  const [skinTone, setSkinTone] = useState("");
  const [skinType, setSkinType] = useState("");
  const [selectedDiseases, setSelectedDiseases] = useState([]);
  const fileInputRef = useRef(null);

  // ─── Image handling ───────────────────────────────────────
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSkinImage(reader.result);
      setSkinImagePreview(reader.result);
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
    if (step === 1) return !!gender;
    if (step === 2) return !!dateOfBirth;
    if (step === 3) return !!inputMethod;
    if (step === 4) {
      if (inputMethod === "image") return !!skinImage;
      return !!skinTone && !!skinType;
    }
    return false;
  };

  // ─── Submit ───────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      const payload = {
        gender,
        date_of_birth: dateOfBirth,
      };

      if (inputMethod === "image") {
        payload.skin_image = skinImage;
      } else {
        payload.skin_tone = skinTone;
        payload.skin_type = skinType;
        payload.skin_disease = selectedDiseases.join(",");
      }

      await submitOnboarding(payload);
      navigate("/dashboard");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save onboarding data.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ─── Step labels ──────────────────────────────────────────
  const stepLabels = ["Gender", "Date of Birth", "Input Method", inputMethod === "image" ? "Upload Photo" : "Skin Info"];

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700">Onboarding</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">Tell us about yourself</h1>
          <p className="mt-2 text-sm text-slate-500">
            Complete a few quick steps so TrueTone can personalize your experience.
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {stepLabels.map((label, i) => (
              <div key={i} className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    i + 1 < step
                      ? "bg-emerald-600 text-white"
                      : i + 1 === step
                      ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {i + 1 < step ? <CheckCircle2 size={16} /> : i + 1}
                </div>
                <span className="text-xs text-slate-500 mt-1 hidden sm:block">{label}</span>
              </div>
            ))}
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full transition-all duration-500"
              style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* ─── STEP 1: Gender ────────────────────────────── */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">What's your gender?</h2>
              <p className="text-sm text-slate-500 mb-6">This helps us tailor skincare recommendations.</p>
              <div className="grid gap-4">
                {genderOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setGender(opt.value)}
                    className={`flex items-center gap-4 rounded-2xl border px-6 py-5 text-left transition-all ${
                      gender === opt.value
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-600"
                        : "border-slate-200 bg-white text-slate-700 hover:border-emerald-400 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-base font-semibold">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── STEP 2: Date of Birth ────────────────────── */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">When were you born?</h2>
              <p className="text-sm text-slate-500 mb-6">Your age affects skincare needs and product recommendations.</p>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full h-14 px-5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              {dateOfBirth && (
                <p className="mt-3 text-sm text-slate-500">
                  Selected: <span className="font-medium text-slate-700">{new Date(dateOfBirth).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                </p>
              )}
            </div>
          )}

          {/* ─── STEP 3: Choose Input Method ──────────────── */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">How would you like to share your skin info?</h2>
              <p className="text-sm text-slate-500 mb-6">Upload a photo for AI analysis or enter details manually.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setInputMethod("image")}
                  className={`flex flex-col items-center gap-3 rounded-2xl border px-6 py-8 transition-all ${
                    inputMethod === "image"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-600"
                      : "border-slate-200 bg-white text-slate-700 hover:border-emerald-400"
                  }`}
                >
                  <Upload size={32} className={inputMethod === "image" ? "text-emerald-600" : "text-slate-400"} />
                  <span className="text-base font-semibold">Upload Image</span>
                  <span className="text-xs text-slate-500 text-center">Take or upload a photo of your skin</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInputMethod("manual")}
                  className={`flex flex-col items-center gap-3 rounded-2xl border px-6 py-8 transition-all ${
                    inputMethod === "manual"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-600"
                      : "border-slate-200 bg-white text-slate-700 hover:border-emerald-400"
                  }`}
                >
                  <FileText size={32} className={inputMethod === "manual" ? "text-emerald-600" : "text-slate-400"} />
                  <span className="text-base font-semibold">Manual Info</span>
                  <span className="text-xs text-slate-500 text-center">Answer a few questions about your skin</span>
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 4: Image Upload OR Manual Questions ─── */}
          {step === 4 && inputMethod === "image" && (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Upload a skin photo</h2>
              <p className="text-sm text-slate-500 mb-6">Our AI will analyze your skin condition from the photo.</p>

              {skinImagePreview ? (
                <div className="relative">
                  <img
                    src={skinImagePreview}
                    alt="Skin preview"
                    className="w-full max-h-72 object-cover rounded-2xl border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => { setSkinImage(null); setSkinImagePreview(""); }}
                    className="absolute top-3 right-3 bg-white/90 text-red-500 rounded-full px-3 py-1 text-xs font-semibold shadow hover:bg-red-50"
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
                    className="flex flex-col items-center justify-center w-full h-52 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/30 transition"
                  >
                    <Upload size={36} className="text-slate-400 mb-3" />
                    <span className="text-sm font-medium text-slate-600">Click to upload image</span>
                    <span className="text-xs text-slate-400 mt-1">JPG, PNG, WebP up to 10MB</span>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 4 && inputMethod === "manual" && (
            <div className="space-y-8">
              {/* Skin Tone */}
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Skin Tone</h2>
                <p className="text-sm text-slate-500 mb-4">Select the closest match to your skin tone.</p>
                <div className="grid grid-cols-3 gap-4">
                  {skinTones.map((tone) => (
                    <button
                      key={tone.value}
                      type="button"
                      onClick={() => setSkinTone(tone.value)}
                      className={`flex flex-col items-center gap-2 rounded-2xl border px-4 py-5 transition-all ${
                        skinTone === tone.value
                          ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600"
                          : "border-slate-200 bg-white hover:border-emerald-400"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full border-2 border-white shadow" style={{ backgroundColor: tone.color }} />
                      <span className="text-sm font-semibold text-slate-700">{tone.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Skin Type */}
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Skin Type</h2>
                <p className="text-sm text-slate-500 mb-4">How does your skin usually feel?</p>
                <div className="grid gap-3">
                  {skinTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setSkinType(type.value)}
                      className={`flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all ${
                        skinType === type.value
                          ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600"
                          : "border-slate-200 bg-white hover:border-emerald-400"
                      }`}
                    >
                      <div>
                        <span className="text-base font-semibold text-slate-800">{type.label}</span>
                        <p className="text-xs text-slate-500">{type.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Skin Disease */}
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Skin Conditions</h2>
                <p className="text-sm text-slate-500 mb-4">Select any that apply (optional).</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {skinDiseases.map((disease) => (
                    <button
                      key={disease.value}
                      type="button"
                      onClick={() => toggleDisease(disease.value)}
                      className={`flex items-center gap-3 rounded-2xl border px-5 py-4 text-left transition-all ${
                        selectedDiseases.includes(disease.value)
                          ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600"
                          : "border-slate-200 bg-white hover:border-emerald-400"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedDiseases.includes(disease.value)
                          ? "border-emerald-600 bg-emerald-600"
                          : "border-slate-300"
                      }`}>
                        {selectedDiseases.includes(disease.value) && (
                          <CheckCircle2 size={14} className="text-white" />
                        )}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-slate-800">{disease.label}</span>
                        <p className="text-xs text-slate-500">{disease.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Navigation ──────────────────────────────────── */}
          <div className="mt-10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} /> Back
            </button>

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200/40 hover:bg-emerald-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canProceed() || loading}
                className="flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200/40 hover:bg-emerald-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? "Saving..." : "Finish Onboarding"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
