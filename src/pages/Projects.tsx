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
import { useProjects } from "@/context/ProjectContext";
import { Project } from "@/types/project";
import { ArrowLeft, Edit, Folder, PlusCircle, Trash } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Projects = () => {
  const { projects, createProject, updateProject, deleteProject, loading, projectHasChecks } = useProjects();
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
    } finally {
      setIsDeleting(false);
    }
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
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {projects.map(project => (
              <Card key={project.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle>{project.name}</CardTitle>
                  <CardDescription>
                    {new Date(project.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 line-clamp-2">
                    {project.description || "Žiadny popis"}
                  </p>
                </CardContent>
                <CardFooter className="justify-between border-t pt-3">
                  <Button variant="outline" onClick={() => navigate(`/`)}>
                    Zobraziť kontroly
                  </Button>
                  <div className="flex gap-2">
                    <Dialog open={openEditDialog && editProject?.id === project.id} onOpenChange={val => {
                      setOpenEditDialog(val);
                      if (!val) setEditProject(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setEditProject(project)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
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
                    
                    <Dialog open={openDeleteDialog && editProject?.id === project.id} onOpenChange={val => {
                      setOpenDeleteDialog(val);
                      if (!val) setEditProject(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setEditProject(project)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
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
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Projects;
