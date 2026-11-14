/**
 * Clinical score display: mono value + unit/range label.
 * Examples: Profile score (0 to 1), Match (0 to 10)
 */
export default function ScoreLabel({
  value,
  label,
  rangeText,
  className = "",
  size = "md",
}) {
  const valueClass = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-base";
  return (
    <div className={`inline-flex flex-col ${className}`}>
      <span className={`tt-score text-[var(--tt-ink)] ${valueClass}`}>{value}</span>
      <span className="text-xs text-[var(--tt-secondary)]">
        {label}
        {rangeText ? ` (${rangeText})` : ""}
      </span>
    </div>
  );
}
