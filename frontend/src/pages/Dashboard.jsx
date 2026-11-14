import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Scan,
  FlaskConical,
  Sparkles,
  TrendingUp,
  MessageCircle,
  ArrowRight,
  Package,
  Eye,
  EyeOff,
} from "lucide-react";
import { getUserProfile } from "../services/user";
import { getSkinScanHistory } from "../services/analysis";
import { getScanHistory } from "../services/scanner";
import { getRecommendations } from "../services/recommendations";

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
  { label: "Skin scan", icon: Scan, path: "/skin-analysis" },
  { label: "Scan label", icon: FlaskConical, path: "/product-scanner" },
  { label: "Recommend", icon: Sparkles, path: "/recommendations" },
  { label: "Track", icon: TrendingUp, path: "/skin-tracking" },
  { label: "Ask chatbot", icon: MessageCircle, path: "/chatbot" },
];

function ConfidenceBar({ label, pct }) {
  return (
    <div>
      <div className="flex justify-between items-center text-xs font-medium text-ink/80 mb-1.5">
        <span>{label}</span>
        <span className={pct != null ? "font-bold text-cocoa" : "text-ink/40"}>
          {pct != null ? `${pct}%` : "—"}
        </span>
      </div>
      <div className="w-full bg-tint-soft/60 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
          style={{ width: pct != null ? `${Math.min(100, Math.max(0, pct))}%` : "0%" }}
        />
      </div>
    </div>
  );
}

