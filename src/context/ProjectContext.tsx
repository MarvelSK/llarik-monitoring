
import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Project } from "@/types/project";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  getProject: (id: string) => Project | undefined;
  createProject: (project: Partial<Project>) => Promise<Project>;
  updateProject: (id: string, project: Partial<Project>) => Promise<Project | undefined>;
  deleteProject: (id: string) => void;
  setCurrentProject: (projectId: string) => void;
  loading: boolean;
  projectHasChecks: (id: string) => Promise<boolean>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjects must be used within a ProjectProvider");
  }
  return context;
};

// Helper to convert Supabase date strings to Date objects
function convertDatesToObjects(project: any): Project {
  return {
    ...project,
    createdAt: new Date(project.created_at),
  };
}

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider = ({ children }: ProjectProviderProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // Load projects from Supabase
  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching projects:', error);
          toast.error('Failed to load projects');
          return;
        }

        const projectsWithDates = data.map(convertDatesToObjects);
        setProjects(projectsWithDates);
        
        // Set the first project as current if we have projects and no current project
        if (projectsWithDates.length > 0 && !currentProject) {
          setCurrentProject(projectsWithDates[0]);
        }
      } catch (err) {
        console.error('Error in fetchProjects:', err);
        toast.error('Failed to load projects');
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();

    // Set up real-time subscription to projects table for updates
    const channel = supabase
      .channel('public:projects')
      .on('postgres_changes', {
        event: '*', 
        schema: 'public',
        table: 'projects'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newProject = convertDatesToObjects(payload.new);
          setProjects(prev => [newProject, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          const updatedProject = convertDatesToObjects(payload.new);
          setProjects(prev => prev.map(project => 
            project.id === updatedProject.id ? updatedProject : project
          ));
          
          // Update currentProject if it was the one updated
          if (currentProject && currentProject.id === updatedProject.id) {
            setCurrentProject(updatedProject);
          }
        } else if (payload.eventType === 'DELETE') {
          setProjects(prev => prev.filter(project => project.id !== payload.old.id));
          
          // If current project was deleted, set to first available or null
          if (currentProject && currentProject.id === payload.old.id) {
            setCurrentProject(projects.length > 0 ? projects[0] : null);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getProject = (id: string) => {
    return projects.find((project) => project.id === id);
  };

  const createProject = async (projectData: Partial<Project>) => {
    try {
      const now = new Date();
      
      const newProjectData = {
        name: projectData.name || "Untitled Project",
        description: projectData.description,
        created_at: now.toISOString()
      };

      const { data, error } = await supabase
        .from('projects')
        .insert(newProjectData)
        .select('*')
        .single();

      if (error) {
        console.error('Error creating project:', error);
        toast.error('Failed to create project');
        throw error;
      }

      const newProject = convertDatesToObjects(data);
      toast.success('Project created successfully');
      return newProject;
    } catch (error) {
      console.error('Error in createProject:', error);
      toast.error('Failed to create project');
      throw error;
    }
  };

  const updateProject = async (id: string, projectData: Partial<Project>) => {
    try {
      const projectIndex = projects.findIndex((c) => c.id === id);
      if (projectIndex === -1) return undefined;

      // Prepare data for Supabase
      const dbProjectData = {
        name: projectData.name,
        description: projectData.description,
      };
      
      const { error } = await supabase
        .from('projects')
        .update(dbProjectData)
        .eq('id', id);

      if (error) {
        console.error('Error updating project:', error);
        toast.error('Failed to update project');
        return undefined;
      }

      const updatedProject = {
        ...projects[projectIndex],
        ...projectData,
      };

      toast.success('Project updated successfully');
      return updatedProject;
    } catch (error) {
      console.error('Error in updateProject:', error);
      toast.error('Failed to update project');
      return undefined;
    }
  };

  // Check if project has any related checks
  const projectHasChecks = async (id: string): Promise<boolean> => {
    try {
      const { data, error, count } = await supabase
        .from('checks')
        .select('id', { count: 'exact' })
        .eq('project_id', id)
        .limit(1);

      if (error) {
        console.error('Error checking if project has checks:', error);
        return false;
      }

      return count ? count > 0 : false;
    } catch (error) {
      console.error('Error in projectHasChecks:', error);
      return false;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      // Check if project has checks
      const hasChecks = await projectHasChecks(id);
      if (hasChecks) {
        toast.error('Cannot delete project with existing checks. Remove all checks first.');
        return;
      }

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting project:', error);
        toast.error('Failed to delete project');
        return;
      }

      // If we're deleting the current project, set another one as current
      if (currentProject && currentProject.id === id) {
        const remainingProjects = projects.filter(project => project.id !== id);
        setCurrentProject(remainingProjects.length > 0 ? remainingProjects[0] : null);
      }

      setProjects((prev) => prev.filter((project) => project.id !== id));
      toast.success('Project deleted successfully');
    } catch (error) {
      console.error('Error in deleteProject:', error);
      toast.error('Failed to delete project');
    }
  };

  const handleSetCurrentProject = (projectId: string) => {
    if (projectId === "") {
      setCurrentProject(null);
    } else {
      const project = getProject(projectId);
      if (project) {
        setCurrentProject(project);
      }
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProject,
        getProject,
        createProject,
        updateProject,
        deleteProject,
        setCurrentProject: handleSetCurrentProject,
        loading,
        projectHasChecks,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};
