// Shared building blocks for the system report pages (RAG, Recommendation engine).
// Shared layout and typography for the system reports.

export const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
export const pct = (v, d = 1) => `${(v * 100).toFixed(d)}%`;

export function Section({ id, n, title, why, children }) {
  return (
    <section id={`sec-${id}`} className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cocoa text-sm font-bold text-white">{n}</div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{why}</p>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function Kpi({ label, value, hint }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

export function Row({ k, v }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 text-xs last:border-0">
      <span className="text-slate-500">{k}</span>
      <span className="text-right font-semibold text-slate-800">{v}</span>
    </div>
  );
}

export function Caption({ children }) {
  return <p className="mt-3 rounded-xl bg-paper-alt px-3 py-2 text-xs text-cocoa-light">{children}</p>;
}

export function SubTitle({ children }) {
  return <h3 className="mb-2 mt-6 text-sm font-bold text-slate-900 first:mt-0">{children}</h3>;
}

const BAR_TONES = {
  emerald: "bg-emerald-500",
  strong: "bg-emerald-600",
  rose: "bg-rose-400",
  amber: "bg-amber-400",
  sky: "bg-slate-400",
  slate: "bg-slate-300",
};

/** A thin horizontal bar: value out of max. */
export function Bar({ value, max = 1, tone = "emerald", width = "w-full" }) {
  const w = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={`h-2 rounded-full bg-slate-100 ${width}`}>
      <div className={`h-2 rounded-full ${BAR_TONES[tone] || BAR_TONES.emerald}`} style={{ width: `${w}%` }} />
    </div>
  );
}

const CHIP_TONES = {
  emerald: "bg-emerald-50 text-emerald-700",
  rose: "bg-rose-50 text-rose-700",
  amber: "bg-amber-50 text-amber-700",
  slate: "bg-slate-100 text-slate-600",
  sky: "bg-slate-100 text-slate-700",
};

export function Chip({ tone = "slate", children }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${CHIP_TONES[tone] || CHIP_TONES.slate}`}>{children}</span>;
}

export function Arrow({ down = false }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 text-slate-400 ${down ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** A numbered vertical timeline: steps = [[title, text], ...] */
export function Steps({ steps }) {
  return (
    <ol className="space-y-0">
      {steps.map(([title, text], i) => (
        <li key={title} className="relative flex gap-4 pb-5 last:pb-0">
          {i < steps.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-slate-200" aria-hidden="true" />}
          <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cocoa text-xs font-bold text-white">{i + 1}</span>
          <div className="pt-1">
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="text-xs text-slate-500">{text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** A plain table: head = [..], rows = [[..], ..]. First column is bold. */
export function Table({ head, rows, min = "min-w-[520px]" }) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${min} text-left text-xs`}>
        <thead>
          <tr className="border-b border-slate-200 text-slate-400">
            {head.map((h) => (
              <th key={h} className="py-2 pr-3 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r[0]}-${i}`} className="border-b border-slate-100 align-top">
              {r.map((c, j) => (
                <td key={j} className={`py-2.5 pr-3 ${j === 0 ? "font-semibold text-slate-800" : "text-slate-600"}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}