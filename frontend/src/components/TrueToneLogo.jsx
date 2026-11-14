import { Link } from "react-router-dom";

/**
 * Clinical logo for light chrome (sidebar, landing, auth).
 * variant: "ink" (default) | "onPrimary" for dark brand surfaces.
 */
const TrueToneLogo = ({ variant = "ink", to = "/", className = "" }) => {
  const onPrimary = variant === "onPrimary";
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-3 ${className}`}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg font-bold shadow-sm ${
          onPrimary ? "bg-white/20 text-white" : "bg-cocoa text-paper"
        }`}
      >
        T
      </span>
      <span className={`text-xl font-bold tracking-tight ${onPrimary ? "text-white" : "text-cocoa-dark"}`}>
        TrueTone
      </span>
    </Link>
  );
};

export default TrueToneLogo;
