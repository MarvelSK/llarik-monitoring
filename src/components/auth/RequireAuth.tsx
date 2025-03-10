
import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompanies } from "@/context/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface RequireAuthProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

const RequireAuth = ({ children, requireAdmin = false }: RequireAuthProps) => {
  const { currentUser } = useCompanies();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/login");
      } else if (requireAdmin && !currentUser?.isAdmin) {
        navigate("/");
      }
    }
  }, [user, currentUser, navigate, requireAdmin, loading]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  if (requireAdmin && !currentUser?.isAdmin) {
    return null;
  }

  return <>{children}</>;
};

export default RequireAuth;
