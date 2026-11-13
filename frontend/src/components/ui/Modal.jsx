import Button from "./Button";

export default function Modal({
  open,
  title,
  children,
  onClose,
  primaryLabel = "Confirm",
  secondaryLabel = "Cancel",
  onPrimary,
  primaryDisabled = false,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[var(--tt-ink)]/30"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tt-modal-title"
        className="relative z-10 w-full max-w-md rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] shadow-lg"
      >
        <div className="border-b border-[var(--tt-border)] px-4 py-3">
          <h2 id="tt-modal-title" className="text-base font-semibold text-[var(--tt-ink)]">
            {title}
          </h2>
        </div>
        <div className="px-4 py-4 text-sm text-[var(--tt-secondary)]">{children}</div>
        <div className="flex justify-end gap-2 border-t border-[var(--tt-border)] px-4 py-3">
          <Button variant="secondary" onClick={onClose}>
            {secondaryLabel}
          </Button>
          <Button variant="primary" onClick={onPrimary} disabled={primaryDisabled}>
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
