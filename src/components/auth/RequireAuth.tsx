
import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";

interface RequireAuthProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

const RequireAuth = ({ children, requireAdmin = false }: RequireAuthProps) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminChecked, setAdminChecked] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);

  // Check for authentication and admin status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user || null;
        setUser(currentUser);
        
        if (currentUser) {
          // If requireAdmin is true, check if the user is an admin
          if (requireAdmin) {
            const { data, error } = await supabase
              .from("profiles")
              .select("is_admin")
              .eq("id", currentUser.id)
              .single();
            
            if (error) {
              console.error("Error checking admin status:", error);
              setIsAdmin(false);
            } else {
              setIsAdmin(data?.is_admin || false);
            }
            setAdminChecked(true);
          } else {
            setAdminChecked(true);
          }
        } else {
          setAdminChecked(true);
        }
        setAuthChecked(true);
      } catch (error) {
        console.error("Error in auth check:", error);
        setAuthChecked(true);
        setAdminChecked(true);
      }
    };

    checkAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const newUser = session?.user || null;
      setUser(newUser);
      
      if (newUser && requireAdmin) {
        const { data, error } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", newUser.id)
          .single();
        
        if (!error && data) {
          setIsAdmin(data.is_admin || false);
        } else {
          setIsAdmin(false);
        }
        setAdminChecked(true);
      } else {
        setAdminChecked(true);
      }
      setAuthChecked(true);
    });

    return () => subscription.unsubscribe();
  }, [requireAdmin]);

  // Handle navigation based on auth and admin status
  useEffect(() => {
    if (authChecked) {
      if (!user) {
        navigate("/login");
      } else if (requireAdmin && adminChecked && !isAdmin) {
        toast.error("Nemáte oprávnenie na prístup k tejto stránke");
        navigate("/");
      }
    }
  }, [user, isAdmin, navigate, authChecked, adminChecked, requireAdmin]);

  // Show loading indicator while checking authentication and admin status
  if (!authChecked || (requireAdmin && !adminChecked)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-blue-500"></div>
      </div>
    );
  }

  // Prevent rendering if not authenticated or not admin when required
  if (!user || (requireAdmin && !isAdmin)) {
    return null;
  }

  return <>{children}</>;
};

export default RequireAuth;
