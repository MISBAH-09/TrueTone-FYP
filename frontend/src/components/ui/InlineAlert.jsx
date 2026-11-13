const tones = {
  info: "border-[var(--tt-border)] border-l-4 border-l-[var(--tt-primary)] bg-[var(--tt-primary-muted)] text-[var(--tt-ink)]",
  error: "border-red-200 border-l-4 border-l-[var(--tt-avoid)] bg-red-50 text-[var(--tt-avoid)]",
  loading: "border-[var(--tt-border)] border-l-4 border-l-[var(--tt-secondary)] bg-[var(--tt-paper)] text-[var(--tt-secondary)]",
};

export default function InlineAlert({ tone = "info", children, className = "" }) {
  return (
    <div className={`rounded-[var(--tt-radius)] border px-3 py-2 text-sm ${tones[tone] || tones.info} ${className}`}>
      {children}
    </div>
  );
}
