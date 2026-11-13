import { useEffect, useState, useRef } from "react";
import { Upload, Camera, CheckCircle2, AlertTriangle, Loader2, History, X } from "lucide-react";
import { scanProductImage, getScanHistory } from "../services/scanner";
import { ManualCropScreen } from "../components/Upload/ManualCropScreen";
import { ScoreLabel } from "../components/ui";

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
    <div className="mx-auto max-w-5xl text-[var(--tt-ink)]">
      <div className="flex gap-4">
        <div className="min-w-0 flex-1 space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--tt-border)] pb-4">
            <div>
              <p className="tt-mono text-xs font-medium uppercase tracking-[0.14em] text-[var(--tt-primary)]">
                Product Scanner
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--tt-ink)] sm:text-3xl">
                Score a label
              </h1>
              <p className="mt-1.5 text-sm text-[var(--tt-secondary)]">
                Scan a label, then TrueTone scores that product against your profile.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHistoryOpen((open) => !open)}
              className="inline-flex h-[var(--tt-control-h)] shrink-0 items-center gap-2 rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] px-3 text-sm font-medium text-[var(--tt-ink)] transition-colors hover:bg-[var(--tt-paper)]"
            >
              <History className="h-4 w-4" />
              Saved scans
            </button>
          </div>

          {error && (
            <div className="rounded-[var(--tt-radius)] border border-red-200 border-l-4 border-l-[var(--tt-avoid)] bg-red-50 px-3 py-2 text-sm font-medium text-[var(--tt-avoid)]">
              {error}
            </div>
          )}

          {cropSrc && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <ManualCropScreen
                imageSrc={cropSrc}
                onApply={handleApplyCrop}
                onCancel={handleCancelCrop}
              />
            </div>
          )}

          {!result && !loading && (
            <div className="rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] p-5 text-center sm:p-6">
              {preview ? (
                <div className="space-y-4">
                  <div className="relative mx-auto h-56 w-56 overflow-hidden rounded-[var(--tt-radius)] border border-[var(--tt-border)] sm:h-64 sm:w-64">
                    <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={resetScanner}
                      className="inline-flex h-[var(--tt-control-h)] items-center rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] px-4 text-sm font-medium text-[var(--tt-ink)] hover:bg-[var(--tt-paper)]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleScan}
                      className="inline-flex h-[var(--tt-control-h)] items-center rounded-[var(--tt-radius)] bg-[var(--tt-primary)] px-4 text-sm font-medium text-white hover:bg-[var(--tt-primary-hover)]"
                    >
                      Score this product
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-6">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[var(--tt-radius)] bg-[var(--tt-primary-muted)] text-[var(--tt-primary)]">
                    <Camera className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--tt-ink)]">Upload Product Label</h3>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--tt-secondary)]">
                      The ingredients are read, then scored with your skin profile.
                    </p>
                  </div>

                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                  <input
                    type="file"
                    ref={cameraInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                  />

                  <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex h-[var(--tt-control-h)] items-center gap-2 rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] px-4 text-sm font-medium text-[var(--tt-ink)] hover:bg-[var(--tt-paper)]"
                    >
                      <Upload className="h-4 w-4" /> Upload
                    </button>
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="inline-flex h-[var(--tt-control-h)] items-center gap-2 rounded-[var(--tt-radius)] bg-[var(--tt-primary)] px-4 text-sm font-medium text-white hover:bg-[var(--tt-primary-hover)]"
                    >
                      <Camera className="h-4 w-4" /> Scan Label
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {loading && (
            <div className="space-y-4 rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] p-12 text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-[var(--tt-primary)]" />
              <div>
                <h3 className="text-lg font-semibold text-[var(--tt-ink)]">Scoring this product</h3>
                <p className="mt-1 text-sm text-[var(--tt-secondary)]">
                  Reading the label, then running it through your recommendation profile.
                </p>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-[var(--tt-ink)]">Analysis Results</h2>
                <button
                  onClick={resetScanner}
                  className="text-sm font-medium text-[var(--tt-primary)] hover:underline"
                >
                  Scan Another Product
                </button>
              </div>

              <div className="rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] p-5">
                <ScoreLabel
                  value={result.score}
                  label="Profile score"
                  rangeText="0 to 10"
                  size="lg"
                />
                <p className="mt-2 text-sm text-[var(--tt-secondary)]">
                  {result.is_safe
                    ? "Higher means more of the ingredients fit your skin conditions."
                    : "This product is blocked for safety, so the score is not a recommendation."}
                </p>
              </div>

              <div
                className={`flex items-start gap-3 rounded-[var(--tt-radius)] border p-5 ${
                  result.is_safe
                    ? "border-emerald-200 border-l-4 border-l-[var(--tt-safe)] bg-emerald-50"
                    : "border-red-200 border-l-4 border-l-[var(--tt-avoid)] bg-red-50"
                }`}
              >
                {result.is_safe ? (
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-[var(--tt-safe)]" />
                ) : (
                  <AlertTriangle className="h-6 w-6 shrink-0 text-[var(--tt-avoid)]" />
                )}
                <div>
                  <h3
                    className={`text-base font-semibold ${
                      result.is_safe ? "text-[var(--tt-safe)]" : "text-[var(--tt-avoid)]"
                    }`}
                  >
                    {result.is_safe ? "No safety block" : "Not safe for your profile"}
                  </h3>
                  {result.flags?.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {result.flags.map((flag, idx) => (
                        <li key={idx} className="text-sm font-medium text-[var(--tt-avoid)]">
                          • {flag}
                        </li>
                      ))}
                    </ul>
                  )}
                  {result.reasons?.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {result.reasons.map((reason, idx) => (
                        <li key={idx} className="text-sm text-[var(--tt-safe)]">
                          • {reason}
                        </li>
                      ))}
                    </ul>
                  )}
                  {result.warnings?.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {result.warnings.map((warning, idx) => (
                        <li key={idx} className="text-sm text-[var(--tt-caution)]">
                          • {warning}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] p-5">
                <h3 className="mb-3 text-base font-semibold text-[var(--tt-ink)]">
                  Extracted Ingredients ({result.ingredients?.length || 0})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(result.ingredients || []).map((ing, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-paper)] px-2.5 py-1 text-xs font-medium text-[var(--tt-ink)]"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {historyOpen && (
          <aside className="h-fit w-72 shrink-0 rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--tt-ink)]">Saved scans</h2>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="rounded-[var(--tt-radius)] p-1 text-[var(--tt-secondary)] hover:bg-[var(--tt-paper)] hover:text-[var(--tt-ink)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-[var(--tt-secondary)]">Scans you run are kept here.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((scan) => (
                  <li key={scan.id}>
                    <button
                      type="button"
                      onClick={() => openSaved(scan)}
                      className="w-full rounded-[var(--tt-radius)] border border-[var(--tt-border)] px-3 py-2 text-left transition-colors hover:border-[var(--tt-primary)] hover:bg-[var(--tt-primary-muted)]"
                    >
                      <p className="text-sm font-semibold text-[var(--tt-ink)]">Score {scan.score}</p>
                      <p className="text-xs text-[var(--tt-secondary)]">
                        {formatWhen(scan.created_at)} · {scan.ingredients?.length || 0} ingredients
                      </p>
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
