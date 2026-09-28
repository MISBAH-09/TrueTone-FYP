import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScanFace, FlaskConical, Sparkles, TrendingUp, Bell, Search, MessageCircle, ArrowRight } from "lucide-react";
import FeatureCard from "../components/FeatureCard";
import { getUserProfile } from "../services/user";

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const result = await getUserProfile();
        if (result.success) {
          setProfile(result.data);
        }
      } catch (error) {
        console.error("Failed to load user profile:", error);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 text-sm animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  const displayName = profile
    ? (profile.first_name && profile.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : profile.username)
    : "User";

  const skinType = profile?.skin_type
    ? profile.skin_type.charAt(0).toUpperCase() + profile.skin_type.slice(1)
    : "Not analyzed yet";

  const skinTone = profile?.skin_tone
    ? profile.skin_tone.charAt(0).toUpperCase() + profile.skin_tone.slice(1)
    : "Not set";

  const skinDisease = profile?.skin_disease 
    ? profile.skin_disease.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : "None detected";
  const ageBracket = profile?.age_bracket || "—";
  
  // Format the allergies string to be more readable
  const allergiesList = profile?.allergies 
    ? profile.allergies.split(',').map(a => a.trim()).filter(a => a).join(', ')
    : "None recorded";

  const pregnancyStatus = profile?.is_pregnant_or_breastfeeding 
    ? "Pregnant / Breastfeeding" 
    : "Not Pregnant";

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <section className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-slate-500">Welcome back</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">{displayName}</h1>
              <p className="mt-2 text-sm text-slate-500">Maintain your streak for healthy skin</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="Search products..."
                  className="w-full min-w-[220px] rounded-2xl border border-slate-200 bg-slate-50 px-10 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <button className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 hover:bg-slate-100 transition">
                <Bell className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

        {/* Core Features: Profile & Actions */}
        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white text-2xl font-bold">
                  {displayName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{skinType} Skin</h2>
                  <p className="text-sm text-slate-500">Tone: {skinTone} • Condition: {skinDisease}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 border-t border-slate-100 pt-6">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Age Bracket</p>
                  <p className="font-medium text-slate-800">{ageBracket}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Pregnancy Status</p>
                  <p className="font-medium text-slate-800">{pregnancyStatus}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-400 mb-1">Allergies</p>
                  <p className="font-medium text-slate-800">{allergiesList}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => navigate("/profile")}
                className="flex-1 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
              >
                Edit Profile
              </button>
              <button
                onClick={() => navigate("/skin-analysis")}
                className="flex-1 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition"
              >
                Retake Scan
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-emerald-900 p-8 shadow-sm border border-emerald-800 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">Recommendations</h3>
              <h2 className="mt-4 text-3xl font-bold leading-tight">
                Discover products tailored exactly to your skin.
              </h2>
              <p className="mt-4 text-emerald-100 text-sm max-w-sm">
                Our engine uses your latest skin scan and allergy profile to recommend safe, effective products.
              </p>
            </div>
            <div className="relative z-10 mt-8">
              <button
                onClick={() => navigate("/recommendations")}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-400 text-emerald-950 px-6 py-3 text-sm font-semibold hover:bg-emerald-300 transition"
              >
                View Recommendations <ArrowRight size={16} />
              </button>
            </div>
            {/* Decorative background circle */}
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-800 rounded-full blur-3xl opacity-50"></div>
          </div>
        </section>

        {/* Tools Grid */}
        <section className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Explore Tools</h2>
              <p className="mt-1 text-sm text-slate-500">Everything you need for healthy skin.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<ScanFace className="w-6 h-6" />}
              title="Skin Scan"
              description="Analyze your skin with AI."
              onClick={() => navigate("/skin-analysis")}
            />
            <FeatureCard
              icon={<FlaskConical className="w-6 h-6" />}
              title="Ingredient Scanner"
              description="Check products for harmful ingredients."
              onClick={() => navigate("/product-scanner")}
            />
            <FeatureCard
              icon={<TrendingUp className="w-6 h-6" />}
              title="Track Progress"
              description="Monitor your skin health over time."
              onClick={() => navigate("/skin-tracking")}
            />
            <FeatureCard
              icon={<MessageCircle className="w-6 h-6" />}
              title="AI Assistant"
              description="Ask our chatbot any skincare questions."
              onClick={() => navigate("/chatbot")}
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
