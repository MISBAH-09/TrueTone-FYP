import React from 'react';
import { ArrowLeft, Check, X, CheckCircle2 } from 'lucide-react';

export const CaptureTipsScreen = ({ onContinue, onBack }) => {
  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden flex flex-col p-6 text-slate-800 animate-fadeIn relative">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-xl font-bold text-slate-900">Take the right photo</h2>
        </div>
        <button
          onClick={onContinue}
          className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="text-center mb-6">
        <span className="text-xs uppercase tracking-wider font-bold text-emerald-600">
          Optimal Facial Alignment Guidelines
        </span>
      </div>

      {/* Yes / No Visual Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {/* YES Card - Front Pose */}
        <div className="flex flex-col items-center">
          <div className="relative w-full aspect-square rounded-xl bg-white border-2 border-emerald-400 overflow-hidden flex items-center justify-center shadow-sm">
            <img src="/images/capture-tips-front.png" alt="Correct Front Pose" className="w-full h-full object-cover scale-110" />
          </div>
          <div className="mt-2 flex items-center gap-1 px-2.5 py-1 bg-emerald-500 text-white rounded-full text-[10px] sm:text-xs font-bold shadow-sm">
            <Check className="w-3 h-3 stroke-[3]" />
            CORRECT
          </div>
        </div>

        {/* NO Card - Side Pose 1 */}
        <div className="flex flex-col items-center">
          <div className="relative w-full aspect-square rounded-xl bg-white border-2 border-rose-300 overflow-hidden flex items-center justify-center shadow-sm opacity-90">
             <img src="/images/capture-tips-side.png" alt="Incorrect Side Pose" className="w-full h-full object-cover scale-110" />
          </div>
          <div className="mt-2 flex items-center gap-1 px-2.5 py-1 bg-rose-500 text-white rounded-full text-[10px] sm:text-xs font-bold shadow-sm">
            <X className="w-3 h-3 stroke-[3]" />
            INCORRECT
          </div>
        </div>

        {/* NO Card - Glasses Pose */}
        <div className="flex flex-col items-center">
          <div className="relative w-full aspect-square rounded-xl bg-white border-2 border-rose-300 overflow-hidden flex items-center justify-center shadow-sm opacity-90">
             <img src="/images/capture-tips-glasses.png" alt="Incorrect Glasses Pose" className="w-full h-full object-cover scale-110" />
          </div>
          <div className="mt-2 flex items-center gap-1 px-2.5 py-1 bg-rose-500 text-white rounded-full text-[10px] sm:text-xs font-bold shadow-sm">
            <X className="w-3 h-3 stroke-[3]" />
            INCORRECT
          </div>
        </div>
      </div>

      {/* Checklist */}
      <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 mb-8 px-2">
        {[
          "Ensure adequate frontal lighting; avoid strong backlighting.",
          "Center your face perfectly within the alignment oval.",
          "Maintain a completely neutral expression with your eyes open.",
          "Ensure your entire face is clearly visible (remove glasses).",
          "Keep the camera steady to avoid motion blur."
        ].map((item, idx) => (
          <li key={idx} className="flex items-start gap-2.5">
            <span className="mt-0.5 text-emerald-600 font-bold shrink-0">➢</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {/* Action Button */}
      <button
        onClick={onContinue}
        className="w-full py-3.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm uppercase tracking-wider transition shadow-md hover:shadow-lg active:scale-[0.98]"
      >
        Got It
      </button>
    </div>
  );
};
