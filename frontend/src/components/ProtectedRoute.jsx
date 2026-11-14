import { Navigate } from "react-router-dom";
import { getActiveViewMode } from "../services/user";

const ProtectedRoute = ({ children, requireRole = null }) => {
  const token = localStorage.getItem("truetone_token");

  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  const authRole = localStorage.getItem("truetone_role") || "end_user";
  const viewMode = getActiveViewMode();

  if (requireRole === "evaluator") {
    // Only accounts authenticated with the evaluator code may view evaluator routes.
    if (authRole !== "evaluator") {
      return <Navigate to="/dashboard" replace />;
    }
    if (viewMode !== "evaluator") {
      return <Navigate to="/dashboard" replace />;
    }
  } else if (requireRole === "end_user") {
    // End-users always enter here; evaluators enter once they click "User Mode".
    if (authRole === "evaluator" && viewMode === "evaluator") {
      return <Navigate to="/inspector" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
