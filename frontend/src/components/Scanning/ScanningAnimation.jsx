import React, { useEffect, useState } from "react";

export const ScanningAnimation = ({ imagePreviewUrl, label = "ANALYZING..." }) => {
  const [activeSegments, setActiveSegments] = useState(2);
  const [showOriginal, setShowOriginal] = useState(false);
  const TOTAL_SEGMENTS = 14;

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSegments((prev) => ((prev + 1) % TOTAL_SEGMENTS) + 1);
    }, 180);
    return () => clearInterval(interval);
  }, [TOTAL_SEGMENTS]);

  return (
    <div className="tt-scan-anim mx-auto flex min-h-[520px] w-full max-w-lg flex-col items-center justify-center overflow-hidden rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] p-8 text-[var(--tt-ink)] select-none sm:p-12">
      <div className="relative mb-8 flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72">
        <div className="absolute top-0 left-0 h-7 w-7 border-t-2 border-l-2 border-[var(--tt-primary)]" />
        <div className="absolute top-0 right-0 h-7 w-7 border-t-2 border-r-2 border-[var(--tt-primary)]" />
        <div className="absolute bottom-0 left-0 h-7 w-7 border-b-2 border-l-2 border-[var(--tt-primary)]" />
        <div className="absolute right-0 bottom-0 h-7 w-7 border-r-2 border-b-2 border-[var(--tt-primary)]" />

        <div className="relative flex h-48 w-48 items-center justify-center overflow-hidden rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-paper)] sm:h-56 sm:w-56">
          {imagePreviewUrl ? (
            <img
              src={imagePreviewUrl}
              alt="Scanning Face"
              className={`h-full w-full object-cover transition-all duration-300 ${
                showOriginal ? "" : "contrast-110 grayscale-[20%]"
              }`}
            />
          ) : (
            <div className="h-full w-full bg-[var(--tt-paper)]" />
          )}

          {!showOriginal && (
            <div className="tt-scan-anim-beam pointer-events-none absolute inset-x-0 h-px bg-[var(--tt-primary)]" />
          )}
        </div>
      </div>

      <h3 className="tt-mono mb-4 text-sm font-medium tracking-[0.2em] text-[var(--tt-primary)] sm:text-base">
        {label}
      </h3>

      {imagePreviewUrl && (
        <button
          onClick={() => setShowOriginal(!showOriginal)}
          className="mb-6 inline-flex h-[var(--tt-control-h)] items-center rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] px-4 text-xs font-medium text-[var(--tt-ink)] transition-colors hover:bg-[var(--tt-paper)] sm:text-sm"
        >
          {showOriginal ? "Show Scanning" : "Show Original"}
        </button>
      )}

      <div className="flex w-full max-w-xs items-center gap-1 rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-paper)] p-1">
        {Array.from({ length: TOTAL_SEGMENTS }).map((_, index) => {
          const isActive = index < activeSegments;
          return (
            <div
              key={index}
              className={`h-2.5 flex-1 rounded-[2px] transition-colors duration-150 ${
                isActive ? "bg-[var(--tt-primary)]" : "bg-[var(--tt-border)]"
              }`}
            />
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-[var(--tt-secondary)]">
        Running parallel neural networks for skin type, tone & conditions...
      </p>

      <style>{`
        @keyframes ttScanBeam {
          0% { top: 0%; opacity: 0.25; }
          12% { opacity: 1; }
          88% { opacity: 1; }
          100% { top: 100%; opacity: 0.25; }
        }
        .tt-scan-anim-beam {
          animation: ttScanBeam 2.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .tt-scan-anim-beam {
            animation: none !important;
            top: 45%;
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
};
