
import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Project, ProjectMember } from "@/types/project";
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
  getProjectMembers: (projectId: string) => Promise<ProjectMember[]>;
  isProjectOwner: (projectId: string) => boolean;
  currentUserId: string | null;
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
    ownerId: project.owner_id
  };
}

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider = ({ children }: ProjectProviderProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user's ID and set up auth listener
  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id || null);
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setCurrentUserId(session?.user?.id || null);
        } else if (event === 'SIGNED_OUT') {
          setCurrentUserId(null);
        }
      });
      
      return () => {
        subscription.unsubscribe();
      };
    };
    
    initializeAuth();
  }, []);

  // Load projects from Supabase
  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true);
        
        if (!currentUserId) {
          setProjects([]);
          return;
        }
        
        // Get projects the user owns
        const { data: ownedProjects, error: ownedError } = await supabase
          .from('projects')
          .select('*')
          .eq('owner_id', currentUserId)
          .order('created_at', { ascending: false });

        if (ownedError) {
          console.error('Error fetching owned projects:', ownedError);
          toast.error('Failed to load owned projects');
          return;
        }

        // Get projects shared with the user
        const { data: sharedProjects, error: sharedError } = await supabase
          .from('projects')
          .select('*')
          .not('owner_id', 'eq', currentUserId)
          .order('created_at', { ascending: false });

        if (sharedError) {
          console.error('Error fetching shared projects:', sharedError);
          toast.error('Failed to load shared projects');
          return;
        }

        const allProjects = [...(ownedProjects || []), ...(sharedProjects || [])];
        const projectsWithDates = allProjects.map(convertDatesToObjects);
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
          // Only add if the project is owned by the current user or shared with them
          if (newProject.ownerId === currentUserId) {
            setProjects(prev => [newProject, ...prev]);
          }
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

    // Also subscribe to project_members changes
    const membersChannel = supabase
      .channel('public:project_members')
      .on('postgres_changes', {
        event: '*', 
        schema: 'public',
        table: 'project_members'
      }, () => {
        // When members change, refresh projects to reflect new shares
        fetchProjects();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(membersChannel);
    };
  }, [currentUserId]);

  const getProject = (id: string) => {
    return projects.find((project) => project.id === id);
  };

  const isProjectOwner = (projectId: string) => {
    const project = getProject(projectId);
    return project?.ownerId === currentUserId;
  };

  const getProjectMembers = async (projectId: string): Promise<ProjectMember[]> => {
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          id,
          project_id,
          user_id,
          permissions,
          created_at,
          profiles:user_id(name, email)
        `)
        .eq('project_id', projectId);
      
      if (error) throw error;
      
      return (data || []).map((member: any) => ({
        id: member.id,
        projectId: member.project_id,
        userId: member.user_id,
        permissions: member.permissions,
        createdAt: new Date(member.created_at),
        user: member.profiles ? {
          name: member.profiles.name,
          email: member.profiles.email
        } : undefined
      }));
    } catch (error) {
      console.error('Error getting project members:', error);
      toast.error('Failed to load project members');
      return [];
    }
  };

  const createProject = async (projectData: Partial<Project>) => {
    try {
      const now = new Date();
      
      if (!currentUserId) {
        throw new Error("User not authenticated");
      }
      
      const newProjectData = {
        name: projectData.name || "Untitled Project",
        description: projectData.description,
        created_at: now.toISOString(),
        owner_id: currentUserId
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

      // Check if user is the owner
      const project = projects[projectIndex];
      if (project.ownerId !== currentUserId) {
        toast.error('Only the owner can update this project');
        return undefined;
      }

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
      // Check if user is the owner
      const project = getProject(id);
      if (!project || project.ownerId !== currentUserId) {
        toast.error('Only the owner can delete this project');
        return;
      }
      
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
        getProjectMembers,
        isProjectOwner,
        currentUserId,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};
