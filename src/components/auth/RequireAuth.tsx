
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

  // Show loading indicator while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="mb-4 h-6 w-6 animate-spin rounded-full border-b-2 border-gray-900 mx-auto"></div>
          <p className="text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, return null (will be redirected by useEffect)
  if (!user) {
    return null;
  }

  // If admin is required but user is not admin, return null (will be redirected by useEffect)
  if (requireAdmin && !user.is_admin) {
    return null;
  }

  // User is authenticated and has the required permissions
  return <>{children}</>;
};

export default RequireAuth;
