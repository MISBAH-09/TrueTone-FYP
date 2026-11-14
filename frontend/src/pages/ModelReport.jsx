import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";

/* ════════════════════════════════════════════════════════════════════════════
   MODEL & SYSTEM REPORT - examiner view
   Every number on this page comes from a real run of this project (dataset
   build log, Colab training log, test-set classification report, and the
   18-photo web check). To update the page after a retrain, edit REPORT below.
   ════════════════════════════════════════════════════════════════════════════ */

export const REPORT = {
  // Dataset build (Colab build_dataset log). raw -> after duplicate + quality filtering -> used (cap 1650) -> split
  classes: [
    { key: "comedonal_acne", label: "Acne (comedonal)", source: "Roboflow acne set and Kaggle acne dataset", raw: 1749, clean: 1645, used: 1645, train: 1151, val: 247, test: 247 },
    { key: "cystic_acne", label: "Acne (cystic)", source: "Roboflow acne set and Kaggle acne dataset", raw: 1749, clean: 1639, used: 1639, train: 1147, val: 246, test: 246 },
    { key: "eczema", label: "Eczema", source: "DermNet", raw: 2156, clean: 1976, used: 1650, train: 1155, val: 247, test: 248 },
    { key: "healthy", label: "Healthy", source: "Roboflow normal-skin + SCIN", raw: 3802, clean: 3294, used: 1650, train: 1155, val: 247, test: 248 },
    { key: "psoriasis", label: "Psoriasis", source: "DermNet", raw: 1757, clean: 1669, used: 1650, train: 1155, val: 247, test: 248 },
    { key: "rosacea", label: "Rosacea", source: "DermNet (mixed acne and rosacea folder) and Kaggle augmented skin", raw: 1239, clean: 757, used: 757, train: 529, val: 114, test: 114 },
    { key: "tinea_ringworm", label: "Tinea (ringworm)", source: "DermNet", raw: 1625, clean: 1481, used: 1481, train: 1036, val: 222, test: 223 },
  ],
  trainTarget: 1650, // every class is topped up to this many training images with augmentation

  // Colab training log: accuracy (%) at the epochs that were printed / saved as a new best
  trainAcc: [[5, 78.8], [10, 84.8], [15, 87.6], [20, 88.0], [25, 89.2], [30, 89.5]],
  valAcc: [[1, 57.9], [2, 63.6], [3, 65.3], [4, 66.6], [5, 66.4], [6, 68.2], [10, 67.6], [15, 66.8], [20, 65.2], [25, 65.5], [30, 65.5]],
  bestEpoch: { epoch: 6, valAcc: 68.2 },

  // Test-set classification report (1,574 held-out images)
  test: {
    accuracy: 66.9,
    macroF1: 67.43,
    weightedF1: 66.3,
    perClass: [
      { key: "comedonal_acne", label: "Acne (comedonal)", p: 0.276, r: 0.19, f1: 0.225, n: 247 },
      { key: "cystic_acne", label: "Acne (cystic)", p: 0.374, r: 0.476, f1: 0.419, n: 246 },
      { key: "eczema", label: "Eczema", p: 0.764, r: 0.77, f1: 0.767, n: 248 },
      { key: "healthy", label: "Healthy", p: 0.996, r: 0.992, f1: 0.994, n: 248 },
      { key: "psoriasis", label: "Psoriasis", p: 0.735, r: 0.794, f1: 0.764, n: 248 },
      { key: "rosacea", label: "Rosacea", p: 0.782, r: 0.816, f1: 0.798, n: 114 },
      { key: "tinea_ringworm", label: "Tinea (ringworm)", p: 0.783, r: 0.726, f1: 0.753, n: 223 },
    ],
  },

  // 18 ordinary web photos run through the finished app (diagnose_disease.py)
  realWorld: {
    total: 18,
    correct: 9,
    previousModelCorrect: 7,
    rows: [
      { label: "Psoriasis", n: 3, ok: 3 },
      { label: "Acne", n: 4, ok: 3 },
      { label: "Eczema", n: 4, ok: 2 },
      { label: "Rosacea", n: 5, ok: 1 },
      { label: "Tinea", n: 2, ok: 0 },
    ],
    failures: [
      "Rosacea faces were read as acne in 3 of 5 photos.",
      "Both tinea photos were read as psoriasis.",
      "Two photos (one acne, one rosacea) were called Healthy at 47%.",
      "One eczema photo was correct but flagged as unclear (33%).",
    ],
  },

  // Monk Skin Tone (US estimate) of the 290 SCIN cases used as part of the Healthy class
  monk: [[1, 23], [2, 104], [3, 73], [4, 35], [5, 17], [6, 17], [7, 14], [8, 1], [9, 1], [10, 1]],
  monkUnrated: 4,
};

// The bars of the condition decision (keep in step with HEALTHY_MIN_PROB, UNHEALTHY_MIN_PROB and DISEASE_MIN_SHARE in pipeline_engine.py)
const HEALTHY_BAR = 70;       // step 1: healthy needs this score or more
const NOT_HEALTHY_BELOW = 50; // step 2 only runs when the healthy score is under this
const CONDITION_SHARE = 50;   // step 2: a condition needs this share of the condition scores

// Skin tone model (stage 1), from the project report
export const TONE = {
  source: { urls: 16577, labelled: 16012, downloaded: 15956 },
  fitz: [["Type I", 2941, "#f8d9b0"], ["Type II", 4795, "#f2b077"], ["Type III", 3294, "#c78548"], ["Type IV", 2771, "#8b5e3c"], ["Type V", 1527, "#5c3317"], ["Type VI", 628, "#2d1405"]],
  merge: [
    { key: "fair", label: "Fair", types: "Types I and II", n: 7736, share: 48.5 },
    { key: "medium", label: "Medium", types: "Types III and IV", n: 6065, share: 38.0 },
    { key: "dark", label: "Dark", types: "Types V and VI", n: 2155, share: 13.5 },
  ],
  balance: [
    { label: "Fair", before: 5602, after: 5602 },
    { label: "Medium", before: 4709, after: 5603 },
    { label: "Dark", before: 1714, after: 5614 },
  ],
  split: [
    { label: "Fair", total: 5602, train: 3921, val: 841, test: 840 },
    { label: "Medium", total: 5603, train: 3922, val: 841, test: 840 },
    { label: "Dark", total: 5614, train: 3933, val: 841, test: 840 },
  ],
  test: {
    n: 2998, accuracy: 77.02, balancedAccuracy: 77.43, macroF1: 76.33, weightedF1: 77.07, bestEpoch: 15, epochs: 24,
    perClass: [
      { key: "fair", label: "Fair", p: 0.8321, r: 0.8059, f1: 0.8188, n: 1298 },
      { key: "medium", label: "Medium", p: 0.7408, r: 0.7233, f1: 0.7319, n: 1225 },
      { key: "dark", label: "Dark", p: 0.6917, r: 0.7937, f1: 0.7392, n: 475 },
    ],
    matrix: [[1046, 230, 22], [193, 886, 146], [18, 80, 377]],
  },
};

