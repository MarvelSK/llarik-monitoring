
import CheckTable from "@/components/checks/CheckTable";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChecks } from "@/context/CheckContext";
import { useProjects } from "@/context/ProjectContext";
import { Activity, AlertCircle, Clock, PlusCircle, RefreshCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { toast } from "sonner";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatusCards from "@/components/dashboard/StatusCards";

const Index = () => {
  const { checks, loading } = useChecks();
  const { currentProject } = useProjects();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);

  // Filter checks by current project or show all if no project selected
  const filteredChecks = currentProject 
    ? checks.filter(check => check.projectId === currentProject.id)
    : checks; // If no project is selected, show all checks

  const allChecks = filteredChecks;
  const upChecks = filteredChecks.filter((check) => check.status === "up");
  const downChecks = filteredChecks.filter((check) => check.status === "down");
  const lateChecks = filteredChecks.filter((check) => check.status === "grace");

  // Function to handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh with a delay
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
        />

        {loading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center">
                  <Skeleton className="w-12 h-12 rounded-full mr-4" />
                  <div>
                    <Skeleton className="h-4 w-28 mb-2" />
                    <Skeleton className="h-8 w-16" />
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
