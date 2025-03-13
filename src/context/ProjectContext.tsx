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
  isAdmin: boolean;
  getAllProjects: () => Promise<Project[]>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjects must be used within a ProjectProvider");
  }
  return context;
};

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

const CURRENT_PROJECT_KEY = 'currentProjectId';

export const ProjectProvider = ({ children }: ProjectProviderProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id || null);
      
      if (session?.user?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single();
        
        if (!error && data) {
          setIsAdmin(data.is_admin);
        }
      }
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setCurrentUserId(session?.user?.id || null);
          
          if (session?.user?.id) {
            const { data, error } = await supabase
              .from('profiles')
              .select('is_admin')
              .eq('id', session.user.id)
              .single();
            
            if (!error && data) {
              setIsAdmin(data.is_admin);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setCurrentUserId(null);
          setIsAdmin(false);
        }
      });
      
      return () => {
        subscription.unsubscribe();
      };
    };
    
    initializeAuth();
  }, []);

  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true);
        
        if (!currentUserId) {
          setProjects([]);
          return;
        }
        
        let allProjects: any[] = [];
        
        if (isAdmin) {
          const { data: adminProjects, error: adminError } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });
            
          if (adminError) {
            console.error('Error fetching all projects for admin:', adminError);
            toast.error('Zlyhalo načítanie projektov');
            return;
          }
          
          allProjects = adminProjects || [];
        } else {
          const { data: ownedProjects, error: ownedError } = await supabase
            .from('projects')
            .select('*')
            .eq('owner_id', currentUserId)
            .order('created_at', { ascending: false });

          if (ownedError) {
            console.error('Error fetching owned projects:', ownedError);
            toast.error('Zlyhalo načítanie vlastných projektov');
            return;
          }
          
          const { data: memberProjects, error: memberError } = await supabase
            .from('project_members')
            .select(`
              project_id,
              projects:project_id (*)
            `)
            .eq('user_id', currentUserId);
            
          if (memberError) {
            console.error('Error fetching member projects:', memberError);
            toast.error('Zlyhalo načítanie zdieľaných projektov');
            return;
          }

          const sharedProjects = memberProjects?.map(item => item.projects) || [];
          allProjects = [...(ownedProjects || []), ...sharedProjects];
        }

        const projectsWithDates = allProjects.map(convertDatesToObjects);
        setProjects(projectsWithDates);
        
        const savedProjectId = localStorage.getItem(CURRENT_PROJECT_KEY);
        
        if (savedProjectId && projectsWithDates.some(p => p.id === savedProjectId)) {
          const savedProject = projectsWithDates.find(p => p.id === savedProjectId);
          if (savedProject) {
            setCurrentProject(savedProject);
          }
        } else if (projectsWithDates.length > 0 && !currentProject) {
          setCurrentProject(projectsWithDates[0]);
        }
      } catch (err) {
        console.error('Error in fetchProjects:', err);
        toast.error('Zlyhalo načítanie projektov');
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();

    const channel = supabase
      .channel('public:projects')
      .on('postgres_changes', {
        event: '*', 
        schema: 'public',
        table: 'projects'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newProject = convertDatesToObjects(payload.new);
          if (newProject.ownerId === currentUserId) {
            setProjects(prev => [newProject, ...prev]);
          }
        } else if (payload.eventType === 'UPDATE') {
          const updatedProject = convertDatesToObjects(payload.new);
          setProjects(prev => prev.map(project => 
            project.id === updatedProject.id ? updatedProject : project
          ));
          
          if (currentProject && currentProject.id === updatedProject.id) {
            setCurrentProject(updatedProject);
          }
        } else if (payload.eventType === 'DELETE') {
          setProjects(prev => prev.filter(project => project.id !== payload.old.id));
          
          if (currentProject && currentProject.id === payload.old.id) {
            setCurrentProject(projects.length > 0 ? projects[0] : null);
          }
        }
      })
      .subscribe();

    const membersChannel = supabase
      .channel('public:project_members')
      .on('postgres_changes', {
        event: '*', 
        schema: 'public',
        table: 'project_members'
      }, () => {
        fetchProjects();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(membersChannel);
    };
  }, [currentUserId, isAdmin]);

  const getProject = (id: string) => {
    return projects.find((project) => project.id === id);
  };

  const isProjectOwner = (projectId: string) => {
    if (isAdmin) return true;
    const project = getProject(projectId);
    return project?.ownerId === currentUserId;
  };

  const getProjectMembers = async (projectId: string): Promise<ProjectMember[]> => {
    try {
      console.log("Fetching project members for project:", projectId);
      
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select('id, project_id, user_id, permissions, created_at')
        .eq('project_id', projectId);
      
      if (membersError) {
        console.error('Error fetching project members:', membersError);
        throw membersError;
      }
      
      if (!membersData || membersData.length === 0) {
        console.log("No members found for project:", projectId);
        return [];
      }
      
      const memberPromises = membersData.map(async (member) => {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', member.user_id)
          .single();
        
        if (profileError) {
          console.error(`Error fetching profile for user ${member.user_id}:`, profileError);
          // Don't throw here, we'll still include the member with undefined user info
        }
        
        return {
          id: member.id,
          projectId: member.project_id,
          userId: member.user_id,
          permissions: member.permissions as 'read_only' | 'read_write',
          createdAt: new Date(member.created_at),
          user: profileData ? {
            name: profileData.name,
            email: profileData.email
          } : undefined
        };
      });
      
      return await Promise.all(memberPromises);
      
    } catch (error) {
      console.error('Error getting project members:', error);
      toast.error('Zlyhalo načítanie členov projektu');
      return [];
    }
  };

  const createProject = async (projectData: Partial<Project>) => {
    try {
      const now = new Date();
      
      if (!currentUserId) {
        throw new Error("Používateľ nie je autentifikovaný");
      }
      
      const newProjectData = {
        name: projectData.name || "Nový Projekt",
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
        toast.error('Zlyhalo vytvorenie projektu');
        throw error;
      }

      const newProject = convertDatesToObjects(data);
      toast.success('Projekt bol úspešne vytvorený');
      return newProject;
    } catch (error) {
      console.error('Error in createProject:', error);
      toast.error('Zlyhalo vytvorenie projektu');
      throw error;
    }
  };

  const updateProject = async (id: string, projectData: Partial<Project>) => {
    try {
      const projectIndex = projects.findIndex((c) => c.id === id);
      if (projectIndex === -1) return undefined;

      const project = projects[projectIndex];
      if (project.ownerId !== currentUserId && !isAdmin) {
        toast.error('Projekt môže upraviť iba vlastník alebo administrátor');
        return undefined;
      }

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
        toast.error('Zlyhala aktualizácia projektu');
        return undefined;
      }

      const updatedProject = {
        ...projects[projectIndex],
        ...projectData,
      };

      toast.success('Projekt bol úspešne aktualizovaný');
      return updatedProject;
    } catch (error) {
      console.error('Error in updateProject:', error);
      toast.error('Zlyhala aktualizácia projektu');
      return undefined;
    }
  };

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
      const project = getProject(id);
      if (!project || (project.ownerId !== currentUserId && !isAdmin)) {
        toast.error('Projekt môže vymazať iba vlastník alebo administrátor');
        return;
      }
      
      const hasChecks = await projectHasChecks(id);
      if (hasChecks) {
        toast.error('Nie je možné vymazať projekt s existujúcimi kontrolami. Najprv odstráňte všetky kontroly.');
        return;
      }

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting project:', error);
        toast.error('Zlyhalo vymazanie projektu');
        return;
      }

      if (currentProject && currentProject.id === id) {
        const remainingProjects = projects.filter(project => project.id !== id);
        setCurrentProject(remainingProjects.length > 0 ? remainingProjects[0] : null);
      }

      setProjects((prev) => prev.filter((project) => project.id !== id));
      toast.success('Projekt bol úspešne vymazaný');
    } catch (error) {
      console.error('Error in deleteProject:', error);
      toast.error('Zlyhalo vymazanie projektu');
    }
  };

  const handleSetCurrentProject = (projectId: string) => {
    if (projectId === "") {
      setCurrentProject(null);
      localStorage.removeItem(CURRENT_PROJECT_KEY);
    } else {
      const project = getProject(projectId);
      if (project) {
        setCurrentProject(project);
        localStorage.setItem(CURRENT_PROJECT_KEY, projectId);
      }
    }
  };

  const getAllProjects = async (): Promise<Project[]> => {
    if (isAdmin) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching all projects:', error);
          toast.error('Zlyhalo načítanie všetkých projektov');
          return [];
        }
        
        return (data || []).map(convertDatesToObjects);
      } catch (error) {
        console.error('Error in getAllProjects:', error);
        toast.error('Zlyhalo načítanie projektov');
        return [];
      }
    } else {
      return projects;
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
        isAdmin,
        getAllProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};
