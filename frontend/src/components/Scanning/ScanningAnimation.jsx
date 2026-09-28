import React, { useEffect, useState } from 'react';

export const ScanningAnimation = ({ imagePreviewUrl, label = "SCANNING..." }) => {
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
    <div className="w-full max-w-lg mx-auto bg-slate-950 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col items-center justify-center p-8 sm:p-12 min-h-[580px] text-white select-none animate-fadeIn">
      {/* Target Scanning Circle Frame with HUD corners */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center mb-10">
        {/* HUD Corner Brackets */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />

        {/* Outer Rotating Dashed Ring */}
        <div className="absolute inset-2 rounded-full border-2 border-dashed border-emerald-500/40 animate-spinSlow" />
        
        {/* Inner Counter-Rotating Dotted Ring */}
        <div className="absolute inset-5 rounded-full border border-dotted border-emerald-400/60 animate-spinReverse" />

        {/* Circular Face Photo Container */}
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.25)] border-2 border-emerald-500/50 bg-slate-900 flex items-center justify-center">
          {imagePreviewUrl ? (
            <img
              src={imagePreviewUrl}
              alt="Scanning Face"
              className={`w-full h-full object-cover transition-all duration-300 ${
                showOriginal ? '' : 'grayscale-[30%] contrast-110'
              }`}
            />
          ) : (
            <div className="w-full h-full bg-slate-800" />
          )}

          {/* Sweeping Laser Line with gradient glow */}
          {!showOriginal && <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-300 to-transparent shadow-[0_0_15px_#34d399] animate-laserSweep pointer-events-none" />}
          
          {/* Subtle Scanning Mesh Overlay */}
          {!showOriginal && <div className="absolute inset-0 bg-[radial-gradient(rgba(16,185,129,0.15)_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />}
        </div>
      </div>

      {/* "SCANNING..." Text */}
      <h3 className="text-xl sm:text-2xl font-black text-emerald-400 tracking-[0.25em] mb-4 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)] animate-pulse">
        {label}
      </h3>

      {/* Show Original Toggle */}
      {imagePreviewUrl && (
        <button
          onClick={() => setShowOriginal(!showOriginal)}
          className="mb-6 px-6 py-2 rounded-full bg-slate-800/80 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-semibold tracking-wide hover:bg-slate-700/80 transition-colors shadow-lg"
        >
          {showOriginal ? 'Show Scanning' : 'Show Original'}
        </button>
      )}

      {/* Segmented Progress Bar matching reference image 15 */}
      <div className="w-full max-w-xs p-1 rounded-lg border border-emerald-500/40 bg-slate-900/80 shadow-inner flex items-center gap-1">
        {Array.from({ length: TOTAL_SEGMENTS }).map((_, index) => {
          const isActive = index < activeSegments;
          return (
            <div
              key={index}
              className={`flex-1 h-3 rounded-[2px] transition-colors duration-150 ${
                isActive
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                  : 'bg-emerald-950/60'
              }`}
            />
          );
        })}
      </div>

      <p className="text-xs text-slate-400 mt-4 text-center">
        Running parallel neural networks for skin type, tone & conditions...
      </p>

      {/* Custom Keyframe Animations */}
      <style>{`
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spinReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes laserSweep {
          0% { top: 0%; opacity: 0.2; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 100%; opacity: 0.2; }
        }
        .animate-spinSlow {
          animation: spinSlow 12s linear infinite;
        }
        .animate-spinReverse {
          animation: spinReverse 8s linear infinite;
        }
        .animate-laserSweep {
          animation: laserSweep 2s ease-in-out infinite alternate;
        }
      `}</style>
    </div>
  );
};
