const fieldClass =
  "h-[var(--tt-control-h)] w-full rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] px-3 text-sm text-[var(--tt-ink)] placeholder:text-[var(--tt-secondary)] focus:border-[var(--tt-primary)] focus:outline-none";

export function Input({ className = "", ...props }) {
  return <input className={`${fieldClass} ${className}`} {...props} />;
}

export function Textarea({ className = "", rows = 4, ...props }) {
  return (
    <textarea
      rows={rows}
      className={`w-full rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] px-3 py-2 text-sm text-[var(--tt-ink)] placeholder:text-[var(--tt-secondary)] focus:border-[var(--tt-primary)] focus:outline-none ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", children, ...props }) {
  return (
    <select className={`${fieldClass} ${className}`} {...props}>
      {children}
    </select>
  );
}

export default Input;
