
import CheckActions from "@/components/checks/CheckActions";
import CheckSummary from "@/components/checks/CheckSummary";
import PingsList from "@/components/checks/PingsList";
import Layout from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useChecks } from "@/context/CheckContext";
import { useCompanies } from "@/context/CompanyContext";
import { CheckPing, CheckEnvironment } from "@/types/check";
import { ArrowLeft, Pencil } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const CheckDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getCheck, pingCheck, deleteCheck, loading } = useChecks();
  const { getCompany } = useCompanies();

  const check = id ? getCheck(id) : undefined;
  const company = check?.companyId ? getCompany(check.companyId) : undefined;

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="icon" 
                disabled
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <div className="flex flex-wrap gap-1 mt-1">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              </div>
            </div>
            <div>
              <Skeleton className="h-10 w-36" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-3">
                  {Array(5).fill(0).map((_, i) => (
                    <div key={i} className="flex items-center">
                      <Skeleton className="h-5 w-5 rounded-full mr-3" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-1/4 mb-1" />
                        <Skeleton className="h-3 w-1/5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

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

  const getEnvironmentColor = (env: CheckEnvironment) => {
    switch(env) {
      case 'produkcia': return 'bg-amber-500 text-white';
      case 'test': return 'bg-rose-500 text-white';
      case 'manuál': return 'bg-slate-500 text-white';
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
                {company && (
                  <Badge className="bg-blue-500 text-white">
                    {company.name}
                  </Badge>
                )}
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
            <PingsList checkId={check.id} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CheckDetail;
