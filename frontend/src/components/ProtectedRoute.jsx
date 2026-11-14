import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, requireRole = null }) => {
  const token = localStorage.getItem("truetone_token");

  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  if (requireRole) {
    const role = localStorage.getItem("truetone_role") || "end_user";
    if (role !== requireRole) {
      return (
        <Navigate
          to={role === "evaluator" ? "/inspector" : "/dashboard"}
          replace
        />
      );
    }
  }

  return children;
};

export default ProtectedRoute;
