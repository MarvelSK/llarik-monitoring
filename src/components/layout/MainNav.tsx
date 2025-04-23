
import * as React from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Settings } from "lucide-react";

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();

        setIsAdmin(profile?.is_admin || false);
      } catch (error) {
        console.error("Error checking admin status:", error);
      }
    };

    checkAdminStatus();
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
