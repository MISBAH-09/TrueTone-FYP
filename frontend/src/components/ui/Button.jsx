const variants = {
  primary: "bg-[var(--tt-primary)] text-white border border-[var(--tt-primary)] hover:bg-[var(--tt-primary-hover)]",
  secondary: "bg-[var(--tt-surface)] text-[var(--tt-ink)] border border-[var(--tt-border)] hover:bg-[var(--tt-paper)]",
  ghost: "bg-transparent text-[var(--tt-secondary)] border border-transparent hover:bg-[var(--tt-paper)] hover:text-[var(--tt-ink)]",
  danger: "bg-transparent text-[var(--tt-avoid)] border border-[var(--tt-border)] hover:bg-red-50",
};

export default function Button({
  variant = "primary",
  type = "button",
  className = "",
  disabled = false,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex h-[var(--tt-control-h)] items-center justify-center gap-2 rounded-[var(--tt-radius)] px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
