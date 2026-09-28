import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Star,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  PackageX,
} from "lucide-react";
import { getRecommendations } from "../services/recommendations";

// Nicely-cased labels for category keys coming back from the API
// (products_template.csv's `category` values are lowercase).
const CATEGORY_LABELS = {
  cleanser: "Cleansers",
  moisturizer: "Moisturizers",
  treatment: "Treatments & Serums",
  sunscreen: "Sunscreens",
};

const categoryLabel = (key) => CATEGORY_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);

const Recommendations = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [recommendations, setRecommendations] = useState({});
  const [excluded, setExcluded] = useState([]);
  const [notRelevantCount, setNotRelevantCount] = useState(0);
  const [activeCategory, setActiveCategory] = useState(null);
  const [showExcluded, setShowExcluded] = useState(false);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getRecommendations();
        setRecommendations(data.recommendations || {});
        setExcluded(data.excluded_for_safety || []);
        setNotRelevantCount(data.not_relevant_count || 0);
        const categories = Object.keys(data.recommendations || {});
        if (categories.length > 0) setActiveCategory(categories[0]);
      } catch (err) {
        if (err.response?.data?.error_code === "ONBOARDING_INCOMPLETE") {
          setNeedsOnboarding(true);
        } else {
          setError(err.response?.data?.message || "Couldn't load recommendations right now.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  // ─── Loading state ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
        <p className="text-sm text-slate-500">Building your personalized recommendations…</p>
      </div>
    );
  }

  // ─── Onboarding-incomplete state ────────────────────────────
  if (needsOnboarding) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
          <ShieldCheck className="text-emerald-600" size={26} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Complete onboarding first</h1>
        <p className="text-sm text-slate-500 max-w-sm">
          We need your skin type, condition, and a couple of safety questions before we can recommend anything responsibly.
        </p>
        <button
          onClick={() => navigate("/onboarding")}
          className="mt-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200/40 hover:bg-emerald-700 transition"
        >
          Go to Onboarding
        </button>
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertTriangle className="text-red-500" size={28} />
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  const categories = Object.keys(recommendations);
  const hasAnyRecommendations = categories.some((c) => recommendations[c]?.length > 0);

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div>
          <p className="text-sm text-slate-500">Recommendations</p>
          <h1 className="text-3xl font-bold">Personalized Product Picks</h1>
          <p className="mt-2 text-slate-600">Products ranked for your skin profile and safety answers.</p>
          {notRelevantCount > 0 && (
            <p className="mt-1 text-xs text-slate-400">
              {notRelevantCount} other product{notRelevantCount > 1 ? "s" : ""} in the catalog didn't match your profile closely enough to show here.
            </p>
          )}
        </div>

        {/* Category tabs */}
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeCategory === cat
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-emerald-400"
                }`}
              >
                {categoryLabel(cat)} ({recommendations[cat].length})
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!hasAnyRecommendations && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <PackageX className="mx-auto text-slate-300 mb-3" size={36} />
            <p className="text-slate-500 text-sm">
              No products matched your profile yet — the catalog is still small while we're testing.
              Check back as more products are added.
            </p>
          </div>
        )}

        {/* Product cards for the active category */}
        {activeCategory && recommendations[activeCategory]?.length > 0 && (
          <div className="grid gap-6 md:grid-cols-3">
            {recommendations[activeCategory].map((item) => (
              <div
                key={item.product_id}
                className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <Star className="w-5 h-5" />
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Score {item.score.toFixed(1)}
                  </span>
                </div>

                <h2 className="text-lg font-semibold text-slate-900 leading-snug">{item.name}</h2>
                {item.brand_name && <p className="text-xs text-slate-400 mt-0.5">{item.brand_name}</p>}

                {/* Safety advisory - always shown prominently, never buried */}
                {item.safety_advisory && (
                  <div className="mt-3 flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    <ShieldAlert size={16} className="flex-shrink-0 mt-0.5" />
                    <span>{item.safety_advisory}</span>
                  </div>
                )}

                {/* Why it's recommended */}
                {item.reasons?.length > 0 && (
                  <ul className="mt-4 space-y-1.5">
                    {item.reasons.map((reason, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                        <ShieldCheck size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Warnings - e.g. tone caution notes, ingredient concerns */}
                {item.warnings?.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {item.warnings.map((warning, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-amber-600">
                        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                        {warning}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Ingredients - collapsed by default, so the card stays scannable */}
                {item.ingredients?.length > 0 && (
                  <details className="mt-4 group">
                    <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-emerald-600 select-none">
                      Ingredients ({item.ingredients.length})
                    </summary>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">
                      {item.ingredients.map((ing, i) => (
                        <span key={i} className={ing.is_common_allergen ? "font-semibold text-amber-600" : ""}>
                          {ing.inci_name}
                          {i < item.ingredients.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </p>
                  </details>
                )}

                <div className="mt-auto pt-5 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-800" title="Approximate - actual retailer price may differ">
                    {item.price_pkr_low
                      ? `~Rs. ${item.price_pkr_low.toLocaleString()}–${item.price_pkr_high.toLocaleString()}`
                      : "Price N/A"}
                  </span>
                  {item.purchase_link && (
                    <a
                      href={item.purchase_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-emerald-600 font-semibold hover:text-emerald-700"
                    >
                      View <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Excluded-for-safety, collapsible - full transparency, never hidden entirely */}
        {excluded.length > 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <button
              onClick={() => setShowExcluded((s) => !s)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <ShieldAlert size={16} className="text-slate-400" />
                {excluded.length} product{excluded.length > 1 ? "s" : ""} excluded for your safety
              </span>
              <span className="text-xs text-emerald-600 font-semibold">
                {showExcluded ? "Hide" : "Show"}
              </span>
            </button>
            {showExcluded && (
              <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                {excluded.map((ex) => (
                  <li key={ex.product_id} className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{ex.name}</span> — {ex.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Recommendations;
