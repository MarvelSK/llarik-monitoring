
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useProjects } from "@/context/ProjectContext";
import { Building, ChevronDown, FolderKanban, LogOut, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();
  const {
    currentProject,
    projects,
    setCurrentProject
  } = useProjects();
  
  const handleLogout = () => {
    // For now, just navigate to login
    navigate("/login");
  };
  
  return <header className="bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800">
      <div className="container flex items-center justify-between h-16 px-4 mx-auto sm:px-6 lg:px-8">
        <div className="flex items-center">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-healthy rounded-md flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="font-bold text-xl text-gray-900 dark:text-white">LLarik Monitoring</span>
          </Link>

          {projects.length > 0 && <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="ml-4 gap-1">
                  <Building className="w-4 h-4 mr-1" />
                  {currentProject ? currentProject.name : "Všetky Projekty"}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setCurrentProject("")}>
                  Všetky Projekty
                </DropdownMenuItem>
                {projects.map(project => <DropdownMenuItem key={project.id} onClick={() => setCurrentProject(project.id)}>
                    {project.name}
                  </DropdownMenuItem>)}
                <DropdownMenuItem asChild>
                  <Link to="/projects" className="w-full">
                    <FolderKanban className="w-4 h-4 mr-2" />
                    Správa Projektov
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>}
        </div>
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="ml-2">
                <User className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Odhlásiť sa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>;
};

export default Header;
