
import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@/types/company";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { toast } from "sonner";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        
        if (session) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (error) {
            console.error("Error fetching user profile:", error);
            setLoading(false);
            return;
          }
          
          // Ensure dates are properly converted
          if (data) {
            setUser({
              id: data.id,
              name: data.name,
              email: data.email,
              company_id: data.company_id,
              is_admin: data.is_admin
            });
            
            // Navigate to home page if not already there
            if (window.location.pathname === '/login') {
              navigate('/');
            }
          }
        } else {
          setUser(null);
          
          // If not authenticated and not on login page, redirect to login
          if (window.location.pathname !== '/login') {
            navigate('/login');
          }
        }
        
        setLoading(false);
      }
    );

    // Initial session check
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (error) {
          console.error("Error fetching user profile:", error);
          setLoading(false);
          return;
        }
        
        if (data) {
          setUser({
            id: data.id,
            name: data.name,
            email: data.email,
            company_id: data.company_id,
            is_admin: data.is_admin
          });
          
          // Navigate to home page if on login page
          if (window.location.pathname === '/login') {
            navigate('/');
          }
        }
      } else {
        // If not authenticated and not on login page, redirect to login
        if (window.location.pathname !== '/login' && 
            !window.location.pathname.startsWith('/ping/')) {
          navigate('/login');
        }
      }
      
      setLoading(false);
    };

    getInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        throw error;
      }

      toast.success("Successfully signed in!");
      navigate('/');
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(error.message);
        throw error;
      }
      
      navigate("/login");
      toast.success("Successfully signed out");
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        signIn,
        signOut,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
