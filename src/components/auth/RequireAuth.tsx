
import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface RequireAuthProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

const RequireAuth = ({ children, requireAdmin = false }: RequireAuthProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/login");
      } else if (requireAdmin && !user.is_admin) {
        navigate("/");
      }
    }
  }, [user, navigate, requireAdmin, loading]);

  // Show nothing while checking authentication
  if (loading) {
    return null;
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  // Not admin but admin is required
  if (requireAdmin && !user.is_admin) {
    return null;
  }

  return <>{children}</>;
};

export default RequireAuth;
