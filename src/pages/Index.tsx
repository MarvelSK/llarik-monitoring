
import CheckTable from "@/components/checks/CheckTable";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChecks } from "@/context/CheckContext";
import { Activity, AlertCircle, Clock, PlusCircle, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const { checks, loading } = useChecks();
  const navigate = useNavigate();

  const allChecks = checks;
  const upChecks = checks.filter((check) => check.status === "up");
  const downChecks = checks.filter((check) => check.status === "down");
  const lateChecks = checks.filter((check) => check.status === "grace");

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor your scheduled tasks and cron jobs
            </p>
          </div>
          <Button 
            onClick={() => navigate("/checks/new")}
            className="gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            New Check
          </Button>
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
              title="Total Checks" 
              count={allChecks.length} 
              icon={<Activity className="w-5 h-5" />}
              color="bg-primary"
            />
            <StatusCard 
              title="Up" 
              count={upChecks.length} 
              icon={<Activity className="w-5 h-5" />}
              color="bg-healthy"
            />
            <StatusCard 
              title="Running Late" 
              count={lateChecks.length} 
              icon={<Clock className="w-5 h-5" />}
              color="bg-warning"
            />
            <StatusCard 
              title="Down" 
              count={downChecks.length} 
              icon={<AlertCircle className="w-5 h-5" />}
              color="bg-danger"
            />
          </div>
        )}

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Checks</TabsTrigger>
            <TabsTrigger value="up">Up</TabsTrigger>
            <TabsTrigger value="grace">Running Late</TabsTrigger>
            <TabsTrigger value="down">Down</TabsTrigger>
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
}

const StatusCard = ({ title, count, icon, color }: StatusCardProps) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center">
        <div className={`${color} p-3 rounded-full mr-4 text-white`}>
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
