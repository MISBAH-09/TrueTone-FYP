import { useState, useEffect } from "react";
import { getUserProfile, updateUser } from "../services/user";
import { CheckCircle2, Loader2, Save } from "lucide-react";

const ageBrackets = [
  { value: "teen", label: "Teen", desc: "Under 18" },
  { value: "18-24", label: "18–24", desc: "" },
  { value: "25-34", label: "25–34", desc: "" },
  { value: "35+", label: "35+", desc: "" },
];

const skinTones = [
  { value: "fair", label: "Fair", color: "#FDEBD0" },
  { value: "medium", label: "Medium", color: "#D4A574" },
  { value: "dark", label: "Dark", color: "#8B5E3C" },
];

const skinTypes = [
  { value: "oily", label: "Oily", desc: "Shiny, enlarged pores" },
  { value: "combination", label: "Combination", desc: "Oily T-zone, dry cheeks" },
  { value: "dry", label: "Dry", desc: "Tight, flaky skin" },
  { value: "normal", label: "Normal", desc: "Balanced, few concerns" },
];

const skinDiseases = [
  { value: "common_acne", label: "Acne", desc: "Blackheads, whiteheads & breakouts" },
  { value: "cystic_acne", label: "Cystic Acne", desc: "Deep, painful breakouts" },
  { value: "eczema", label: "Eczema", desc: "Itchy, inflamed patches" },
  { value: "psoriasis", label: "Psoriasis", desc: "Thick, scaly skin patches" },
  { value: "rosacea", label: "Rosacea", desc: "Facial redness & flushing" },
  { value: "tinea", label: "Tinea", desc: "Fungal skin infection" },
];

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [ageBracket, setAgeBracket] = useState("");
  const [skinTone, setSkinTone] = useState("");
  const [skinType, setSkinType] = useState("");
  const [skinDisease, setSkinDisease] = useState("");
  const [allergiesText, setAllergiesText] = useState("");
  const [isPregnantOrBreastfeeding, setIsPregnantOrBreastfeeding] = useState(false);
  const [currentProductsText, setCurrentProductsText] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getUserProfile();
        if (response.success && response.data) {
          const p = response.data;
          setUsername(p.username || "");
          setEmail(p.email || "");
          setAgeBracket(p.age_bracket || "");
          setSkinTone(p.skin_tone || "");
          setSkinType(p.skin_type || "");
          setSkinDisease(p.skin_disease || "");
          setAllergiesText(p.allergies || "");
          setIsPregnantOrBreastfeeding(p.is_pregnant_or_breastfeeding || false);
          setCurrentProductsText(p.current_products || "");
        }
      } catch (err) {
        console.error("Profile fetch error:", err);
        setError(
          err.response?.data?.message || 
          err.message || 
          "Failed to load profile."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updates = {
        username,
        email,
        age_bracket: ageBracket,
        skin_tone: skinTone,
        skin_type: skinType,
        skin_disease: skinDisease,
        allergies: allergiesText,
        is_pregnant_or_breastfeeding: isPregnantOrBreastfeeding,
        current_products: currentProductsText,
      };
      
      const response = await updateUser(updates);
      if (response.success) {
        setSuccess("Profile updated successfully!");
      } else {
        setError(response.message || "Failed to update profile.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fadeIn pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-2 text-slate-500">
          Update your profile, skin profile, and safety information.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="h-5 w-5" />
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-12">
        
        {/* Account Details */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Account Details</h2>
            <p className="text-sm text-slate-500">Your basic TrueTone account info.</p>
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
              <input
                type="text"
                value={username}
                disabled
                className="w-full rounded-2xl border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 cursor-not-allowed outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full rounded-2xl border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 cursor-not-allowed outline-none"
              />
            </div>
          </div>
        </div>

        {/* Skin Profile */}
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Skin Profile</h2>
            <p className="text-sm text-slate-500">Used by TrueTone to filter and recommend products accurately.</p>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-900">Age Bracket</label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ageBrackets.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setAgeBracket(item.value)}
                  className={`flex flex-col items-center justify-center rounded-2xl border-2 p-3 text-center transition-all ${
                    ageBracket === item.value
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                      : "border-slate-100 bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="font-semibold">{item.label}</span>
                  {item.desc && <span className="text-xs mt-0.5 opacity-80">{item.desc}</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-900">Skin Tone</label>
            <div className="grid grid-cols-3 gap-3">
              {skinTones.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSkinTone(item.value)}
                  className={`flex flex-col items-center justify-center rounded-2xl border-2 p-4 transition-all ${
                    skinTone === item.value
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div
                    className="h-8 w-8 rounded-full border border-black/10 shadow-sm mb-3"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className={`text-sm font-semibold ${skinTone === item.value ? "text-emerald-900" : "text-slate-700"}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-900">Skin Type</label>
            <div className="grid grid-cols-2 gap-3">
              {skinTypes.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSkinType(item.value)}
                  className={`flex flex-col items-start rounded-2xl border-2 p-4 text-left transition-all ${
                    skinType === item.value
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className={`text-sm font-semibold ${skinType === item.value ? "text-emerald-900" : "text-slate-700"}`}>
                    {item.label}
                  </span>
                  <span className={`text-xs mt-1 ${skinType === item.value ? "text-emerald-700" : "text-slate-500"}`}>
                    {item.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="block text-sm font-bold text-slate-900">Skin Condition (Optional)</label>
              {skinDisease && (
                <button 
                  type="button"
                  onClick={() => setSkinDisease("")}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                >
                  Clear Selection
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {skinDiseases.map((item) => {
                const isSelected = skinDisease === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setSkinDisease(isSelected ? "" : item.value)}
                    className={`flex flex-col items-start rounded-2xl border-2 p-3 text-left transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className={`text-sm font-semibold ${isSelected ? "text-emerald-900" : "text-slate-700"}`}>
                      {item.label}
                    </span>
                    <span className={`text-[11px] leading-tight mt-1 ${isSelected ? "text-emerald-700" : "text-slate-500"}`}>
                      {item.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Safety & Habits */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Safety & Habits</h2>
            <p className="text-sm text-slate-500">Crucial for ingredient safety checks and routine matching.</p>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-900">Allergies or sensitivities</label>
            <p className="text-xs text-slate-500">List any ingredients you know you react badly to.</p>
            <textarea
              value={allergiesText}
              onChange={(e) => setAllergiesText(e.target.value)}
              placeholder="e.g., fragrance, niacinamide, essential oils..."
              className="h-24 w-full resize-none rounded-2xl border-slate-200 bg-slate-50 p-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-900">Pregnancy Status</label>
            <p className="text-xs text-slate-500">Helps us flag ingredients to avoid (like retinoids).</p>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition">
              <input
                type="checkbox"
                checked={isPregnantOrBreastfeeding}
                onChange={(e) => setIsPregnantOrBreastfeeding(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-700">
                I am currently pregnant or breastfeeding
              </span>
            </label>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-900">Current Routine</label>
            <p className="text-xs text-slate-500">What products do you use regularly?</p>
            <textarea
              value={currentProductsText}
              onChange={(e) => setCurrentProductsText(e.target.value)}
              placeholder="e.g., CeraVe Foaming Cleanser, The Ordinary Niacinamide 10%..."
              className="h-24 w-full resize-none rounded-2xl border-slate-200 bg-slate-50 p-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
