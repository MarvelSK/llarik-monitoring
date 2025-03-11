
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjects } from "@/context/ProjectContext";
import { Project, ProjectMember } from "@/types/project";
import { ArrowLeft, Building, Edit, Folder, PlusCircle, Share2, Trash, User } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import ProjectMembers from "@/components/projects/ProjectMembers";

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
    currentUserId
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

  const handleCreateProject = async () => {
    await createProject(newProject);
    setNewProject({ name: "", description: "" });
    setOpenNewDialog(false);
  };

  const handleUpdateProject = async () => {
    if (!editProject) return;
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
        toast.error('Cannot delete project with existing checks. Remove all checks first.');
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
    setLoadingMembers(true);
    try {
      const members = await getProjectMembers(projectId);
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Projekty</h1>
              <p className="text-muted-foreground">
                Správa projektov pre kontroly
              </p>
            </div>
          </div>
          
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
                  <Input 
                    id="name" 
                    value={newProject.name} 
                    onChange={e => setNewProject({...newProject, name: e.target.value})}
                    placeholder="Zadajte názov projektu" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Popis</Label>
                  <Textarea 
                    id="description" 
                    value={newProject.description || ''} 
                    onChange={e => setNewProject({...newProject, description: e.target.value})}
                    placeholder="Zadajte popis projektu" 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenNewDialog(false)}>Zrušiť</Button>
                <Button onClick={handleCreateProject}>Vytvoriť</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-24 bg-gray-100 dark:bg-gray-800" />
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium">Žiadne projekty</h3>
            <p className="mt-1 text-gray-500">Začnite vytvorením nového projektu.</p>
            <div className="mt-6">
              <Button onClick={() => setOpenNewDialog(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nový projekt
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                {projects.map(project => (
                  <Card 
                    key={project.id} 
                    className={`overflow-hidden cursor-pointer ${selectedProject === project.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => handleSelectProject(project)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center">
                            {project.name}
                            {project.ownerId === currentUserId && (
                              <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                Vlastník
                              </span>
                            )}
                          </CardTitle>
                          <CardDescription>
                            {new Date(project.createdAt).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        {project.ownerId === currentUserId && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {
                            e.stopPropagation();
                            setEditProject(project);
                            setOpenEditDialog(true);
                          }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 dark:text-gray-300 line-clamp-2">
                        {project.description || "Žiadny popis"}
                      </p>
                    </CardContent>
                    <CardFooter className="justify-between border-t pt-3">
                      <Button 
                        variant="outline" 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/`);
                        }}
                      >
                        Zobraziť kontroly
                      </Button>
                      <div className="flex gap-2">
                        {project.ownerId === currentUserId && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditProject(project);
                              setOpenDeleteDialog(true);
                            }}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
            
            {selectedProject && (
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {projects.find(p => p.id === selectedProject)?.name || "Projekt"}
                    </CardTitle>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList>
                        <TabsTrigger value="details">
                          <Building className="w-4 h-4 mr-2" />
                          Detaily
                        </TabsTrigger>
                        <TabsTrigger value="members">
                          <User className="w-4 h-4 mr-2" />
                          Členovia
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </CardHeader>
                  <CardContent>
                    <TabsContent value="details" className="space-y-4 mt-0">
                      <div>
                        <h3 className="text-sm font-medium">Popis</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {projects.find(p => p.id === selectedProject)?.description || "Žiadny popis"}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">Vytvorené</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {projects.find(p => p.id === selectedProject)?.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">Vlastník</h3>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          {projects.find(p => p.id === selectedProject)?.ownerId === currentUserId 
                            ? "Vy" 
                            : "Iný používateľ"}
                        </p>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="members" className="mt-0">
                      <ProjectMembers 
                        projectId={selectedProject}
                        isOwner={isProjectOwner(selectedProject)}
                        members={projectMembers}
                        onMembersChange={() => fetchProjectMembers(selectedProject)}
                      />
                    </TabsContent>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={openEditDialog} onOpenChange={(val) => {
        setOpenEditDialog(val);
        if (!val) setEditProject(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upraviť projekt</DialogTitle>
          </DialogHeader>
          {editProject && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Názov projektu</Label>
                <Input 
                  id="edit-name" 
                  value={editProject.name} 
                  onChange={e => setEditProject({...editProject, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Popis</Label>
                <Textarea 
                  id="edit-description" 
                  value={editProject.description || ''} 
                  onChange={e => setEditProject({...editProject, description: e.target.value})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEditDialog(false)}>Zrušiť</Button>
            <Button onClick={handleUpdateProject}>Uložiť</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={openDeleteDialog} onOpenChange={(val) => {
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
    </Layout>
  );
};

export default Projects;
