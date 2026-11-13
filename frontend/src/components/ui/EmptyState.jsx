import Button from "./Button";

export default function EmptyState({ title, description, actionLabel = null, onAction = null }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[var(--tt-radius)] border border-dashed border-[var(--tt-border)] bg-[var(--tt-surface)] px-4 py-8">
      <h3 className="text-base font-semibold text-[var(--tt-ink)]">{title}</h3>
      {description ? <p className="max-w-md text-sm text-[var(--tt-secondary)]">{description}</p> : null}
      {actionLabel && onAction ? (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
