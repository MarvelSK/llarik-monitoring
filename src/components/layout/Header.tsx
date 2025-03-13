import { MainNav } from "@/components/layout/MainNav";
import { ProjectSelector } from "@/components/layout/ProjectSelector";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import * as React from "react";
import { Link } from "react-router-dom";
import { Upload } from "lucide-react";
interface MobileNavProps extends React.HTMLAttributes<HTMLElement> {
  items?: any[];
}
export function MobileNav({
  items,
  ...props
}: MobileNavProps) {
  // Removed useSession since we don't have next-auth

  return <div className="md:hidden" {...props}>
      {/* Mobile navigation content can be added here */}
    </div>;
}
const Header = () => {
  return <header className="supports-backdrop-blur:bg-background/60 sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-14 items-center">
        <MainNav />
        <div className="flex flex-1 items-center justify-end space-x-2">
          <nav className="flex items-center">
            <ProjectSelector />
            
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>;
};
export default Header;