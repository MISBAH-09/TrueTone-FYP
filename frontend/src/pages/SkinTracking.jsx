import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  CalendarClock,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { getSkinScanHistory } from "../services/analysis";
import { DataTable } from "../components/ui";

const LABEL = {
  common_acne: "Acne",
  cystic_acne: "Acne",
  eczema: "Eczema",
  healthy: "None detected",
  psoriasis: "Psoriasis",
  rosacea: "Rosacea",
  tinea: "Tinea",
};

const conditionLabel = (raw) => (raw ? LABEL[raw] || raw : "None detected");

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

const formatPct = (v) => (v == null ? "—" : `${Math.round(v * 100)}%`);

/* Thumbnail with a hover preview rendered via portal (escapes all overflow contexts) */
function HoverImage({ src, alt }) {
  const thumbRef = useRef(null);
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const handleEnter = useCallback(() => {
    if (!thumbRef.current) return;
    const rect = thumbRef.current.getBoundingClientRect();
    setPos({ top: rect.top + rect.height / 2 - 110, left: rect.right + 12 });
    setShow(true);
  }, []);

  return (
    <>
      <img
        ref={thumbRef}
        src={src}
        alt={alt}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
        className="h-10 w-10 cursor-pointer rounded-[var(--tt-radius)] border border-[var(--tt-border)] object-cover transition hover:border-[var(--tt-primary)]"
      />
      {show &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999]"
            style={{ top: pos.top, left: pos.left }}
          >
            <img
              src={src}
              alt={`${alt} full`}
              className="max-h-[220px] max-w-[220px] rounded-xl border border-[var(--tt-border)] bg-white object-contain p-1 shadow-2xl"
            />
          </div>,
          document.body
        )}
    </>
  );
}

