import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Trash2, Edit2, Check, X } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({});
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    const stored = localStorage.getItem("truetone_profile");
    const parsed = stored ? JSON.parse(stored) : {};
    setProfile(parsed);
    setForm(parsed);
  }, []);

  const saveProfile = () => {
    localStorage.setItem("truetone_profile", JSON.stringify(form));
    setProfile(form);
    setEditing(false);
  };

  const deleteAccount = () => {
    localStorage.removeItem("truetone_profile");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-slate-500">Profile</p>
            <h1 className="text-3xl font-bold">Manage Your Account</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            {editing ? (
              <>
                <button onClick={() => setEditing(false)} className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition">
                  <X className="inline w-4 h-4 mr-2" /> Cancel
                </button>
                <button onClick={saveProfile} className="rounded-full bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 transition">
                  <Check className="inline w-4 h-4 mr-2" /> Save
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 transition">
                <Edit2 className="inline w-4 h-4 mr-2" /> Edit Profile
              </button>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
          <div className="grid gap-6 md:grid-cols-2">
            {[
              { label: "Full Name", key: "name", icon: <User className="w-4 h-4" /> },
              { label: "Email", key: "email", icon: <Mail className="w-4 h-4" /> },
            ].map((field) => (
              <div key={field.key} className="space-y-2">
                <div className="flex items-center gap-2 text-slate-500">
                  {field.icon}
                  <span className="text-sm">{field.label}</span>
                </div>
                {editing ? (
                  <input
                    value={form[field.key] || ""}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                ) : (
                  <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">{profile[field.key] || "Not set"}</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={deleteAccount} className="rounded-full bg-rose-600 px-4 py-2 text-sm text-white hover:bg-rose-700 transition">
              <Trash2 className="inline w-4 h-4 mr-2" /> Delete Account
            </button>
            <button onClick={() => navigate("/dashboard")} className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700 hover:bg-slate-200 transition">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
