
import * as React from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Clock, Settings, Globe } from "lucide-react";

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          setLoading(false);
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", session.user.id)
          .single();

        if (!error) {
          setIsAdmin(profile?.is_admin || false);
        } else {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setLoading(false);
      }
    };

    checkAdminStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkAdminStatus();
      } else if (event === 'SIGNED_OUT') {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return <nav className={className} {...props}>
      <Link to="/" className="mr-6 flex items-center space-x-2">
        <span className="hidden font-bold sm:inline-block">
          LLarik Monitoring
        </span>
      </Link>
      <nav className="flex items-center space-x-4 lg:space-x-6">
        <Link to="/" className="text-sm font-medium transition-colors hover:text-primary">
          Dashboard
        </Link>
        <Link to="/cron-jobs" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary flex items-center">
          <Clock className="h-4 w-4 mr-1" />
          <span>CRON Úlohy</span>
        </Link>
        <Link to="/projects" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
          Projekty
        </Link>
        <Link to="/notes" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
          Poznámky
        </Link>
        {isAdmin && (
          <Link 
            to="/admin/settings" 
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary flex items-center"
            title="Administrátorské nastavenia"
          >
            <Settings className="h-4 w-4 mr-1" />
            <span>Admin</span>
          </Link>
        )}
      </nav>
    </nav>;
}
