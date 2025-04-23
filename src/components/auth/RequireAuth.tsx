
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      
      if (session?.user) {
        // If requireAdmin, check if user is admin
        if (requireAdmin) {
          supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", session.user.id)
            .single()
            .then(({ data }) => {
              setIsAdmin(data?.is_admin || false);
              setLoading(false);
            });
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user || null;
      setUser(newUser);
      
      if (newUser && requireAdmin) {
        supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", newUser.id)
          .single()
          .then(({ data }) => {
            setIsAdmin(data?.is_admin || false);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [requireAdmin]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/login");
      } else if (requireAdmin && !isAdmin) {
        toast.error("Nemáte oprávnenie na prístup k tejto stránke");
        navigate("/");
      }
    }
  }, [user, isAdmin, navigate, loading, requireAdmin]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-blue-500"></div>
    </div>;
  }

  if (!user || (requireAdmin && !isAdmin)) {
    return null;
  }

  return <>{children}</>;
};

export default RequireAuth;
