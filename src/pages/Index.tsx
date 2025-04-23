
import CheckTable from "@/components/checks/CheckTable";
import Layout from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChecks } from "@/context/CheckContext";
import { useProjects } from "@/context/ProjectContext";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatusCards from "@/components/dashboard/StatusCards";
import { useNavigate } from "react-router-dom";
import FileImport from "@/components/import/FileImport";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Upload } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const { checks, loading: checksLoading } = useChecks();
  const { currentProject, projects, loading: projectsLoading } = useProjects();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  
  // Wait for both projects and checks to be loaded
  useEffect(() => {
    if (!projectsLoading && !checksLoading) {
      setIsDataReady(true);
    }
  }, [projectsLoading, checksLoading]);

  // If projects are still loading, show loader
  if (projectsLoading) {
    return (
      <Layout>
        <div className="flex flex-col min-h-[60vh] items-center justify-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] mb-4" />
          <div className="text-gray-800 dark:text-gray-200 text-lg">Načítavam projekty...</div>
        </div>
      </Layout>
    );
  }

  // Filter podľa projektu až keď sú projekty načítané
  const filteredChecks = !currentProject 
    ? checks 
    : checks.filter(check => check.projectId === currentProject.id);

  const allChecks = filteredChecks;
  const upChecks = filteredChecks.filter((check) => check.status === "up");
  const downChecks = filteredChecks.filter((check) => check.status === "down");
  const lateChecks = filteredChecks.filter((check) => check.status === "grace");

  // Manuálny refresh dashboardu
  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulácia refreshu
    await new Promise(resolve => setTimeout(resolve, 800));
    setRefreshing(false);
    toast.success("Nástenka obnovená");
  };

  return (
    <Layout>
      <div className="space-y-6">
        <DashboardHeader 
          title="Nástenka"
          subtitle={`Monitorovanie systémových úloh${currentProject ? ` - ${currentProject.name}` : ' - Všetky projekty'}`}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onAddNew={() => navigate("/checks/new")}
          extraButtons={
            <Sheet open={showImport} onOpenChange={setShowImport}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Upload className="mr-2 h-4 w-4" />
                  Importovať
                </Button>
              </SheetTrigger>
              <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Hromadný import</SheetTitle>
                  <SheetDescription>
                    Importujte projekty alebo kontroly z JSON súborov
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <FileImport />
                </div>
              </SheetContent>
            </Sheet>
          }
        />

        {checksLoading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full mr-4 bg-gray-200 dark:bg-gray-700 animate-pulse" />
                  <div>
                    <div className="h-4 w-28 mb-2 bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <StatusCards 
            allChecksCount={allChecks.length}
            upChecksCount={upChecks.length}
            lateChecksCount={lateChecks.length}
            downChecksCount={downChecks.length}
          />
        )}

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="gap-1">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary/10">Všetky Kontroly</TabsTrigger>
            <TabsTrigger value="up" className="data-[state=active]:bg-healthy/10">Aktívne</TabsTrigger>
            <TabsTrigger value="grace" className="data-[state=active]:bg-warning/10">Meškajúce</TabsTrigger>
            <TabsTrigger value="down" className="data-[state=active]:bg-danger/10">V Poruche</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <CheckTable checks={allChecks} />
          </TabsContent>
          <TabsContent value="up">
            <CheckTable checks={upChecks} />
          </TabsContent>
          <TabsContent value="grace">
            <CheckTable checks={lateChecks} />
          </TabsContent>
          <TabsContent value="down">
            <CheckTable checks={downChecks} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Index;
