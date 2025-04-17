
import * as React from "react";
import { Link } from "react-router-dom";
export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
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
        <Link to="/import" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
          Import
        </Link>
      </nav>
    </nav>;
}
