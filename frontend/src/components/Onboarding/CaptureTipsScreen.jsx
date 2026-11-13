import React from "react";
import { ArrowLeft, Check, X, CheckCircle2 } from "lucide-react";

export const CaptureTipsScreen = ({ onContinue, onBack }) => {
  return (
    <div className="relative mx-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] p-5 text-[var(--tt-ink)] sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="rounded-[var(--tt-radius)] p-2 text-[var(--tt-secondary)] transition hover:bg-[var(--tt-paper)] hover:text-[var(--tt-ink)]"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <h2 className="text-xl font-semibold text-[var(--tt-ink)]">Take the right photo</h2>
        </div>
        <button
          onClick={onContinue}
          className="rounded-[var(--tt-radius)] p-2 text-[var(--tt-secondary)] transition hover:bg-[var(--tt-paper)] hover:text-[var(--tt-ink)]"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-5 text-center">
        <span className="tt-mono text-xs font-medium uppercase tracking-[0.14em] text-[var(--tt-primary)]">
          Optimal Facial Alignment Guidelines
        </span>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center">
          <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[var(--tt-radius)] border border-[var(--tt-safe)] bg-[var(--tt-surface)]">
            <img
              src="/images/capture-tips-front.png"
              alt="Correct Front Pose"
              className="h-full w-full scale-110 object-cover"
            />
          </div>
          <div className="mt-2 inline-flex items-center gap-1 rounded-[var(--tt-radius)] bg-[var(--tt-safe)] px-2 py-1 text-[10px] font-medium text-white sm:text-xs">
            <Check className="h-3 w-3" />
            CORRECT
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[var(--tt-radius)] border border-[var(--tt-avoid)] bg-[var(--tt-surface)] opacity-90">
            <img
              src="/images/capture-tips-side.png"
              alt="Incorrect Side Pose"
              className="h-full w-full scale-110 object-cover"
            />
          </div>
          <div className="mt-2 inline-flex items-center gap-1 rounded-[var(--tt-radius)] bg-[var(--tt-avoid)] px-2 py-1 text-[10px] font-medium text-white sm:text-xs">
            <X className="h-3 w-3" />
            INCORRECT
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[var(--tt-radius)] border border-[var(--tt-avoid)] bg-[var(--tt-surface)] opacity-90">
            <img
              src="/images/capture-tips-glasses.png"
              alt="Incorrect Glasses Pose"
              className="h-full w-full scale-110 object-cover"
            />
          </div>
          <div className="mt-2 inline-flex items-center gap-1 rounded-[var(--tt-radius)] bg-[var(--tt-avoid)] px-2 py-1 text-[10px] font-medium text-white sm:text-xs">
            <X className="h-3 w-3" />
            INCORRECT
          </div>
        </div>
      </div>

      <ul className="mb-6 space-y-2.5 px-1 text-xs text-[var(--tt-secondary)] sm:text-sm">
        {[
          "Ensure adequate frontal lighting; avoid strong backlighting.",
          "Center your face perfectly within the alignment oval.",
          "Maintain a completely neutral expression with your eyes open.",
          "Ensure your entire face is clearly visible (remove glasses).",
          "Keep the camera steady to avoid motion blur.",
        ].map((item, idx) => (
          <li key={idx} className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tt-primary)]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onContinue}
        className="inline-flex h-[var(--tt-control-h)] w-full items-center justify-center rounded-[var(--tt-radius)] bg-[var(--tt-primary)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--tt-primary-hover)]"
      >
        Got It
      </button>
    </div>
  );
};