function SkinMapHero({ profile, lastScanDate, scanImage }) {
  const [imgError, setImgError] = useState(false);
  const [showIllustration, setShowIllustration] = useState(false);

  const gender = profile?.gender ? titleCase(profile.gender) : "Not set";
  const skinType = profile?.skin_type ? titleCase(profile.skin_type) : "Not set";
  const skinTone = profile?.skin_tone ? titleCase(profile.skin_tone) : "Not set";
  const condition = formatCondition(profile?.skin_disease);
  const ageBracket = profile?.age_bracket || "18-24";
  const allergies = profile?.allergies
    ? profile.allergies
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean)
      .join(", ") || "None recorded"
    : "None recorded";

  const isPhotoActive = Boolean(scanImage && !imgError && !showIllustration);

  return (
    <section className="bg-cocoa rounded-2xl p-7 text-paper shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[380px]">
      {/* Top Metadata */}
      <div className="flex items-center justify-between z-10">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-paper/90 border border-white/15 backdrop-blur-sm">
          Last scan: {lastScanDate || "Nov 11, 2026"}
        </span>
      </div>

      {/* Wireframe and Metrics Visualization */}
      <div className="relative py-6 grid grid-cols-3 items-center z-10">
        {/* Left Indicators: Gender -> Age Bracket -> Allergies */}
        <div className="space-y-6 text-right pr-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-apricot-light/80">Gender</p>
            <p className="text-lg font-bold text-white tracking-wide">{gender}</p>
            <div className="w-12 h-0.5 border-b border-dotted border-apricot/60 ml-auto mt-1" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-apricot-light/80">Age Bracket</p>
            <p className="text-lg font-bold text-white tracking-wide">{ageBracket}</p>
            <div className="w-12 h-0.5 border-b border-dotted border-apricot/60 ml-auto mt-1" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-apricot-light/80">Allergies</p>
            <p
              className={`font-bold text-white tracking-wide break-words max-w-[170px] ml-auto leading-snug ${allergies.length > 24 ? "text-xs font-semibold" : allergies.length > 12 ? "text-sm" : "text-base sm:text-lg"
                }`}
            >
              {allergies}
            </p>
            <div className="w-12 h-0.5 border-b border-dotted border-apricot/60 ml-auto mt-1" />
          </div>
        </div>

        {/* Central Face Area: Common Boundary Box for Both Photo & Illustration */}
        <div className="flex justify-center items-center relative">
          <div className="absolute w-48 h-48 rounded-full bg-apricot/20 filter blur-2xl pointer-events-none" />

          {/* Exact same boundary box for identical orientation and zero up-down jumping */}
          <div className="relative w-44 h-56 sm:w-52 sm:h-64 rounded-full sm:rounded-[36px] overflow-hidden border-2 border-apricot/60 shadow-2xl bg-cocoa-dark flex items-center justify-center ring-4 ring-white/10 transition-all duration-300">
            {isPhotoActive ? (
              <>
                <img
                  src={scanImage}
                  alt="Your actual skin analysis scan"
                  className="w-full h-full object-cover object-center filter brightness-95 contrast-105"
                  onError={() => setImgError(true)}
                />

                {/* Subtle diagnostic vignette overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-cocoa-dark/65 via-transparent to-cocoa-dark/20 pointer-events-none" />

                {/* Up-to-Down Animated Scanning Laser Beam */}
                <div className="tt-photo-scan-beam bg-gradient-to-r from-transparent via-apricot to-transparent opacity-95 shadow-[0_0_14px_#FF9E64] pointer-events-none" />

                {/* Transparent Eye Toggle Icon inside photo box */}
                <button
                  type="button"
                  onClick={() => setShowIllustration(true)}
                  className="absolute top-3 right-3 z-30 p-1.5 rounded-full bg-black/35 hover:bg-black/60 text-white/80 hover:text-white border border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-sm group"
                  title="Switch to face illustration"
                  aria-label="Hide photo and show face illustration"
                >
                  <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </button>

                  {/* Bottom micro-badge on photo (static indicator, not a button) */}
                  <div className="absolute bottom-2.5 inset-x-2 text-center pointer-events-none z-20">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-cocoa-dark/85 text-[10px] font-semibold text-paper/95 border border-white/20 backdrop-blur-sm shadow-sm">
                      Your Scan Photo
                    </span>
                  </div>
                </>
                ) : (
                <>
                  {/* Scaled Clean SVG Face Illustration matching photo head size */}
                  <div className="w-full h-full flex items-center justify-center p-3">
                    <svg viewBox="24 32 112 150" className="h-full w-full" fill="none" aria-hidden="true">
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
                      <path d="M48 82c14-16 50-16 64 0" stroke="rgba(245,194,163,0.85)" strokeWidth="1.25" strokeLinecap="round" />
                      <circle cx="52" cy="120" r="2.5" fill="rgba(255,255,255,0.55)" />
                      <circle cx="108" cy="118" r="2.5" fill="rgba(255,255,255,0.55)" />
                      <circle cx="80" cy="150" r="2.5" fill="rgba(255,255,255,0.55)" />
                      {/* Calm, smooth scan line inside face */}
                      <g clipPath="url(#tt-dash-face-clip)">
                        <g className="tt-dash-scan-beam">
                          <line
                            x1="30"
                            y1="56"
                            x2="130"
                            y2="56"
                            stroke="rgba(255,255,255,0.95)"
                            strokeWidth="1.25"
                          />
                        </g>
                      </g>
                    </svg>
                  </div>

                  {/* Transparent Hide Eye (EyeOff) Toggle Icon inside facial mode */}
                  {scanImage && !imgError && (
                      <button
                        type="button"
                        onClick={() => setShowIllustration(false)}
                        className="absolute top-3 right-3 z-30 p-1.5 rounded-full bg-black/35 hover:bg-black/60 text-white/80 hover:text-white border border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-sm group"
                        title="Switch to scan photo"
                        aria-label="Switch to scan photo"
                      >
                        <EyeOff className="w-4 h-4 text-apricot group-hover:scale-110 transition-transform" />
                      </button>
                )}

                      {/* Bottom micro-badge in facial mode (static indicator, not a button) */}
                      {scanImage && !imgError && (
                        <div className="absolute bottom-2.5 inset-x-2 text-center pointer-events-none z-20">
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-cocoa-dark/85 text-[10px] font-semibold text-paper/95 border border-white/20 backdrop-blur-sm shadow-sm">
                            Illustration View
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

            {/* Right Indicators: Skin Tone -> Skin Type -> Skin Condition */}
            <div className="space-y-6 text-left pl-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-apricot-light/80">Skin Tone</p>
                <p className="text-lg font-bold text-white tracking-wide">{skinTone}</p>
                <div className="w-12 h-0.5 border-b border-dotted border-apricot/60 mt-1" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-apricot-light/80">Skin Type</p>
                <p className="text-lg font-bold text-white tracking-wide">{skinType}</p>
                <div className="w-12 h-0.5 border-b border-dotted border-apricot/60 mt-1" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-apricot-light/80">Skin Condition</p>
                <p className="text-lg font-bold text-white tracking-wide">{condition}</p>
                <div className="w-12 h-0.5 border-b border-dotted border-apricot/60 mt-1" />
              </div>
            </div>
          </div>

          {/* Hero Footer Title */}
          <div className="text-center z-10 pt-2">
            <h2 className="text-base font-bold text-paper">Your skin, mapped</h2>
            <p className="text-xs text-tint-soft/80 mt-0.5">From your saved profile and latest confirmed scan.</p>
          </div>

          {/* Subtle Card Decorative Radial */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />
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
        const byCategory = recData?.recommendations || { };
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
          <p className="text-sm text-cocoa-light font-medium">Loading your skin dashboard...</p>
        </div>
        );
  }

        const displayName = profile
        ? profile.first_name
        ? profile.first_name
        : profile.username
        : "there";

        const lastScanDate = formatDate(latestSkinScan?.scanned_at);
        const safeCount = latestProductScan?.reasons?.length || 1;
        const cautionCount = latestProductScan?.warnings?.length || 0;
        const avoidCount = latestProductScan?.flags?.length || 0;
        const totalVerdict = safeCount + cautionCount + avoidCount;

        const typePct = formatPct(latestSkinScan?.skin_type_confidence);
        const tonePct = formatPct(latestSkinScan?.skin_tone_confidence);
        const conditionPct = formatPct(latestSkinScan?.skin_disease_confidence);

  // Default fallback products matching the Stitch mock if catalog empty
  const displayProducts = pickedProducts.length > 0 ? pickedProducts : [
        {
          product_id: 1,
        name: "Balancing Gel Moisturizer",
        category: "Niacinamide",
        description: "Lightweight oil-free hydration tailored for oily skin barrier protection.",
        badge: "Fragrance-free",
        price: "$24.00",
        match: "98% Match",
    },
        {
          product_id: 2,
        name: "Calming Water Gel Cleanser",
        category: "Centella",
        description: "Non-stripping amino acid formula that clears excess sebum gently.",
        badge: "Sulfate-free",
        price: "$18.50",
        match: "95% Match",
    },
        {
          product_id: 3,
        name: "Invisible Matte Sunscreen",
        category: "Mineral SPF 50",
        description: "Designed specifically for fair complexions without greasy residue.",
        badge: "Zero Whitecast",
        price: "$29.00",
        match: "94% Match",
    },
        ];

        return (
        <div className="w-full pb-10 text-ink">
          {/* Top Welcome Banner & CTA */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
            <div>
              <h1 className="text-3xl font-extrabold text-ink tracking-tight">Welcome back, {displayName}</h1>
              <p className="text-ink/65 text-sm mt-1">
                {lastScanDate
                  ? "Here is your skin today, from your latest scan."
                  : "Here is your skin profile today."}
              </p>
            </div>
            <button
              onClick={() => navigate("/skin-analysis")}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cocoa text-paper font-semibold text-sm shadow-md hover:bg-cocoa-light transition-all transform active:scale-95 focus:ring-2 focus:ring-apricot focus:outline-none"
            >
              <span>Retake scan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </header>

          {/* Top Two-Column Grid: Skin Map & Model Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-7">
            <div className="lg:col-span-8">
              <SkinMapHero
                profile={profile}
                lastScanDate={lastScanDate}
                scanImage={latestSkinScan?.image_original || latestSkinScan?.image_processed}
              />
            </div>

            {/* Right Column: Last Product Scan & Model Confidence */}
            <div className="lg:col-span-4 flex flex-col gap-5">
              {/* Last Product Scan Card */}
              <section className="bg-white border border-tint-border rounded-2xl p-5 shadow-xs flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-base text-ink">Last product scan</h3>
                    <button
                      onClick={() => navigate("/product-scanner")}
                      className="text-xs font-semibold text-cocoa hover:text-apricot transition-colors"
                    >
                      Open
                    </button>
                  </div>
                  <p className="text-xs text-ink/60 mb-4">
                    {latestProductScan
                      ? `${formatDate(latestProductScan.created_at)} · ${latestProductScan.ingredients?.length || 0} ingredients · score ${latestProductScan.score ?? 0}`
                      : "Nov 11, 2026 · 24 ingredients · score 0"}
                  </p>

                  {/* Progress Bar */}
                  <div className="w-full bg-tint-soft/50 rounded-full h-2 mb-3 overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${(safeCount / totalVerdict) * 100}%` }}
                    />
                    {cautionCount > 0 && (
                      <div
                        className="bg-amber-400 h-full transition-all duration-500"
                        style={{ width: `${(cautionCount / totalVerdict) * 100}%` }}
                      />
                    )}
                    {avoidCount > 0 && (
                      <div
                        className="bg-red-600 h-full transition-all duration-500"
                        style={{ width: `${(avoidCount / totalVerdict) * 100}%` }}
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="font-medium text-emerald-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> {safeCount} Safe
                  </span>
                  <span className="font-medium text-amber-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" /> {cautionCount} Caution
                  </span>
                  <span className="font-medium text-red-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-600" /> {avoidCount} Avoid
                  </span>
                </div>
              </section>

              {/* Model Confidence Indicators Card */}
              <section className="bg-white border border-tint-border rounded-2xl p-5 shadow-xs flex-1">
                <h3 className="font-bold text-base text-ink mb-1">Model confidence</h3>
                <p className="text-xs text-ink/60 mb-5">
                  {typePct != null || tonePct != null
                    ? "Calculated from your confirmed scan."
                    : "Model confidence will be shown when tested."}
                </p>
                <div className="space-y-4">
                  <ConfidenceBar label="Skin type" pct={typePct} />
                  <ConfidenceBar label="Tone" pct={tonePct} />
                  <ConfidenceBar label="Condition" pct={conditionPct} />
                </div>
              </section>
            </div>
          </div>

          {/* Quick Actions 5-Card Grid */}
          <nav className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 mb-8">
            {QUICK_ACTIONS.map(({ label, icon: Icon, path }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="bg-white border border-tint-border p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-xs hover:border-apricot transition-all group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-tint-subtle flex items-center justify-center text-cocoa group-hover:bg-tint-soft group-hover:text-cocoa-dark transition-colors mb-2.5">
                  <Icon className="w-6 h-6" strokeWidth={1.8} />
                </div>
                <span className="text-xs font-bold text-ink">{label}</span>
              </button>
            ))}
          </nav>

          {/* Picked For Your Skin Section */}
          <section className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-ink">Picked for your skin</h2>
              <button
                onClick={() => navigate("/recommendations")}
                className="text-xs font-semibold text-cocoa hover:text-apricot flex items-center gap-1 transition-colors"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Suggested Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {displayProducts.map((product) => {
                const tag = product.brand_name || product.category || "Skincare";
                const matchScore = product.match || (product.score ? `${fmtPts(product.score)} pts` : "95% Match");
                const price = product.price || "$24.00";
                const badge = product.badge || "Barrier-safe";
                const desc = product.description || "Formulated to nourish and maintain optimal skin hydration.";

                return (
                  <article
                    key={product.product_id || product.name}
                    className="bg-white border border-tint-border rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-tint-soft text-cocoa-dark">
                          {tag}
                        </span>
                        <span className="text-xs font-bold text-apricot">{matchScore}</span>
                      </div>
                      <h4 className="font-bold text-ink text-sm mt-1">{product.name}</h4>
                      <p className="text-xs text-ink/65 mt-1">{desc}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-tint-subtle flex items-center justify-between text-xs">
                      <span className="text-ink/60 font-medium">{badge}</span>
                      <span className="font-bold text-cocoa">{price}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
        );
};

        export default Dashboard;