const SkinTracking = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scans, setScans] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getSkinScanHistory();
        setScans(data.data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Couldn't load your scan history.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-[var(--tt-ink)]">
        <Loader2 className="h-7 w-7 animate-spin text-[var(--tt-primary)]" />
        <p className="text-sm text-[var(--tt-secondary)]">Loading your skin tracking history…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-24 text-center">
        <AlertTriangle className="text-[var(--tt-avoid)]" size={26} />
        <p className="text-sm font-medium text-[var(--tt-avoid)]">{error}</p>
      </div>
    );
  }

  if (scans.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center text-[var(--tt-ink)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-[var(--tt-radius)] bg-[var(--tt-primary-muted)] text-[var(--tt-primary)]">
          <CalendarClock size={26} />
        </div>
        <div>
          <p className="tt-mono text-xs font-medium uppercase tracking-[0.14em] text-[var(--tt-primary)]">
            Skin Tracking
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">No tracked scans yet</h1>
          <p className="mt-1.5 text-sm text-[var(--tt-secondary)]">
            Run a disease check in Skin Analysis and confirm the photo is yours.
            That scan is saved here, and your profile condition is updated with it.
          </p>
        </div>
        <a
          href="/skin-analysis"
          className="mt-1 inline-flex h-[var(--tt-control-h)] items-center rounded-[var(--tt-radius)] bg-[var(--tt-primary)] px-5 text-sm font-medium text-white hover:bg-[var(--tt-primary-hover)]"
        >
          Go to Skin Analysis
        </a>
      </div>
    );
  }

  const latest = scans[0];
  const previous = scans[1];

  // Confidence trend on the disease-confidence score - a rough, honest signal
  // only shown when there are at least two scans to compare.
  let trend = null;
  if (
    previous &&
    latest.disease_detected &&
    previous.disease_detected &&
    latest.skin_disease_confidence != null &&
    previous.skin_disease_confidence != null
  ) {
    const delta = latest.skin_disease_confidence - previous.skin_disease_confidence;
    if (Math.abs(delta) < 0.03) trend = "flat";
    else trend = delta > 0 ? "up" : "down";
  }

  const historyColumns = [
    {
      key: "date",
      header: "Date",
      render: (s) => (
        <span className="text-[var(--tt-secondary)]">{formatDate(s.scanned_at)}</span>
      ),
    },
    {
      key: "photos",
      header: "Photos",
      render: (s) => {
        const hasOriginal = !!s.image_original;
        const hasProcessed = !!s.image_processed;
        if (!hasOriginal && !hasProcessed) {
          return <span className="text-sm text-[var(--tt-secondary)]">—</span>;
        }
        return (
          <div className="flex items-center gap-2">
            {hasOriginal && <HoverImage src={s.image_original} alt="Original" />}
            {hasProcessed && <HoverImage src={s.image_processed} alt="Processed" />}
          </div>
        );
      },
    },
    {
      key: "skin_type",
      header: "Skin type",
      render: (s) => <span className="capitalize">{s.skin_type || "—"}</span>,
    },
    {
      key: "skin_tone",
      header: "Skin tone",
      render: (s) => <span className="capitalize">{s.skin_tone || "—"}</span>,
    },
    {
      key: "condition",
      header: "Condition",
      render: (s) =>
        s.disease_detected ? (
          <span className="inline-flex items-center rounded-[var(--tt-radius)] border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-[var(--tt-caution)]">
            {conditionLabel(s.skin_disease)}
          </span>
        ) : (
          <span className="text-[var(--tt-secondary)]">None detected</span>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 text-[var(--tt-ink)]">
      <div className="border-b border-[var(--tt-border)] pb-4">
        <p className="tt-mono text-xs font-medium uppercase tracking-[0.14em] text-[var(--tt-primary)]">
          Skin Tracking
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Your skin over time</h1>
        <p className="mt-1.5 text-sm text-[var(--tt-secondary)]">
          {scans.length} confirmed scan{scans.length > 1 ? "s" : ""}, most recent first.
        </p>
      </div>

      <div className="rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="tt-mono text-xs font-medium uppercase tracking-[0.12em] text-[var(--tt-secondary)]">
            Current profile
          </h2>
          <span className="text-xs text-[var(--tt-secondary)]">{formatDate(latest.scanned_at)}</span>
        </div>

        {(latest.image_original || latest.image_processed) && (
          <div className="mb-4 flex flex-wrap items-center justify-center gap-4 rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-paper)] p-3">
            {latest.image_original && (
              <div className="flex flex-col items-center gap-2">
                <span className="tt-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--tt-secondary)]">
                  Original
                </span>
                <div className="relative h-32 w-32 overflow-hidden rounded-[var(--tt-radius)] border border-[var(--tt-border)]">
                  <img src={latest.image_original} alt="Original" className="h-full w-full object-cover" />
                </div>
              </div>
            )}
            {latest.image_processed && (
              <div className="flex flex-col items-center gap-2">
                <span className="tt-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--tt-primary)]">
                  Analysis
                </span>
                <div className="relative h-32 w-32 overflow-hidden rounded-[var(--tt-radius)] border border-[var(--tt-primary)]">
                  <img src={latest.image_processed} alt="Processed" className="h-full w-full object-cover" />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-paper)] p-3">
            <p className="text-xs text-[var(--tt-secondary)]">Skin type</p>
            <p className="mt-1 text-base font-semibold capitalize">{latest.skin_type || "—"}</p>
            <p className="text-xs text-[var(--tt-secondary)]">{formatPct(latest.skin_type_confidence)} confidence</p>
          </div>
          <div className="rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-paper)] p-3">
            <p className="text-xs text-[var(--tt-secondary)]">Skin tone</p>
            <p className="mt-1 text-base font-semibold capitalize">{latest.skin_tone || "—"}</p>
            <p className="text-xs text-[var(--tt-secondary)]">{formatPct(latest.skin_tone_confidence)} confidence</p>
          </div>
          <div className="rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-paper)] p-3">
            <p className="text-xs text-[var(--tt-secondary)]">Condition</p>
            <p className="mt-1 text-base font-semibold">{conditionLabel(latest.skin_disease)}</p>
            <p className="text-xs text-[var(--tt-secondary)]">
              {formatPct(latest.skin_disease_confidence)} confidence
            </p>
          </div>
        </div>

        {trend && (
          <div className="mt-4 flex items-center gap-2 text-xs">
            {trend === "up" && <TrendingUp size={14} className="text-[var(--tt-caution)]" />}
            {trend === "down" && <TrendingDown size={14} className="text-[var(--tt-safe)]" />}
            {trend === "flat" && <Minus size={14} className="text-[var(--tt-secondary)]" />}
            <span className="text-[var(--tt-secondary)]">
              {trend === "up" && "Condition confidence increased since your last scan"}
              {trend === "down" && "Condition confidence decreased since your last scan"}
              {trend === "flat" && "No meaningful change since your last scan"}
            </span>
          </div>
        )}
      </div>

      {scans.length === 1 && (
        <div className="flex items-start gap-3 rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] p-4">
          <Sparkles className="mt-0.5 shrink-0 text-[var(--tt-primary)]" size={18} />
          <p className="text-sm text-[var(--tt-secondary)]">
            This is your first tracked scan. Skin changes gradually - checking again in a few weeks
            will start showing you a real trend instead of a single snapshot.
          </p>
        </div>
      )}

      <div className="rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] overflow-hidden">
        <div className="border-b border-[var(--tt-border)] px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-[var(--tt-ink)]">Scan history</h2>
        </div>
        <div className="px-1 sm:px-2">
          <DataTable columns={historyColumns} rows={scans} empty="No scans yet." />
        </div>
      </div>
    </div>
  );
};

export default SkinTracking;