// Skin type model (stage 2), from the project report (the split table in the report gives approximate figures)
export const TYPE = {
  sources: [
    { name: "Skin Type Classification (Otar)", photos: 2000, classes: "combination, dry, normal, oily", licence: "CC BY 4.0" },
    { name: "Skin Types2 (theaskin)", photos: 1430, classes: "combination, dry, normal, oily", licence: "CC BY 4.0" },
    { name: "Skin (dry/normal/oily/pores)", photos: 895, classes: "dry, normal, oily, pores (pores counted as oily)", licence: "CC BY 4.0" },
  ],
  split: [
    { label: "Combination", total: 2200, train: 1540, val: 330, test: 330 },
    { label: "Dry", total: 2200, train: 1540, val: 330, test: 330 },
    { label: "Normal", total: 3400, train: 2380, val: 510, test: 510 },
    { label: "Oily", total: 2500, train: 1750, val: 375, test: 375 },
  ],
  test: {
    n: 1063, accuracy: 76.67, macroF1: 72.11, weightedF1: 77.56,
    perClass: [
      { key: "combination", label: "Combination", p: 0.6748, r: 0.9022, f1: 0.7721, n: 92, note: "High recall, over-predicts" },
      { key: "dry", label: "Dry", p: 0.4, r: 0.7317, f1: 0.5172, n: 82, note: "Lowest F1, visual ambiguity" },
      { key: "normal", label: "Normal", p: 0.8565, r: 0.7992, f1: 0.8268, n: 478, note: "Best performing class" },
      { key: "oily", label: "Oily", p: 0.843, r: 0.7056, f1: 0.7682, n: 411, note: "Strong precision" },
    ],
  },
};

const MONK_SWATCH = ["#f6ede4", "#f3e7db", "#f7ead0", "#eadaba", "#d7bd96", "#a07e56", "#825c43", "#604134", "#3a312a", "#292420"];

const NAV_OVERVIEW = [
  ["architecture", "Architecture"],
  ["models", "The three models"],
  ["safety", "Safety design"],
  ["fairness", "Skin-tone coverage"],
];
const NAV_MODEL = [
  ["data", "Data"],
  ["training", "Training"],
  ["results", "Test results"],
  ["realworld", "Real-world check"],
  ["limits", "Limits"],
];

const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const pct = (v, d = 1) => `${(v * 100).toFixed(d)}%`;
const f1Color = (f) => (f >= 0.75 ? "bg-emerald-500" : f >= 0.5 ? "bg-amber-400" : "bg-rose-500");

/* ───────────────────────────── layout helpers ───────────────────────────── */

function Section({ id, n, title, why, children }) {
  return (
    <section id={`sec-${id}`} className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white">{n}</div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{why}</p>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Kpi({ label, value, hint }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 text-xs last:border-0">
      <span className="text-slate-500">{k}</span>
      <span className="text-right font-semibold text-slate-800">{v}</span>
    </div>
  );
}

function Caption({ children }) {
  return <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{children}</p>;
}

/* ───────────────────────────── 1. architecture ───────────────────────────── */

const TONES = {
  slate: "fill-slate-50 stroke-slate-300",
  emerald: "fill-emerald-50 stroke-emerald-500",
  amber: "fill-amber-50 stroke-amber-500",
  sky: "fill-sky-50 stroke-sky-500",
  violet: "fill-violet-50 stroke-violet-500",
};

function Box({ x, y, w, h, title, sub, tone = "slate" }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="12" strokeWidth="1.5" className={TONES[tone]} />
      <text x={x + w / 2} y={y + (sub ? h / 2 - 3 : h / 2 + 4)} textAnchor="middle" fontSize="12" fontWeight="700" className="fill-slate-800">
        {title}
      </text>
      {sub && (
        <text x={x + w / 2} y={y + h / 2 + 13} textAnchor="middle" fontSize="10" className="fill-slate-500">
          {sub}
        </text>
      )}
    </g>
  );
}

function Architecture() {
  const arrow = { fill: "none", strokeWidth: 1.5, markerEnd: "url(#arr)", className: "stroke-slate-400" };
  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 960 400" className="min-w-[760px]" role="img" aria-label="System architecture diagram">
        <defs>
          <marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" className="fill-slate-400" />
          </marker>
        </defs>

        <text x="20" y="16" fontSize="10" fontWeight="700" className="fill-slate-400">CLIENT AND SERVER</text>
        <Box x={20} y={26} w={200} h={58} title="Browser" sub="React, Vite, Tailwind" tone="sky" />
        <Box x={300} y={26} w={220} h={58} title="Django REST API" sub="token auth, Swagger docs" tone="emerald" />
        <Box x={760} y={26} w={180} h={58} title="PostgreSQL" sub="users, scans, history" tone="slate" />
        <path d="M220 55 H300" {...arrow} />
        <text x="260" y="48" textAnchor="middle" fontSize="9" className="fill-slate-400">HTTPS, JSON</text>
        <path d="M520 55 H760" {...arrow} />

        <text x="20" y="128" fontSize="10" fontWeight="700" className="fill-slate-400">IMAGE ANALYSIS PIPELINE (one request)</text>
        <Box x={20} y={140} w={130} h={64} title="1  Validate" sub="format, size, decode" />
        <Box x={176} y={140} w={150} h={64} title="2  Face detect" sub="MediaPipe, crop" />
        <Box x={352} y={140} w={140} h={64} title="3  Preprocess" sub="224 x 224, normalise" />
        <Box x={528} y={118} w={190} h={40} title="Skin type" sub="EfficientNet-B0" tone="amber" />
        <Box x={528} y={166} w={190} h={40} title="Skin tone" sub="EfficientNet-B2" tone="amber" />
        <Box x={528} y={214} w={190} h={40} title="Skin condition" sub="EfficientNet-B3, 7 outputs" tone="amber" />
        <Box x={752} y={140} w={188} h={64} title="Grad-CAM + rules" sub="heatmaps, thresholds" tone="violet" />
        <path d="M150 172 H176" {...arrow} />
        <path d="M326 172 H352" {...arrow} />
        <path d="M492 172 H510 V138 H528" {...arrow} />
        <path d="M492 172 H528" {...arrow} />
        <path d="M492 172 H510 V234 H528" {...arrow} />
        <path d="M718 138 H735 V172 H752" {...arrow} />
        <path d="M718 186 H735 V172" {...arrow} />
        <path d="M718 234 H735 V172" {...arrow} />
        <text x="605" y="272" textAnchor="middle" fontSize="9" className="fill-slate-400">three models run in parallel threads</text>

        <text x="20" y="300" fontSize="10" fontWeight="700" className="fill-slate-400">PERSONALISATION</text>
        <Box x={20} y={312} w={230} h={64} title="Recommendation engine" sub="rule-based points, CSV catalogue" tone="emerald" />
        <Box x={276} y={312} w={190} h={64} title="Safety filters" sub="allergy, pregnancy: hard block" tone="emerald" />
        <Box x={492} y={312} w={210} h={64} title="Product scanner" sub="vision LLM, ingredient match" tone="sky" />
        <Box x={728} y={312} w={212} h={64} title="Chatbot" sub="LLM grounded in the profile" tone="sky" />
        <path d="M846 204 V282 H135 V312" {...arrow} />
        <text x="500" y="278" textAnchor="middle" fontSize="9" className="fill-slate-400">scan result becomes the skin profile</text>
        <path d="M250 344 H276" {...arrow} />
      </svg>
    </div>
  );
}

/* ───────────────────────────── 2. data ───────────────────────────── */

