
import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompanies } from "@/context/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface RequireAuthProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireCompany?: boolean;
}

const RequireAuth = ({ 
  children, 
  requireAdmin = false, 
  requireCompany = true 
}: RequireAuthProps) => {
  const { currentUser, setCurrentUser } = useCompanies();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCheckingCompany, setIsCheckingCompany] = useState(false);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) {
        checkUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        checkUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserProfile = async (user: User) => {
    try {
      // Fetch user profile from profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      // Set user context
      if (profile) {
        setCurrentUser({
          id: profile.id,
          name: profile.name,
          email: profile.email,
          companyId: profile.company_id,
          isAdmin: profile.is_admin
        });
      }
      
      // If we need a company and company check is required
      if (requireCompany && !profile.company_id) {
        setIsCheckingCompany(true);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/login");
      } else if (requireAdmin && !currentUser?.isAdmin) {
        navigate("/");
      } else if (isCheckingCompany && requireCompany && !currentUser?.companyId) {
        // Redirect to company setup if the user doesn't have a company
        if (window.location.pathname !== "/setup") {
          navigate("/setup");
        }
      }
    }
  }, [user, currentUser, navigate, requireAdmin, loading, isCheckingCompany, requireCompany]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  if (requireAdmin && !currentUser?.isAdmin) {
    return null;
  }

  if (requireCompany && !currentUser?.companyId && window.location.pathname !== "/setup") {
    return null;
  }

  return <>{children}</>;
};

export default RequireAuth;
