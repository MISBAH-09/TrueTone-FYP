import { Link } from "react-router-dom";

/**
 * Clinical logo for light chrome (sidebar, landing, auth).
 * variant: "ink" (default) | "onPrimary" for teal/dark strips if needed later.
 */
const TrueToneLogo = ({ variant = "ink", to = "/", className = "" }) => {
  const onPrimary = variant === "onPrimary";
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2 ${onPrimary ? "text-white" : "text-[var(--tt-ink)]"} ${className}`}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-[var(--tt-radius)] text-sm font-bold ${
          onPrimary ? "bg-white/15 text-white" : "bg-[var(--tt-primary)] text-white"
        }`}
      >
        T
      </span>
      <span className="text-lg font-semibold tracking-tight">TrueTone</span>
    </Link>
  );
};

export default TrueToneLogo;
