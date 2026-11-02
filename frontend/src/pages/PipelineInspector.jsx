import { useEffect, useRef, useState } from "react";
import {
  Upload,
  Crop,
  Layers,
  Cpu,
  Flame,
  ShieldCheck,
  Sparkles,
  Play,
  RotateCcw,
  Download,
  Printer,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { analyzeAll } from "../services/analysis";
import { getRecommendations } from "../services/recommendations";

/* ════════════════════════════════════════════════════════════════════════════
   PIPELINE INSPECTOR - evaluator view
   Runs ONE photo through the real pipeline and shows every step:
   upload -> face crop -> preprocessing -> 3 models -> heatmaps -> decision
   rules -> recommendation scoring. A dry run: nothing is saved to the profile.
   ════════════════════════════════════════════════════════════════════════════ */

const NORM = { mean: [0.485, 0.456, 0.406], std: [0.229, 0.224, 0.225] };
const NORM_RANGE = [-2.2, 2.7]; // shared x-axis for the normalised-value histogram
const CHANNELS = [
  { key: "R", color: "#ef4444" },
  { key: "G", color: "#22c55e" },
  { key: "B", color: "#3b82f6" },
];

// Thresholds mirror Config in pipeline_engine.py; the backend also sends them
// with each prediction, and those values win when present.
const MODELS = [
  { key: "skin_type", title: "Skin type", arch: "EfficientNet", outputs: 4, threshold: 0.5 },
  { key: "skin_tone", title: "Skin tone", arch: "EfficientNet", outputs: 3, threshold: 0.5 },
  { key: "skin_disease", title: "Skin condition", arch: "EfficientNet-B3", outputs: 7, threshold: 0.4 },
];

const DISEASE_LABELS = {
  common_acne: "Acne",
  cystic_acne: "Acne",
  eczema: "Eczema",
  healthy: "Healthy",
  psoriasis: "Psoriasis",
  rosacea: "Rosacea",
  tinea: "Tinea",
};
const RAW_DISEASE_LABELS = { ...DISEASE_LABELS, common_acne: "Acne (common)", cystic_acne: "Acne (cystic)" };

// Mirrors Config.WEIGHT_* in backend/recommendation_engine.py
const SCORING_RULES = [
  { rule: "Skin type match", points: "+3" },
  { rule: "Condition match", points: "+3" },
  { rule: "Helpful ingredients", points: "+1 each (max +3)" },
  { rule: "Ingredients to avoid", points: "\u22122 each (max \u22126)", negative: true },
  { rule: "Age relevance", points: "+1" },
];

const STAGES = [
  { n: 1, short: "Upload" },
  { n: 2, short: "Face crop" },
  { n: 3, short: "Preprocess" },
  { n: 4, short: "3 models" },
  { n: 5, short: "Heatmaps" },
  { n: 6, short: "Decision" },
  { n: 7, short: "Recommend" },
];
const STAGE_COUNT = STAGES.length;

/* ───────────────────────────── small helpers ───────────────────────────── */

const cap = (s) => (s ? String(s).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "");
const nice = (key, v) => (key === "skin_disease" ? DISEASE_LABELS[v] || cap(v) : cap(v));
const num = (v) => (v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
const pct = (v, d = 1) => `${(Number(v) * 100).toFixed(d)}%`;
const imgSrc = (b64, mime = "image/png") => (b64 ? `data:${mime};base64,${b64}` : null);
const fmtPts = (n) => (Number.isInteger(n) ? n : Number(n).toFixed(1));
const kb = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(2)} MB` : `${Math.round(bytes / 1024)} KB`);

/** crop_box can arrive as [x1,y1,x2,y2], [x,y,w,h] or an object - turn it into 4 numbers. */
function coerceBox(cb) {
  if (Array.isArray(cb) && cb.length >= 4) {
    const a = cb.slice(0, 4).map(Number);
    return a.every(Number.isFinite) ? a : null;
  }
  if (cb && typeof cb === "object") {
    const g = (...ks) => {
      for (const k of ks) if (cb[k] !== undefined) return Number(cb[k]);
      return NaN;
    };
    const x = g("x1", "left", "x", "xmin");
    const y = g("y1", "top", "y", "ymin");
    const x2 = g("x2", "right", "xmax");
    const y2 = g("y2", "bottom", "ymax");
    if ([x, y, x2, y2].every(Number.isFinite)) return [x, y, x2, y2];
    const w = g("w", "width");
    const h = g("h", "height");
    if ([x, y, w, h].every(Number.isFinite)) return [x, y, x + w, y + h];
  }
  return null;
}

/**
 * Work out where the face crop sits inside the original photo, as percentages.
 * It only returns a box when the numbers are consistent with the crop size the
 * server reported, so a wrongly-read box is never drawn.
 */
export function resolveCropBox(cropBox, cropW, cropH, origW, origH) {
  const c = coerceBox(cropBox);
  if (!c || !origW || !origH) return null;
  const [a, b, c2, d] = c;
  const tol = Math.max(3, 0.02 * Math.max(cropW || 0, cropH || 0));
  const near = (x, y) => Math.abs(x - y) <= tol;
  let x1;
  let y1;
  let x2;
  let y2;
  if (cropW && cropH && near(c2 - a, cropW) && near(d - b, cropH)) {
    [x1, y1, x2, y2] = [a, b, c2, d]; // x1, y1, x2, y2
  } else if (cropW && cropH && near(c2, cropW) && near(d, cropH)) {
    [x1, y1, x2, y2] = [a, b, a + c2, b + d]; // x, y, w, h
  } else if (cropW && cropH && c2 > a && d > b && c2 <= origW + 1 && d <= origH + 1) {
    const ratioBox = (c2 - a) / (d - b);
    const ratioCrop = cropW / cropH;
    if (Math.abs(ratioBox - ratioCrop) / ratioCrop > 0.05) return null;
    [x1, y1, x2, y2] = [a, b, c2, d]; // resized crop, same shape
  } else {
    return null;
  }
  x1 = Math.max(0, x1);
  y1 = Math.max(0, y1);
  x2 = Math.min(origW, x2);
  y2 = Math.min(origH, y2);
  if (x2 <= x1 || y2 <= y1) return null;
  return {
    left: (x1 / origW) * 100,
    top: (y1 / origH) * 100,
    width: ((x2 - x1) / origW) * 100,
    height: ((y2 - y1) / origH) * 100,
    areaShare: ((x2 - x1) * (y2 - y1)) / (origW * origH),
  };
}

/** Histograms of the model input before and after normalisation (pure, testable). */
export function computeHistograms(data, bins = 32) {
  const raw = [0, 1, 2].map(() => new Array(bins).fill(0));
  const norm = [0, 1, 2].map(() => new Array(bins).fill(0));
  const sum = [0, 0, 0];
  const sumSq = [0, 0, 0];
  const [lo, hi] = NORM_RANGE;
  let count = 0;
  for (let i = 0; i + 2 < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = data[i + c];
      raw[c][Math.min(bins - 1, Math.floor((v / 256) * bins))] += 1;
      const n = (v / 255 - NORM.mean[c]) / NORM.std[c];
      const b = Math.floor(((n - lo) / (hi - lo)) * bins);
      norm[c][Math.max(0, Math.min(bins - 1, b))] += 1;
      sum[c] += v;
      sumSq[c] += v * v;
    }
    count += 1;
  }
  const stats = [0, 1, 2].map((c) => {
    const mean = count ? sum[c] / count : 0;
    const std = count ? Math.sqrt(Math.max(0, sumSq[c] / count - mean * mean)) : 0;
    return {
      rawMean: mean,
      rawStd: std,
      normMean: (mean / 255 - NORM.mean[c]) / NORM.std[c],
      normStd: std / 255 / NORM.std[c],
    };
  });
  return { raw, norm, stats, pixels: count };
}

/** Plain facts about how one model reached its decision (used by stage 6). */
export function summarizeDecision(key, pred) {
  const dist = pred?.distribution || {};
  const sum = Object.values(dist).reduce((a, b) => a + Number(b || 0), 0);
  const fallback = { skin_type: 0.5, skin_tone: 0.5, skin_disease: 0.4 }[key] ?? 0.5;
  const threshold = num(pred?.threshold) ?? fallback;
  const confidence = num(pred?.confidence) ?? 0;
  const confident = typeof pred?.is_confident === "boolean" ? pred.is_confident : confidence >= threshold;
  let outcome = null;
  if (key === "skin_disease") outcome = pred?.disease_detected ? "detected" : confident ? "healthy" : "unclear";
  let merge = null;
  const raw = pred?.raw_distribution;
  if (raw && raw.common_acne !== undefined && raw.cystic_acne !== undefined) {
    merge = {
      parts: [
        ["common_acne", Number(raw.common_acne)],
        ["cystic_acne", Number(raw.cystic_acne)],
      ],
      total: Number(raw.common_acne) + Number(raw.cystic_acne),
    };
  }
  return { sum, threshold, confidence, confident, outcome, merge };
}

/* ───────────────────────────── layout pieces ───────────────────────────── */

function Stage({ n, icon: Icon, title, what, tech, children }) {
  return (
    <section id={`stage-${n}`} className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-sm font-bold text-white">
          {n}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          </div>
          <p className="mt-1 text-sm text-slate-600">{what}</p>
          {tech && <p className="mt-1 font-mono text-[11px] text-slate-400">{tech}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Fact({ label, value, good }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-xs last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className={`text-right font-semibold ${good === false ? "text-amber-600" : "text-slate-800"}`}>{value}</span>
    </div>
  );
}

function TraceRow({ ok, children }) {
  return (
    <li className="flex items-start gap-2 text-xs text-slate-600">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      )}
      <span>{children}</span>
    </li>
  );
}

/* ───────────────────────────── stage 1: upload ───────────────────────────── */

function StageUpload({ file, previewUrl, origDims }) {
  const okFormat = file ? /\.(jpe?g|png|webp|bmp)$/i.test(file.name) : true;
  const okSize = file ? file.size <= 10 * 1048576 : true;
  return (
    <Stage
      n={1}
      icon={Upload}
      title="Photo upload and validation"
      what="The photo is sent to the server, which checks its format and size and decodes it to RGB before anything else happens."
      tech="POST /api/analyze_all  (multipart/form-data)"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex items-center justify-center rounded-2xl bg-slate-50 p-3">
          {previewUrl ? (
            <img src={previewUrl} alt="Uploaded" className="max-h-64 rounded-xl object-contain" />
          ) : (
            <p className="text-xs text-slate-400">Original photo not available</p>
          )}
        </div>
        <div>
          <Fact label="File name" value={file?.name || "-"} />
          <Fact label="Type" value={file?.type || "-"} />
          <Fact label="Size" value={file ? kb(file.size) : "-"} />
          <Fact label="Pixels" value={origDims ? `${origDims.w} x ${origDims.h}` : "-"} />
          <Fact label="Allowed format (JPG, PNG, WebP, BMP)" value={okFormat ? "Pass" : "Fail"} good={okFormat} />
          <Fact label="Under the 10 MB limit" value={okSize ? "Pass" : "Fail"} good={okSize} />
        </div>
      </div>
    </Stage>
  );
}

/* ───────────────────────────── stage 2: face crop ───────────────────────────── */

function StageCrop({ info, previewUrl, origDims }) {
  const ow = num(info.original_width) || origDims?.w || null;
  const oh = num(info.original_height) || origDims?.h || null;
  const box = resolveCropBox(info.crop_box, num(info.width), num(info.height), ow, oh);
  const modelInput = imgSrc(info.display_image_base64, "image/jpeg");
  return (
    <Stage
      n={2}
      icon={Crop}
      title="Face detection and crop"
      what="A face detector finds the face and the photo is cropped around it, so the models look at skin and not at the background."
      tech="MediaPipe face detector (inference/face_crop.py)"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500">Original photo{box ? " with detected face region" : ""}</p>
          <div className="relative inline-block max-w-full overflow-hidden rounded-xl bg-slate-900">
            {previewUrl && <img src={previewUrl} alt="Original" className="block max-h-72 max-w-full object-contain" />}
            {box && (
              <div
                className="absolute rounded-sm border-2 border-emerald-400"
                style={{
                  left: `${box.left}%`,
                  top: `${box.top}%`,
                  width: `${box.width}%`,
                  height: `${box.height}%`,
                  boxShadow: "0 0 0 9999px rgba(15,23,42,0.5)",
                }}
              />
            )}
          </div>
          {!box && (
            <p className="mt-2 text-[11px] text-slate-400">
              The crop region is not drawn because its coordinates could not be matched to the photo
              {info.crop_box ? ` (crop_box = ${JSON.stringify(info.crop_box)})` : ""}.
            </p>
          )}
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500">Result of this step</p>
          <Fact label="Faces detected" value={info.faces_detected ?? "-"} good={info.faces_detected === undefined || info.faces_detected === null ? undefined : info.faces_detected === 1} />
          <Fact label="Cropped size" value={info.width && info.height ? `${info.width} x ${info.height} px` : "-"} />
          <Fact label="Original size" value={ow && oh ? `${ow} x ${oh} px` : "-"} />
          {box && <Fact label="Share of the photo kept" value={pct(box.areaShare, 0)} />}
          <p className="mt-3 text-[11px] text-slate-400">
            More than one face is rejected. If no face is found the server checks for skin-coloured pixels and asks
            whether to continue with a skin close-up.
          </p>
        </div>
      </div>
      {modelInput && <span className="hidden">{modelInput.length}</span>}
    </Stage>
  );
}

/* ───────────────────────────── stage 3: preprocessing ───────────────────────────── */

function Histogram({ series, left, right }) {
  const W = 300;
  const H = 90;
  const bins = series[0].length;
  const max = Math.max(1, ...series.flat());
  const pts = (arr) => arr.map((v, i) => `${(i / (bins - 1)) * W},${H - (v / max) * H}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full rounded-xl bg-slate-50">
        {series.map((arr, c) => (
          <polyline key={CHANNELS[c].key} points={pts(arr)} fill="none" stroke={CHANNELS[c].color} strokeWidth="1.8" opacity="0.85" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

function StagePreprocess({ info }) {
  const src = imgSrc(info.display_image_base64, "image/jpeg");
  const [hist, setHist] = useState(null);

  useEffect(() => {
    if (!src) return undefined;
    let cancelled = false;
    const im = new Image();
    im.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = im.naturalWidth;
        c.height = im.naturalHeight;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(im, 0, 0);
        const { data } = ctx.getImageData(0, 0, c.width, c.height);
        if (!cancelled) setHist(computeHistograms(data));
      } catch (e) {
        if (!cancelled) setHist(null);
      }
    };
    im.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  const steps = [
    "Resize shorter side to 256",
    "Centre-crop 224 x 224",
    "Scale pixels to 0 - 1",
    "Normalise with ImageNet mean and std",
  ];
  return (
    <Stage
      n={3}
      icon={Layers}
      title="Preprocessing: what the models actually receive"
      what="Every model expects the same 224 x 224 input with standardised colour values. This is the exact image they see."
      tech="x' = (x / 255 - mean) / std     mean = [0.485, 0.456, 0.406]   std = [0.229, 0.224, 0.225]"
    >
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        {steps.map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">{s}</span>
            {i < steps.length - 1 && <span className="text-slate-300">&rarr;</span>}
          </span>
        ))}
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-[200px_1fr]">
        <div>
          {src ? (
            <img src={src} alt="Model input" className="h-48 w-48 rounded-xl border border-slate-200 object-cover" />
          ) : (
            <p className="text-xs text-slate-400">Model input image not available</p>
          )}
          <p className="mt-1 text-[11px] text-slate-400">Model input, 224 x 224</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-500">Colour values before (0 - 255)</p>
            {hist ? <Histogram series={hist.raw} left="0" right="255" /> : <p className="text-xs text-slate-400">Computed in the browser...</p>}
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-500">After normalisation (about {NORM_RANGE[0]} to +{NORM_RANGE[1]})</p>
            {hist ? <Histogram series={hist.norm} left={String(NORM_RANGE[0])} right={`+${NORM_RANGE[1]}`} /> : <p className="text-xs text-slate-400">Computed in the browser...</p>}
          </div>
          {hist && (
            <div className="sm:col-span-2">
              <table className="w-full text-left text-[11px] text-slate-600">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400">
                    <th className="py-1 font-medium">Channel</th>
                    <th className="py-1 font-medium">Mean before</th>
                    <th className="py-1 font-medium">Mean after</th>
                  </tr>
                </thead>
                <tbody>
                  {CHANNELS.map((ch, i) => (
                    <tr key={ch.key}>
                      <td className="py-1 font-semibold" style={{ color: ch.color }}>{ch.key}</td>
                      <td className="py-1">{hist.stats[i].rawMean.toFixed(1)}</td>
                      <td className="py-1">{hist.stats[i].normMean.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Stage>
  );
}

/* ───────────────────────────── stage 4: three models ───────────────────────────── */

function ModelCard({ meta, pred, ms }) {
  if (!pred) {
    return <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-xs text-slate-400">{meta.title}: no result</div>;
  }
  const dist = Object.entries(pred.distribution || {}).sort(([, a], [, b]) => b - a);
  const thr = num(pred.threshold) ?? meta.threshold;
  const conf = num(pred.confidence) ?? 0;
  const ok = conf >= thr;
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{meta.title}</h3>
          <p className="text-[11px] text-slate-400">
            {meta.arch} &middot; {meta.outputs} outputs
            {meta.key === "skin_disease" ? ", acne types merged into one" : ""}
          </p>
        </div>
        {ms !== null && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{Math.round(ms)} ms</span>}
      </div>
      <div className="mt-3 space-y-2">
        {dist.map(([cls, p]) => (
          <div key={cls}>
            <div className="flex justify-between text-[11px]">
              <span className={cls === pred.label ? "font-bold text-slate-900" : "text-slate-500"}>{nice(meta.key, cls)}</span>
              <span className="text-slate-400">{pct(p)}</span>
            </div>
            <div className="relative h-2 rounded-full bg-slate-100">
              <div
                className={`h-2 rounded-full ${cls === pred.label ? "bg-emerald-500" : "bg-slate-300"}`}
                style={{ width: `${Math.max(0, Math.min(100, p * 100))}%` }}
              />
              <div className="absolute -top-0.5 h-3 border-l border-dashed border-rose-400" style={{ left: `${thr * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-slate-400">Dashed line: confidence threshold ({pct(thr, 0)})</p>
      <div className={`mt-2 rounded-xl px-3 py-2 text-xs font-semibold ${ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
        {nice(meta.key, pred.label)} at {pct(conf)} {ok ? "meets" : "is below"} {pct(thr, 0)}: {ok ? "confident" : "low confidence"}
      </div>
    </div>
  );
}

function Timeline({ lat }) {
  const pre = num(lat?.preprocess_ms) ?? 0;
  const rows = MODELS.map((m) => ({ key: m.key, label: m.title, ms: num(lat?.[`${m.key}_ms`]) ?? 0 }));
  const sumModels = rows.reduce((a, r) => a + r.ms, 0);
  const wall = num(lat?.parallel_wall_ms) ?? Math.max(...rows.map((r) => r.ms), 0);
  const total = pre + wall || 1;
  const bar = (start, ms, color) => (
    <div
      className={`absolute top-1 h-3 rounded-full ${color}`}
      style={{ left: `${(start / total) * 100}%`, width: `${Math.max(1.5, (ms / total) * 100)}%` }}
    />
  );
  return (
    <div className="mt-5 rounded-2xl bg-slate-50 p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-600">
        <Clock className="h-4 w-4 text-emerald-600" />
        Timeline: the three models run at the same time
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-3 text-[11px]">
          <span className="w-28 shrink-0 text-slate-500">Preprocessing</span>
          <div className="relative h-5 flex-1 rounded-full bg-white">{bar(0, pre, "bg-slate-400")}</div>
          <span className="w-14 shrink-0 text-right text-slate-500">{Math.round(pre)} ms</span>
        </div>
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-3 text-[11px]">
            <span className="w-28 shrink-0 text-slate-500">{r.label}</span>
            <div className="relative h-5 flex-1 rounded-full bg-white">{bar(pre, r.ms, "bg-emerald-500")}</div>
            <span className="w-14 shrink-0 text-right text-slate-500">{Math.round(r.ms)} ms</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-slate-500">
        In parallel the models took {Math.round(wall)} ms. One after another they would take about {Math.round(sumModels)} ms.
        Each time includes drawing that model&apos;s heatmap.
      </p>
    </div>
  );
}

function StageModels({ data }) {
  const preds = data.predictions || {};
  return (
    <Stage
      n={4}
      icon={Cpu}
      title="Three neural networks look at the same image"
      what="Skin type, skin tone and skin condition are separate EfficientNet models. Each ends in a softmax that turns raw scores into probabilities that add up to 100%."
      tech="ThreadPoolExecutor, 3 workers; torch.softmax(logits)"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {MODELS.map((m) => (
          <ModelCard key={m.key} meta={m} pred={preds[m.key]} ms={num(data.latency_ms?.[`${m.key}_ms`])} />
        ))}
      </div>
      <Timeline lat={data.latency_ms} />
    </Stage>
  );
}

/* ───────────────────────────── stage 5: heatmaps ───────────────────────────── */

function StageHeatmaps({ data }) {
  const [active, setActive] = useState("skin_disease");
  const [layerKey, setLayerKey] = useState(null);
  const [opacity, setOpacity] = useState(75);
  const pred = data.predictions?.[active];
  const base = imgSrc(data.image_info?.display_image_base64, "image/jpeg");

  const layers = [];
  if (pred?.heatmap_base64) layers.push({ key: "heatmap", label: "Heatmap", src: imgSrc(pred.heatmap_base64) });
  const overlay = pred?.zone_overlay_base64 || pred?.marker_base64;
  if (overlay) layers.push({ key: "overlay", label: active === "skin_disease" ? "Hotspot marker" : "Zone overlay", src: imgSrc(overlay) });
  const current = layers.find((l) => l.key === layerKey) || layers[0];
  const legend = pred?.legend;

  return (
    <Stage
      n={5}
      icon={Flame}
      title="Explainability: where the model looked"
      what="Grad-CAM traces the model's decision back to the pixels that pushed it towards its answer. Warmer colours mean more influence. It shows where the model looked, it is not a medical finding."
      tech="Grad-CAM on the last convolutional block (inference/gradcam.py)"
    >
      <div className="flex flex-wrap gap-2">
        {MODELS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => {
              setActive(m.key);
              setLayerKey(null);
            }}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              active === m.key ? "bg-emerald-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-400"
            }`}
          >
            {m.title}
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-6 md:grid-cols-[280px_1fr]">
        <div className="relative h-72 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-slate-900">
          {base && <img src={base} alt="Model input" className="absolute inset-0 h-full w-full object-cover" />}
          {current && (
            <img
              src={current.src}
              alt={current.label}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ opacity: opacity / 100 }}
            />
          )}
        </div>
        <div className="space-y-4">
          {current ? (
            <>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-500">Layer</p>
                <div className="flex flex-wrap gap-2">
                  {layers.map((l) => (
                    <button
                      key={l.key}
                      type="button"
                      onClick={() => setLayerKey(l.key)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        current.key === l.key ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-500">Layer strength: {opacity}% (0% shows only the original)</p>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
              {legend?.palette && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-slate-500">{legend.title}</p>
                  <div className="h-3 rounded-full" style={{ background: `linear-gradient(to right, ${legend.palette.join(", ")})` }} />
                  <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                    <span>{legend.min_label}</span>
                    <span>{legend.max_label}</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
              {active === "skin_disease" && pred?.is_healthy
                ? "No heatmap: the model's top answer was Healthy, so there is nothing to localise."
                : "No heatmap was produced for this model on this photo."}
            </div>
          )}
        </div>
      </div>
    </Stage>
  );
}

/* ───────────────────────────── stage 6: decision rules ───────────────────────────── */

function StageDecision({ data }) {
  const preds = data.predictions || {};
  const outcomeText = {
    detected: "The top class is a condition and confidence is high enough, so a condition is reported.",
    healthy: "The top class is Healthy, so no condition is reported and no heatmap is drawn.",
    unclear: "Confidence is too low to name anything, so the result is Unclear and the saved condition is left unchanged.",
  };
  return (
    <Stage
      n={6}
      icon={ShieldCheck}
      title="Decision rules: how probabilities become a result"
      what="Plain rules sit on top of the models. A result is only reported when confidence clears that model's threshold, and healthy is never treated as a disease."
      tech="low_confidence = top_probability < threshold;  disease_detected = label != healthy and not low_confidence"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {MODELS.map((m) => {
          const pred = preds[m.key];
          if (!pred) return null;
          const d = summarizeDecision(m.key, pred);
          return (
            <div key={m.key} className="rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-900">{m.title}</h3>
              <ul className="mt-3 space-y-2">
                <TraceRow ok={Math.abs(d.sum - 1) < 0.02}>
                  The outputs add up to {pct(d.sum, 0)}, so they can be read as probabilities.
                </TraceRow>
                {m.key === "skin_disease" && d.merge && (
                  <TraceRow ok>
                    Acne types are merged: {RAW_DISEASE_LABELS[d.merge.parts[0][0]]} {pct(d.merge.parts[0][1])} +{" "}
                    {RAW_DISEASE_LABELS[d.merge.parts[1][0]]} {pct(d.merge.parts[1][1])} = Acne {pct(d.merge.total)}.
                  </TraceRow>
                )}
                <TraceRow ok>
                  Highest class: {nice(m.key, pred.label)} at {pct(d.confidence)}.
                </TraceRow>
                <TraceRow ok={d.confident}>
                  Confidence {pct(d.confidence)} {d.confident ? "meets" : "is below"} the {pct(d.threshold, 0)} threshold.
                </TraceRow>
                {m.key === "skin_disease" && d.outcome && <TraceRow ok={d.outcome !== "unclear"}>{outcomeText[d.outcome]}</TraceRow>}
              </ul>
              {m.key === "skin_disease" && pred.raw_distribution && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="mb-1 text-[11px] font-semibold text-slate-500">The 7 raw model outputs</p>
                  {Object.entries(pred.raw_distribution)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cls, p]) => (
                      <div key={cls} className="flex justify-between text-[11px] text-slate-500">
                        <span className={cls.includes("acne") ? "font-semibold text-emerald-700" : ""}>{RAW_DISEASE_LABELS[cls] || cap(cls)}</span>
                        <span>{pct(p)}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {data.warnings?.length > 0 && (
        <div className="mt-4 space-y-2">
          {data.warnings.map((w) => (
            <div key={w} className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {w}
            </div>
          ))}
        </div>
      )}
    </Stage>
  );
}

/* ───────────────────────────── stage 7: recommendations ───────────────────────────── */

function StageRecs({ data, recs, recsLoading, recsError }) {
  const p = data.predictions || {};
  const dis = p.skin_disease || {};
  const condition = dis.disease_detected ? nice("skin_disease", dis.label) : "None";
  const used = recs?.profile_used;
  const all = recs ? Object.values(recs.recommendations || {}).flat().sort((a, b) => b.score - a.score) : [];
  const top = all.slice(0, 3);
  const excluded = recs?.excluded_for_safety || [];
  const flow = ["Profile", "Safety filters", "Points", "Ranking"];

  return (
    <Stage
      n={7}
      icon={Sparkles}
      title="From scan to recommendations"
      what="The scan becomes a profile. Allergies and pregnancy remove unsafe products first, then every remaining product earns points and the best ones are shown."
      tech="recommendation_engine.recommend(profile)  - dry run, nothing is saved"
    >
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        {flow.map((f, i) => (
          <span key={f} className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">{f}</span>
            {i < flow.length - 1 && <span className="text-slate-300">&rarr;</span>}
          </span>
        ))}
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-900">Profile built from this scan</h3>
          <Fact label="Skin type" value={nice("skin_type", p.skin_type?.label) || "-"} />
          <Fact label="Skin tone" value={nice("skin_tone", p.skin_tone?.label) || "-"} />
          <Fact label="Condition" value={condition} />
          {used && (
            <>
              <p className="mt-3 text-[11px] font-semibold text-slate-500">Taken from the saved account</p>
              <Fact label="Age group" value={used.age_bracket || "-"} />
              <Fact label="Allergies" value={used.allergies?.length ? used.allergies.join(", ") : "none"} />
              <Fact label="Pregnant or breastfeeding" value={used.is_pregnant_or_breastfeeding ? "yes" : "no"} />
            </>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-900">Points scheme (best case 10)</h3>
          {SCORING_RULES.map((r) => (
            <Fact key={r.rule} label={r.rule} value={<span className={r.negative ? "text-red-500" : "text-emerald-600"}>{r.points}</span>} />
          ))}
          <p className="mt-2 text-[11px] text-slate-400">
            Allergies and pregnancy are not scored: a product that breaks them is removed completely.
          </p>
        </div>
      </div>

      <div className="mt-5">
        {recsLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> Scoring the catalog...
          </div>
        )}
        {recsError && <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{recsError}</div>}
        {used?.source === "saved_profile" && (
          <div className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            These recommendations use the saved account profile, not this scan, because the dry-run option is not connected
            in the frontend service yet.
          </div>
        )}
        {used?.source === "scan_preview" && (
          <div className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            Dry run: scored using this scan. Nothing was saved to the account.
          </div>
        )}
        {recs && (
          <p className="mb-3 text-xs text-slate-500">
            {excluded.length} product{excluded.length === 1 ? "" : "s"} removed by the safety filters
            {excluded.length > 0 ? `, for example: ${excluded[0].name} (${excluded[0].reason})` : ""}. {recs.not_relevant_count || 0} more
            did not match closely enough to show.
          </p>
        )}
        {recs && top.length === 0 && !recsLoading && (
          <p className="text-xs text-slate-500">No product scored above zero for this profile.</p>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          {top.map((item) => (
            <div key={item.product_id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-900">{item.name}</p>
                  <p className="text-[11px] text-slate-400">{item.brand_name || cap(item.category)}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  {item.max_score ? `${fmtPts(item.score)} / ${item.max_score} pts` : `${fmtPts(item.score)} pts`}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {(item.breakdown || []).map((row) => (
                  <div key={row.label}>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">{row.label}</span>
                      <span className={row.points > 0 ? "font-semibold text-emerald-600" : row.points < 0 ? "font-semibold text-red-500" : "text-slate-400"}>
                        {row.points > 0 ? "+" : ""}
                        {fmtPts(row.points)}
                        {row.max > 0 ? ` / ${row.max}` : ""}
                      </span>
                    </div>
                    {row.max > 0 && (
                      <div className="h-1.5 rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, (row.points / row.max) * 100))}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {item.reasons?.length > 0 && (
                <p className="mt-3 text-[11px] text-slate-500">Why: {item.reasons.join("; ")}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </Stage>
  );
}

/* ───────────────────────────── the full report ───────────────────────────── */

export function InspectorReport({ data, file, previewUrl, origDims, recs, recsLoading, recsError, visible = STAGE_COUNT }) {
  const info = data.image_info || {};
  const show = (n) => visible >= n;
  return (
    <div className="space-y-6">
      {show(1) && <StageUpload file={file} previewUrl={previewUrl} origDims={origDims} />}
      {show(2) && <StageCrop info={info} previewUrl={previewUrl} origDims={origDims} />}
      {show(3) && <StagePreprocess info={info} />}
      {show(4) && <StageModels data={data} />}
      {show(5) && <StageHeatmaps data={data} />}
      {show(6) && <StageDecision data={data} />}
      {show(7) && <StageRecs data={data} recs={recs} recsLoading={recsLoading} recsError={recsError} />}
    </div>
  );
}

/* ───────────────────────────── the page ───────────────────────────── */

// Kept outside the component so the photo and its result survive moving to another page and back.
const saved = {
  file: null, previewUrl: null, origDims: null, skipFace: false,
  status: "idle", error: "", data: null, recs: null, autoRun: false,
};

/** Called by the Evaluation Lab: open this photo in the Inspector and analyse it straight away. */
export function startInspection(file, skipFace = false) {
  if (saved.previewUrl) URL.revokeObjectURL(saved.previewUrl);
  Object.assign(saved, {
    file, previewUrl: URL.createObjectURL(file), origDims: null, skipFace,
    status: "idle", error: "", data: null, recs: null, autoRun: true,
  });
}

const PipelineInspector = () => {
  const inputRef = useRef(null);
  const timer = useRef(null);
  const [file, setFile] = useState(saved.file);
  const [previewUrl, setPreviewUrl] = useState(saved.previewUrl);
  const [origDims, setOrigDims] = useState(saved.origDims);
  const [skipFace, setSkipFace] = useState(saved.skipFace);
  const [status, setStatus] = useState(saved.status); // idle | running | done | error
  const [error, setError] = useState(saved.error);
  const [data, setData] = useState(saved.data);
  const [recs, setRecs] = useState(saved.recs);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState("");
  const [visible, setVisible] = useState(STAGE_COUNT);
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => clearInterval(timer.current), []);

  // while the walkthrough plays, scroll to each stage as it appears
  useEffect(() => {
    if (playing && visible > 0) {
      document.getElementById(`stage-${visible}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [visible, playing]);

  const onPick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(f);
    setFile(f);
    setPreviewUrl(url);
    setData(null);
    setRecs(null);
    setError("");
    setStatus("idle");
    setOrigDims(null);
    const probe = new Image();
    probe.onload = () => setOrigDims({ w: probe.naturalWidth, h: probe.naturalHeight });
    probe.src = url;
  };

  const loadRecs = async (d) => {
    setRecsLoading(true);
    setRecsError("");
    try {
      const p = d.predictions || {};
      const dis = p.skin_disease;
      const override = {
        skin_type: p.skin_type?.label,
        skin_tone: p.skin_tone?.label,
        skin_conditions: dis?.disease_detected ? [dis.label] : [],
      };
      setRecs(await getRecommendations(override));
    } catch (err) {
      setRecsError(err?.response?.data?.message || "Could not load recommendations for this scan.");
    } finally {
      setRecsLoading(false);
    }
  };

  const run = async () => {
    if (!file) return;
    clearInterval(timer.current);
    setPlaying(false);
    setStatus("running");
    setError("");
    setData(null);
    setRecs(null);
    setRecsError("");
    const t0 = performance.now();
    try {
      const payload = await analyzeAll(file, skipFace);
      if (!payload?.success || payload.data?.status === "error") {
        setError(payload?.data?.message || payload?.message || "Analysis failed.");
        setStatus("error");
        return;
      }
      const d = { ...payload.data, _roundTripMs: Math.round(performance.now() - t0) };
      setData(d);
      setVisible(STAGE_COUNT);
      setStatus("done");
      loadRecs(d);
    } catch (err) {
      const body = err?.response?.data?.data;
      setError(body?.message || err?.response?.data?.message || err?.message || "Something went wrong.");
      setStatus("error");
    }
  };

  const play = () => {
    clearInterval(timer.current);
    setVisible(0);
    setPlaying(true);
    let n = 0;
    timer.current = setInterval(() => {
      n += 1;
      setVisible(n);
      if (n >= STAGE_COUNT) {
        clearInterval(timer.current);
        setPlaying(false);
      }
    }, 1200);
  };

  const showAll = () => {
    clearInterval(timer.current);
    setPlaying(false);
    setVisible(STAGE_COUNT);
  };

  const downloadTrace = () => {
    const clean = JSON.parse(
      JSON.stringify(data, (k, v) => (typeof v === "string" && k.endsWith("_base64") ? "[image omitted]" : v))
    );
    const blob = new Blob([JSON.stringify({ analysis: clean, recommendations: recs }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "truetone-pipeline-trace.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // remember the latest state for when the page is opened again
  useEffect(() => {
    Object.assign(saved, { file, previewUrl, origDims, skipFace, status: status === "running" ? "idle" : status, error, data, recs });
  }, [file, previewUrl, origDims, skipFace, status, error, data, recs]);

  // photo handed over from the Lab: measure it and analyse it straight away
  useEffect(() => {
    if (previewUrl && !origDims) {
      const probe = new Image();
      probe.onload = () => setOrigDims({ w: probe.naturalWidth, h: probe.naturalHeight });
      probe.src = previewUrl;
    }
    if (saved.autoRun && file) {
      saved.autoRun = false;
      run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const preds = data?.predictions || {};
  const dis = preds.skin_disease;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">Evaluator view</p>
          <h1 className="mt-1 text-3xl font-extrabold">Pipeline Inspector</h1>
          <p className="mt-2 text-sm text-slate-600">
            Upload one photo and watch every step TrueTone takes, from the raw image to the product points. This is a dry
            run: nothing is saved to the account.
          </p>
        </div>

        {/* upload card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/bmp" onChange={onPick} className="hidden" />
          <div className="flex flex-wrap items-center gap-4">
            {previewUrl ? (
              <img src={previewUrl} alt="Selected" className="h-20 w-20 rounded-xl object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <Upload className="h-6 w-6" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{file ? file.name : "No photo selected"}</p>
              <label className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <input type="checkbox" checked={skipFace} onChange={(e) => setSkipFace(e.target.checked)} className="accent-emerald-600" />
                Skip the face check (for skin close-ups)
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {file ? "Change photo" : "Choose photo"}
              </button>
              <button
                type="button"
                onClick={run}
                disabled={!file || status === "running"}
                className="flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-40"
              >
                {status === "running" && <Loader2 className="h-4 w-4 animate-spin" />}
                {status === "running" ? "Analysing..." : "Run analysis"}
              </button>
            </div>
          </div>
          {status === "error" && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* result */}
        {status === "done" && data && (
          <>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                  Skin type: {nice("skin_type", preds.skin_type?.label) || "-"}
                </span>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  Skin tone: {nice("skin_tone", preds.skin_tone?.label) || "-"}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    dis?.disease_detected ? "bg-rose-50 text-rose-700" : dis?.is_confident === false ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  Condition: {dis?.disease_detected ? nice("skin_disease", dis.label) : dis?.is_confident === false ? "Unclear" : "None detected"}
                </span>
                <span className="ml-auto flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="h-3.5 w-3.5" /> server {Math.round(data.latency_ms?.total_ms || 0)} ms, round trip {data._roundTripMs} ms
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button type="button" onClick={play} className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white">
                  <Play className="h-3.5 w-3.5" /> Play walkthrough
                </button>
                <button type="button" onClick={showAll} className="flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700">
                  <RotateCcw className="h-3.5 w-3.5" /> Show all steps
                </button>
                <button type="button" onClick={downloadTrace} className="flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700">
                  <Download className="h-3.5 w-3.5" /> Download trace (JSON)
                </button>
                <button type="button" onClick={() => window.print()} className="flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700">
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
                <div className="ml-auto flex flex-wrap gap-1">
                  {STAGES.map((s) => (
                    <button
                      key={s.n}
                      type="button"
                      onClick={() => {
                        setVisible(STAGE_COUNT);
                        setPlaying(false);
                        setTimeout(() => document.getElementById(`stage-${s.n}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                      }}
                      className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      {s.n}. {s.short}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <InspectorReport
              data={data}
              file={file}
              previewUrl={previewUrl}
              origDims={origDims}
              recs={recs}
              recsLoading={recsLoading}
              recsError={recsError}
              visible={visible}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default PipelineInspector;