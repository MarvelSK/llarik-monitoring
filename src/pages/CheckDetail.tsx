
import CheckActions from "@/components/checks/CheckActions";
import CheckSummary from "@/components/checks/CheckSummary";
import PingsList from "@/components/checks/PingsList";
import Layout from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useChecks } from "@/context/CheckContext";
import { CheckPing } from "@/types/check";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Pencil } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const CheckDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getCheck, pingCheck, deleteCheck } = useChecks();

  const check = getCheck(id!);

  if (!check) {
    return (
      <Layout>
        <div className="text-center py-10">
          <h2 className="text-2xl font-bold mb-2">Check not found</h2>
          <p className="text-gray-500 mb-6">The check you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  const getEnvironmentColor = (env: string) => {
    switch(env) {
      case 'prod': return 'bg-amber-500 text-white';
      case 'sandbox': return 'bg-rose-500 text-white';
      case 'worker': return 'bg-slate-500 text-white';
      case 'db-backups': return 'bg-blue-500 text-white';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  const handlePing = (status: CheckPing["status"]) => {
    pingCheck(check.id, status);
  };

  const handleDelete = () => {
    deleteCheck(check.id);
    navigate("/");
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {check.name}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => navigate(`/checks/${check.id}/edit`)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </h1>
              <div className="flex flex-wrap gap-1 mt-1">
                {check.environments?.map((env) => (
                  <Badge key={env} className={`${getEnvironmentColor(env)}`}>
                    {env}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          <CheckActions 
            check={check} 
            onPing={handlePing} 
            onDelete={handleDelete} 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <CheckSummary check={check} />
          </div>
          
          <div className="md:col-span-2">
            <PingsList pings={check.pings} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CheckDetail;