function ConditionData() {
  const max = Math.max(...REPORT.classes.map((c) => c.raw));
  const steps = [
    ["Exact duplicates", "MD5 hash of the file bytes"],
    ["Near duplicates", "perceptual hash (pHash), distance 8 or less"],
    ["Quality check", "image must open and be at least 100 x 100 px"],
    ["Balance", "no class above 1,650 real images"],
    ["Split", "70% train, 15% validation, 15% test"],
    ["Augment", "training split only, topped up to 1,650 per class"],
  ];
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {steps.map(([t, d], i) => (
          <div key={t} className="rounded-2xl border border-slate-200 p-3">
            <p className="text-[11px] font-bold text-emerald-600">Step {i + 1}</p>
            <p className="text-xs font-semibold text-slate-800">{t}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{d}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400">
              <th className="py-2 pr-3 font-medium">Class</th>
              <th className="py-2 pr-3 font-medium">Source</th>
              <th className="py-2 pr-3 font-medium">Collected</th>
              <th className="py-2 pr-3 font-medium">After cleaning</th>
              <th className="py-2 pr-3 font-medium">Used</th>
              <th className="py-2 font-medium">Train / validation / test</th>
            </tr>
          </thead>
          <tbody>
            {REPORT.classes.map((c) => (
              <tr key={c.key} className="border-b border-slate-100 align-top">
                <td className="py-2.5 pr-3 font-semibold text-slate-800">{c.label}</td>
                <td className="py-2.5 pr-3 text-slate-500">{c.source}</td>
                <td className="py-2.5 pr-3">
                  <div className="h-2 w-28 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-slate-300" style={{ width: `${(c.raw / max) * 100}%` }} />
                  </div>
                  <span className="text-slate-500">{fmt(c.raw)}</span>
                </td>
                <td className="py-2.5 pr-3">
                  <div className="h-2 w-28 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-sky-400" style={{ width: `${(c.clean / max) * 100}%` }} />
                  </div>
                  <span className="text-slate-500">{fmt(c.clean)}</span>
                </td>
                <td className="py-2.5 pr-3 font-semibold text-slate-800">{fmt(c.used)}</td>
                <td className="py-2.5">
                  <div className="flex h-2 w-40 overflow-hidden rounded-full">
                    <div className="bg-emerald-500" style={{ width: `${(c.train / c.used) * 100}%` }} />
                    <div className="bg-amber-400" style={{ width: `${(c.val / c.used) * 100}%` }} />
                    <div className="bg-violet-500" style={{ width: `${(c.test / c.used) * 100}%` }} />
                  </div>
                  <span className="text-slate-500">
                    {fmt(c.train)} / {fmt(c.val)} / {fmt(c.test)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Caption>
        How to read this: each class starts with every image collected, loses duplicates and unusable files, then is capped
        and split. Training images are topped up to {fmt(REPORT.trainTarget)} per class with augmentation, but this project's pipeline
        never augments the validation or test images.
      </Caption>
      <p className="mt-3 text-xs text-slate-500">
        Healthy combines 3,214 photos from the Roboflow normal-skin set and 588 photos (290 cases) from SCIN, a consented,
        crowd-sourced dermatology dataset that was added to widen skin-tone coverage.
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Two things to know about these sources. The Kaggle acne photos were split at random into the two acne types, so those types
        cannot be told apart. And the DermNet folder used for rosacea contains both acne and rosacea photos, so some rosacea labels
        are noisy.
      </p>
    </>
  );
}

/* ───────────────────────────── 3. training ───────────────────────────── */

function TrainingCurve() {
  const W = 560;
  const H = 250;
  const L = 44;
  const B = 30;
  const T = 14;
  const R = 12;
  const x = (e) => L + (e / 30) * (W - L - R);
  const y = (v) => T + ((100 - v) / 50) * (H - T - B);
  const line = (pts) => pts.map(([e, v]) => `${x(e)},${y(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Training and validation accuracy by epoch">
      {[50, 60, 70, 80, 90, 100].map((g) => (
        <g key={g}>
          <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} className="stroke-slate-100" />
          <text x={L - 6} y={y(g) + 3} textAnchor="end" fontSize="10" className="fill-slate-400">{g}%</text>
        </g>
      ))}
      {[0, 5, 10, 15, 20, 25, 30].map((e) => (
        <text key={e} x={x(e)} y={H - 12} textAnchor="middle" fontSize="10" className="fill-slate-400">{e}</text>
      ))}
      <text x={(L + W - R) / 2} y={H - 1} textAnchor="middle" fontSize="10" className="fill-slate-400">epoch</text>
      <polyline points={line(REPORT.trainAcc)} fill="none" strokeWidth="2.2" className="stroke-sky-500" />
      <polyline points={line(REPORT.valAcc)} fill="none" strokeWidth="2.2" className="stroke-emerald-500" />
      {REPORT.trainAcc.map(([e, v]) => <circle key={`t${e}`} cx={x(e)} cy={y(v)} r="3" className="fill-sky-500" />)}
      {REPORT.valAcc.map(([e, v]) => <circle key={`v${e}`} cx={x(e)} cy={y(v)} r="3" className="fill-emerald-500" />)}
      <circle cx={x(REPORT.bestEpoch.epoch)} cy={y(REPORT.bestEpoch.valAcc)} r="7" fill="none" strokeWidth="2" className="stroke-rose-500" />
      <text x={x(REPORT.bestEpoch.epoch) + 12} y={y(REPORT.bestEpoch.valAcc) + 22} fontSize="10" fontWeight="700" className="fill-rose-600">
        best checkpoint: epoch {REPORT.bestEpoch.epoch}, {REPORT.bestEpoch.valAcc}%
      </text>
      <g transform={`translate(${W - 190}, ${T + 4})`}>
        <rect width="170" height="38" rx="8" className="fill-white stroke-slate-200" />
        <line x1="10" x2="30" y1="13" y2="13" strokeWidth="2.2" className="stroke-sky-500" />
        <text x="36" y="16" fontSize="10" className="fill-slate-600">training accuracy</text>
        <line x1="10" x2="30" y1="28" y2="28" strokeWidth="2.2" className="stroke-emerald-500" />
        <text x="36" y="31" fontSize="10" className="fill-slate-600">validation accuracy</text>
      </g>
    </svg>
  );
}

function ConditionTraining() {
  const [showImgs, setShowImgs] = useState(true);
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-slate-200 p-4">
          <h3 className="mb-2 text-sm font-bold text-slate-900">Skin condition model</h3>
          <Row k="Backbone" v="EfficientNet-B3, ImageNet pre-trained" />
          <Row k="Output layer" v="replaced: 7 classes" />
          <Row k="Input" v="224 x 224 RGB" />
          <Row k="Optimiser" v="Adam, learning rate 1e-4, weight decay 1e-4" />
          <Row k="Schedule" v="cosine annealing over 30 epochs" />
          <Row k="Batch size" v="32" />
          <Row k="Loss" v="cross-entropy, class weights, label smoothing 0.1" />
          <Row k="Augmentation" v="random crop, flip, colour jitter, rotation 15 deg, blur, random erasing" />
          <Row k="Model selection" v="best validation accuracy, saved when it improves" />
          <Row k="Hardware" v="Google Colab GPU" />
        </div>
        <div>
          <TrainingCurve />
          <Caption>
            What this shows: training accuracy keeps rising to 89.5%, but validation accuracy peaks at {REPORT.bestEpoch.valAcc}% at
            epoch {REPORT.bestEpoch.epoch} and then drifts down. That gap is overfitting. Because the best checkpoint was saved, the model
            in the app is the epoch {REPORT.bestEpoch.epoch} model, not the last one.
          </Caption>
          <p className="mt-2 text-[11px] text-slate-400">Points are the epochs that were logged or saved as a new best.</p>
        </div>
      </div>

      <div className="mt-6">
        <button type="button" onClick={() => setShowImgs((s) => !s)} className="text-xs font-semibold text-emerald-700 underline">
          {showImgs ? "Hide" : "Show"} the original training figures
        </button>
        {showImgs && (
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {[
              ["/report-figures/EfficientNet_B3_curves.png", "Loss and accuracy curves from the training run"],
              ["/report-figures/EfficientNet_B3_cm.png", "Confusion matrix on the test set"],
            ].map(([src, cap]) => (
              <figure key={src} className="rounded-2xl border border-slate-200 p-3">
                <img
                  src={src}
                  alt={cap}
                  className="w-full rounded-xl"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextSibling.style.display = "block";
                  }}
                />
                <p className="hidden rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
                  Figure not added yet. Copy <span className="font-mono">{src.split("/").pop()}</span> from the Drive results folder
                  into <span className="font-mono">frontend/public/report-figures/</span>.
                </p>
                <figcaption className="mt-2 text-[11px] text-slate-500">{cap}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ───────────────────────────── 4. test results ───────────────────────────── */

function ConditionResults() {
  const t = REPORT.test;
  const total = t.perClass.reduce((a, c) => a + c.n, 0);
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Accuracy" value={`${t.accuracy}%`} hint="all 7 classes" />
        <Kpi label="Macro F1" value={`${t.macroF1}%`} hint="every class counts equally" />
        <Kpi label="Weighted F1" value={`${t.weightedF1}%`} hint="weighted by class size" />
        <Kpi label="Test images" value={fmt(total)} hint="never seen in training" />
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400">
              <th className="py-2 pr-3 font-medium">Class</th>
              <th className="py-2 pr-3 font-medium">Precision</th>
              <th className="py-2 pr-3 font-medium">Recall</th>
              <th className="py-2 pr-3 font-medium">F1 score</th>
              <th className="py-2 font-medium">Images</th>
            </tr>
          </thead>
          <tbody>
            {t.perClass.map((c) => (
              <tr key={c.key} className="border-b border-slate-100">
                <td className="py-2.5 pr-3 font-semibold text-slate-800">{c.label}</td>
                <td className="py-2.5 pr-3 text-slate-600">{pct(c.p)}</td>
                <td className="py-2.5 pr-3 text-slate-600">{pct(c.r)}</td>
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 rounded-full bg-slate-100">
                      <div className={`h-2 rounded-full ${f1Color(c.f1)}`} style={{ width: `${c.f1 * 100}%` }} />
                    </div>
                    <span className="font-semibold text-slate-800">{pct(c.f1)}</span>
                  </div>
                </td>
                <td className="py-2.5 text-slate-500">{c.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Caption>
        How to read this: precision asks how often a prediction of that class was right, recall asks how many real cases of that class
        were found, and F1 combines both. Green is 75% or above, amber is 50 to 75%, red is below 50%.
      </Caption>
      <div className="mt-3 space-y-2 text-xs text-slate-600">
        <p>
          <span className="font-semibold text-slate-800">The two acne types are confused with each other</span> (F1 22.5% and 41.9%).
          They look alike, so the app reports them as one Acne result and adds their probabilities.
        </p>
        <p>
          <span className="font-semibold text-slate-800">Healthy scores 99.4% on this test set,</span> but that test comes from the same
          sources as the training photos, so it overstates how well Healthy works on ordinary phone photos. The next section checks that.
        </p>
      </div>
    </>
  );
}

/* ───────────────────────────── 5. real-world check ───────────────────────────── */

function RealWorldSection() {
  const rw = REPORT.realWorld;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Correct" value={`${rw.correct} / ${rw.total}`} hint={`${Math.round((rw.correct / rw.total) * 100)}% on ordinary web photos`} />
        <Kpi label="Previous model" value={`${rw.previousModelCorrect} / ${rw.total}`} hint="same photos, before the retrain" />
        <Kpi label="Photos" value={rw.total} hint="not from the training sources" />
      </div>
      <div className="mt-6 space-y-3">
        {rw.rows.map((r) => (
          <div key={r.label}>
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-800">{r.label}</span>
              <span className="text-slate-500">{r.ok} of {r.n} correct</span>
            </div>
            <div className="mt-1 h-3 rounded-full bg-slate-100">
              <div
                className={`h-3 rounded-full ${r.ok / r.n >= 0.75 ? "bg-emerald-500" : r.ok / r.n >= 0.4 ? "bg-amber-400" : "bg-rose-500"}`}
                style={{ width: `${(r.ok / r.n) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-2xl border border-slate-200 p-4">
        <p className="text-xs font-bold text-slate-900">Where it goes wrong</p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-600">
          {rw.failures.map((f) => <li key={f}>{f}</li>)}
        </ul>
      </div>
      <Caption>
        Honest reading: this is a small sample of 18 photos, so treat it as an indicator and not a benchmark. It does show that
        accuracy on everyday photos is lower than on the held-out test set, which is a common result when training and real photos differ.
      </Caption>
    </>
  );
}

/* ───────────────────────────── 6. safety design ───────────────────────────── */

function SafetySection() {
  const cards = [
    ["Healthy first, then the condition", `Step 1: the skin is called healthy only at ${HEALTHY_BAR}% or more, because telling someone with a condition that they are fine is the worst mistake. Step 2 runs only when the healthy score is under ${NOT_HEALTHY_BELOW}%, and it names a condition only if that condition has at least ${CONDITION_SHARE}% of the condition scores. Everything else is shown as Unclear. Skin type and tone need 50% or more.`],
    ["Healthy is not a disease", "A Healthy answer never creates a condition on the profile, and no risk heatmap is drawn for it."],
    ["Unclear never overwrites", "An unclear scan leaves the saved condition unchanged, so one bad photo cannot erase a real diagnosis."],
    ["Acne types merged", "The two acne classes are confused with each other, so their probabilities are added and one Acne result is shown."],
    ["Hard safety filters", "Products containing a flagged allergen or a pregnancy-unsafe ingredient are removed, never just ranked lower."],
    ["Explainable scores", "Every recommendation shows its points per rule out of 10, so no score is a black box."],
    ["Dry-run inspection", "The Pipeline Inspector scores a photo without saving anything to the account."],
    ["Screening aid, not a diagnosis", "Every condition result carries a reminder to see a dermatologist."],
  ];
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-900">{t}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{d}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        See these rules working on a real photo in the <a href="/inspector" className="font-semibold text-emerald-700 underline">Pipeline Inspector</a>.
      </p>
    </>
  );
}

/* ───────────────────────────── 7. skin-tone coverage ───────────────────────────── */

function FairnessSection() {
  const total = REPORT.monk.reduce((a, [, n]) => a + n, 0);
  const max = Math.max(...REPORT.monk.map(([, n]) => n));
  const light = REPORT.monk.filter(([m]) => m <= 3).reduce((a, [, n]) => a + n, 0);
  const mid = REPORT.monk.filter(([m]) => m >= 4 && m <= 5).reduce((a, [, n]) => a + n, 0);
  const dark = REPORT.monk.filter(([m]) => m >= 6).reduce((a, [, n]) => a + n, 0);
  return (
    <>
      <div className="flex items-end gap-2 sm:gap-3">
        {REPORT.monk.map(([m, n]) => (
          <div key={m} className="flex flex-1 flex-col items-center">
            <span className="mb-1 text-[11px] font-semibold text-slate-600">{n}</span>
            <div className="w-full rounded-t-md border border-slate-200" style={{ height: `${Math.max(4, (n / max) * 120)}px`, backgroundColor: MONK_SWATCH[m - 1] }} />
            <span className="mt-1 text-[10px] text-slate-400">{m}</span>
          </div>
        ))}
      </div>
      <p className="mt-1 text-center text-[11px] text-slate-400">Monk Skin Tone scale, 1 (lightest) to 10 (darkest). Swatch colours are approximate.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Kpi label="Tones 1 to 3" value={`${Math.round((light / total) * 100)}%`} hint={`${light} cases`} />
        <Kpi label="Tones 4 to 5" value={`${Math.round((mid / total) * 100)}%`} hint={`${mid} cases`} />
        <Kpi label="Tones 6 to 10" value={`${Math.round((dark / total) * 100)}%`} hint={`${dark} cases`} />
      </div>
      <Caption>
        What this shows: the SCIN part of the Healthy class (290 cases, {REPORT.monkUnrated} without a rating) leans towards lighter skin,
        which is a known gap in public dermatology data. It was added on purpose to improve coverage, and it is reported here
        so the bias is visible instead of hidden.
      </Caption>
      <p className="mt-3 text-xs text-slate-500">
        Not measured: the DermNet and Roboflow images carry no skin-tone labels, so the condition model's accuracy per skin tone was
        not evaluated. This is listed under future work.
      </p>

      <h3 className="mt-8 text-sm font-bold text-slate-900">The skin tone model&apos;s own training photos</h3>
      <p className="mt-1 text-xs text-slate-500">Fitzpatrick17k, {fmt(TONE.source.downloaded)} photos, counted by Fitzpatrick type (I lightest, VI darkest).</p>
      <div className="mt-4 flex items-end gap-2 sm:gap-3">
        {TONE.fitz.map(([name, n, colour]) => (
          <div key={name} className="flex flex-1 flex-col items-center">
            <span className="mb-1 text-[11px] font-semibold text-slate-600">{fmt(n)}</span>
            <div className="w-full rounded-t-md border border-slate-200" style={{ height: `${Math.max(4, (n / Math.max(...TONE.fitz.map((f) => f[1]))) * 120)}px`, backgroundColor: colour }} />
            <span className="mt-1 text-[10px] text-slate-400">{name.replace("Type ", "")}</span>
          </div>
        ))}
      </div>
      <Caption>
        What this shows: Type II has {fmt(TONE.fitz[1][1])} photos but Type VI only {fmt(TONE.fitz[5][1])}, a gap of about{" "}
        {(TONE.fitz[1][1] / TONE.fitz[5][1]).toFixed(1)} to 1. The Dark class was topped up with {fmt(TONE.balance[2].after - TONE.balance[2].before)} augmented
        copies, but copies add no new people. Swatch colours are approximate.
      </Caption>
    </>
  );
}

/* ───────────────────────────── 8. limits ───────────────────────────── */

function ConditionLimits() {
  const limits = [
    "Rosacea and tinea are weak on ordinary photos (rosacea 1 of 5, tinea 0 of 2 in the web check).",
    "The two acne types come from the same pool of photos and were split at random, so they cannot be told apart. They are reported together.",
    "The rosacea class was built mostly from a DermNet folder that mixes acne and rosacea photos, so some of its labels are noisy.",
    "Classes come from different kinds of photos (acne, rosacea and healthy are mostly faces; eczema, psoriasis and tinea are mostly body close-ups), so the model may partly use the photo type as a shortcut.",
    "Overfitting: validation accuracy peaked early (epoch 6) and the test set shares sources with the training data.",
    "No evaluation per skin tone, and the data leans towards lighter skin.",
    `The decision bars (healthy at ${HEALTHY_BAR}% or more, a condition only when the healthy score is under ${NOT_HEALTHY_BELOW}% and it has ${CONDITION_SHARE}% of the condition scores, 50% for skin type and tone) were set by hand and have not been calibrated on an independent set.`,
  ];
  const future = [
    "Add dermatologist-labelled phone photos for the weak classes and mix faces and body shots in every class.",
    "Build a fixed test set from sources the model never trained on, and judge every version against it.",
    "Report accuracy per skin tone and rebalance the data.",
    "Calibrate the confidence scores and add an explicit out-of-scope detector.",
    "Have a dermatologist review the recommendation weights.",
  ];
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5">
        <p className="text-sm font-bold text-slate-900">Known limitations</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs text-slate-600">{limits.map((l) => <li key={l}>{l}</li>)}</ul>
      </div>
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
        <p className="text-sm font-bold text-slate-900">Future work</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs text-slate-600">{future.map((l) => <li key={l}>{l}</li>)}</ul>
      </div>
      <p className="text-[11px] text-slate-400 md:col-span-2">
        TrueTone is a screening aid built as a final-year project. It is not a medical device and does not replace a dermatologist.
      </p>
    </div>
  );
}

/* ───────────────────────────── page ───────────────────────────── */

/* ───────────────────────────── the other two models ───────────────────────────── */

function ModelSwitch({ current }) {
  const items = [
    ["overview", "/report", "Overview", "architecture, safety, coverage"],
    ["tone", "/report/tone", "Skin tone", "EfficientNet-B2, 3 classes"],
    ["type", "/report/type", "Skin type", "EfficientNet-B0, 4 classes"],
    ["condition", "/report/condition", "Skin condition", "EfficientNet-B3, 7 outputs"],
  ];
  return (
    <nav aria-label="Report pages" className="sticky top-2 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur print:hidden">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Switch to another model&apos;s page</p>
      <div className="flex flex-wrap gap-2">
        {items.map(([key, to, name, sub]) => (
          <Link
            key={key}
            to={to}
            aria-current={current === key ? "page" : undefined}
            className={`rounded-xl px-4 py-2 text-left transition ${
              current === key ? "bg-emerald-600 text-white shadow" : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-400"
            }`}
          >
            <span className="block text-xs font-bold">{name}</span>
            <span className={`block text-[10px] ${current === key ? "text-emerald-100" : "text-slate-400"}`}>{sub}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

function FigureStrip({ items }) {
  return (
    <div className={`mt-6 grid gap-4 ${items.length > 1 ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
      {items.map(([src, cap]) => (
        <figure key={src} className="rounded-2xl border border-slate-200 p-3">
          <img
            src={src}
            alt={cap}
            className="w-full rounded-xl"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextSibling.style.display = "block";
            }}
          />
          <p className="hidden rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
            Figure not added yet. Copy <span className="font-mono">{src.split("/").pop()}</span> into{" "}
            <span className="font-mono">frontend/public/report-figures/</span>.
          </p>
          <figcaption className="mt-2 text-[11px] text-slate-500">{cap}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function ClassTable({ rows, notes = false }) {
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-xs">
        <thead>
          <tr className="border-b border-slate-200 text-slate-400">
            <th className="py-2 pr-3 font-medium">Class</th>
            <th className="py-2 pr-3 font-medium">Precision</th>
            <th className="py-2 pr-3 font-medium">Recall</th>
            <th className="py-2 pr-3 font-medium">F1 score</th>
            <th className="py-2 pr-3 font-medium">Photos</th>
            {notes && <th className="py-2 font-medium">Note</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.key} className="border-b border-slate-100">
              <td className="py-2.5 pr-3 font-semibold text-slate-800">{c.label}</td>
              <td className="py-2.5 pr-3 text-slate-600">{pct(c.p)}</td>
              <td className="py-2.5 pr-3 text-slate-600">{pct(c.r)}</td>
              <td className="py-2.5 pr-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-32 rounded-full bg-slate-100">
                    <div className={`h-2 rounded-full ${f1Color(c.f1)}`} style={{ width: `${c.f1 * 100}%` }} />
                  </div>
                  <span className="font-semibold text-slate-800">{pct(c.f1)}</span>
                </div>
              </td>
              <td className="py-2.5 pr-3 text-slate-500">{fmt(c.n)}</td>
              {notes && <td className="py-2.5 text-slate-500">{c.note}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SplitTable({ rows, approx = false }) {
  const p = approx ? "~" : "";
  const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-xs">
        <thead>
          <tr className="border-b border-slate-200 text-slate-400">
            <th className="py-2 pr-3 font-medium">Class</th>
            <th className="py-2 pr-3 font-medium">After preparation</th>
            <th className="py-2 font-medium">Train / validation / test</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-slate-100 align-top">
              <td className="py-2.5 pr-3 font-semibold text-slate-800">{r.label}</td>
              <td className="py-2.5 pr-3 font-semibold text-slate-800">{p}{fmt(r.total)}</td>
              <td className="py-2.5">
                <div className="flex h-2 w-40 overflow-hidden rounded-full">
                  <div className="bg-emerald-500" style={{ width: `${(r.train / r.total) * 100}%` }} />
                  <div className="bg-amber-400" style={{ width: `${(r.val / r.total) * 100}%` }} />
                  <div className="bg-violet-500" style={{ width: `${(r.test / r.total) * 100}%` }} />
                </div>
                <span className="text-slate-500">{p}{fmt(r.train)} / {p}{fmt(r.val)} / {p}{fmt(r.test)}</span>
              </td>
            </tr>
          ))}
          <tr className="font-semibold text-slate-800">
            <td className="py-2.5 pr-3">Total</td>
            <td className="py-2.5 pr-3">{p}{fmt(sum("total"))}</td>
            <td className="py-2.5">{p}{fmt(sum("train"))} / {p}{fmt(sum("val"))} / {p}{fmt(sum("test"))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ConfusionHeat({ labels, matrix }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-separate border-spacing-1 text-center text-xs">
        <thead>
          <tr>
            <th className="p-1 text-left text-[10px] font-semibold uppercase text-slate-400">Really is</th>
            {labels.map((l) => (
              <th key={l} className="p-1 text-[11px] font-semibold text-slate-600">Model said {l}</th>
            ))}
            <th className="p-1 text-[10px] font-semibold uppercase text-slate-400">Photos</th>
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => {
            const total = row.reduce((a, b) => a + b, 0);
            return (
              <tr key={labels[i]}>
                <th className="p-1 text-left text-[11px] font-semibold text-slate-700">{labels[i]}</th>
                {row.map((n, j) => {
                  const a = Math.min(1, 0.12 + 0.88 * (n / total));
                  const rgb = i === j ? "16,185,129" : "244,63,94";
                  return (
                    <td key={labels[j]} className="h-12 rounded-lg bg-slate-50 font-bold" style={{ backgroundColor: `rgba(${rgb},${a.toFixed(2)})`, color: a > 0.55 ? "#ffffff" : "#0f172a" }}>
                      {fmt(n)}
                      <span className="block text-[10px] font-medium opacity-80">{pct(n / total, 0)}</span>
                    </td>
                  );
                })}
                <td className="p-1 text-slate-500">{fmt(total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LimitsPanel({ limits, future }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5">
        <p className="text-sm font-bold text-slate-900">Known limitations</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs text-slate-600">{limits.map((l) => <li key={l}>{l}</li>)}</ul>
      </div>
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
        <p className="text-sm font-bold text-slate-900">Future work</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs text-slate-600">{future.map((l) => <li key={l}>{l}</li>)}</ul>
      </div>
      <p className="text-[11px] text-slate-400 md:col-span-2">
        TrueTone is a screening aid built as a final-year project. It is not a medical device and does not replace a dermatologist.
      </p>
    </div>
  );
}

/* skin tone */

function ToneData() {
  const T = TONE;
  const steps = [
    ["Download", `${fmt(T.source.urls)} image links, ${fmt(T.source.downloaded)} photos retrieved (${fmt(T.source.labelled)} had a valid label)`],
    ["Merge", "six Fitzpatrick types combined into three classes"],
    ["Balance", "the Dark class topped up with augmented copies of real photos"],
    ["Split", "70% train, 15% validation, 15% test, stratified"],
  ];
  const maxBalance = Math.max(...T.balance.flatMap((b) => [b.before, b.after]));
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(([t, d], i) => (
          <div key={t} className="rounded-2xl border border-slate-200 p-3">
            <p className="text-[11px] font-bold text-emerald-600">Step {i + 1}</p>
            <p className="text-xs font-semibold text-slate-800">{t}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{d}</p>
          </div>
        ))}
      </div>

      <h3 className="mt-6 text-sm font-bold text-slate-900">Six Fitzpatrick types merged into three classes</h3>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400">
              <th className="py-2 pr-3 font-medium">Class</th>
              <th className="py-2 pr-3 font-medium">Fitzpatrick types</th>
              <th className="py-2 font-medium">Photos</th>
            </tr>
          </thead>
          <tbody>
            {T.merge.map((m) => (
              <tr key={m.key} className="border-b border-slate-100">
                <td className="py-2.5 pr-3 font-semibold text-slate-800">{m.label}</td>
                <td className="py-2.5 pr-3 text-slate-500">{m.types}</td>
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-40 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-sky-400" style={{ width: `${m.share}%` }} />
                    </div>
                    <span className="text-slate-600">{fmt(m.n)} ({m.share}%)</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-6 text-sm font-bold text-slate-900">Class balance, before and after adding augmented copies</h3>
      <div className="mt-3 space-y-3">
        {T.balance.map((b) => (
          <div key={b.label}>
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-800">{b.label}</span>
              <span className="text-slate-500">{fmt(b.before)} real, {fmt(b.after)} after{b.after > b.before ? ` (+${fmt(b.after - b.before)} copies)` : ""}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(b.after / maxBalance) * 100}%` }} />
            </div>
            <div className="mt-1 h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-slate-400" style={{ width: `${(b.before / maxBalance) * 100}%` }} />
            </div>
          </div>
        ))}
        <p className="text-[11px] text-slate-400">Green bar: after. Grey bar: real photos only.</p>
      </div>

      <SplitTable rows={T.split} />
      <Caption>
        How to read this: Fitzpatrick17k has far fewer dark-skin photos than light-skin ones, a 3.3 to 1 gap in real photos between Fair and Dark.
        The Dark class was topped up with augmented copies so the model sees the three classes equally. Copies are made from real photos
        and add no new people. Validation and test photos are drawn after this step.
      </Caption>
    </>
  );
}

function ToneTraining() {
  const candidates = ["EfficientNet-B2 (chosen)", "MobileNetV3-Large", "ResNet-50", "VGG-16"];
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-slate-200 p-4">
          <h3 className="mb-2 text-sm font-bold text-slate-900">Skin tone model</h3>
          <Row k="Backbone" v="EfficientNet-B2 (8.49M parameters), ImageNet pre-trained" />
          <Row k="Head" v="custom three-layer head (512, 128 and 3 units), dropout 0.3 after each hidden layer" />
          <Row k="Input" v="resize to 256, centre crop 224 x 224" />
          <Row k="Optimiser" v="AdamW, learning rate 3e-4, weight decay 1e-2" />
          <Row k="Schedule" v="5-epoch linear warm-up, then cosine annealing" />
          <Row k="Loss" v="cross-entropy, class weights 1 / 1 / 2 (Fair / Medium / Dark), label smoothing 0.05" />
          <Row k="Epochs" v={`up to ${TONE.test.epochs}, early stopping with patience 8`} />
          <Row k="Best checkpoint" v={`epoch ${TONE.test.bestEpoch} (validation loss 0.7076)`} />
          <Row k="Augmentation" v="flip, rotation 15 deg, colour jitter, small shifts and zoom, blur, occasional greyscale" />
          <Row k="Hardware" v="Google Colab T4 (16 GB). Photos were copied to local disk, cutting an epoch from 22+ minutes to about 2.6" />
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-500">Four architectures were compared on the same setup</p>
          <div className="flex flex-wrap gap-2">
            {candidates.map((c, i) => (
              <span key={c} className={`rounded-full px-3 py-1 text-[11px] font-semibold ${i === 0 ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>{c}</span>
            ))}
          </div>
          <Caption>
            EfficientNet-B2 was chosen on validation macro F1 and balanced accuracy. The Dark class counts twice as much in the loss, so
            missing a dark-skin photo is penalised more than over-calling it.
          </Caption>
        </div>
      </div>
      <FigureStrip items={[["/report-figures/tone_loss_curve.jpg", "Training and validation loss. The gold line marks the saved checkpoint at epoch 15."]]} />
    </>
  );
}

function ToneResults() {
  const t = TONE.test;
  const m = t.matrix;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Accuracy" value={`${t.accuracy}%`} hint="3 classes" />
        <Kpi label="Balanced accuracy" value={`${t.balancedAccuracy}%`} hint="average recall per class" />
        <Kpi label="Macro F1" value={`${t.macroF1}%`} hint="every class counts equally" />
        <Kpi label="Weighted F1" value={`${t.weightedF1}%`} hint="weighted by class size" />
        <Kpi label="Test photos" value={fmt(t.n)} hint="never seen in training" />
      </div>
      <ClassTable rows={t.perClass} />
      <p className="mb-1 mt-6 text-xs font-semibold text-slate-500">Where the test photos ended up</p>
      <ConfusionHeat labels={t.perClass.map((c) => c.label)} matrix={m} />
      <Caption>
        How to read this: each row is what the photos really are, each column is what the model said. Green is correct, red is wrong. Mistakes
        are mostly between neighbouring tones ({m[0][1]} Fair called Medium, {m[1][0]} Medium called Fair, {m[1][2]} Medium called Dark). Skipping a
        tone is rare: only {m[0][2]} Fair photos were called Dark and {m[2][0]} Dark photos were called Fair.
      </Caption>
      <p className="mt-3 text-xs text-slate-600">
        <span className="font-semibold text-slate-800">Dark recall ({pct(t.perClass[2].r)}) is higher than its precision ({pct(t.perClass[2].p)}) on purpose:</span>{" "}
        the loss counts Dark twice, so the model prefers to over-call Dark than to miss it. Medium is the weakest class (F1 {pct(t.perClass[1].f1)}).
      </p>
    </>
  );
}

function ToneLimits() {
  return (
    <LimitsPanel
      limits={[
        "The training photos (Fitzpatrick17k) are clinical and dermatological photos, not ordinary smartphone photos, so accuracy may drop on real phone photos.",
        "Three classes hide variation inside each class that may matter clinically.",
        "Three classes do not capture how lighting changes the look of skin, for example outdoors or in a studio.",
        "Fair and Medium are confused most often, and Medium is the weakest class.",
        `Dark has far fewer real photos (${fmt(TONE.balance[2].before)}) than Fair (${fmt(TONE.balance[0].before)}). The gap was filled with copies, not new people.`,
      ]}
      future={[
        "Add smartphone photos taken in different lighting, especially of dark skin.",
        "Test on a separate set of phone photos and report accuracy for each Fitzpatrick type.",
        "Check whether more than three classes are reliable once there are more photos.",
      ]}
    />
  );
}

/* skin type */

function TypeData() {
  const T = TYPE;
  const steps = [
    ["Collect", "three public Roboflow datasets, all CC BY 4.0"],
    ["Remove duplicates", "MD5 hash, so each photo is kept once"],
    ["Merge", "four classes: oily, dry, normal, combination"],
    ["Pad", "combination and dry topped up to about 2,200 each, before splitting"],
    ["Split", "70% train, 15% validation, 15% test, stratified, fixed seed 42"],
  ];
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map(([t, d], i) => (
          <div key={t} className="rounded-2xl border border-slate-200 p-3">
            <p className="text-[11px] font-bold text-emerald-600">Step {i + 1}</p>
            <p className="text-xs font-semibold text-slate-800">{t}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{d}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400">
              <th className="py-2 pr-3 font-medium">Source dataset</th>
              <th className="py-2 pr-3 font-medium">Photos</th>
              <th className="py-2 pr-3 font-medium">Classes</th>
              <th className="py-2 font-medium">Licence</th>
            </tr>
          </thead>
          <tbody>
            {T.sources.map((x) => (
              <tr key={x.name} className="border-b border-slate-100">
                <td className="py-2.5 pr-3 font-semibold text-slate-800">{x.name}</td>
                <td className="py-2.5 pr-3 text-slate-600">{fmt(x.photos)}</td>
                <td className="py-2.5 pr-3 text-slate-500">{x.classes}</td>
                <td className="py-2.5 text-slate-500">{x.licence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        A fourth class, sensitive skin, was left out because too few reliably labelled photos exist in any of the sources.
      </p>

      <SplitTable rows={T.split} approx />
      <Caption>
        How to read this: the combination class had only about 800 photos before padding, against about 3,400 normal and 2,500 oily, an imbalance of about
        4 to 1. Two things addressed it: padding with augmented copies before the split, and class weights during training (dry 6.47 times,
        combination 5.77 times). Because the copies were made before the split, copies of one photo can land in both training and validation
        (see limitations). The split figures are approximate.
      </Caption>
    </>
  );
}

function TypeTraining() {
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-slate-200 p-4">
          <h3 className="mb-2 text-sm font-bold text-slate-900">Skin type model</h3>
          <Row k="Backbone" v="EfficientNet-B0 (4.34M parameters), ImageNet pre-trained" />
          <Row k="Head" v="1280, dropout 0.4, 256 units, ReLU, dropout 0.3, 4 outputs" />
          <Row k="Loss" v="class-weighted cross-entropy, label smoothing 0.1, in both phases" />
          <Row k="Early stopping" v="patience 5 in each phase, best validation-accuracy checkpoint restored" />
          <Row k="Augmentation" v="flips, rotation 15 deg, small shifts and zoom, colour jitter, blur" />
          <Row k="Epochs" v="25 in total: 10 + 15" />
        </div>
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-900">Phase 1: 10 epochs</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                Backbone frozen, only the new head trains. Adam, learning rate 1e-3, halved when progress stalls (patience 3).
              </p>
            </div>
            <div className="rounded-2xl border border-tint-border bg-tint-subtle p-4">
              <p className="text-xs font-bold text-slate-900">Phase 2: 15 epochs</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                All layers unfrozen and fine-tuned. Adam, learning rate 1e-5 (100 times smaller), cosine annealing down to 1e-7.
              </p>
            </div>
          </div>
          <Caption>
            Training the head first stops a randomly started head from damaging the pre-trained features. The very small learning rate in
            phase 2 then lets the backbone adapt gently.
          </Caption>
        </div>
      </div>
      <FigureStrip items={[["/report-figures/type_training_history.jpg", "Loss and accuracy over both phases. The dashed line is where phase 2 starts."]]} />
    </>
  );
}

function TypeResults() {
  const t = TYPE.test;
  const dry = t.perClass[1];
  const comb = t.perClass[0];
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Accuracy" value={`${t.accuracy}%`} hint="4 classes" />
        <Kpi label="Macro F1" value={`${t.macroF1}%`} hint="every class counts equally" />
        <Kpi label="Weighted F1" value={`${t.weightedF1}%`} hint="weighted by class size" />
        <Kpi label="Test photos" value={fmt(t.n)} hint="held out from training" />
      </div>
      <ClassTable rows={t.perClass} notes />
      <Caption>
        How to read this: precision asks how often a prediction of that class was right, recall asks how many real cases of that class were found.
        Normal and oily are the most reliable. Dry is the weak spot (precision {pct(dry.p, 0)}, F1 {pct(dry.f1)}): it has fewer training photos and its colour is close to
        dry-oily skin. Combination is found often (recall {pct(comb.r, 0)}) but over-predicted (precision {pct(comb.p, 0)}) because it overlaps with oily and dry skin.
      </Caption>
    </>
  );
}

function TypeLimits() {
  return (
    <LimitsPanel
      limits={[
        `Dry skin is weak (F1 ${pct(TYPE.test.perClass[1].f1)}, precision ${pct(TYPE.test.perClass[1].p)}): few training photos, and a colour close to dry-oily skin.`,
        `Combination is over-predicted (recall ${pct(TYPE.test.perClass[0].r)}, precision ${pct(TYPE.test.perClass[0].p)}) because it overlaps with oily and dry skin.`,
        "Augmented copies were made before the data was split, so copies of one photo can be in both training and validation. This slightly inflates the validation figures.",
        "Sensitive skin is not a class, because too few reliably labelled photos exist.",
      ]}
      future={[
        "Split the data first and augment only the training part, then re-measure.",
        "Collect more reliably labelled dry-skin and combination photos.",
        "Add smartphone photos taken in different lighting.",
      ]}
    />
  );
}

/* the dispatchers: each section shows the model picked at the top */

function DataSection({ model }) {
  return model === "tone" ? <ToneData /> : model === "type" ? <TypeData /> : <ConditionData />;
}
function TrainingSection({ model }) {
  return model === "tone" ? <ToneTraining /> : model === "type" ? <TypeTraining /> : <ConditionTraining />;
}
function ResultsSection({ model }) {
  return model === "tone" ? <ToneResults /> : model === "type" ? <TypeResults /> : <ConditionResults />;
}
function LimitsSection({ model }) {
  return model === "tone" ? <ToneLimits /> : model === "type" ? <TypeLimits /> : <ConditionLimits />;
}

const WHY = {
  data: {
    tone: "Where the skin tone photos came from, how six Fitzpatrick types became three classes, and how the classes were balanced.",
    type: "Where the skin type photos came from and how the four classes were prepared.",
    condition: "Where the images came from and what was done to them before training.",
  },
  training: {
    tone: "How the skin tone model was chosen and trained.",
    type: "How the skin type model was trained, in two phases.",
    condition: "How the skin condition model was built, and how its learning behaved.",
  },
  results: {
    tone: `Performance on ${fmt(TONE.test.n)} held-out photos the model never saw while training.`,
    type: `Performance on ${fmt(TYPE.test.n)} held-out photos.`,
    condition: "Performance on 1,574 held-out images the model never saw while training.",
  },
  limits: {
    tone: "What the skin tone model does not yet do, and what comes next.",
    type: "What the skin type model does not yet do, and what comes next.",
    condition: "What this project does not yet do, and what comes next.",
  },
};

const MODEL_ORDER = ["tone", "type", "condition"];

const MODEL_INFO = {
  tone: {
    name: "Skin tone",
    backbone: "EfficientNet-B2",
    classes: "3 classes: Fair, Medium, Dark",
    what: "Estimates how light or dark the skin is, using the Fitzpatrick scale merged into three classes.",
    stats: [["Accuracy", `${TONE.test.accuracy.toFixed(1)}%`], ["Macro F1", `${TONE.test.macroF1.toFixed(1)}%`], ["Test photos", fmt(TONE.test.n)]],
  },
  type: {
    name: "Skin type",
    backbone: "EfficientNet-B0",
    classes: "4 classes: oily, dry, normal, combination",
    what: "Tells oily, dry, normal and combination skin apart.",
    stats: [["Accuracy", `${TYPE.test.accuracy.toFixed(1)}%`], ["Macro F1", `${TYPE.test.macroF1.toFixed(1)}%`], ["Test photos", fmt(TYPE.test.n)]],
  },
  condition: {
    name: "Skin condition",
    backbone: "EfficientNet-B3",
    classes: "6 results: healthy, acne, eczema, psoriasis, rosacea, tinea",
    what: "Looks for a skin condition, or says the skin looks healthy.",
    stats: [["Accuracy", `${REPORT.test.accuracy.toFixed(1)}%`], ["Macro F1", `${REPORT.test.macroF1.toFixed(1)}%`], ["Test photos", fmt(REPORT.test.perClass.reduce((a, c) => a + c.n, 0))]],
  },
};

function ModelCards() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {MODEL_ORDER.map((key) => {
        const m = MODEL_INFO[key];
        return (
          <div key={key} className="flex flex-col rounded-2xl border border-slate-200 p-5">
            <p className="text-base font-bold text-slate-900">{m.name}</p>
            <p className="text-[11px] font-semibold text-emerald-700">{m.backbone}</p>
            <p className="mt-2 text-xs text-slate-600">{m.what}</p>
            <p className="mt-1 text-[11px] text-slate-400">{m.classes}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {m.stats.map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-50 p-2">
                  <p className="text-[10px] text-slate-400">{k}</p>
                  <p className="text-sm font-extrabold text-slate-900">{v}</p>
                </div>
              ))}
            </div>
            <Link to={`/report/${key}`} className="mt-5 inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
              See the {m.name.toLowerCase()} details
            </Link>
          </div>
        );
      })}
    </div>
  );
}

export function OverviewBody() {
  return (
    <div className="space-y-6">
      <Section id="architecture" n={1} title="System architecture" why="How a photo travels from the browser to a result, and what else the platform does with it.">
        <Architecture />
        <Caption>
          One request runs the whole image pipeline. The three models run in parallel threads, and the result becomes the user&apos;s skin
          profile that drives the recommendations, the product scanner and the chatbot.
        </Caption>
      </Section>
      <Section id="models" n={2} title="The three models" why="Each model has its own page with its data, training, results and limits. Pick one.">
        <ModelCards />
      </Section>
      <Section id="safety" n={3} title="Safety and decision design" why="Rules that sit on top of the models so a wrong answer does as little harm as possible.">
        <SafetySection />
      </Section>
      <Section id="fairness" n={4} title="Skin-tone coverage" why="Who is represented in the data, reported openly.">
        <FairnessSection />
      </Section>
    </div>
  );
}

export function ModelBody({ model }) {
  const withReal = model === "condition";
  const next = MODEL_ORDER[(MODEL_ORDER.indexOf(model) + 1) % MODEL_ORDER.length];
  return (
    <div className="space-y-6">
      <Section id="data" n={1} title="Data and preparation" why={WHY.data[model]}>
        <DataSection model={model} />
      </Section>
      <Section id="training" n={2} title="Model and training" why={WHY.training[model]}>
        <TrainingSection model={model} />
      </Section>
      <Section id="results" n={3} title="Test-set results" why={WHY.results[model]}>
        <ResultsSection model={model} />
      </Section>
      {withReal && (
        <Section id="realworld" n={4} title="Real-world check" why="This model on ordinary photos from the web, outside the training sources.">
          <RealWorldSection />
        </Section>
      )}
      <Section id="limits" n={withReal ? 5 : 4} title="Limitations and future work" why={WHY.limits[model]}>
        <LimitsSection model={model} />
      </Section>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/report" className="rounded-full border border-slate-300 bg-white px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          Back to the report overview
        </Link>
        <Link to={`/report/${next}`} className="rounded-full bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
          Next: the {MODEL_INFO[next].name.toLowerCase()} model
        </Link>
      </div>
    </div>
  );
}

function PillNav({ items }) {
  return (
    <div className="mt-4 flex flex-wrap gap-1.5">
      {items.map(([id, label], i) => (
        <a key={id} href={`#sec-${id}`} className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 hover:text-emerald-700">
          {i + 1}. {label}
        </a>
      ))}
      <button type="button" onClick={() => window.print()} className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white print:hidden">
        Print
      </button>
    </div>
  );
}

// The Model Report starting page: system-wide sections, and a button to each model's own page
const ModelReport = () => (
  <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6">
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">Examiner view</p>
        <h1 className="mt-1 text-3xl font-extrabold">Model and System Report</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          How TrueTone&apos;s three models (skin tone, skin type and skin condition) were built, trained and tested, using the real numbers from this project,
          including where they fall short. Each model has its own page. To watch one photo travel through the system step by step, open the{" "}
          <a href="/inspector" className="font-semibold text-emerald-700 underline">Pipeline Inspector</a>.
        </p>
        <PillNav items={NAV_OVERVIEW} />
      </div>
      <ModelSwitch current="overview" />
      <OverviewBody />
    </div>
  </div>
);

// One page per model: /report/tone, /report/type, /report/condition
export function ModelReportPage() {
  const { model } = useParams();
  const valid = MODEL_ORDER.includes(model);
  useEffect(() => {
    if (valid) window.scrollTo(0, 0);
  }, [model, valid]);
  if (!valid) return <Navigate to="/report" replace />;
  const m = MODEL_INFO[model];
  const nav = model === "condition" ? NAV_MODEL : NAV_MODEL.filter(([id]) => id !== "realworld");
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <Link to="/report" className="text-xs font-semibold text-emerald-700 underline print:hidden">Back to the report overview</Link>
          <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-emerald-600">Model report</p>
          <h1 className="mt-1 text-3xl font-extrabold">{m.name} model</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            {m.backbone}. {m.what} {m.classes}.
          </p>
          <PillNav items={nav} />
        </div>
        <ModelSwitch current={model} />
        <ModelBody model={model} />
      </div>
    </div>
  );
}

export default ModelReport;