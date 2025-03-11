
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

const Index = () => {
  const { checks, loading } = useChecks();
  const { currentProject } = useProjects();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);

  // Filter checks by current project
  const filteredChecks = currentProject 
    ? checks.filter(check => check.projectId === currentProject.id)
    : checks;

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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Nástenka</h1>
            <p className="text-muted-foreground">
              Monitorovanie systémových úloh
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              onClick={() => navigate("/checks/new")}
              className="gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Nová kontrola
            </Button>
          </div>
        </div>

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
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatusCard 
              title="Celkový počet" 
              count={allChecks.length} 
              icon={<Activity className="w-5 h-5" />}
              color="bg-primary"
            />
            <StatusCard 
              title="Aktívne"
              count={upChecks.length} 
              icon={<Activity className="w-5 h-5" />}
              color="bg-healthy"
            />
            <StatusCard 
              title="Meškajúce"
              count={lateChecks.length} 
              icon={<Clock className="w-5 h-5" />}
              color="bg-warning"
              pulseAnimation={lateChecks.length > 0}
            />
            <StatusCard 
              title="V Poruche"
              count={downChecks.length} 
              icon={<AlertCircle className="w-5 h-5" />}
              color="bg-danger"
              pulseAnimation={downChecks.length > 0}
            />
          </div>
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

interface StatusCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  pulseAnimation?: boolean;
}

const StatusCard = ({ title, count, icon, color, pulseAnimation = false }: StatusCardProps) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-center">
        <div className={`${color} p-3 rounded-full mr-4 text-white ${pulseAnimation ? 'animate-pulse' : ''}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold">{count}</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
