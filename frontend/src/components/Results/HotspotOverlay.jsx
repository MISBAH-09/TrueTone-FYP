import React, { useState } from 'react';
import { Eye, EyeOff, Flame } from 'lucide-react';

export const HotspotOverlay = ({
  markerBase64,
  heatmapBase64,
  baseImage,
  badgeTitle,
  diseaseDetected,
  legend,
}) => {
  const [showOriginal, setShowOriginal] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);

  let activeSrc = markerBase64 ? `data:image/png;base64,${markerBase64}` : baseImage;
  if (showOriginal) {
    activeSrc = baseImage;
  } else if (showHeatmap && heatmapBase64) {
    activeSrc = `data:image/png;base64,${heatmapBase64}`;
  }

  const markerPosPct = legend?.marker_pos_pct !== undefined
    ? legend.marker_pos_pct
    : (legend?.score !== undefined ? Math.round(legend.score * 100) : 75);
  const minLabel = legend?.min_label || 'Low Risk';
  const maxLabel = legend?.max_label || 'High Risk';
  const palette = legend?.palette || ['#fde047', '#f97316', '#dc2626'];

  const gradientCss = `linear-gradient(to bottom, ${palette.join(', ')})`;

  return (
    <div className="relative w-full aspect-[4/5] max-h-[62vh] rounded-3xl overflow-hidden bg-slate-950 border border-slate-200 shadow-lg flex items-center justify-center select-none">
      {activeSrc ? (
        <img
          src={activeSrc}
          alt={badgeTitle || 'Disease Hotspot'}
          className="w-full h-full object-cover transition-opacity duration-300"
        />
      ) : (
        <div className="text-slate-400 text-sm">Image unavailable</div>
      )}

      {/* Top Right Condition Badge */}
      {badgeTitle && (
        <div className="absolute top-4 right-4 z-10">
          <span
            className={`px-4 py-1.5 rounded-full text-white text-xs sm:text-sm font-bold shadow-md tracking-wide ${
              diseaseDetected ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
          >
            {badgeTitle}
          </span>
        </div>
      )}

      {/* Side Vertical Legend Bar showing actual risk severity level */}
      {diseaseDetected && (
        <div className="absolute top-14 right-4 bottom-14 flex flex-col items-center justify-between z-10 pointer-events-none py-1">
          <div className="bg-black/60 backdrop-blur-md text-white text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded shadow">
            {minLabel}
          </div>

          <div className="relative flex-1 w-3 sm:w-4 my-2 rounded-full overflow-hidden shadow-md border border-white/40">
            <div
              className="w-full h-full"
              style={{ background: gradientCss }}
            />
            <div
              className="absolute left-0 right-0 h-1.5 bg-white border border-black/40 rounded-full shadow-lg transform -translate-y-1/2 transition-all duration-500"
              style={{ top: `${Math.max(5, Math.min(95, markerPosPct))}%` }}
            />
          </div>

          <div className="bg-black/60 backdrop-blur-md text-white text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded shadow">
            {maxLabel}
          </div>
        </div>
      )}

      {/* Bottom Left Controls: Show Original and Technical Heatmap toggles */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
        {/* Toggle Original Image */}
        {baseImage && (
          <button
            type="button"
            onClick={() => {
              setShowOriginal(!showOriginal);
              if (!showOriginal) setShowHeatmap(false);
            }}
            className={`flex items-center gap-1.5 backdrop-blur-md text-xs font-semibold px-3 py-1.5 rounded-full shadow transition border active:scale-95 ${
              showOriginal
                ? 'bg-emerald-600 text-white border-emerald-400'
                : 'bg-black/65 hover:bg-black/85 text-white border-white/20'
            }`}
          >
            {showOriginal ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {showOriginal ? 'Show Analysis' : 'Show Original'}
          </button>
        )}

        {/* Toggle Technical Heatmap */}
        {heatmapBase64 && (
          <button
            type="button"
            onClick={() => {
              setShowHeatmap(!showHeatmap);
              if (!showHeatmap) setShowOriginal(false);
            }}
            className={`flex items-center gap-1.5 backdrop-blur-md text-xs font-semibold px-3 py-1.5 rounded-full shadow transition border active:scale-95 ${
              showHeatmap
                ? 'bg-amber-600 text-white border-amber-400'
                : 'bg-black/65 hover:bg-black/85 text-white border-white/20'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            {showHeatmap ? 'Hide Heatmap' : 'Technical Heatmap'}
          </button>
        )}
      </div>
    </div>
  );
};
