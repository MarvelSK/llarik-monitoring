
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

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check current session
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user || null;
        setUser(currentUser);
        
        if (currentUser) {
          // Use a direct query instead of the profiles RLS
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('id, name, email, company_id, is_admin')
            .eq('id', currentUser.id)
            .single();
          
          if (error) {
            console.error("Error fetching profile:", error);
          } else if (profile) {
            setCurrentUser({
              id: profile.id,
              name: profile.name,
              email: profile.email,
              companyId: profile.company_id,
              isAdmin: profile.is_admin
            });
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user || null);
        
        if (session?.user) {
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('id, name, email, company_id, is_admin')
              .eq('id', session.user.id)
              .single();
            
            if (error) {
              console.error("Error fetching profile on auth change:", error);
            } else if (profile) {
              setCurrentUser({
                id: profile.id,
                name: profile.name,
                email: profile.email,
                companyId: profile.company_id,
                isAdmin: profile.is_admin
              });
            }
          } catch (error) {
            console.error("Error on auth state change:", error);
          }
        } else {
          setCurrentUser(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setCurrentUser]);

  // Handle redirects based on auth state and requirements
  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/login");
      } else if (requireAdmin && !currentUser?.isAdmin) {
        navigate("/");
      } else if (requireCompany && !currentUser?.companyId && window.location.pathname !== "/setup") {
        navigate("/setup");
      }
    }
  }, [user, currentUser, navigate, requireAdmin, loading, requireCompany]);

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
