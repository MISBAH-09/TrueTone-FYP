import React from "react";
import { RotateCcw, ArrowRight, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";

export const ConfirmRetakeScreen = ({
  imagePreviewUrl,
  onRetake,
  onContinue,
  modeLabel,
  error,
  skinOnlyWarning,
  onProceedAnyway,
}) => {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col overflow-hidden rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] p-5 text-[var(--tt-ink)] sm:p-6">
      <div className="mb-5 text-center">
        <span className="tt-mono text-xs font-medium uppercase tracking-[0.14em] text-[var(--tt-primary)]">
          Photo Verification
        </span>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--tt-ink)]">Review Your Photo</h2>
        <p className="mt-1 text-sm text-[var(--tt-secondary)]">
          Ensure your face is clearly visible and centered before analyzing.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-[var(--tt-radius)] border border-red-200 border-l-4 border-l-[var(--tt-avoid)] bg-red-50 p-3 text-sm text-[var(--tt-avoid)]">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {skinOnlyWarning && (
        <div className="mb-4 flex items-start gap-3 rounded-[var(--tt-radius)] border border-amber-200 border-l-4 border-l-[var(--tt-caution)] bg-amber-50 p-3 text-[var(--tt-caution)]">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <h4 className="mb-1 text-sm font-semibold">Skin Detected, No Face</h4>
            <p className="text-sm">{skinOnlyWarning}</p>
          </div>
        </div>
      )}

      <div className="relative mb-6 flex aspect-[4/5] max-h-[50vh] w-full items-center justify-center overflow-hidden rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-ink)]">
        {imagePreviewUrl ? (
          <img src={imagePreviewUrl} alt="Captured Face" className="h-full w-full object-cover" />
        ) : (
          <div className="text-sm text-white/60">No photo available</div>
        )}

        <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-[var(--tt-radius)] bg-black/65 px-2.5 py-1 text-xs font-medium text-white">
          <CheckCircle2 className="h-3.5 w-3.5 text-[var(--tt-primary-hover)]" />
          Ready for {modeLabel || "Analysis"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onRetake}
          className="inline-flex h-[var(--tt-control-h)] items-center justify-center gap-2 rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] px-3 text-sm font-medium text-[var(--tt-ink)] transition-colors hover:bg-[var(--tt-paper)]"
        >
          <RotateCcw className="h-4 w-4" />
          Retake
        </button>

        {skinOnlyWarning ? (
          <button
            onClick={onProceedAnyway}
            className="inline-flex h-[var(--tt-control-h)] items-center justify-center gap-2 rounded-[var(--tt-radius)] bg-[var(--tt-caution)] px-3 text-sm font-medium text-white transition-colors hover:opacity-90"
          >
            Proceed Anyway
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={onContinue}
            className="inline-flex h-[var(--tt-control-h)] items-center justify-center gap-2 rounded-[var(--tt-radius)] bg-[var(--tt-primary)] px-3 text-sm font-medium text-white transition-colors hover:bg-[var(--tt-primary-hover)]"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
