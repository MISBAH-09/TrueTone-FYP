export default function PageHeader({ title, subtitle, actions = null }) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--tt-border)] pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--tt-ink)] sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-[var(--tt-secondary)]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
