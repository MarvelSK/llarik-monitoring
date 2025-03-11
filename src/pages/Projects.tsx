import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjects } from "@/context/ProjectContext";
import { Project, ProjectMember } from "@/types/project";
import { ArrowLeft, ArrowDown, ArrowUp, Building, Edit, Folder, PlusCircle, Search, Share2, Trash, User, UserPlus, ShieldAlert, Users, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ProjectMembers from "@/components/projects/ProjectMembers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Define sortable field types
type SortField = 'name' | 'description' | 'createdAt' | 'owner';
type SortDirection = 'asc' | 'desc';

const Projects = () => {
  const {
    projects,
    createProject,
    updateProject,
    deleteProject,
    loading,
    projectHasChecks,
    getProjectMembers,
    isProjectOwner,
    currentUserId,
    isAdmin,
    setCurrentProject
  } = useProjects();
  const navigate = useNavigate();
  const [newProject, setNewProject] = useState<Partial<Project>>({
    name: "",
    description: ""
  });
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [openNewDialog, setOpenNewDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("details");
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPermissions, setMemberPermissions] = useState<"read_only" | "read_write">("read_only");
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [projectForMember, setProjectForMember] = useState<Project | null>(null);
  const [openAddMemberDialog, setOpenAddMemberDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Sort projects based on current field and direction
  const sortedProjects = [...projects]
    .filter(project => 
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortField === 'name') {
        return sortDirection === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (sortField === 'description') {
        const descA = a.description || '';
        const descB = b.description || '';
        return sortDirection === 'asc'
          ? descA.localeCompare(descB)
          : descB.localeCompare(descA);
      } else if (sortField === 'createdAt') {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      return 0;
    });

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Create a sortable column header component
  const SortableHeader = ({ field, label }: { field: SortField, label: string }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/30" 
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center">
        {label}
        {getSortIcon(field)}
      </div>
    </TableHead>
  );

  const handleCreateProject = async () => {
    if (!newProject.name) {
      toast.error("Zadajte názov projektu");
      return;
    }
    await createProject(newProject);
    setNewProject({
      name: "",
      description: ""
    });
    setOpenNewDialog(false);
  };
  const handleUpdateProject = async () => {
    if (!editProject) return;
    if (!editProject.name) {
      toast.error("Zadajte názov projektu");
      return;
    }
    await updateProject(editProject.id, editProject);
    setEditProject(null);
    setOpenEditDialog(false);
  };
  const handleDeleteProject = async () => {
    if (!editProject) return;
    try {
      setIsDeleting(true);

      // Check if the project has checks before attempting to delete
      const hasChecks = await projectHasChecks(editProject.id);
      if (hasChecks) {
        toast.error('Nie je možné odstrániť projekt s existujúcimi kontrolami. Najprv odstráňte všetky kontroly.');
        setIsDeleting(false);
        setOpenDeleteDialog(false);
        return;
      }
      await deleteProject(editProject.id);
      setEditProject(null);
      setOpenDeleteDialog(false);
      setSelectedProject(null);
    } finally {
      setIsDeleting(false);
    }
  };
  const fetchProjectMembers = async (projectId: string) => {
    if (!projectId) return;
    setLoadingMembers(true);
    try {
      console.log("Fetching members for project:", projectId);
      const members = await getProjectMembers(projectId);
      console.log("Fetched members:", members);
      setProjectMembers(members);
    } catch (error) {
      console.error("Error fetching project members:", error);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Handle project selection and tab changes
  useEffect(() => {
    if (selectedProject && activeTab === "members") {
      fetchProjectMembers(selectedProject);
    }
  }, [selectedProject, activeTab]);
  const handleSelectProject = (project: Project) => {
    setSelectedProject(project.id);
    setActiveTab("details");
  };
  const openAddMemberDialogFor = (project: Project) => {
    setProjectForMember(project);
    setMemberEmail("");
    setMemberPermissions("read_only");
    setOpenAddMemberDialog(true);
    // Fetch members for display in the modal
    fetchProjectMembers(project.id);
  };
  const handleAddMember = async () => {
    if (!projectForMember) return;
    try {
      setIsSubmittingMember(true);
      if (!memberEmail.trim()) {
        toast.error("Zadajte emailovú adresu");
        return;
      }
      const {
        data,
        error
      } = await supabase.rpc('invite_user_to_project', {
        p_project_id: projectForMember.id,
        p_email: memberEmail.trim(),
        p_permissions: memberPermissions
      });
      if (error) throw error;
      toast.success("Používateľ bol úspešne pridaný do projektu");
      setMemberEmail("");
      setMemberPermissions("read_only");

      // Refresh members list
      fetchProjectMembers(projectForMember.id);
    } catch (error: any) {
      console.error("Error inviting user:", error);
      toast.error(error.message || "Nepodarilo sa pridať používateľa");
    } finally {
      setIsSubmittingMember(false);
    }
  };
  const handleRemoveMember = async (memberId: string) => {
    try {
      const {
        error
      } = await supabase.from('project_members').delete().eq('id', memberId);
      if (error) throw error;
      toast.success("Používateľ bol odstránený z projektu");

      // Refresh members list
      if (projectForMember) {
        fetchProjectMembers(projectForMember.id);
      }
      if (selectedProject) {
        fetchProjectMembers(selectedProject);
      }
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast.error(error.message || "Nepodarilo sa odstrániť používateľa");
    }
  };
  const navigateToProjectChecks = (project: Project) => {
    // Set the current project in context
    setCurrentProject(project.id);
    // Navigate to the index page
    navigate('/');
  };

  return <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Projekty 
                {isAdmin && <Badge variant="outline" className="ml-2 bg-yellow-50 border-yellow-300">
                    <ShieldAlert className="w-3 h-3 mr-1 text-yellow-600" />
                    <span className="text-yellow-800">Administrátor</span>
                  </Badge>}
              </h1>
              <p className="text-muted-foreground">
                Správa projektov pre kontroly
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={openNewDialog} onOpenChange={setOpenNewDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <PlusCircle className="w-4 h-4" />
                  Nový projekt
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Vytvoriť nový projekt</DialogTitle>
                  <DialogDescription>
                    Vytvorte nový projekt pre organizáciu vašich kontrol.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Názov projektu</Label>
                    <Input id="name" value={newProject.name} onChange={e => setNewProject({
                    ...newProject,
                    name: e.target.value
                  })} placeholder="Zadajte názov projektu" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Popis</Label>
                    <Textarea id="description" value={newProject.description || ''} onChange={e => setNewProject({
                    ...newProject,
                    description: e.target.value
                  })} placeholder="Zadajte popis projektu" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenNewDialog(false)}>Zrušiť</Button>
                  <Button onClick={handleCreateProject}>Vytvoriť</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search input */}
        {!loading && projects.length > 0 && 
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input 
              placeholder="Vyhľadať projekt..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="pl-9"
            />
          </div>
        }

        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border animate-pulse">
            <div className="h-12 bg-gray-100 dark:bg-gray-700 rounded-t-lg" />
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              ))}
            </div>
          </div>
        ) : sortedProjects.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium">
              {searchTerm ? "Nenašli sa žiadne projekty" : "Žiadne projekty"}
            </h3>
            <p className="mt-1 text-gray-500">
              {searchTerm ? "Skúste upraviť vyhľadávanie" : "Začnite vytvorením nového projektu."}
            </p>
            {!searchTerm && <div className="mt-6">
                <Button onClick={() => setOpenNewDialog(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nový projekt
                </Button>
              </div>}
          </div>
        ) : (
          // Main sortable table
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <ScrollArea className="h-[calc(100vh-240px)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader field="name" label="Názov" />
                    <SortableHeader field="description" label="Popis" />
                    <SortableHeader field="createdAt" label="Vytvorené" />
                    <TableHead className="w-[120px]">Vlastník</TableHead>
                    <TableHead className="text-right w-[160px]">Akcie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedProjects.map(project => (
                    <TableRow 
                      key={project.id} 
                      className={`${selectedProject === project.id ? 'bg-primary/5' : ''} hover:bg-muted/20`}
                      onClick={() => handleSelectProject(project)}
                    >
                      <TableCell className="font-medium">
                        {project.name}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {project.description || "—"}
                      </TableCell>
                      <TableCell>
                        {new Date(project.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {project.ownerId === currentUserId ? 
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
                              Vlastník
                            </Badge> : 
                            isAdmin ? 
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                                Admin
                              </Badge> : 
                              <Badge variant="outline" className="text-xs">
                                Člen
                              </Badge>
                          }
                        </div>
                      </TableCell>
                      <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => navigateToProjectChecks(project)} className="h-8">
                          Kontroly
                        </Button>
                        {(project.ownerId === currentUserId || isAdmin) && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => openAddMemberDialogFor(project)} 
                              className="h-8"
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                setEditProject(project);
                                setOpenEditDialog(true);
                              }} 
                              className="h-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-red-500 hover:text-red-600" 
                              onClick={() => {
                                setEditProject(project);
                                setOpenDeleteDialog(true);
                              }}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
        
        {/* Dialogs for project operations */}
        <Dialog open={openEditDialog} onOpenChange={val => {
          setOpenEditDialog(val);
          if (!val) setEditProject(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upraviť projekt</DialogTitle>
            </DialogHeader>
            {editProject && <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Názov projektu</Label>
                  <Input id="edit-name" value={editProject.name} onChange={e => setEditProject({
                ...editProject,
                name: e.target.value
              })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Popis</Label>
                  <Textarea id="edit-description" value={editProject.description || ''} onChange={e => setEditProject({
                ...editProject,
                description: e.target.value
              })} />
                </div>
              </div>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenEditDialog(false)}>Zrušiť</Button>
              <Button onClick={handleUpdateProject}>Uložiť</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Dialog open={openDeleteDialog} onOpenChange={val => {
          setOpenDeleteDialog(val);
          if (!val) setEditProject(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Odstrániť projekt</DialogTitle>
              <DialogDescription>
                Ste si istí, že chcete odstrániť tento projekt? Táto akcia sa nedá vrátiť.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenDeleteDialog(false)}>Zrušiť</Button>
              <Button variant="destructive" onClick={handleDeleteProject} disabled={isDeleting}>
                {isDeleting ? 'Odstraňujem...' : 'Odstrániť'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={openAddMemberDialog} onOpenChange={val => {
          setOpenAddMemberDialog(val);
          if (!val) setProjectForMember(null);
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Správa členov projektu</DialogTitle>
              <DialogDescription>
                Pridajte a spravujte používateľov v projekte {projectForMember?.name}
              </DialogDescription>
            </DialogHeader>
            
            {/* Current members list */}
            {projectMembers.length > 0 && <div className="border rounded-md p-3 mb-4">
                <h3 className="text-sm font-medium mb-2">Aktuálni členovia</h3>
                <ScrollArea className="h-[150px]">
                  <div className="space-y-2">
                    {projectMembers.map(member => <div key={member.id} className="flex items-center justify-between p-2 border rounded-md">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{member.user?.name || "Používateľ"}</p>
                            <p className="text-xs text-muted-foreground">{member.user?.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.permissions === 'read_only' ? <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              Len na čítanie
                            </Badge> : <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Na čítanie a úpravy
                            </Badge>}
                          
                          {(projectForMember && projectForMember.ownerId === currentUserId || isAdmin) && <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => handleRemoveMember(member.id)}>
                              <Trash className="h-4 w-4" />
                            </Button>}
                        </div>
                      </div>)}
                  </div>
                </ScrollArea>
              </div>}
            
            {/* Add new member form */}
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="member-email">Email používateľa</Label>
                <Input id="member-email" type="email" value={memberEmail} onChange={e => setMemberEmail(e.target.value)} placeholder="user@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-permissions">Oprávnenia</Label>
                <Select value={memberPermissions} onValueChange={value => setMemberPermissions(value as "read_only" | "read_write")}>
                  <SelectTrigger id="member-permissions">
                    <SelectValue placeholder="Vyberte oprávnenia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read_only">Len na čítanie</SelectItem>
                    <SelectItem value="read_write">Na čítanie a úpravy</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Len na čítanie - používateľ môže vidieť kontroly a ich stav<br />
                  Na čítanie a úpravy - používateľ môže pridávať, upravovať a mazať kontroly
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenAddMemberDialog(false)}>Zavrieť</Button>
              <Button onClick={handleAddMember} disabled={isSubmittingMember}>
                {isSubmittingMember ? 'Pridávam...' : 'Pridať člena'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>;
};

export default Projects;
