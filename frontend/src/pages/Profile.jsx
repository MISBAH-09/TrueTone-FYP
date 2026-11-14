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
  { value: "common_acne", label: "Acne", desc: "Blackheads, whiteheads, pimples & deep breakouts" },
  { value: "eczema", label: "Eczema", desc: "Itchy, inflamed patches" },
  { value: "psoriasis", label: "Psoriasis", desc: "Thick, scaly skin patches" },
  { value: "rosacea", label: "Rosacea", desc: "Facial redness & flushing" },
  { value: "tinea", label: "Tinea", desc: "Fungal skin infection" },
];

const selectClass = (active) =>
  `rounded-[var(--tt-radius)] border p-3 text-left transition-colors ${
    active
      ? "border-[var(--tt-primary)] bg-[var(--tt-primary-muted)] text-[var(--tt-ink)]"
      : "border-[var(--tt-border)] bg-[var(--tt-surface)] text-[var(--tt-ink)] hover:bg-[var(--tt-paper)]"
  }`;

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
  const [gender, setGender] = useState("");
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
          setSkinDisease(p.skin_disease === "cystic_acne" ? "common_acne" : p.skin_disease || "");
          setGender(p.gender || "");
          setAllergiesText(p.allergies || "");
          setIsPregnantOrBreastfeeding(p.is_pregnant_or_breastfeeding || false);
          setCurrentProductsText(p.current_products || "");
        }
      } catch (err) {
        console.error("Profile fetch error:", err);
        setError(err.response?.data?.message || err.message || "Failed to load profile.");
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
        gender,
        allergies: allergiesText,
        is_pregnant_or_breastfeeding: gender === "male" ? false : isPregnantOrBreastfeeding,
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
        <Loader2 className="h-8 w-8 animate-spin text-[var(--tt-primary)]" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-16 text-[var(--tt-ink)]">
      <div className="border-b border-[var(--tt-border)] pb-4">
        <p className="tt-mono text-xs font-medium uppercase tracking-[0.14em] text-[var(--tt-primary)]">
          Profile
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1.5 text-sm text-[var(--tt-secondary)]">
          Update your profile, skin profile, and safety information.
        </p>
      </div>

      {error && (
        <div className="rounded-[var(--tt-radius)] border border-red-200 border-l-4 border-l-[var(--tt-avoid)] bg-red-50 px-4 py-3 text-sm font-medium text-[var(--tt-avoid)]">
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-[var(--tt-radius)] border border-emerald-200 border-l-4 border-l-[var(--tt-safe)] bg-emerald-50 px-4 py-3 text-sm font-medium text-[var(--tt-safe)]">
          <CheckCircle2 className="h-5 w-5" />
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--tt-ink)]">Account Details</h2>
            <p className="text-sm text-[var(--tt-secondary)]">Your basic TrueTone account info.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--tt-ink)]">Username</label>
              <input
                type="text"
                value={username}
                disabled
                className="h-[var(--tt-control-h)] w-full cursor-not-allowed rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-paper)] px-3 text-sm text-[var(--tt-secondary)] outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--tt-ink)]">Email Address</label>
              <input
                type="email"
                value={email}
                disabled
                className="h-[var(--tt-control-h)] w-full cursor-not-allowed rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-paper)] px-3 text-sm text-[var(--tt-secondary)] outline-none"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--tt-ink)]">Skin Profile</h2>
            <p className="text-sm text-[var(--tt-secondary)]">
              Used by TrueTone to filter and recommend products accurately.
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-[var(--tt-ink)]">Age Bracket</label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ageBrackets.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setAgeBracket(item.value)}
                  className={`flex flex-col items-center justify-center p-3 text-center ${selectClass(
                    ageBracket === item.value
                  )}`}
                >
                  <span className="font-semibold">{item.label}</span>
                  {item.desc && <span className="mt-0.5 text-xs text-[var(--tt-secondary)]">{item.desc}</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-[var(--tt-ink)]">Skin Tone</label>
            <div className="grid grid-cols-3 gap-3">
              {skinTones.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSkinTone(item.value)}
                  className={`flex flex-col items-center justify-center p-4 ${selectClass(
                    skinTone === item.value
                  )}`}
                >
                  <div
                    className="mb-3 h-8 w-8 rounded-[var(--tt-radius)] border border-black/10"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-semibold">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-[var(--tt-ink)]">Skin Type</label>
            <div className="grid grid-cols-2 gap-3">
              {skinTypes.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSkinType(item.value)}
                  className={`flex flex-col items-start p-4 ${selectClass(skinType === item.value)}`}
                >
                  <span className="text-sm font-semibold">{item.label}</span>
                  <span className="mt-1 text-xs text-[var(--tt-secondary)]">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <label className="block text-sm font-semibold text-[var(--tt-ink)]">
                Skin Condition (Optional)
              </label>
              {skinDisease && (
                <button
                  type="button"
                  onClick={() => setSkinDisease("")}
                  className="text-xs font-medium text-[var(--tt-avoid)] hover:underline"
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
                    className={`flex flex-col items-start p-3 ${selectClass(isSelected)}`}
                  >
                    <span className="text-sm font-semibold">{item.label}</span>
                    <span className="mt-1 text-[11px] leading-tight text-[var(--tt-secondary)]">
                      {item.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--tt-ink)]">Safety & Habits</h2>
            <p className="text-sm text-[var(--tt-secondary)]">
              Crucial for ingredient safety checks and routine matching.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--tt-ink)]">
              Allergies or sensitivities
            </label>
            <p className="text-xs text-[var(--tt-secondary)]">
              List any ingredients you know you react badly to.
            </p>
            <textarea
              value={allergiesText}
              onChange={(e) => setAllergiesText(e.target.value)}
              placeholder="e.g., fragrance, niacinamide, essential oils..."
              className="h-24 w-full resize-none rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-paper)] p-3 text-sm outline-none transition focus:border-[var(--tt-primary)] focus:bg-[var(--tt-surface)] focus:ring-1 focus:ring-[var(--tt-primary)]"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--tt-ink)]">Gender</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "female", label: "Woman" },
                { value: "male", label: "Man" },
                { value: "prefer_not_to_say", label: "Prefer not to say" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setGender(option.value);
                    if (option.value === "male") setIsPregnantOrBreastfeeding(false);
                  }}
                  className={`px-4 py-3 text-sm font-medium ${selectClass(gender === option.value)}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {gender !== "male" && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--tt-ink)]">Pregnancy Status</label>
              <p className="text-xs text-[var(--tt-secondary)]">
                Helps us flag ingredients to avoid (like retinoids).
              </p>
              <label className="flex cursor-pointer items-center gap-3 rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] p-4 hover:bg-[var(--tt-paper)]">
                <input
                  type="checkbox"
                  checked={isPregnantOrBreastfeeding}
                  onChange={(e) => setIsPregnantOrBreastfeeding(e.target.checked)}
                  className="h-4 w-4 rounded-[var(--tt-radius)] border-[var(--tt-border)] text-[var(--tt-primary)] focus:ring-[var(--tt-primary)]"
                />
                <span className="text-sm font-medium text-[var(--tt-ink)]">
                  I am currently pregnant or breastfeeding
                </span>
              </label>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--tt-ink)]">Current Routine</label>
            <p className="text-xs text-[var(--tt-secondary)]">What products do you use regularly?</p>
            <textarea
              value={currentProductsText}
              onChange={(e) => setCurrentProductsText(e.target.value)}
              placeholder="e.g., CeraVe Foaming Cleanser, The Ordinary Niacinamide 10%..."
              className="h-24 w-full resize-none rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-paper)] p-3 text-sm outline-none transition focus:border-[var(--tt-primary)] focus:bg-[var(--tt-surface)] focus:ring-1 focus:ring-[var(--tt-primary)]"
            />
          </div>
        </div>

        <div className="flex justify-end border-t border-[var(--tt-border)] pt-4">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-[var(--tt-control-h)] items-center gap-2 rounded-[var(--tt-radius)] bg-[var(--tt-primary)] px-5 text-sm font-medium text-white hover:bg-[var(--tt-primary-hover)] disabled:opacity-50"
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
