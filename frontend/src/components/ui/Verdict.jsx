const styles = {
  safe: "text-[var(--tt-safe)]",
  caution: "text-[var(--tt-caution)]",
  avoid: "text-[var(--tt-avoid)]",
};

const labels = {
  safe: "Safe",
  caution: "Caution",
  avoid: "Avoid",
};

export default function Verdict({ level = "safe", className = "" }) {
  const key = String(level).toLowerCase();
  return (
    <span className={`text-sm font-medium ${styles[key] || styles.safe} ${className}`}>
      {labels[key] || labels.safe}
    </span>
  );
}
