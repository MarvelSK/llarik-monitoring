import { MainNav } from "@/components/layout/MainNav"
import { ProjectSelector } from "@/components/layout/ProjectSelector"
import { SiteSwitcher } from "@/components/layout/SiteSwitcher"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"
import * as React from "react"
import { Link } from "react-router-dom"
import { Upload } from "lucide-react";

interface MobileNavProps extends React.HTMLAttributes<HTMLElement> {
  items?: any[]
}

export function MobileNav({ items, ...props }: MobileNavProps) {
  const { data: session } = useSession()

  return (
    <div className="md:hidden" {...props}>
      {/*{session ? (*/}
      {/*  <Sheet>*/}
      {/*    <SheetTrigger asChild>*/}
      {/*      <Button variant="ghost" size="sm" className="mr-2">*/}
      {/*        Menu*/}
      {/*      </Button>*/}
      {/*    </SheetTrigger>*/}
      {/*    <SheetContent side="left" className="pr-0">*/}
      {/*      <MainNav className="pl-4" />*/}
      {/*      <UserNav className="pl-4" />*/}
      {/*    </SheetContent>*/}
      {/*  </Sheet>*/}
      {/*) : null}*/}
    </div>
  )
}

const Header = () => {
  // const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  // const toggleMenu = () => {
  //   setIsMenuOpen(!isMenuOpen);
  // };

  return (
    <header className="supports-backdrop-blur:bg-background/60 sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-14 items-center">
        <MainNav />
        <div className="flex flex-1 items-center justify-end space-x-2">
          <nav className="flex items-center">
            <ProjectSelector />
            <Link 
              to="/import" 
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "mr-1"
              )}
              title="Import"
            >
              <Upload className="h-5 w-5" />
              <span className="sr-only">Import</span>
            </Link>
            <SiteSwitcher />
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
