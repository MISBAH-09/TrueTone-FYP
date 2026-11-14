import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ScanFace,
  FlaskConical,
  Star,
  TrendingUp,
  MessageCircle,
  ArrowRight,
  Package,
} from "lucide-react";
import { getUserProfile } from "../services/user";
import { getSkinScanHistory } from "../services/analysis";
import { getScanHistory } from "../services/scanner";
import { getRecommendations } from "../services/recommendations";
import { Button } from "../components/ui";

const CONDITION_LABELS = {
  common_acne: "Acne",
  cystic_acne: "Acne",
  eczema: "Eczema",
  healthy: "None detected",
  psoriasis: "Psoriasis",
  rosacea: "Rosacea",
  tinea: "Tinea",
};

const titleCase = (value) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ") : "";

const formatCondition = (raw) => {
  if (!raw) return "None detected";
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => CONDITION_LABELS[part] || titleCase(part))
    .join(", ");
};

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

const formatPct = (v) => (v == null || Number.isNaN(Number(v)) ? null : Math.round(Number(v) * 100));

const fmtPts = (n) => (Number.isInteger(n) ? String(n) : Number(n).toFixed(1));

const QUICK_ACTIONS = [
  { label: "Skin scan", icon: ScanFace, path: "/skin-analysis" },
  { label: "Scan label", icon: FlaskConical, path: "/product-scanner" },
  { label: "Recommend", icon: Star, path: "/recommendations" },
  { label: "Track", icon: TrendingUp, path: "/skin-tracking" },
  { label: "Ask chatbot", icon: MessageCircle, path: "/chatbot" },
];

const PRODUCT_HEADER_TONES = [
  "bg-[var(--tt-primary-muted)] text-[var(--tt-primary)]",
  "bg-amber-50 text-[var(--tt-caution)]",
  "bg-teal-50 text-[var(--tt-primary)]",
];

function ConfidenceBar({ label, pct }) {
  if (pct == null) {
    return (
      <div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--tt-secondary)]">{label}</span>
          <span className="text-[var(--tt-secondary)]">—</span>
        </div>
        <div className="mt-1.5 h-1.5 rounded-[var(--tt-radius)] bg-[var(--tt-border)]" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--tt-secondary)]">{label}</span>
        <span className="font-medium text-[var(--tt-ink)]">{pct}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-[var(--tt-radius)] bg-[var(--tt-border)]">
        <div
          className="h-full rounded-[var(--tt-radius)] bg-[var(--tt-primary)]"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}

