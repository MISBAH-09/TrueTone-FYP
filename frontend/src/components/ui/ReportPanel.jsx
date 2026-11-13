export default function ReportPanel({ title = null, children, className = "" }) {
  return (
    <section className={`rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] ${className}`}>
      {title ? (
        <div className="border-b border-[var(--tt-border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--tt-ink)]">{title}</h2>
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}
