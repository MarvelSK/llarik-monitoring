
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
      async (_event, currentSession) => {
        console.log("Auth state changed:", _event, currentSession?.user?.id);
        setSession(currentSession);
        
        if (currentSession) {
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', currentSession.user.id)
              .single();
              
            if (error) {
              console.error("Error fetching user profile:", error);
              setUser(null);
              setLoading(false);
              return;
            }
            
            // Ensure dates are properly converted
            if (data) {
              console.log("Profile data loaded:", data);
              setUser({
                id: data.id,
                name: data.name,
                email: data.email,
                company_id: data.company_id,
                is_admin: data.is_admin
              });
            } else {
              console.log("No profile data found for user");
              setUser(null);
            }
          } catch (err) {
            console.error("Error processing authentication:", err);
            setUser(null);
          }
        } else {
          console.log("No session, clearing user");
          setUser(null);
        }
        
        setLoading(false);
      }
    );

    // Initial session check
    const getInitialSession = async () => {
      try {
        setLoading(true);
        console.log("Getting initial session");
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        
        if (session) {
          console.log("Initial session found, fetching profile");
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
            console.log("Initial profile data loaded:", data);
            setUser({
              id: data.id,
              name: data.name,
              email: data.email,
              company_id: data.company_id,
              is_admin: data.is_admin
            });
          } else {
            console.log("No initial profile data found");
          }
        } else {
          console.log("No initial session found");
        }
      } catch (error) {
        console.error("Error checking initial session:", error);
      } finally {
        setLoading(false);
      }
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
