import React, { useState, useRef } from "react";
import {
  Camera,
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
  HelpCircle,
  Upload,
} from "lucide-react";
import {
  analyzeAll,
  analyzeSkin,
  analyzeSkinType,
  analyzeSkinTone,
  analyzeSkinDisease,
  confirmSkinScan,
} from "../services/analysis";
import { updateUser } from "../services/user";
import { FaceCaptureScreen } from "../components/FaceCapture/FaceCaptureScreen";
import { CaptureTipsScreen } from "../components/Onboarding/CaptureTipsScreen";
import { ManualCropScreen } from "../components/Upload/ManualCropScreen";
import { ConfirmRetakeScreen } from "../components/Confirm/ConfirmRetakeScreen";
import { ScanningAnimation } from "../components/Scanning/ScanningAnimation";
import { ResultTabs } from "../components/Results/ResultTabs";
import { ZoneOverlay } from "../components/Results/ZoneOverlay";
import { HotspotOverlay } from "../components/Results/HotspotOverlay";

/* ─── Analysis mode definitions ──────────────────────────────────────────── */

const MODES = [
  {
    key: "skin_type",
    label: "Skin Type Only",
    description: "Detect if your skin is oily, dry, combination, or normal.",
    icon: Droplets,
    color: "bg-blue-100 text-blue-700",
    activeBg: "bg-blue-600 text-white border-transparent",
    apiFn: analyzeSkinType,
  },
  {
    key: "skin_tone",
    label: "Skin Tone Only",
    description: "Identify your skin tone (fair, medium, or dark).",
    icon: Palette,
    color: "bg-amber-100 text-amber-700",
    activeBg: "bg-amber-600 text-white border-transparent",
    apiFn: analyzeSkinTone,
  },
  {
    key: "skin_disease",
    label: "Diseases Only",
    description: "Screen for skin conditions like acne, eczema, or rosacea.",
    icon: ShieldAlert,
    color: "bg-rose-100 text-rose-700",
    activeBg: "bg-rose-600 text-white border-transparent",
    apiFn: analyzeSkinDisease,
  },
  {
    key: "skin",
    label: "Skin Type & Tone",
    description: "Combined analysis of your skin type and tone together.",
    icon: Layers,
    color: "bg-violet-100 text-violet-700",
    activeBg: "bg-violet-600 text-white border-transparent",
    apiFn: analyzeSkin,
  },
  {
    key: "all",
    label: "Full Analysis",
    description: "Complete report (skin type, tone, and condition screening).",
    icon: Sparkles,
    color: "bg-emerald-100 text-emerald-700",
    activeBg: "bg-emerald-600 text-white border-transparent",
    apiFn: analyzeAll,
  },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const capitalize = (s) =>
  s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";

const pctBar = (value) => `${Math.round(value * 100)}%`;

/* ═══════════════════════════════════════════════════════════════════════════ */

const SkinAnalysis = () => {
  // Stages: select | upload | onboarding | camera | manual_crop | confirm | scanning | results
  const [stage, setStage] = useState("select");
  const [selectedMode, setSelectedMode] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [skinOnlyWarning, setSkinOnlyWarning] = useState(null);
  const [skipFaceCheck, setSkipFaceCheck] = useState(false);

  // Flow State
  const [rawUploadUrl, setRawUploadUrl] = useState(null);
  const [confirmedFile, setConfirmedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [captureOrigin, setCaptureOrigin] = useState("camera"); // 'camera' | 'upload'
  const [activeTabKey, setActiveTabKey] = useState("skin_type");
  const [saveState, setSaveState] = useState("idle"); // idle | confirming | saving | saved | error
  const [saveError, setSaveError] = useState("");
  const [savedChanges, setSavedChanges] = useState(null);

  const fileInputRef = useRef(null);

  /* ── Select a mode and move to upload choice ──────────────────────────── */
  const handleModeSelect = (mode) => {
    setSelectedMode(mode);
    setStage("upload");
    setError(null);
    setSkinOnlyWarning(null);
    setSkipFaceCheck(false);
  };

  /* ── Live Smart Scan clicked ──────────────────────────────────────────── */
  const handleStartSmartScan = () => {
    const tipsCount = parseInt(localStorage.getItem("truetone_tips_count") || "0", 10);
    if (tipsCount < 3) {
      setStage("onboarding");
    } else {
      setStage("camera");
    }
  };

  /* ── File selected → Open manual crop screen ─────────────────────────── */
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (rawUploadUrl) URL.revokeObjectURL(rawUploadUrl);
    const objectUrl = URL.createObjectURL(file);
    setRawUploadUrl(objectUrl);
    setSkinOnlyWarning(null);
    setSkipFaceCheck(false);
    setStage("manual_crop");
  };

  /* ── Manual crop applied → proceed to Confirm/Retake ─────────────────── */
  const handleManualCropApply = (croppedFileOrBlob) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const croppedUrl = URL.createObjectURL(croppedFileOrBlob);

    setConfirmedFile(croppedFileOrBlob);
    setPreviewUrl(croppedUrl);
    setCaptureOrigin("upload");
    setStage("confirm");
  };

  /* ── Camera capture success → proceed to Confirm/Retake ──────────────── */
  const handleCameraCaptureSuccess = (capturedFile) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(capturedFile);

    setConfirmedFile(capturedFile);
    setPreviewUrl(url);
    setCaptureOrigin("camera");
    setStage("confirm");
  };

  /* ── Confirm/Retake actions ───────────────────────────────────────────── */
  const handleRetake = () => {
    setSkinOnlyWarning(null);
    setSkipFaceCheck(false);
    if (captureOrigin === "camera") {
      setStage("camera");
    } else {
      if (rawUploadUrl) {
        setStage("manual_crop");
      } else {
        setStage("upload");
      }
    }
  };

  /* ── Submit Analysis (Runs Scanning Animation in parallel) ───────────── */
  const handleConfirmAndAnalyze = async (forceSkip = false) => {
    if (!confirmedFile || !selectedMode) return;

    setStage("scanning");
    setError(null);

    // Minimum animation duration so the scanning animation runs smoothly
    const minWait = new Promise((resolve) => setTimeout(resolve, 1800));
    const isForceSkip = forceSkip === true || skipFaceCheck === true;
    const apiCall = selectedMode.apiFn(confirmedFile, isForceSkip);

    try {
      const [_, responsePayload] = await Promise.all([minWait, apiCall]);

      if (!responsePayload.success || responsePayload.data?.status === "error") {
        setError(responsePayload.data?.message || responsePayload.message || "Analysis failed. Please try again.");
        setStage("confirm");
        return;
      }

      const resultsData = responsePayload.data;
      setResults(resultsData);

      // Determine initial active tab
      const keys = visibleKeysForMode(selectedMode.key);
      if (keys.length > 0) {
        setActiveTabKey(keys[0]);
      }

      setStage("results");

      // Auto-update user profile in background if logged in
      const token = localStorage.getItem("truetone_token");
      if (token) {
        const updates = {};
        if (resultsData.predictions?.skin_type?.label)
          updates.skin_type = resultsData.predictions.skin_type.label;
        if (resultsData.predictions?.skin_tone?.label)
          updates.skin_tone = resultsData.predictions.skin_tone.label;
        if (resultsData.predictions?.skin_disease) {
          updates.skin_disease = resultsData.predictions.skin_disease.disease_detected
            ? resultsData.predictions.skin_disease.label
            : "";
        }

        if (Object.keys(updates).length > 0) {
          try {
            await updateUser(updates);
          } catch (updateErr) {
            console.error("Profile update failed:", updateErr);
          }
        }
      }
    } catch (err) {
      console.error("Analysis API error:", err);
      const backendErrorData = err.response?.data?.data;
      
      if (backendErrorData?.error_code === "NO_FACE_NO_SKIN") {
        setError(backendErrorData.message);
        setStage("upload");
        return;
      } else if (backendErrorData?.error_code === "NO_FACE_SKIN") {
        setSkinOnlyWarning(backendErrorData.message);
        setStage("confirm");
        return;
      }

      const msg =
        err.response?.data?.message ||
        err.message ||
        "Something went wrong. Please try again.";
      setError(msg);
      setStage("confirm");
    }
  };

  /* ── Reset everything ─────────────────────────────────────────────────── */
  const handleReset = () => {
    setStage("select");
    setSelectedMode(null);
    setResults(null);
    setError(null);
    setSkinOnlyWarning(null);
    setSkipFaceCheck(false);
    setConfirmedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (rawUploadUrl) {
      URL.revokeObjectURL(rawUploadUrl);
      setRawUploadUrl(null);
    }
    setSaveState("idle");
    setSaveError("");
    setSavedChanges(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmSave = async () => {
    setSaveState("saving");
    setSaveError("");
    try {
      const data = await confirmSkinScan(
        results.predictions,
        confirmedFile,
        results.images?.results || results.images?.heatmap
      );
      if (data.success) {
        setSavedChanges(data.data?.changes || {});
        setSaveState("saved");
      } else {
        setSaveError(data.message || "Couldn't save this scan.");
        setSaveState("error");
      }
    } catch (err) {
      setSaveError(err.response?.data?.message || "Couldn't save this scan.");
      setSaveState("error");
    }
  };

  /* ── Helpers for keys ─────────────────────────────────────────────────── */
  const visibleKeysForMode = (modeKey) => {
    const map = {
      skin_type: ["skin_type"],
      skin_tone: ["skin_tone"],
      skin_disease: ["skin_disease"],
      skin: ["skin_type", "skin_tone"],
      all: ["skin_type", "skin_tone", "skin_disease"],
    };
    return map[modeKey] || ["skin_type"];
  };

  const visibleKeys = () =>
    selectedMode ? visibleKeysForMode(selectedMode.key) : [];

  /* ── Build tabs for ResultTabs ────────────────────────────────────────── */
  const buildResultTabs = () => {
    if (!results?.predictions) return [];
    const keys = visibleKeys();

    return keys.map((key) => {
      const pred = results.predictions[key];
      if (key === "skin_type") {
        return {
          key: "skin_type",
          label: "Skin Type",
          confidence: pred?.confidence ?? 0.75,
          activeBg: "bg-orange-500 text-white ring-4 ring-orange-200",
        };
      }
      if (key === "skin_tone") {
        return {
          key: "skin_tone",
          label: "Skin Tone",
          confidence: pred?.confidence ?? 0.8,
          activeBg: "bg-amber-600 text-white ring-4 ring-amber-200",
        };
      }
      return {
        key: "skin_disease",
        label: pred?.disease_detected
          ? "Skin Disease"
          : "Skin Health",
        confidence: pred?.confidence ?? 0.85,
        activeBg: pred?.disease_detected
          ? "bg-rose-500 text-white ring-4 ring-rose-200"
          : "bg-emerald-500 text-white ring-4 ring-emerald-200",
      };
    });
  };

  /* ═════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-slate-50 px-4 sm:px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header (Only on select, upload, or results) */}
        {["select", "upload", "results"].includes(stage) && (
          <div>
            <p className="text-sm font-semibold text-emerald-600 tracking-wide uppercase">
              TrueTone AI Dermatological Lab
            </p>
            <h1 className="text-3xl font-extrabold text-slate-900 mt-1">
              {stage === "select" && "Choose Analysis Type"}
              {stage === "upload" && "Select Photo Capture Method"}
              {stage === "results" && "Clinical Analysis Report"}
            </h1>
            <p className="mt-1.5 text-slate-600 text-sm sm:text-base">
              {stage === "select" &&
                "Select what specific dermatological properties you want our AI models to analyze."}
              {stage === "upload" &&
                "Use our guided real-time Smart Scan or upload a high-resolution photo."}
              {stage === "results" &&
                "Explore per-metric anatomical zone overlays, confidence distributions, and recommendations."}
            </p>
          </div>
        )}

        {/* ─── STAGE 1: SELECT MODE ─────────────────────────────────────── */}
        {stage === "select" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODES.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.key}
                  onClick={() => handleModeSelect(mode)}
                  className="group rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:shadow-md hover:border-emerald-300 hover:-translate-y-0.5 focus:outline-none"
                >
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${mode.color} transition group-hover:scale-110`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg">
                    {mode.label}
                  </h3>
                  <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                    {mode.description}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* ─── STAGE 2: UPLOAD OR SCAN CHOICE ───────────────────────────── */}
        {stage === "upload" && (
          <div className="space-y-4 max-w-2xl mx-auto">
            <button
              onClick={() => setStage("select")}
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Change analysis type
            </button>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm text-center">
              {selectedMode && (
                <div className="mb-6 flex justify-center">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${selectedMode.color}`}
                  >
                    <selectedMode.icon className="h-4 w-4" />
                    {selectedMode.label}
                  </span>
                </div>
              )}

              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700">
                <Camera className="w-10 h-10" />
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Capture or Upload Your Photo
              </h3>
              <p className="text-slate-600 text-sm max-w-md mx-auto">
                For optimal diagnostic precision, ensure good frontal lighting,
                a neutral expression, and hair away from your forehead.
              </p>

              {error && (
                <div className="mx-auto mt-4 flex max-w-md items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/bmp"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                <button
                  onClick={handleStartSmartScan}
                  className="w-full sm:w-auto rounded-full bg-emerald-600 hover:bg-emerald-700 px-8 py-3.5 text-sm font-bold text-white transition shadow-md flex justify-center items-center gap-2 active:scale-95"
                >
                  <Camera className="w-4 h-4" /> Smart Face Scan
                </button>
                <span className="text-slate-400 text-sm font-medium">or</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto rounded-full bg-white border border-slate-300 hover:bg-slate-50 px-8 py-3.5 text-sm font-bold text-slate-700 transition flex justify-center items-center gap-2 active:scale-95 shadow-sm"
                >
                  <Upload className="w-4 h-4" /> Upload Existing Photo
                </button>
              </div>

              {/* Tips Help Link */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-center">
                <button
                  onClick={() => setStage("onboarding")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  View photo capture tips & requirements
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── STAGE 3: ONBOARDING TIPS ─────────────────────────────────── */}
        {stage === "onboarding" && (
          <CaptureTipsScreen
            onContinue={() => {
              const currentCount = parseInt(localStorage.getItem("truetone_tips_count") || "0", 10);
              localStorage.setItem("truetone_tips_count", (currentCount + 1).toString());
              setStage("camera");
            }}
            onBack={() => setStage("upload")}
          />
        )}

        {/* ─── STAGE 4: LIVE OVAL CAMERA SCAN ───────────────────────────── */}
        {stage === "camera" && (
          <div className="w-full max-w-2xl mx-auto">
            <FaceCaptureScreen
              onCaptureSuccess={handleCameraCaptureSuccess}
              onCancel={() => setStage("upload")}
            />
          </div>
        )}

        {/* ─── STAGE 5: UPLOAD MANUAL CROP ──────────────────────────────── */}
        {stage === "manual_crop" && rawUploadUrl && (
          <ManualCropScreen
            imageSrc={rawUploadUrl}
            onApply={handleManualCropApply}
            onCancel={() => setStage("upload")}
          />
        )}

        {/* ─── STAGE 6: CONFIRM / RETAKE ────────────────────────────────── */}
        {stage === "confirm" && (
          <ConfirmRetakeScreen
            imagePreviewUrl={previewUrl}
            modeLabel={selectedMode?.label}
            onRetake={handleRetake}
            onContinue={handleConfirmAndAnalyze}
            error={error}
            skinOnlyWarning={skinOnlyWarning}
            onProceedAnyway={() => {
              setSkipFaceCheck(true);
              setSkinOnlyWarning(null);
              handleConfirmAndAnalyze(true);
            }}
          />
        )}

        {/* ─── STAGE 7: SCANNING ANIMATION ──────────────────────────────── */}
        {stage === "scanning" && (
          <ScanningAnimation
            imagePreviewUrl={previewUrl}
            label="ANALYZING..."
          />
        )}

        {/* ─── STAGE 8: RESULTS REPORT WITH TEMPLATE-ZONE OVERLAYS ──────── */}
        {stage === "results" && results && (
          <div className="space-y-6 animate-fadeIn">
            {/* Action Bar */}
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${selectedMode?.color}`}
              >
                {selectedMode && <selectedMode.icon className="h-4 w-4" />}
                {selectedMode?.label}
              </span>
              <div className="flex items-center gap-2">
                {selectedMode?.key === "all" && saveState === "idle" && (
                  <button
                    onClick={() => setSaveState("confirming")}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition shadow-sm active:scale-95"
                  >
                    Save to my profile
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm active:scale-95"
                >
                  <RotateCcw className="h-4 w-4" />
                  New Analysis
                </button>
              </div>
            </div>

            {/* Confirm-save panel - only for a full ("all") scan */}
            {saveState === "confirming" && (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
                <p className="text-sm font-semibold text-emerald-900">
                  Update your saved profile with this result?
                </p>
                <p className="mt-1 text-xs text-emerald-700">
                  This replaces your current skin type, tone, and condition on file, and your
                  Recommendations will refresh to match. It's also logged to Skin Tracking.
                </p>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleConfirmSave}
                    className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                  >
                    Yes, update my profile
                  </button>
                  <button
                    onClick={() => setSaveState("idle")}
                    className="rounded-full border border-emerald-300 bg-white px-5 py-2 text-sm text-emerald-800 hover:bg-emerald-100 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {saveState === "saving" && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500">
                Saving…
              </div>
            )}

            {saveState === "saved" && (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
                <p className="text-sm font-semibold text-emerald-900">Profile updated.</p>
                {savedChanges && Object.keys(savedChanges).length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-emerald-700">
                    {Object.entries(savedChanges).map(([field, change]) => (
                      <li key={field}>
                        {field.replace("_", " ")}: {change.from || "(none)"} → {change.to || "(none)"}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-emerald-700">
                    No change from your last saved profile - logged anyway for your tracking history.
                  </p>
                )}
                <a
                  href="/recommendations"
                  className="mt-3 inline-block text-sm font-semibold text-emerald-700 underline"
                >
                  View updated recommendations →
                </a>
              </div>
            )}

            {saveState === "error" && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700">
                {saveError}
              </div>
            )}

            {/* Warnings */}
            {results.warnings?.length > 0 && (
              <div className="space-y-2">
                {results.warnings.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800"
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {w}
                  </div>
                ))}
              </div>
            )}

            {/* Main Interactive Facial Visualizer (Cetaphil-Style) */}
            <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm flex flex-col items-center">
              {/* Active Metric Overlay Component */}
              <div className="w-full max-w-md mx-auto">
                {(() => {
                  const baseImageStr = results.image_info?.display_image_base64 
                    ? `data:image/jpeg;base64,${results.image_info.display_image_base64}`
                    : previewUrl;

                  return (
                    <>
                      {activeTabKey === "skin_type" && results.predictions?.skin_type && (
                        <ZoneOverlay
                          overlayBase64={
                            results.predictions.skin_type.zone_overlay_base64 ||
                            results.predictions.skin_type.marker_base64
                          }
                          heatmapBase64={results.predictions.skin_type.heatmap_base64}
                          baseImage={baseImageStr}
                    legend={results.predictions.skin_type.legend}
                    badgeTitle={`${capitalize(
                      results.predictions.skin_type.label
                    )} Skin`}
                    badgeBgColor={
                      results.predictions.skin_type.label === "dry"
                        ? "bg-blue-500"
                        : results.predictions.skin_type.label === "normal"
                        ? "bg-emerald-600"
                        : "bg-orange-500"
                    }
                  />
                )}

                {activeTabKey === "skin_tone" && results.predictions?.skin_tone && (
                  <ZoneOverlay
                    overlayBase64={
                      results.predictions.skin_tone.zone_overlay_base64 ||
                      results.predictions.skin_tone.marker_base64
                    }
                    heatmapBase64={results.predictions.skin_tone.heatmap_base64}
                    baseImage={baseImageStr}
                    legend={results.predictions.skin_tone.legend}
                    badgeTitle={`${capitalize(
                      results.predictions.skin_tone.label
                    )} Undertone`}
                    badgeBgColor="bg-amber-600"
                  />
                )}

                {activeTabKey === "skin_disease" &&
                  results.predictions?.skin_disease && (
                    <HotspotOverlay
                      markerBase64={
                        results.predictions.skin_disease.marker_base64
                      }
                      heatmapBase64={
                        results.predictions.skin_disease.heatmap_base64
                      }
                      baseImage={baseImageStr}
                      diseaseDetected={
                        results.predictions.skin_disease.disease_detected
                      }
                      legend={results.predictions.skin_disease.legend}
                      badgeTitle={
                        results.predictions.skin_disease.disease_detected
                          ? capitalize(results.predictions.skin_disease.label)
                          : "No Condition Detected"
                      }
                    />
                  )}
                    </>
                  );
                })()}
              </div>

              {/* Per-Metric Tab Switcher Bar matching reference images 5 and 14 */}
              <div className="mt-4 w-full border-t border-slate-100 pt-3">
                <ResultTabs
                  tabs={buildResultTabs()}
                  activeTabKey={activeTabKey}
                  onSelectTab={(key) => setActiveTabKey(key)}
                />
              </div>
            </div>

            {/* Detail Distribution Cards Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {visibleKeys().map((key) => {
                const pred = results.predictions?.[key];
                if (!pred) return null;

                const title =
                  key === "skin_type"
                    ? "Skin Type Distribution"
                    : key === "skin_tone"
                    ? "Skin Tone Distribution"
                    : "Condition Screening Distribution";

                const iconColor =
                  key === "skin_type"
                    ? "bg-orange-100 text-orange-700"
                    : key === "skin_tone"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-rose-100 text-rose-700";

                return (
                  <div
                    key={key}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-2xl ${iconColor}`}
                          >
                            <BarChart3 className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900">{title}</h3>
                            <p className="text-xs text-slate-500">
                              Top prediction:{" "}
                              <span className="font-bold text-slate-800">
                                {capitalize(pred.label)}
                              </span>{" "}
                              ({Math.round(pred.confidence * 100)}%)
                            </p>
                          </div>
                        </div>

                        {/* Confidence Pill */}
                        <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-full">
                          {Math.round(pred.confidence * 100)}%
                        </span>
                      </div>

                      {/* Percentage Distribution Bars (Section 9.6) */}
                      <div className="space-y-3.5 my-4">
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
                                          ? "font-bold text-slate-900"
                                          : "text-slate-600"
                                      }`}
                                    >
                                      {capitalize(cls)}
                                      {isTop && (
                                        <CheckCircle2 className="ml-1.5 inline h-3.5 w-3.5 text-emerald-600" />
                                      )}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-400">
                                      {pctBar(prob)}
                                    </span>
                                  </div>
                                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                      className={`h-2 rounded-full transition-all duration-700 ${
                                        isTop
                                          ? "bg-emerald-500"
                                          : "bg-slate-300"
                                      }`}
                                      style={{ width: pctBar(prob) }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                      </div>
                    </div>

                    {/* Condition Status Alert */}
                    {key === "skin_disease" && (
                      <div
                        className={`mt-4 rounded-2xl px-4 py-3 text-sm font-medium ${
                          pred.disease_detected
                            ? "bg-rose-50 text-rose-800 border border-rose-200"
                            : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        {pred.disease_detected ? (
                          <span className="flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                            {capitalize(pred.label)} detected. TrueTone is an AI
                            screening aid. Please consult a dermatologist.
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                            No clinical skin conditions detected in scanned zones.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Latency info */}
            {results.latency_ms && (
              <p className="text-center text-xs text-slate-400">
                Processed in {results.latency_ms.total_ms}ms (inference:{" "}
                {results.latency_ms.parallel_wall_ms ||
                  results.latency_ms.inference_wall_ms}
                ms)
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SkinAnalysis;
