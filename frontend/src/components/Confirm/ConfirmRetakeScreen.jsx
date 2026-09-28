import React from 'react';
import { RotateCcw, ArrowRight, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

export const ConfirmRetakeScreen = ({ imagePreviewUrl, onRetake, onContinue, modeLabel, error, skinOnlyWarning, onProceedAnyway }) => {
  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col p-6 text-slate-800 animate-fadeIn">
      <div className="text-center mb-5">
        <span className="text-xs uppercase tracking-wider font-bold text-emerald-600">
          Photo Verification
        </span>
        <h2 className="text-2xl font-bold text-slate-900 mt-1">Review Your Photo</h2>
        <p className="text-sm text-slate-500 mt-1">
          Ensure your face is clearly visible and centered before analyzing.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {skinOnlyWarning && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-300 p-4 text-amber-800 shadow-sm animate-pulse-soft">
          <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm mb-1">Skin Detected, No Face</h4>
            <p className="text-sm font-medium">{skinOnlyWarning}</p>
          </div>
        </div>
      )}

      {/* Large Framed Preview */}
      <div className="relative w-full aspect-[4/5] max-h-[50vh] rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner flex items-center justify-center mb-6">
        {imagePreviewUrl ? (
          <img
            src={imagePreviewUrl}
            alt="Captured Face"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-slate-400 text-sm">No photo available</div>
        )}

        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Ready for {modeLabel || 'Analysis'}
        </div>
      </div>

      {/* Two Action Buttons: Retake vs Continue / Proceed Anyway */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={onRetake}
          className="flex items-center justify-center gap-2 py-3.5 px-6 rounded-full border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition active:scale-[0.98]"
        >
          <RotateCcw className="w-4 h-4" />
          Retake
        </button>

        {skinOnlyWarning ? (
          <button
            onClick={onProceedAnyway}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm tracking-wide transition shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            Proceed Anyway
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onContinue}
            className="flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm tracking-wide transition shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
