import { useEffect, useReducer, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { analyzeSkinDisease } from "../services/analysis";
import { startInspection } from "./PipelineInspector";

/* ════════════════════════════════════════════════════════════════════════════
   EVALUATION LAB - examiner view
   Drop in photos, say what each one really shows, and watch the app's own
   answers fill in a confusion matrix with live accuracy figures.
   Nothing is saved: each photo is only analysed.
   ════════════════════════════════════════════════════════════════════════════ */

const CLASSES = [
  { key: "healthy", label: "Healthy" },
  { key: "acne", label: "Acne" },
  { key: "eczema", label: "Eczema" },
  { key: "psoriasis", label: "Psoriasis" },
  { key: "rosacea", label: "Rosacea" },
  { key: "tinea", label: "Tinea" },
];
const ANSWERS = [...CLASSES, { key: "unclear", label: "Unclear" }];
const LABEL = Object.fromEntries(ANSWERS.map((a) => [a.key, a.label]));

// The true type is read from the file name when possible (editable afterwards)
const NAME_RULES = [
  [/^(ca|cy)\d/, "acne"],
  [/^(acne|cystic|comedonal|common)/, "acne"],
  [/^(e\d|eczema)/, "eczema"],
  [/^(psy?\d|psoriasis)/, "psoriasis"],
  [/^(r\d|rosacea)/, "rosacea"],
  [/^(tr\d|tinea)/, "tinea"],
  [/^(h\d|healthy)/, "healthy"],
];

export function truthFromName(name) {
  const stem = String(name || "").toLowerCase().replace(/\.[a-z0-9]+$/, "");
  for (const [rx, key] of NAME_RULES) if (rx.test(stem)) return key;
  return "";
}

/** What the app told the user for this photo, as one of the matrix columns. */
export function answerOf(pred) {
  if (!pred) return null;
  const confident = typeof pred.is_confident === "boolean" ? pred.is_confident : Number(pred.confidence) >= 0.4;
  if (!confident) return "unclear";
  const l = pred.label;
  if (l === "healthy" || l === "none") return "healthy";
  if (l === "common_acne" || l === "cystic_acne" || l === "acne") return "acne";
  return ["eczema", "psoriasis", "rosacea", "tinea"].includes(l) ? l : null;
}

/** Count how often each true type received each answer. */
export function buildMatrix(items) {
  const counts = {};
  const rowTotals = {};
  const colTotals = {};
  let evaluated = 0;
  let correct = 0;
  let unclear = 0;
  let rejected = 0;
  let noTruth = 0;
  for (const it of items) {
    if (!it.truth) {
      noTruth += it.status === "done" ? 1 : 0;
      continue;
    }
    if (it.status === "error") {
      rejected += 1;
      continue;
    }
    if (it.status !== "done" || !it.answer) continue;
    counts[it.truth] = counts[it.truth] || {};
    counts[it.truth][it.answer] = (counts[it.truth][it.answer] || 0) + 1;
    rowTotals[it.truth] = (rowTotals[it.truth] || 0) + 1;
    colTotals[it.answer] = (colTotals[it.answer] || 0) + 1;
    evaluated += 1;
    if (it.answer === it.truth) correct += 1;
    if (it.answer === "unclear") unclear += 1;
  }
  return { counts, rowTotals, colTotals, evaluated, correct, unclear, rejected, noTruth };
}

/** Accuracy, coverage and per-class precision, recall and F1 from the matrix. */
export function computeMetrics(m) {
  const perClass = CLASSES.filter((c) => (m.rowTotals[c.key] || 0) > 0).map((c) => {
    const tp = m.counts[c.key]?.[c.key] || 0;
    const support = m.rowTotals[c.key] || 0;
    const answered = m.colTotals[c.key] || 0;
    const recall = support ? tp / support : 0;
    const precision = answered ? tp / answered : 0;
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
    return { key: c.key, label: c.label, support, answered, tp, recall, precision, f1 };
  });
  const committed = m.evaluated - m.unclear;
  return {
    perClass,
    accuracy: m.evaluated ? m.correct / m.evaluated : null,
    coverage: m.evaluated ? committed / m.evaluated : null,
    committedAccuracy: committed ? m.correct / committed : null,
    macroF1: perClass.length ? perClass.reduce((a, c) => a + c.f1, 0) / perClass.length : null,
  };
}

const pct = (v, d = 0) => (v === null || v === undefined ? "-" : `${(v * 100).toFixed(d)}%`);

/* ───────────────────────────── display pieces ───────────────────────────── */

function Kpi({ label, value, hint }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

function cellStyle(n, rowTotal, kind) {
  if (!n) return {};
  const a = Math.min(1, 0.15 + 0.85 * (n / Math.max(1, rowTotal)));
  const rgb = kind === "diag" ? "16,185,129" : kind === "unclear" ? "245,158,11" : "244,63,94";
  return { backgroundColor: `rgba(${rgb},${a.toFixed(2)})`, color: a > 0.55 ? "#ffffff" : "#0f172a" };
}

export function ConfusionMatrix({ matrix }) {
  const rows = CLASSES.filter((c) => (matrix.rowTotals[c.key] || 0) > 0);
  if (rows.length === 0) {
    return <p className="rounded-2xl bg-slate-50 p-6 text-center text-xs text-slate-400">The matrix fills in as photos are analysed.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-separate border-spacing-1 text-center text-xs">
        <thead>
          <tr>
            <th className="p-1 text-left text-[10px] font-semibold uppercase text-slate-400">Really is</th>
            {ANSWERS.map((a) => (
              <th key={a.key} className="p-1 text-[11px] font-semibold text-slate-600">{a.label}</th>
            ))}
            <th className="p-1 text-[10px] font-semibold uppercase text-slate-400">Photos</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th className="p-1 text-left text-[11px] font-semibold text-slate-700">{r.label}</th>
              {ANSWERS.map((a) => {
                const n = matrix.counts[r.key]?.[a.key] || 0;
                const kind = a.key === r.key ? "diag" : a.key === "unclear" ? "unclear" : "off";
                return (
                  <td key={a.key} className="h-10 rounded-lg bg-slate-50 font-bold" style={cellStyle(n, matrix.rowTotals[r.key], kind)}>
                    {n || ""}
                  </td>
                );
              })}
              <td className="p-1 text-slate-500">{matrix.rowTotals[r.key]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-slate-400">
        Rows are what the photo really shows, columns are what the app answered. Green is a correct answer, red is a wrong one, amber is
        Unclear. A perfect model would only have green cells on the diagonal.
      </p>
    </div>
  );
}

const statusChip = {
  queued: "bg-slate-100 text-slate-500",
  running: "bg-sky-100 text-sky-700",
  done: "bg-emerald-50 text-emerald-700",
  error: "bg-rose-50 text-rose-700",
};

export function EvaluationReport({ items, onTruth, onInspect }) {
  const m = buildMatrix(items);
  const k = computeMetrics(m);
  const done = items.filter((i) => i.status === "done" || i.status === "error").length;
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Analysed" value={`${done} / ${items.length}`} hint="photos so far" />
        <Kpi label="Accuracy" value={pct(k.accuracy)} hint="Unclear counts as wrong" />
        <Kpi label="Answered" value={pct(k.coverage)} hint="share that was not Unclear" />
        <Kpi label="Accuracy when answered" value={pct(k.committedAccuracy)} hint="correct among answered" />
        <Kpi label="Macro F1" value={pct(k.macroF1)} hint="every class counts equally" />
      </div>
      {(m.rejected > 0 || m.noTruth > 0) && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {m.rejected > 0 ? `${m.rejected} photo${m.rejected === 1 ? " was" : "s were"} rejected before analysis (for example no face found) and ${m.rejected === 1 ? "is" : "are"} not counted. ` : ""}
          {m.noTruth > 0 ? `${m.noTruth} analysed photo${m.noTruth === 1 ? " has" : "s have"} no true type selected and ${m.noTruth === 1 ? "is" : "are"} not counted.` : ""}
        </p>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Confusion matrix</h2>
        <p className="mb-4 text-sm text-slate-500">Where each kind of photo ended up. It updates after every photo.</p>
        <ConfusionMatrix matrix={m} />
      </div>

      {k.perClass.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Per-condition results</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400">
                  <th className="py-2 pr-3 font-medium">Condition</th>
                  <th className="py-2 pr-3 font-medium">Photos</th>
                  <th className="py-2 pr-3 font-medium">Found (recall)</th>
                  <th className="py-2 pr-3 font-medium">Right when said (precision)</th>
                  <th className="py-2 font-medium">F1</th>
                </tr>
              </thead>
              <tbody>
                {k.perClass.map((c) => (
                  <tr key={c.key} className="border-b border-slate-100">
                    <td className="py-2.5 pr-3 font-semibold text-slate-800">{c.label}</td>
                    <td className="py-2.5 pr-3 text-slate-500">{c.support}</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-slate-100">
                          <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${c.recall * 100}%` }} />
                        </div>
                        <span className="text-slate-600">{c.tp} of {c.support}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600">{c.answered ? `${c.tp} of ${c.answered}` : "never answered"}</td>
                    <td className="py-2.5 font-semibold text-slate-800">{pct(c.f1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Every photo</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400">
                <th className="py-2 pr-3 font-medium">Photo</th>
                <th className="py-2 pr-3 font-medium">Really is</th>
                <th className="py-2 pr-3 font-medium">App answered</th>
                <th className="py-2 pr-3 font-medium">Result</th>
                <th className="py-2 font-medium">Status</th>
                {onInspect && <th className="py-2 font-medium" />}
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const right = it.status === "done" && it.truth && it.answer ? it.answer === it.truth : null;
                return (
                  <tr key={it.id} className="border-b border-slate-100 align-middle">
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        {it.url && <img src={it.url} alt="" className="h-9 w-9 rounded-lg object-cover" />}
                        <span className="max-w-[160px] truncate font-semibold text-slate-700">{it.name}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      {onTruth ? (
                        <select value={it.truth} onChange={(e) => onTruth(it.id, e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs">
                          <option value="">Not sure</option>
                          {CLASSES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                        </select>
                      ) : (
                        <span>{LABEL[it.truth] || "Not sure"}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-slate-700">
                      {it.status === "done" ? `${LABEL[it.answer] || "-"}${it.confidence != null ? ` (${Math.round(it.confidence * 100)}%)` : ""}` : it.status === "error" ? <span className="text-rose-600">{it.error}</span> : "-"}
                    </td>
                    <td className="py-2 pr-3 font-bold">
                      {right === true && <span className="text-emerald-600">Correct</span>}
                      {right === false && <span className="text-rose-600">Wrong</span>}
                    </td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusChip[it.status]}`}>{it.status}</span>
                    </td>
                    {onInspect && (
                      <td className="py-2 pl-3">
                        <button type="button" onClick={() => onInspect(it)} className="rounded-full border border-emerald-300 px-3 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50">
                          Inspect
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── the page ───────────────────────────── */

// Kept outside the component so photos and results survive moving to another page and back.
// Leaving the page pauses a run; photos that were already analysed keep their results.
const store = { items: [], skipFace: true, running: false, cancel: false, nextId: 1 };
const listeners = new Set();
const notify = () => listeners.forEach((l) => l());
const commit = (next) => {
  store.items = next;
  notify();
};
const patch = (id, fields) => commit(store.items.map((i) => (i.id === id ? { ...i, ...fields } : i)));

async function runEvaluation() {
  if (store.running) return;
  store.cancel = false;
  store.running = true;
  notify();
  const todo = store.items.filter((i) => i.status === "queued" || i.status === "error").map((i) => i.id);
  for (const id of todo) {
    if (store.cancel) break;
    const it = store.items.find((i) => i.id === id);
    if (!it) continue;
    patch(id, { status: "running", error: "" });
    try {
      const payload = await analyzeSkinDisease(it.file, store.skipFace);
      if (!payload?.success || payload.data?.status === "error") {
        patch(id, { status: "error", error: payload?.data?.message || payload?.message || "Rejected" });
        continue;
      }
      const pred = payload.data?.predictions?.skin_disease;
      patch(id, { status: "done", answer: answerOf(pred), confidence: Number(pred?.confidence) });
    } catch (err) {
      const body = err?.response?.data?.data;
      patch(id, { status: "error", error: body?.message || err?.response?.data?.message || err?.message || "Failed" });
    }
  }
  store.running = false;
  notify();
}

const EvaluationLab = () => {
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const [, refresh] = useReducer((n) => n + 1, 0);

  useEffect(() => {
    listeners.add(refresh);
    return () => {
      listeners.delete(refresh);
      store.cancel = true; // leaving the page pauses the run
    };
  }, []);

  const items = store.items;
  const running = store.running;

  const addFiles = (fileList) => {
    const added = Array.from(fileList || [])
      .filter((f) => /^image\//.test(f.type))
      .map((f) => ({
        id: store.nextId++,
        file: f,
        url: URL.createObjectURL(f),
        name: f.name,
        truth: truthFromName(f.name),
        status: "queued",
        answer: null,
        confidence: null,
        error: "",
      }));
    commit([...store.items, ...added]);
  };

  const clearAll = () => {
    store.cancel = true;
    store.items.forEach((i) => i.url && URL.revokeObjectURL(i.url));
    commit([]);
  };

  const downloadCsv = () => {
    const rows = [["file", "really_is", "app_answered", "confidence", "status"]].concat(
      items.map((i) => [i.name, i.truth, i.answer || "", i.confidence != null ? i.confidence.toFixed(3) : "", i.status])
    );
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "truetone-evaluation.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const inspect = (it) => {
    startInspection(it.file, store.skipFace);
    navigate("/inspector");
  };

  const finished = items.filter((i) => i.status === "done" || i.status === "error").length;
  const pending = items.filter((i) => i.status === "queued" || i.status === "error").length;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">Examiner view</p>
          <h1 className="mt-1 text-3xl font-extrabold">Evaluation Lab</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Add photos, say what each one really shows, and watch the app mark itself. Nothing is saved. File names like
            ca1.jpg (acne), e1.jpg (eczema), ps1.jpg (psoriasis), r1.jpg (rosacea), tr1.jpg (tinea) and h1.jpg (healthy) are recognised
            automatically, and you can change any row. Click Inspect on a row to follow that photo through every step. Your photos and
            results are kept while you visit the other pages.
          </p>
        </div>

        <div
          className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-6 text-center shadow-sm"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <p className="text-sm font-semibold text-slate-700">Drop photos here, or</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={() => inputRef.current?.click()} className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Choose photos
            </button>
            <button
              type="button"
              onClick={runEvaluation}
              disabled={running || pending === 0}
              className="rounded-full bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-40"
            >
              {running ? `Analysing ${finished} of ${items.length}...` : "Run evaluation"}
            </button>
            {running && (
              <button type="button" onClick={() => { store.cancel = true; }} className="rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-600">
                Stop
              </button>
            )}
            {items.length > 0 && (
              <>
                <button type="button" onClick={downloadCsv} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                  Download CSV
                </button>
                <button type="button" onClick={() => window.print()} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                  Print
                </button>
                <button type="button" onClick={clearAll} className="px-3 py-2 text-sm font-semibold text-slate-400 hover:text-slate-600">
                  Clear
                </button>
              </>
            )}
          </div>
          <label className="mt-3 inline-flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={store.skipFace}
              onChange={(e) => {
                store.skipFace = e.target.checked;
                notify();
              }}
              className="accent-emerald-600"
            />
            Skip the face check (needed for skin close-ups; faces are still cropped when found)
          </label>
          {items.length > 0 && (
            <div className="mx-auto mt-4 h-2 max-w-md overflow-hidden rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${(finished / items.length) * 100}%` }} />
            </div>
          )}
        </div>

        {items.length > 0 ? (
          <EvaluationReport items={items} onTruth={(id, v) => patch(id, { truth: v })} onInspect={inspect} />
        ) : (
          <p className="text-center text-xs text-slate-400">
            No photos yet. The held-out test photos from Drive work well here, as do ordinary web photos. Try 10 to 20.
          </p>
        )}
      </div>
    </div>
  );
};

export default EvaluationLab;