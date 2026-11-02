import { useState } from "react";

/* ════════════════════════════════════════════════════════════════════════════
   MODEL & SYSTEM REPORT - examiner view
   Every number on this page comes from a real run of this project (dataset
   build log, Colab training log, test-set classification report, and the
   18-photo web check). To update the page after a retrain, edit REPORT below.
   ════════════════════════════════════════════════════════════════════════════ */

export const REPORT = {
  // Dataset build (Colab build_dataset log). raw -> after duplicate + quality filtering -> used (cap 1650) -> split
  classes: [
    { key: "comedonal_acne", label: "Acne (comedonal)", source: "Roboflow acne set", raw: 1749, clean: 1645, used: 1645, train: 1151, val: 247, test: 247 },
    { key: "cystic_acne", label: "Acne (cystic)", source: "Roboflow acne set", raw: 1749, clean: 1639, used: 1639, train: 1147, val: 246, test: 246 },
    { key: "eczema", label: "Eczema", source: "DermNet", raw: 2156, clean: 1976, used: 1650, train: 1155, val: 247, test: 248 },
    { key: "healthy", label: "Healthy", source: "Roboflow normal-skin + SCIN", raw: 3802, clean: 3294, used: 1650, train: 1155, val: 247, test: 248 },
    { key: "psoriasis", label: "Psoriasis", source: "DermNet", raw: 1757, clean: 1669, used: 1650, train: 1155, val: 247, test: 248 },
    { key: "rosacea", label: "Rosacea", source: "Roboflow acne set", raw: 1239, clean: 757, used: 757, train: 529, val: 114, test: 114 },
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

const MONK_SWATCH = ["#f6ede4", "#f3e7db", "#f7ead0", "#eadaba", "#d7bd96", "#a07e56", "#825c43", "#604134", "#3a312a", "#292420"];

const NAV = [
  ["architecture", "Architecture"],
  ["data", "Data"],
  ["training", "Training"],
  ["results", "Test results"],
  ["realworld", "Real-world check"],
  ["safety", "Safety design"],
  ["fairness", "Skin-tone coverage"],
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
        <Box x={528} y={118} w={190} h={40} title="Skin type" sub="EfficientNet" tone="amber" />
        <Box x={528} y={166} w={190} h={40} title="Skin tone" sub="EfficientNet" tone="amber" />
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

function DataSection() {
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

function TrainingSection() {
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

function ResultsSection() {
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
    ["Confidence thresholds", "A result is only reported when the top probability reaches 50% (skin type, tone) or 40% (condition). Below that the screen says Unclear."],
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
        Not measured: the DermNet and Roboflow images carry no skin-tone labels, so overall coverage and accuracy per skin tone were
        not evaluated. This is listed under future work.
      </p>
    </>
  );
}

/* ───────────────────────────── 8. limits ───────────────────────────── */

function LimitsSection() {
  const limits = [
    "Rosacea and tinea are weak on ordinary photos (rosacea 1 of 5, tinea 0 of 2 in the web check).",
    "The two acne types cannot be told apart reliably, so they are reported together.",
    "Classes come from different kinds of photos (acne, rosacea and healthy are mostly faces; eczema, psoriasis and tinea are mostly body close-ups), so the model may partly use the photo type as a shortcut.",
    "Overfitting: validation accuracy peaked early (epoch 6) and the test set shares sources with the training data.",
    "No evaluation per skin tone, and the data leans towards lighter skin.",
    "Confidence thresholds were set by hand and are not calibrated on an independent set.",
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

export function ReportBody() {
  return (
    <div className="space-y-6">
      <Section id="architecture" n={1} title="System architecture" why="How a photo travels from the browser to a result, and what else the platform does with it.">
        <Architecture />
        <Caption>
          One request runs the whole image pipeline. The three models run in parallel threads, and the result becomes the user&apos;s skin
          profile that drives the recommendations, the product scanner and the chatbot.
        </Caption>
      </Section>
      <Section id="data" n={2} title="Data and preparation" why="Where the images came from and what was done to them before training.">
        <DataSection />
      </Section>
      <Section id="training" n={3} title="Model and training" why="How the skin condition model was built, and how its learning behaved.">
        <TrainingSection />
      </Section>
      <Section id="results" n={4} title="Test-set results" why="Performance on 1,574 held-out images the model never saw while training.">
        <ResultsSection />
      </Section>
      <Section id="realworld" n={5} title="Real-world check" why="The same model on ordinary photos from the web, outside the training sources.">
        <RealWorldSection />
      </Section>
      <Section id="safety" n={6} title="Safety and decision design" why="Rules that sit on top of the model so a wrong answer does as little harm as possible.">
        <SafetySection />
      </Section>
      <Section id="fairness" n={7} title="Skin-tone coverage" why="Who is represented in the data, reported openly.">
        <FairnessSection />
      </Section>
      <Section id="limits" n={8} title="Limitations and future work" why="What this project does not yet do, and what comes next.">
        <LimitsSection />
      </Section>
    </div>
  );
}

const ModelReport = () => (
  <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6">
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">Examiner view</p>
        <h1 className="mt-1 text-3xl font-extrabold">Model and System Report</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          How TrueTone was built, trained and tested, using the real numbers from this project, including where it falls short.
          To watch one photo travel through the system step by step, open the{" "}
          <a href="/inspector" className="font-semibold text-emerald-700 underline">Pipeline Inspector</a>.
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {NAV.map(([id, label], i) => (
            <a key={id} href={`#sec-${id}`} className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 hover:text-emerald-700">
              {i + 1}. {label}
            </a>
          ))}
          <button type="button" onClick={() => window.print()} className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white">
            Print
          </button>
        </div>
      </div>
      <ReportBody />
    </div>
  </div>
);

export default ModelReport;