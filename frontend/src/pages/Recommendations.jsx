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
import { ScoreLabel } from "../components/ui";

// Nicely-cased labels for category keys coming back from the API
// (products_template.csv's `category` values are lowercase).
const CATEGORY_LABELS = {
  cleanser: "Cleansers",
  moisturizer: "Moisturizers",
  treatment: "Treatments & Serums",
  sunscreen: "Sunscreens",
};

const categoryLabel = (key) => CATEGORY_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);

// Points scheme shown in the "How are scores calculated?" panel.
// These mirror Config.WEIGHT_* in backend/recommendation_engine.py - if a weight
// changes there, update it here too. Each product card below shows the real
// points that product earned, taken straight from the backend.
const SCORING_RULES = [
  { rule: "Skin type match", points: "+3", when: "The product is suited to your skin type" },
  { rule: "Condition match", points: "+3", when: "The product targets a condition on your profile" },
  { rule: "Helpful ingredients", points: "+1 each (max +3)", when: "An ingredient is known to help your condition" },
  { rule: "Ingredients to avoid", points: "\u22122 each (max \u22126)", negative: true, when: "An ingredient may worsen your condition" },
  { rule: "Age relevance", points: "+1", when: "The product is aimed at your age group" },
];

// 7 -> "7", 7.5 -> "7.5"
const fmtPts = (n) => (Number.isInteger(n) ? n : Number(n).toFixed(1));

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-[var(--tt-ink)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--tt-primary)]" />
        <p className="text-sm text-[var(--tt-secondary)]">Building your personalized recommendations…</p>
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center text-[var(--tt-ink)]">
        <div className="flex h-14 w-14 items-center justify-center rounded-[var(--tt-radius)] bg-[var(--tt-primary-muted)] text-[var(--tt-primary)]">
          <ShieldCheck size={26} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Complete onboarding first</h1>
        <p className="text-sm text-[var(--tt-secondary)]">
          We need your skin type, condition, and a couple of safety questions before we can recommend anything responsibly.
        </p>
        <button
          type="button"
          onClick={() => navigate("/onboarding")}
          className="mt-2 inline-flex h-[var(--tt-control-h)] items-center rounded-[var(--tt-radius)] bg-[var(--tt-primary)] px-5 text-sm font-medium text-white hover:bg-[var(--tt-primary-hover)]"
        >
          Go to Onboarding
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-24 text-center">
        <AlertTriangle className="text-[var(--tt-avoid)]" size={28} />
        <p className="text-sm font-medium text-[var(--tt-avoid)]">{error}</p>
      </div>
    );
  }

  const categories = Object.keys(recommendations);
  const hasAnyRecommendations = categories.some((c) => recommendations[c]?.length > 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6 text-[var(--tt-ink)]">
      <div className="border-b border-[var(--tt-border)] pb-4">
        <p className="tt-mono text-xs font-medium uppercase tracking-[0.14em] text-[var(--tt-primary)]">
          Recommendations
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Personalized Product Picks
        </h1>
        <p className="mt-1.5 text-sm text-[var(--tt-secondary)]">
          Products ranked for your skin profile and safety answers.
        </p>
        {notRelevantCount > 0 && (
          <p className="mt-1 text-xs text-[var(--tt-secondary)]">
            {notRelevantCount} other product{notRelevantCount > 1 ? "s" : ""} in the catalog didn&apos;t match your profile closely enough to show here.
          </p>
        )}
      </div>

      <details className="rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] p-4 sm:p-5">
        <summary className="cursor-pointer select-none text-sm font-semibold text-[var(--tt-ink)]">
          How are scores calculated?
        </summary>
        <div className="mt-4 space-y-4 text-xs text-[var(--tt-secondary)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--tt-border)] text-[var(--tt-secondary)]">
                  <th className="py-2 pr-3 font-medium">Rule</th>
                  <th className="py-2 pr-3 font-medium">Points</th>
                  <th className="py-2 font-medium">When it applies</th>
                </tr>
              </thead>
              <tbody>
                {SCORING_RULES.map((r) => (
                  <tr key={r.rule} className="border-b border-[var(--tt-border)] last:border-0">
                    <td className="py-2 pr-3 font-semibold text-[var(--tt-ink)]">{r.rule}</td>
                    <td
                      className={`py-2 pr-3 font-semibold whitespace-nowrap ${
                        r.negative ? "text-[var(--tt-avoid)]" : "text-[var(--tt-safe)]"
                      }`}
                    >
                      {r.points}
                    </td>
                    <td className="py-2">{r.when}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="list-disc space-y-1 pl-4">
            <li>
              The best possible score is 10. A rule you have not given us information for (for
              example, no skin condition on your profile) cannot earn points, so each score is
              shown out of what is possible for you.
            </li>
            <li>
              Allergies and pregnancy are not scored. A product with an allergen or a
              pregnancy-unsafe ingredient is removed completely and listed under excluded for
              your safety.
            </li>
            <li>
              Products scoring 0 or below are not shown. Equal scores are ordered by fewest
              warnings, then by name.
            </li>
            <li>The weights are expert-set heuristics, not clinically validated.</li>
          </ul>
        </div>
      </details>

      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`inline-flex h-9 items-center rounded-[var(--tt-radius)] px-3 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-[var(--tt-primary)] text-white"
                  : "border border-[var(--tt-border)] bg-[var(--tt-surface)] text-[var(--tt-ink)] hover:bg-[var(--tt-paper)]"
              }`}
            >
              {categoryLabel(cat)} ({recommendations[cat].length})
            </button>
          ))}
        </div>
      )}

      {!hasAnyRecommendations && (
        <div className="rounded-[var(--tt-radius)] border border-dashed border-[var(--tt-border)] bg-[var(--tt-surface)] p-10 text-center">
          <PackageX className="mx-auto mb-3 text-[var(--tt-secondary)]" size={36} />
          <p className="text-sm text-[var(--tt-secondary)]">
            No products matched your profile yet — the catalog is still small while we&apos;re testing.
            Check back as more products are added.
          </p>
        </div>
      )}

      {activeCategory && recommendations[activeCategory]?.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {recommendations[activeCategory].map((item) => (
            <div
              key={item.product_id}
              className="flex flex-col rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] p-5"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--tt-radius)] bg-[var(--tt-primary-muted)] text-[var(--tt-primary)]">
                  <Star className="h-5 w-5" />
                </div>
                <ScoreLabel
                  value={
                    item.max_score
                      ? `${fmtPts(item.score)} / ${item.max_score}`
                      : item.score.toFixed(1)
                  }
                  label="Match"
                  rangeText={item.max_score ? undefined : "0 to 10"}
                  size="sm"
                  className="text-right"
                />
              </div>

              <h2 className="text-base font-semibold leading-snug text-[var(--tt-ink)]">{item.name}</h2>
              {item.brand_name && (
                <p className="mt-0.5 text-xs text-[var(--tt-secondary)]">{item.brand_name}</p>
              )}

              {item.safety_advisory && (
                <div className="mt-3 flex gap-2 rounded-[var(--tt-radius)] border border-red-200 border-l-4 border-l-[var(--tt-avoid)] bg-red-50 p-3 text-xs text-[var(--tt-avoid)]">
                  <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                  <span>{item.safety_advisory}</span>
                </div>
              )}

              {item.reasons?.length > 0 && (
                <ul className="mt-4 space-y-1.5">
                  {item.reasons.map((reason, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[var(--tt-secondary)]">
                      <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[var(--tt-safe)]" />
                      {reason}
                    </li>
                  ))}
                </ul>
              )}

              {item.breakdown?.length > 0 && (
                <details open className="mt-4">
                  <summary className="cursor-pointer select-none text-xs font-semibold text-[var(--tt-secondary)] hover:text-[var(--tt-primary)]">
                    Score breakdown
                  </summary>
                  <ul className="mt-2 space-y-1.5">
                    {item.breakdown.map((row) => (
                      <li key={row.label} className="flex items-center justify-between text-xs">
                        <span className="text-[var(--tt-secondary)]">{row.label}</span>
                        <span
                          className={`font-semibold ${
                            row.points > 0
                              ? "text-[var(--tt-safe)]"
                              : row.points < 0
                                ? "text-[var(--tt-avoid)]"
                                : "text-[var(--tt-secondary)]"
                          }`}
                        >
                          {row.points > 0 ? "+" : ""}
                          {fmtPts(row.points)}
                          {row.max > 0 ? ` / ${row.max}` : ""}
                        </span>
                      </li>
                    ))}
                    <li className="flex items-center justify-between border-t border-[var(--tt-border)] pt-1.5 text-xs font-semibold text-[var(--tt-ink)]">
                      <span>Total</span>
                      <span>
                        {fmtPts(item.score)}
                        {item.max_score ? ` / ${item.max_score}` : ""}
                      </span>
                    </li>
                  </ul>
                </details>
              )}

              {item.warnings?.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {item.warnings.map((warning, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[var(--tt-caution)]">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                      {warning}
                    </li>
                  ))}
                </ul>
              )}

              {item.ingredients?.length > 0 && (
                <details className="mt-4">
                  <summary className="cursor-pointer select-none text-xs font-semibold text-[var(--tt-secondary)] hover:text-[var(--tt-primary)]">
                    Ingredients ({item.ingredients.length})
                  </summary>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--tt-secondary)]">
                    {item.ingredients.map((ing, i) => (
                      <span
                        key={i}
                        className={ing.is_common_allergen ? "font-semibold text-[var(--tt-caution)]" : ""}
                      >
                        {ing.inci_name}
                        {i < item.ingredients.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </p>
                </details>
              )}

              <div className="mt-auto flex items-center justify-between pt-5 text-sm">
                <span className="font-semibold text-[var(--tt-ink)]" title="Approximate - actual retailer price may differ">
                  {item.price_pkr_low
                    ? `~Rs. ${item.price_pkr_low.toLocaleString()}–${item.price_pkr_high.toLocaleString()}`
                    : "Price N/A"}
                </span>
                {item.purchase_link && (
                  <a
                    href={item.purchase_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-[var(--tt-primary)] hover:underline"
                  >
                    View <ExternalLink size={13} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {excluded.length > 0 && (
        <div className="rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] p-5">
          <button
            type="button"
            onClick={() => setShowExcluded((s) => !s)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-[var(--tt-ink)]">
              <ShieldAlert size={16} className="text-[var(--tt-avoid)]" />
              {excluded.length} product{excluded.length > 1 ? "s" : ""} excluded for your safety
            </span>
            <span className="text-xs font-medium text-[var(--tt-primary)]">
              {showExcluded ? "Hide" : "Show"}
            </span>
          </button>
          {showExcluded && (
            <ul className="mt-4 space-y-2 border-t border-[var(--tt-border)] pt-4">
              {excluded.map((ex) => (
                <li key={ex.product_id} className="text-xs text-[var(--tt-secondary)]">
                  <span className="font-semibold text-[var(--tt-ink)]">{ex.name}</span> — {ex.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default Recommendations;