function SkinMapHero({ profile, lastScanDate }) {
  const skinType = profile?.skin_type ? titleCase(profile.skin_type) : "Not set";
  const skinTone = profile?.skin_tone ? titleCase(profile.skin_tone) : "Not set";
  const condition = formatCondition(profile?.skin_disease);
  const ageBracket = profile?.age_bracket || "Not set";
  const allergies = profile?.allergies
    ? profile.allergies
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean)
        .join(", ") || "None recorded"
    : "None recorded";
  const pregnancy =
    profile?.gender === "male"
      ? null
      : profile?.is_pregnant_or_breastfeeding
        ? "Pregnant / breastfeeding"
        : "Not pregnant";

  const leftLabels = [
    { title: "Skin type", value: skinType },
    { title: "Allergies", value: allergies },
    { title: "Age bracket", value: ageBracket },
  ];
  const rightLabels = [
    { title: "Tone", value: skinTone },
    { title: "Condition", value: condition },
    pregnancy ? { title: "Pregnancy", value: pregnancy } : null,
  ].filter(Boolean);

  return (
    <section className="relative flex min-h-[340px] flex-col overflow-hidden rounded-[var(--tt-radius)] bg-[var(--tt-primary)] p-5 text-white sm:p-6">
      {lastScanDate ? (
        <span className="tt-mono absolute top-4 left-4 rounded-[var(--tt-radius)] bg-white/15 px-2.5 py-1 text-[10px] font-medium tracking-wide text-white/95">
          Last scan: {lastScanDate}
        </span>
      ) : (
        <span className="tt-mono absolute top-4 left-4 rounded-[var(--tt-radius)] bg-white/15 px-2.5 py-1 text-[10px] font-medium tracking-wide text-white/95">
          No scan yet
        </span>
      )}

      <div className="mt-8 grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        <div className="space-y-5 text-right">
          {leftLabels.map((item) => (
            <div key={item.title} className="relative pr-3">
              <p className="text-[10px] uppercase tracking-wide text-white/65">{item.title}</p>
              <p className="text-sm font-medium leading-snug text-white">{item.value}</p>
              <span className="absolute top-1/2 right-0 hidden h-px w-4 -translate-y-1/2 border-t border-dotted border-white/45 sm:block" />
            </div>
          ))}
        </div>

        <div className="mx-auto w-[120px] sm:w-[150px]">
          <svg viewBox="0 0 160 200" className="h-full w-full" fill="none" aria-hidden="true">
            <defs>
              <clipPath id="tt-dash-face-clip">
                <ellipse cx="80" cy="108" rx="42" ry="54" />
              </clipPath>
            </defs>
            <ellipse cx="80" cy="108" rx="42" ry="54" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
            <path d="M58 98c5-3 12-3 17 0" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M85 98c5-3 12-3 17 0" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M80 102v18c0 3-3 6-6 6" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M66 138c6 6 20 6 28 0" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M48 82c14-16 50-16 64 0" stroke="rgba(204,251,241,0.7)" strokeWidth="1.25" strokeLinecap="round" />
            <circle cx="52" cy="120" r="2.5" fill="rgba(255,255,255,0.55)" />
            <circle cx="108" cy="118" r="2.5" fill="rgba(255,255,255,0.55)" />
            <circle cx="80" cy="150" r="2.5" fill="rgba(255,255,255,0.55)" />
            {/* Slow scan line — labels stay still */}
            <g clipPath="url(#tt-dash-face-clip)">
              <g className="tt-dash-scan-beam">
                <line
                  x1="40"
                  y1="56"
                  x2="120"
                  y2="56"
                  stroke="rgba(255,255,255,0.95)"
                  strokeWidth="1.25"
                />
              </g>
            </g>
          </svg>
        </div>

        <div className="space-y-5 text-left">
          {rightLabels.map((item) => (
            <div key={item.title} className="relative pl-3">
              <p className="text-[10px] uppercase tracking-wide text-white/65">{item.title}</p>
              <p className="text-sm font-medium leading-snug text-white">{item.value}</p>
              <span className="absolute top-1/2 left-0 hidden h-px w-4 -translate-y-1/2 border-t border-dotted border-white/45 sm:block" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm font-semibold text-white">Your skin, mapped</p>
        <p className="mt-1 text-xs text-white/75">From your saved profile and latest confirmed scan.</p>
      </div>
    </section>
  );
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [latestSkinScan, setLatestSkinScan] = useState(null);
  const [latestProductScan, setLatestProductScan] = useState(null);
  const [pickedProducts, setPickedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recsLoading, setRecsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Fast path: profile + histories unlock the shell. Recommendations are heavy
    // (~full catalog score, ~64KB) and must not block first paint.
    const loadCore = async () => {
      setLoading(true);
      try {
        const [profileRes, skinHistRes, productHistRes] = await Promise.allSettled([
          getUserProfile(),
          getSkinScanHistory(),
          getScanHistory(),
        ]);
        if (cancelled) return;

        if (profileRes.status === "fulfilled" && profileRes.value?.success) {
          setProfile(profileRes.value.data);
        }
        if (skinHistRes.status === "fulfilled") {
          setLatestSkinScan(skinHistRes.value?.data?.[0] || null);
        }
        if (productHistRes.status === "fulfilled") {
          setLatestProductScan(productHistRes.value?.data?.[0] || null);
        }
      } catch (error) {
        console.error("Failed to load dashboard core:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const loadRecommendations = async () => {
      setRecsLoading(true);
      try {
        const recData = await getRecommendations();
        if (cancelled) return;
        const byCategory = recData?.recommendations || {};
        const flat = Object.values(byCategory)
          .flat()
          .filter(Boolean)
          .sort((a, b) => (b.score || 0) - (a.score || 0));
        setPickedProducts(flat.slice(0, 3));
      } catch (error) {
        console.error("Failed to load dashboard recommendations:", error);
        if (!cancelled) setPickedProducts([]);
      } finally {
        if (!cancelled) setRecsLoading(false);
      }
    };

    loadCore();
    loadRecommendations();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-[var(--tt-secondary)]">Loading dashboard...</p>
      </div>
    );
  }

  const displayName = profile
    ? profile.first_name
      ? profile.first_name
      : profile.username
    : "there";

  const lastScanDate = formatDate(latestSkinScan?.scanned_at);
  const subtitle = lastScanDate
    ? `Here is your skin today, from your latest scan.`
    : "Complete a skin scan to see your mapped profile here.";

  const safeCount = latestProductScan?.reasons?.length || 0;
  const cautionCount = latestProductScan?.warnings?.length || 0;
  const avoidCount = latestProductScan?.flags?.length || 0;
  const verdictTotal = safeCount + cautionCount + avoidCount;
  const topPick = pickedProducts[0] || null;

  const typePct = formatPct(latestSkinScan?.skin_type_confidence);
  const tonePct = formatPct(latestSkinScan?.skin_tone_confidence);
  const conditionPct = formatPct(latestSkinScan?.skin_disease_confidence);
  const hasConfidence = typePct != null || tonePct != null || conditionPct != null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 text-[var(--tt-ink)]">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--tt-ink)] sm:text-3xl">
            Welcome back, {displayName}
          </h1>
          <p className="mt-1 text-sm text-[var(--tt-secondary)]">{subtitle}</p>
        </div>
        <Button type="button" variant="primary" onClick={() => navigate("/skin-analysis")}>
          Retake scan <ArrowRight size={16} />
        </Button>
      </div>

      {/* Hero + side cards */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.85fr)]">
        <SkinMapHero profile={profile} lastScanDate={lastScanDate} />

        <div className="flex flex-col gap-4">
          {/* Last product scan, or top recommendation when no scan exists */}
          <section className="rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] p-4">
            {latestProductScan ? (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--tt-ink)]">Last product scan</h2>
                    <p className="mt-1 text-xs text-[var(--tt-secondary)]">
                      {formatDate(latestProductScan.created_at) || "Saved scan"} ·{" "}
                      {latestProductScan.ingredients?.length || 0} ingredients · score{" "}
                      {latestProductScan.score ?? "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/product-scanner")}
                    className="text-xs font-medium text-[var(--tt-primary)] hover:underline"
                  >
                    Open
                  </button>
                </div>

                {verdictTotal > 0 ? (
                  <>
                    <div className="mt-4 flex h-2 overflow-hidden rounded-[var(--tt-radius)] bg-[var(--tt-border)]">
                      {safeCount > 0 ? (
                        <div
                          className="h-full bg-[var(--tt-safe)]"
                          style={{ width: `${(safeCount / verdictTotal) * 100}%` }}
                        />
                      ) : null}
                      {cautionCount > 0 ? (
                        <div
                          className="h-full bg-[var(--tt-caution)]"
                          style={{ width: `${(cautionCount / verdictTotal) * 100}%` }}
                        />
                      ) : null}
                      {avoidCount > 0 ? (
                        <div
                          className="h-full bg-[var(--tt-avoid)]"
                          style={{ width: `${(avoidCount / verdictTotal) * 100}%` }}
                        />
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs text-[var(--tt-secondary)]">
                      <span className="text-[var(--tt-safe)]">{safeCount} Safe</span>
                      {" · "}
                      <span className="text-[var(--tt-caution)]">{cautionCount} Caution</span>
                      {" · "}
                      <span className="text-[var(--tt-avoid)]">{avoidCount} Avoid</span>
                    </p>
                  </>
                ) : (
                  <p className="mt-4 text-xs text-[var(--tt-secondary)]">
                    {latestProductScan.is_safe
                      ? "No safety block on this scan."
                      : "Blocked for safety on your profile."}
                  </p>
                )}
              </>
            ) : recsLoading ? (
              <>
                <h2 className="text-sm font-semibold text-[var(--tt-ink)]">Top pick recommendation</h2>
                <p className="mt-3 text-xs text-[var(--tt-secondary)]">Loading your best match…</p>
              </>
            ) : topPick ? (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--tt-ink)]">Top pick recommendation</h2>
                    <p className="mt-1 text-xs text-[var(--tt-secondary)]">
                      No product scans yet — showing your best current match.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/recommendations")}
                    className="text-xs font-medium text-[var(--tt-primary)] hover:underline"
                  >
                    Open
                  </button>
                </div>
                <div className="mt-4 flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--tt-radius)] bg-[var(--tt-primary-muted)] text-[var(--tt-primary)]">
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug text-[var(--tt-ink)]">{topPick.name}</p>
                    <p className="mt-0.5 text-xs text-[var(--tt-secondary)]">
                      {topPick.brand_name || titleCase(topPick.category) || "Product"}
                    </p>
                    <p className="mt-2 text-xs font-medium text-[var(--tt-primary)]">
                      {topPick.max_score
                        ? `${fmtPts(topPick.score)} / ${topPick.max_score} match`
                        : `${fmtPts(topPick.score)} pts`}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--tt-ink)]">Last product scan</h2>
                    <p className="mt-1 text-xs text-[var(--tt-secondary)]">
                      No product scans or recommendations yet.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/product-scanner")}
                    className="text-xs font-medium text-[var(--tt-primary)] hover:underline"
                  >
                    Open
                  </button>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-4"
                  onClick={() => navigate("/product-scanner")}
                >
                  Scan a label
                </Button>
              </>
            )}
          </section>

          {/* Model confidence — real scan values only; empty bars stay until tested */}
          <section className="rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] p-4">
            <h2 className="text-sm font-semibold text-[var(--tt-ink)]">Model confidence</h2>
            <p className="mt-1 text-xs text-[var(--tt-secondary)]">
              {hasConfidence
                ? "From your latest confirmed skin scan."
                : "Model confidence will be shown when tested."}
            </p>
            <div className="mt-4 space-y-3">
              <ConfidenceBar label="Skin type" pct={typePct} />
              <ConfidenceBar label="Tone" pct={tonePct} />
              <ConfidenceBar label="Condition" pct={conditionPct} />
            </div>
          </section>
        </div>
      </div>

      {/* Quick actions */}
      <section className="rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] px-3 py-4 sm:px-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {QUICK_ACTIONS.map(({ label, icon: Icon, path }) => (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-2 rounded-[var(--tt-radius)] px-2 py-2 text-center transition-colors hover:bg-[var(--tt-paper)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-[var(--tt-radius)] bg-[var(--tt-primary-muted)] text-[var(--tt-primary)]">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-medium text-[var(--tt-ink)]">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Picked products */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[var(--tt-ink)]">Picked for your skin</h2>
          <button
            type="button"
            onClick={() => navigate("/recommendations")}
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--tt-primary)] hover:underline"
          >
            View all <ArrowRight size={14} />
          </button>
        </div>

        {recsLoading ? (
          <div className="rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] px-4 py-8 text-center">
            <p className="text-sm text-[var(--tt-secondary)]">Loading picks…</p>
          </div>
        ) : pickedProducts.length === 0 ? (
          <div className="rounded-[var(--tt-radius)] border border-dashed border-[var(--tt-border)] bg-[var(--tt-surface)] px-4 py-8 text-center">
            <p className="text-sm text-[var(--tt-secondary)]">
              No matched products yet. Finish onboarding or check recommendations after a scan.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {pickedProducts.map((item, index) => (
              <article
                key={item.product_id || item.name}
                className="overflow-hidden rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)]"
              >
                <div
                  className={`flex h-20 items-center justify-center ${PRODUCT_HEADER_TONES[index % PRODUCT_HEADER_TONES.length]}`}
                >
                  <Package className="h-7 w-7 opacity-80" />
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold leading-snug text-[var(--tt-ink)]">{item.name}</h3>
                  <p className="mt-0.5 text-xs text-[var(--tt-secondary)]">
                    {item.brand_name || titleCase(item.category) || "Product"}
                  </p>
                  <p className="mt-2 text-xs font-medium text-[var(--tt-primary)]">
                    {item.max_score
                      ? `${fmtPts(item.score)} / ${item.max_score} match`
                      : `${fmtPts(item.score)} pts`}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
