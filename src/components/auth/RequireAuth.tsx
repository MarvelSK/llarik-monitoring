
import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCompanies } from "@/context/CompanyContext";

interface RequireAuthProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

const RequireAuth = ({ children, requireAdmin = false }: RequireAuthProps) => {
  const { currentUser } = useCompanies();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
    } else if (requireAdmin && !currentUser.isAdmin) {
      navigate("/");
    }
  }, [currentUser, navigate, requireAdmin]);

  if (!currentUser) {
    return null;
  }

  if (requireAdmin && !currentUser.isAdmin) {
    return null;
  }

  return <>{children}</>;
};

export default RequireAuth;
