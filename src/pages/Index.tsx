
import CheckList from "@/components/checks/CheckList";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChecks } from "@/context/CheckContext";
import { Activity, AlertCircle, Clock } from "lucide-react";

const Index = () => {
  const { checks } = useChecks();

  const allChecks = checks;
  const upChecks = checks.filter((check) => check.status === "up");
  const downChecks = checks.filter((check) => check.status === "down");
  const lateChecks = checks.filter((check) => check.status === "grace");

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        </div>

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

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Checks</TabsTrigger>
            <TabsTrigger value="up">Up</TabsTrigger>
            <TabsTrigger value="grace">Running Late</TabsTrigger>
            <TabsTrigger value="down">Down</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <CheckList checks={allChecks} />
          </TabsContent>
          <TabsContent value="up">
            <CheckList checks={upChecks} />
          </TabsContent>
          <TabsContent value="grace">
            <CheckList checks={lateChecks} />
          </TabsContent>
          <TabsContent value="down">
            <CheckList checks={downChecks} />
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
