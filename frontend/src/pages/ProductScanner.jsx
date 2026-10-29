import { useEffect, useState, useRef } from "react";
import { Upload, Camera, CheckCircle2, AlertTriangle, Loader2, History, X } from "lucide-react";
import { scanProductImage, getScanHistory } from "../services/scanner";
import { ManualCropScreen } from "../components/Upload/ManualCropScreen";

const formatWhen = (iso) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const ProductScanner = () => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [cropSrc, setCropSrc] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const loadHistory = async () => {
    try {
      const data = await getScanHistory();
      setHistory(data.data || []);
    } catch (err) {
      console.error("Could not load scan history", err);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCropSrc(URL.createObjectURL(file));
      setResult(null);
      setError("");
    }
  };

  const handleApplyCrop = (croppedFile) => {
    setImage(croppedFile);
    setPreview(URL.createObjectURL(croppedFile));
    setCropSrc(null);
  };

  const handleCancelCrop = () => {
    setCropSrc(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleScan = async () => {
    if (!image) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await scanProductImage(image);
      if (response.success) {
        setResult(response.data);
        loadHistory();
      } else {
        setError(response.message || "Failed to scan product");
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred during scanning");
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setImage(null);
    setPreview("");
    setResult(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openSaved = (scan) => {
    setResult(scan);
    setPreview(scan.image || "");
    setImage(null);
    setError("");
    setHistoryOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto flex max-w-6xl gap-6">
        <div className="min-w-0 flex-1 space-y-8 animate-fadeIn">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Product Scanner</h1>
              <p className="mt-2 text-slate-600">Scan a label, then TrueTone scores that product against your profile.</p>
            </div>
            <button
              type="button"
              onClick={() => setHistoryOpen((open) => !open)}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <History className="h-4 w-4" />
              Saved scans
            </button>
          </div>

          {error && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm font-semibold text-rose-700">
              {error}
            </div>
          )}

          {cropSrc && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
              <ManualCropScreen
                imageSrc={cropSrc}
                onApply={handleApplyCrop}
                onCancel={handleCancelCrop}
              />
            </div>
          )}

          {!result && !loading && (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm text-center">
              {preview ? (
                <div className="space-y-6">
                  <div className="relative mx-auto h-64 w-64 overflow-hidden rounded-2xl border-4 border-slate-100 shadow-inner">
                    <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex justify-center gap-4">
                    <button onClick={resetScanner} className="rounded-full border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      Cancel
                    </button>
                    <button onClick={handleScan} className="rounded-full bg-emerald-600 px-8 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
                      Score this product
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-12 space-y-6">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Camera className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Upload Product Label</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">The ingredients are read, then scored with your skin profile.</p>
                  </div>

                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                  <input type="file" ref={cameraInputRef} onChange={handleFileSelect} accept="image/*" capture="environment" className="hidden" />

                  <div className="flex justify-center gap-4">
                    <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
                      <Upload className="w-4 h-4" /> Upload
                    </button>
                    <button onClick={() => cameraInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition">
                      <Camera className="w-4 h-4" /> Scan Label
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {loading && (
            <div className="rounded-3xl border border-slate-200 bg-white p-16 shadow-sm text-center space-y-6">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-emerald-500" />
              <div>
                <h3 className="text-lg font-bold text-slate-900">Scoring this product</h3>
                <p className="text-sm text-slate-500 mt-1">Reading the label, then running it through your recommendation profile.</p>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-slideUp">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900">Analysis Results</h2>
                <button onClick={resetScanner} className="text-sm font-medium text-emerald-600 hover:text-emerald-700">Scan Another Product</button>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Profile score</p>
                <p className="mt-1 text-4xl font-bold text-slate-900">{result.score}</p>
                <p className="mt-2 text-sm text-slate-500">
                  {result.is_safe
                    ? "Higher means more of the ingredients fit your skin conditions."
                    : "This product is blocked for safety, so the score is not a recommendation."}
                </p>
              </div>

              <div className={`rounded-3xl border p-6 md:p-8 flex items-start gap-4 ${result.is_safe ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
                {result.is_safe ? (
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-rose-600 shrink-0" />
                )}
                <div>
                  <h3 className={`text-lg font-bold ${result.is_safe ? "text-emerald-900" : "text-rose-900"}`}>
                    {result.is_safe ? "No safety block" : "Not safe for your profile"}
                  </h3>
                  {result.flags?.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {result.flags.map((flag, idx) => (
                        <li key={idx} className="text-sm font-medium text-rose-700">• {flag}</li>
                      ))}
                    </ul>
                  )}
                  {result.reasons?.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {result.reasons.map((reason, idx) => (
                        <li key={idx} className="text-sm text-emerald-800">• {reason}</li>
                      ))}
                    </ul>
                  )}
                  {result.warnings?.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {result.warnings.map((warning, idx) => (
                        <li key={idx} className="text-sm text-amber-800">• {warning}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Extracted Ingredients ({result.ingredients?.length || 0})</h3>
                <div className="flex flex-wrap gap-2">
                  {(result.ingredients || []).map((ing, idx) => (
                    <span key={idx} className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {historyOpen && (
          <aside className="w-72 shrink-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm h-fit">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Saved scans</h2>
              <button type="button" onClick={() => setHistoryOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-slate-500">Scans you run are kept here.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((scan) => (
                  <li key={scan.id}>
                    <button
                      type="button"
                      onClick={() => openSaved(scan)}
                      className="w-full rounded-2xl border border-slate-100 px-3 py-2 text-left hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      <p className="text-sm font-semibold text-slate-800">Score {scan.score}</p>
                      <p className="text-xs text-slate-500">{formatWhen(scan.created_at)} · {scan.ingredients?.length || 0} ingredients</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};

export default ProductScanner;
