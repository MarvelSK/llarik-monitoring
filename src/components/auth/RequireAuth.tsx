
import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface RequireAuthProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

const RequireAuth = ({ children, requireAdmin = false }: RequireAuthProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Only proceed with checks once loading is false
    if (!loading) {
      console.log("RequireAuth: Auth loading complete, user:", user);
      
      if (!user) {
        console.log("RequireAuth: No user, redirecting to login");
        navigate("/login");
      } else if (requireAdmin && !user.is_admin) {
        console.log("RequireAuth: User is not admin, redirecting to home");
        navigate("/");
      }
      
      // Set checking to false when the checks are done
      setIsChecking(false);
    }
  }, [user, navigate, requireAdmin, loading]);

  // Show loading indicator while checking authentication or while auth is loading
  if (loading || isChecking) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="mb-4 h-6 w-6 animate-spin rounded-full border-b-2 border-gray-900 mx-auto"></div>
          <p className="text-xl">Loading...</p>
          <p className="text-sm text-gray-500">
            {loading ? "Checking authentication..." : "Verifying access..."}
          </p>
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
  console.log("RequireAuth: User has required permissions, rendering children");
  return <>{children}</>;
};

export default RequireAuth;
