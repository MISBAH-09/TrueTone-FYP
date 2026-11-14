const FeatureCard = ({ icon, title, description, onClick, className = "" }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] p-4 text-left transition-colors hover:border-[var(--tt-primary)] ${className}`}
    >
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[var(--tt-radius)] bg-[var(--tt-primary-muted)] text-[var(--tt-primary)]">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-[var(--tt-ink)]">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-[var(--tt-secondary)]">{description}</p>
    </button>
  );
};

export default FeatureCard;
