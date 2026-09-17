import { useState, useRef } from "react";
import {
  Camera,
  Search,
  Layers,
  Droplets,
  Palette,
  ShieldAlert,
  Sparkles,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import {
  analyzeAll,
  analyzeSkin,
  analyzeSkinType,
  analyzeSkinTone,
  analyzeSkinDisease,
} from "../services/analysis";

/* ─── Analysis mode definitions ──────────────────────────────────────────── */

const MODES = [
  {
    key: "skin_type",
    label: "Skin Type Only",
    description: "Detect if your skin is oily, dry, combination, or normal.",
    icon: Droplets,
    color: "bg-blue-100 text-blue-700",
    apiFn: analyzeSkinType,
  },
  {
    key: "skin_tone",
    label: "Skin Tone Only",
    description: "Identify your skin tone — fair, medium, or dark.",
    icon: Palette,
    color: "bg-amber-100 text-amber-700",
    apiFn: analyzeSkinTone,
  },
  {
    key: "skin_disease",
    label: "Diseases Only",
    description: "Screen for skin conditions like acne, eczema, or rosacea.",
    icon: ShieldAlert,
    color: "bg-rose-100 text-rose-700",
    apiFn: analyzeSkinDisease,
  },
  {
    key: "skin",
    label: "Skin Type & Tone",
    description: "Combined analysis of your skin type and tone together.",
    icon: Layers,
    color: "bg-violet-100 text-violet-700",
    apiFn: analyzeSkin,
  },
  {
    key: "all",
    label: "Full Analysis",
    description: "Complete report — skin type, tone, and disease screening.",
    icon: Sparkles,
    color: "bg-emerald-100 text-emerald-700",
    apiFn: analyzeAll,
  },
];

/* ─── Static AI recommendations ──────────────────────────────────────────── */

const STATIC_RECOMMENDATIONS = [
  "Use a gentle, fragrance-free cleanser twice daily",
  "Apply broad-spectrum SPF 30+ sunscreen every morning",
  "Support skin hydration with a hyaluronic acid serum",
  "Avoid alcohol-based toners and astringents",
  "Drink at least 8 glasses of water daily",
  "Get 7–9 hours of quality sleep each night",
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const capitalize = (s) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";

const pctBar = (value) => `${Math.round(value * 100)}%`;

/* ═══════════════════════════════════════════════════════════════════════════ */

const SkinAnalysis = () => {
  const [stage, setStage] = useState("select"); // select | upload | loading | done
  const [selectedMode, setSelectedMode] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  /* ── Select a mode and move to upload ─────────────────────────────────── */
  const handleModeSelect = (mode) => {
    setSelectedMode(mode);
    setStage("upload");
    setError(null);
  };

  /* ── Trigger hidden file input ────────────────────────────────────────── */
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  /* ── File selected → call API ─────────────────────────────────────────── */
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStage("loading");
    setError(null);

    try {
      const data = await selectedMode.apiFn(file);

      if (data.status === "error") {
        setError(data.message || "Analysis failed. Please try again.");
        setStage("upload");
        return;
      }

      setResults(data);
      setStage("done");
    } catch (err) {
      console.error("Analysis API error:", err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Something went wrong. Please try again.";
      setError(msg);
      setStage("upload");
    }
  };

  /* ── Reset everything ─────────────────────────────────────────────────── */
  const handleReset = () => {
    setStage("select");
    setSelectedMode(null);
    setResults(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleBack = () => {
    if (stage === "upload") {
      setStage("select");
      setSelectedMode(null);
      setError(null);
    }
  };

  /* ── Which prediction keys to show based on mode ──────────────────────── */
  const visibleKeys = () => {
    if (!selectedMode) return [];
    const map = {
      skin_type: ["skin_type"],
      skin_tone: ["skin_tone"],
      skin_disease: ["skin_disease"],
      skin: ["skin_type", "skin_tone"],
      all: ["skin_type", "skin_tone", "skin_disease"],
    };
    return map[selectedMode.key] || [];
  };

  /* ═════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div>
          <p className="text-sm text-slate-500">Skin Analysis</p>
          <h1 className="text-3xl font-bold">
            {stage === "select" && "Choose Analysis Type"}
            {stage === "upload" && "Upload a Skin Photo"}
            {stage === "loading" && "Analyzing..."}
            {stage === "done" && "Analysis Results"}
          </h1>
          <p className="mt-2 text-slate-600">
            {stage === "select" &&
              "Select what you'd like TrueTone to analyze."}
            {stage === "upload" &&
              "Upload a clear, well-lit photo of your face without makeup."}
            {stage === "loading" &&
              "Our AI models are processing your image."}
            {stage === "done" &&
              "Here's what our AI detected from your photo."}
          </p>
        </div>

        {/* ─── STAGE: SELECT MODE ─────────────────────────────────────── */}

        {stage === "select" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODES.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.key}
                  onClick={() => handleModeSelect(mode)}
                  className="group rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5"
                >
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${mode.color} transition group-hover:scale-110`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-slate-900">{mode.label}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {mode.description}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* ─── STAGE: UPLOAD ──────────────────────────────────────────── */}

        {stage === "upload" && (
          <div className="space-y-4">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Change analysis type
            </button>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm text-center">
              {/* Mode badge */}
              {selectedMode && (
                <div className="mb-6 flex justify-center">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${selectedMode.color}`}
                  >
                    <selectedMode.icon className="h-4 w-4" />
                    {selectedMode.label}
                  </span>
                </div>
              )}

              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700">
                <Camera className="w-8 h-8" />
              </div>
              <p className="text-slate-700">
                Upload a clear, well-lit photo of your face without makeup.
              </p>

              {/* Error message */}
              {error && (
                <div className="mx-auto mt-4 flex max-w-md items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/bmp"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                onClick={handleUploadClick}
                className="mt-8 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition"
              >
                Upload Photo
              </button>
            </div>
          </div>
        )}

        {/* ─── STAGE: LOADING ─────────────────────────────────────────── */}

        {stage === "loading" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700 animate-pulse">
              <Search className="w-8 h-8" />
            </div>
            <p className="text-slate-700">
              Analyzing your skin… this may take a moment.
            </p>
            {selectedMode && (
              <p className="mt-2 text-sm text-slate-400">
                Running: {selectedMode.label}
              </p>
            )}
          </div>
        )}

        {/* ─── STAGE: RESULTS ─────────────────────────────────────────── */}

        {stage === "done" && results && (
          <div className="space-y-6">
            {/* Action bar */}
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${selectedMode?.color}`}
              >
                <selectedMode.icon className="h-4 w-4" />
                {selectedMode?.label}
              </span>
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
              >
                <RotateCcw className="h-4 w-4" />
                New Analysis
              </button>
            </div>

            {/* Warnings */}
            {results.warnings?.length > 0 && (
              <div className="space-y-2">
                {results.warnings.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800"
                  >
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {w}
                  </div>
                ))}
              </div>
            )}

            {/* Summary card — show detected values */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                {visibleKeys().includes("skin_type") &&
                  results.predictions?.skin_type && (
                    <div>
                      <p className="text-sm text-slate-500">
                        Detected Skin Type
                      </p>
                      <h2 className="text-2xl font-semibold text-slate-900">
                        {capitalize(results.predictions.skin_type.label)}
                      </h2>
                    </div>
                  )}

                {visibleKeys().includes("skin_tone") &&
                  results.predictions?.skin_tone && (
                    <div>
                      <p className="text-sm text-slate-500">Skin Tone</p>
                      <p className="text-lg font-medium text-slate-900">
                        {capitalize(results.predictions.skin_tone.label)}
                      </p>
                    </div>
                  )}

                {visibleKeys().includes("skin_disease") &&
                  results.predictions?.skin_disease && (
                    <div>
                      <p className="text-sm text-slate-500">
                        Disease Screening
                      </p>
                      <p className="text-lg font-medium text-slate-900">
                        {results.predictions.skin_disease.disease_detected
                          ? capitalize(results.predictions.skin_disease.label)
                          : "None Detected"}
                      </p>
                    </div>
                  )}

                {/* Confidence score badge — use the primary prediction */}
                {(() => {
                  const keys = visibleKeys();
                  const primary = keys[0];
                  const conf = results.predictions?.[primary]?.confidence;
                  if (conf == null) return null;
                  return (
                    <div className="rounded-3xl bg-emerald-50 px-5 py-3 text-emerald-700">
                      <p className="text-sm">Confidence</p>
                      <p className="text-2xl font-bold">
                        {Math.round(conf * 100)}%
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Detail cards grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Distribution cards for each visible prediction */}
              {visibleKeys().map((key) => {
                const pred = results.predictions?.[key];
                if (!pred) return null;

                const title =
                  key === "skin_type"
                    ? "Skin Type Distribution"
                    : key === "skin_tone"
                    ? "Skin Tone Distribution"
                    : "Disease Screening Distribution";

                const iconColor =
                  key === "skin_type"
                    ? "bg-blue-100 text-blue-700"
                    : key === "skin_tone"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-rose-100 text-rose-700";

                return (
                  <div
                    key={key}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-2xl ${iconColor}`}
                      >
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <h3 className="font-semibold text-slate-900">{title}</h3>
                    </div>

                    <div className="space-y-3">
                      {pred.distribution &&
                        Object.entries(pred.distribution)
                          .sort(([, a], [, b]) => b - a)
                          .map(([cls, prob]) => {
                            const isTop = cls === pred.label;
                            return (
                              <div key={cls}>
                                <div className="flex items-center justify-between mb-1">
                                  <span
                                    className={`text-sm ${
                                      isTop
                                        ? "font-semibold text-slate-900"
                                        : "text-slate-600"
                                    }`}
                                  >
                                    {capitalize(cls)}
                                    {isTop && (
                                      <CheckCircle2 className="ml-1 inline h-3.5 w-3.5 text-emerald-600" />
                                    )}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    {pctBar(prob)}
                                  </span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-slate-100">
                                  <div
                                    className={`h-2 rounded-full transition-all duration-700 ${
                                      isTop ? "bg-emerald-500" : "bg-slate-300"
                                    }`}
                                    style={{
                                      width: pctBar(prob),
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                    </div>

                    {/* Disease-specific flag */}
                    {key === "skin_disease" && (
                      <div
                        className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
                          pred.disease_detected
                            ? "bg-rose-50 text-rose-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {pred.disease_detected ? (
                          <span className="flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4" />
                            Condition detected — consult a dermatologist for
                            confirmation.
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            No skin conditions detected.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* AI Recommendations — always static */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-slate-900">
                    AI Recommendations
                  </h3>
                </div>
                <ul className="space-y-3">
                  {STATIC_RECOMMENDATIONS.map((item) => (
                    <li
                      key={item}
                      className="rounded-2xl bg-slate-50 p-4 text-slate-700 text-sm"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Latency info */}
            {results.latency_ms && (
              <p className="text-center text-xs text-slate-400">
                Processed in {results.latency_ms.total_ms}ms
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SkinAnalysis;
