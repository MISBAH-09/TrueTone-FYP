import React from 'react';
import { CAPTURE_STATES } from './constants';
import { CheckCircle2, X } from 'lucide-react';

const BADGE_BG = {
  bad: 'bg-[#e53935] text-white',
  ok: 'bg-[#f59e0b] text-white',
  good: 'bg-[#00c853] text-white',
};

export const CaptureOverlay = ({
  state,
  feedbackMessage,
  badges,
  countdown,
  progress,
  onClose,
}) => {
  const isCaptured = state === CAPTURE_STATES.CAPTURED;
  const isAllGood = countdown !== null;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 z-20">
      {/* Top Bar: 3 Sleek Status Tabs + Distinct White Close Button matching reference test (3) */}
      <div className="w-full flex items-center justify-between gap-2 pointer-events-auto">
        {/* Three Status Tabs across the top */}
        <div className="flex-1 grid grid-cols-3 gap-1.5 sm:gap-2 max-w-md">
          {/* 1. Lighting Badge */}
          <div
            className={`rounded-lg sm:rounded-xl py-2 px-1 flex flex-col items-center justify-center text-center shadow-md transition-colors duration-200 ${
              BADGE_BG[badges?.lighting?.state || 'bad']
            }`}
          >
            <span className="text-[11px] sm:text-xs text-white/95 font-medium leading-tight">Lighting</span>
            <span className="text-xs sm:text-sm text-white font-bold leading-tight mt-0.5">
              {badges?.lighting?.label || 'Not Good'}
            </span>
          </div>

          {/* 2. Look Straight Badge */}
          <div
            className={`rounded-lg sm:rounded-xl py-2 px-1 flex flex-col items-center justify-center text-center shadow-md transition-colors duration-200 ${
              BADGE_BG[badges?.lookStraight?.state || 'bad']
            }`}
          >
            <span className="text-[11px] sm:text-xs text-white/95 font-medium leading-tight">Look Straight</span>
            <span className="text-xs sm:text-sm text-white font-bold leading-tight mt-0.5">
              {badges?.lookStraight?.label || 'Not Good'}
            </span>
          </div>

          {/* 3. Face Position Badge */}
          <div
            className={`rounded-lg sm:rounded-xl py-2 px-1 flex flex-col items-center justify-center text-center shadow-md transition-colors duration-200 ${
              BADGE_BG[badges?.facePosition?.state || 'bad']
            }`}
          >
            <span className="text-[11px] sm:text-xs text-white/95 font-medium leading-tight">Face Position</span>
            <span className="text-xs sm:text-sm text-white font-bold leading-tight mt-0.5 truncate max-w-full">
              {badges?.facePosition?.label || 'Not Good'}
            </span>
          </div>
        </div>

        {/* Top Right Close Button with visible contrasting cross */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-900/80 hover:bg-slate-800 rounded-xl relative flex items-center justify-center transition-transform hover:scale-105 active:scale-95 ml-2 shrink-0 pointer-events-auto border-2 border-white/50 shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden"
            aria-label="Close"
          >
            <div className="absolute w-5 h-[3px] bg-white rounded-full rotate-45"></div>
            <div className="absolute w-5 h-[3px] bg-white rounded-full -rotate-45"></div>
          </button>
        )}
      </div>

      {/* Center: Slender Oval Face Guide matching test (3).jpeg */}
      <div className="relative flex-1 flex items-center justify-center my-2">
        <div
          className={`relative w-[220px] h-[310px] sm:w-[250px] sm:h-[355px] max-w-[72vw] max-h-[52vh] aspect-[3/4.2] rounded-[50%/50%] border-2 transition-all duration-300 flex items-center justify-center ${
            isCaptured
              ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_20px_rgba(52,211,153,0.5)]'
              : isAllGood
              ? 'border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.6)] animate-pulse'
              : 'border-white drop-shadow-[0_0_8px_rgba(0,0,0,0.4)]'
          }`}
        >
          {/* Centered Instructions without dark box wrapper matching test (3) */}
          {!isAllGood && !isCaptured && (
            <div className="text-center px-4 max-w-[220px]">
              <p className="text-white text-base sm:text-lg font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] leading-snug">
                {feedbackMessage || 'Keep your face inside the circle'}
              </p>
            </div>
          )}

          {/* 3-2-1 Countdown Overlay */}
          {countdown !== null && !isCaptured && (
            <div className="flex flex-col items-center justify-center animate-scaleIn">
              <span className="text-7xl sm:text-8xl font-black text-white drop-shadow-[0_0_25px_rgba(34,197,94,0.9)]">
                {countdown}
              </span>
              <span className="text-sm font-bold text-emerald-300 uppercase tracking-widest mt-2 drop-shadow">
                Hold Still...
              </span>
            </div>
          )}

          {/* Captured Success Icon */}
          {isCaptured && (
            <div className="animate-scaleIn flex flex-col items-center justify-center">
              <CheckCircle2 className="w-20 h-20 text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.8)]" />
              <span className="text-white font-bold text-lg mt-2 drop-shadow">Captured!</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Progress Bar during active countdown */}
      <div className="w-full max-w-xs mx-auto pb-2 flex flex-col items-center">
        {countdown !== null && (
          <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all duration-75 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
