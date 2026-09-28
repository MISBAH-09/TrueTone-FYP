import { useEffect, useState } from "react";
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

const LABEL = {
  common_acne: "Acne",
  cystic_acne: "Cystic Acne",
  eczema: "Eczema",
  psoriasis: "Psoriasis",
  rosacea: "Rosacea",
  tinea: "Tinea",
};

const conditionLabel = (raw) => (raw ? LABEL[raw] || raw : "None detected");

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

const formatPct = (v) => (v == null ? "—" : `${Math.round(v * 100)}%`);

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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-emerald-600" size={28} />
        <p className="text-sm text-slate-500">Loading your skin tracking history…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertTriangle className="text-red-500" size={26} />
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (scans.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
          <CalendarClock className="text-emerald-600" size={26} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">No tracked scans yet</h1>
        <p className="text-sm text-slate-500 max-w-sm">
          Run a full ("all models") scan from Skin Analysis and confirm saving it to your profile -
          it'll show up here, so you can watch how your skin changes over time.
        </p>
        <a
          href="/skin-analysis"
          className="mt-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200/40 hover:bg-emerald-700 transition"
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
  if (previous && latest.skin_disease_confidence != null && previous.skin_disease_confidence != null) {
    const delta = latest.skin_disease_confidence - previous.skin_disease_confidence;
    if (Math.abs(delta) < 0.03) trend = "flat";
    else trend = delta > 0 ? "up" : "down";
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div>
          <p className="text-sm text-slate-500">Skin Tracking</p>
          <h1 className="text-3xl font-bold">Your skin over time</h1>
          <p className="mt-2 text-slate-600">
            {scans.length} confirmed scan{scans.length > 1 ? "s" : ""}, most recent first.
          </p>
        </div>

        {/* Current snapshot */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Current profile
            </h2>
            <span className="text-xs text-slate-400">{formatDate(latest.scanned_at)}</span>
          </div>
          
          {(latest.image_original || latest.image_processed) && (
            <div className="mb-6 flex flex-wrap justify-center items-center gap-6 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              {latest.image_original && (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 tracking-wider">ORIGINAL</span>
                  <div className="relative h-32 w-32 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-sm">
                    <img src={latest.image_original} alt="Original" className="h-full w-full object-cover" />
                  </div>
                </div>
              )}
              {latest.image_processed && (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-bold text-emerald-500 tracking-wider">ANALYSIS</span>
                  <div className="relative h-32 w-32 rounded-2xl overflow-hidden border-2 border-emerald-200 shadow-sm">
                    <img src={latest.image_processed} alt="Processed" className="h-full w-full object-cover" />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Skin type</p>
              <p className="mt-1 text-lg font-semibold capitalize">{latest.skin_type || "—"}</p>
              <p className="text-xs text-slate-400">{formatPct(latest.skin_type_confidence)} confidence</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Skin tone</p>
              <p className="mt-1 text-lg font-semibold capitalize">{latest.skin_tone || "—"}</p>
              <p className="text-xs text-slate-400">{formatPct(latest.skin_tone_confidence)} confidence</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Condition</p>
              <p className="mt-1 text-lg font-semibold">{conditionLabel(latest.skin_disease)}</p>
              <p className="text-xs text-slate-400">{formatPct(latest.skin_disease_confidence)} confidence</p>
            </div>
          </div>

          {trend && (
            <div className="mt-4 flex items-center gap-2 text-xs">
              {trend === "up" && <TrendingUp size={14} className="text-amber-500" />}
              {trend === "down" && <TrendingDown size={14} className="text-emerald-500" />}
              {trend === "flat" && <Minus size={14} className="text-slate-400" />}
              <span className="text-slate-500">
                {trend === "up" && "Condition confidence increased since your last scan"}
                {trend === "down" && "Condition confidence decreased since your last scan"}
                {trend === "flat" && "No meaningful change since your last scan"}
              </span>
            </div>
          )}
        </div>

        {/* Encourage regular tracking if it's been a while */}
        {scans.length === 1 && (
          <div className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-white p-5">
            <Sparkles className="text-emerald-500 flex-shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-slate-600">
              This is your first tracked scan. Skin changes gradually - checking again in a few weeks
              will start showing you a real trend instead of a single snapshot.
            </p>
          </div>
        )}

        {/* Full history table */}
        <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Scan history</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Photos</th>
                <th className="px-6 py-3 font-medium">Skin type</th>
                <th className="px-6 py-3 font-medium">Skin tone</th>
                <th className="px-6 py-3 font-medium">Condition</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((s) => (
                <tr key={s.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-6 py-3 text-slate-500">{formatDate(s.scanned_at)}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      {s.image_original ? (
                        <div className="group relative">
                          <img src={s.image_original} alt="Org" className="h-10 w-10 rounded-lg object-cover border border-slate-200 cursor-pointer hover:border-emerald-400 transition" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                            <img src={s.image_original} alt="Org Full" className="max-w-[200px] max-h-[200px] rounded-xl shadow-2xl border border-slate-200" />
                          </div>
                        </div>
                      ) : <span className="text-xs text-slate-300 italic">No org</span>}
                      {s.image_processed ? (
                        <div className="group relative">
                          <img src={s.image_processed} alt="Proc" className="h-10 w-10 rounded-lg object-cover border border-slate-200 cursor-pointer hover:border-emerald-400 transition" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                            <img src={s.image_processed} alt="Proc Full" className="max-w-[200px] max-h-[200px] rounded-xl shadow-2xl border border-slate-200" />
                          </div>
                        </div>
                      ) : <span className="text-xs text-slate-300 italic">No proc</span>}
                    </div>
                  </td>
                  <td className="px-6 py-3 capitalize">{s.skin_type || "—"}</td>
                  <td className="px-6 py-3 capitalize">{s.skin_tone || "—"}</td>
                  <td className="px-6 py-3">
                    {s.disease_detected ? (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                        {conditionLabel(s.skin_disease)}
                      </span>
                    ) : (
                      <span className="text-slate-400">None detected</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SkinTracking;
