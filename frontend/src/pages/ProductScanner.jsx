import { useState } from "react";
import { Upload, Camera, Search, CheckCircle2, XCircle } from "lucide-react";

const ingredients = [
  { name: "Aqua (Water)", safe: true, note: "Base ingredient, safe for all skin types." },
  { name: "Glycerin", safe: true, note: "Humectant, great for hydration." },
  { name: "Niacinamide", safe: true, note: "Brightens skin and supports barrier." },
  { name: "Sodium Lauryl Sulfate (SLS)", safe: false, note: "Can be harsh and drying for sensitive skin." },
  { name: "Fragrance (Parfum)", safe: false, note: "Common irritant for sensitive skin." },
  { name: "Parabens", safe: false, note: "Preservative linked to irritation for some users." },
];

const ProductScanner = () => {
  const [scanned, setScanned] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const filtered = ingredients.filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleScan = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setScanned(true);
    }, 1400);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Product Scanner</h1>
          <p className="mt-2 text-slate-600">Check ingredient safety and spot harmful components with a simple scan.</p>
        </div>

        {!scanned ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-slate-500">Upload or scan a product label to begin.</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button onClick={handleScan} className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition">
                    <Upload className="w-4 h-4" /> Upload Label
                  </button>
                  <button onClick={handleScan} className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-3 text-sm text-slate-700 hover:bg-slate-100 transition">
                    <Camera className="w-4 h-4" /> Scan Label
                  </button>
                </div>
              </div>
              <div className="relative max-w-md flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ingredient"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-11 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Search className="h-6 w-6" />
            </div>
            <p className="mt-6 text-slate-700">Scanning label and analyzing ingredients...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <p className="text-3xl font-bold text-slate-900">{ingredients.length}</p>
                <p className="text-sm text-slate-500">Ingredients scanned</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <p className="text-3xl font-bold text-emerald-600">{ingredients.filter((i) => i.safe).length}</p>
                <p className="text-sm text-slate-500">Safe ingredients</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <p className="text-3xl font-bold text-rose-600">{ingredients.filter((i) => !i.safe).length}</p>
                <p className="text-sm text-slate-500">Flagged ingredients</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Ingredient analysis</h2>
                <button onClick={() => setScanned(false)} className="text-sm text-slate-600 hover:text-slate-900">Scan again</button>
              </div>
              <div className="space-y-3">
                {filtered.map((item) => (
                  <div key={item.name} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl ${item.safe ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                      {item.safe ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{item.name}</p>
                      <p className="text-sm text-slate-600">{item.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductScanner;
