import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScanFace, FlaskConical, Sparkles, TrendingUp, Bell, Search, MessageCircle } from "lucide-react";
import FeatureCard from "../components/FeatureCard";
import StatCard from "../components/StatCard";
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
        <div className="text-slate-500 text-sm">Loading dashboard...</div>
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

  const skinDisease = profile?.skin_disease || "None detected";
  const age = profile?.age ?? "—";
  const gender = profile?.gender
    ? profile.gender === "prefer_not_to_say"
      ? "Not specified"
      : profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)
    : "—";

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
                  placeholder="Search..."
                  className="w-full min-w-[220px] rounded-2xl border border-slate-200 bg-slate-50 px-10 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <button className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 hover:bg-slate-100 transition">
                <Bell className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

        {/* Skin Profile Card */}
        <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white text-2xl font-bold">
                  {displayName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{skinType} Skin</h2>
                  <p className="text-sm text-slate-500">Tone: {skinTone} • Condition: {skinDisease}</p>
                  <p className="mt-2 text-xs text-slate-500">Age: {age} • {gender}</p>
                </div>
              </div>
              <button
                onClick={() => navigate("/skin-analysis")}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition"
              >
                View Report
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Quick status</h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">Skin Score</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">78</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">Scanned</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">12</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">Flagged</p>
                <p className="mt-2 text-3xl font-bold text-rose-600">4</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">Tracked</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">23</p>
              </div>
            </div>
          </div>
        </section>

        {profile?.onboarding_completed && (
          <section className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Your Skin Profile</h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm text-slate-600">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-slate-500">Sun Exposure</p>
                <p className="mt-2 font-medium text-slate-900">{profile.sunExposure || "Not set"}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-slate-500">Water Intake</p>
                <p className="mt-2 font-medium text-slate-900">{profile.waterIntake || "Not set"}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-slate-500">Sleep</p>
                <p className="mt-2 font-medium text-slate-900">{profile.sleepHours ? `${profile.sleepHours} hrs/night` : "Not set"}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-slate-500">Goals</p>
                <p className="mt-2 font-medium text-slate-900">{profile.skinGoals?.length ? profile.skinGoals.slice(0, 2).join(", ") : "Not set"}</p>
              </div>
            </div>
          </section>
        )}

        {/* Stat Cards */}
        <section className="grid gap-4 lg:grid-cols-4">
          <StatCard label="Skin Score" value="78" change="+5% this week" positive />
          <StatCard label="Products Scanned" value="12" change="3 new" positive />
          <StatCard label="Harmful Flagged" value="4" change="2 less" positive />
          <StatCard label="Days Tracked" value="23" />
        </section>

        {/* Quick Actions */}
        <section className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Quick Actions</h2>
              <p className="mt-1 text-sm text-slate-500">Jump to the tools you use most.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => navigate("/dashboard")} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition">
                Refresh
              </button>
              <button onClick={() => navigate("/chatbot")} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition">
                Open Chatbot
              </button>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <FeatureCard
              icon={<ScanFace className="w-6 h-6" />}
              title="Skin Health Label"
              description="Analyze your skin by uploading a photo for AI-powered assessment."
              onClick={() => navigate("/skin-analysis")}
            />
            <FeatureCard
              icon={<FlaskConical className="w-6 h-6" />}
              title="Scan Product"
              description="Check product ingredients for harmful substances."
              onClick={() => navigate("/product-scanner")}
            />
            <FeatureCard
              icon={<TrendingUp className="w-6 h-6" />}
              title="Track Skin Analysis"
              description="View your skin health history and monitor progress over time."
              onClick={() => navigate("/skin-tracking")}
            />
            <FeatureCard
              icon={<MessageCircle className="w-6 h-6" />}
              title="Chat with AI Assistant"
              description="Get instant skincare advice from our AI-driven assistant."
              onClick={() => navigate("/chatbot")}
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
