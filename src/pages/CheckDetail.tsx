
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Pencil } from "lucide-react";

// Components
import CheckActions from "@/components/checks/CheckActions";
import CheckSummary from "@/components/checks/CheckSummary";
import PingsList from "@/components/checks/PingsList";
import Layout from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Context and types
import { useChecks } from "@/context/CheckContext";
import { CheckPing } from "@/types/check";

const CheckDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getCheck, pingCheck, deleteCheck, loading } = useChecks();
  const [check, setCheck] = useState<ReturnType<typeof getCheck>>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(true);

  // Added defensive coding to prevent runtime errors
  useEffect(() => {
    console.log("CheckDetail: Initial loading");
    
    // Safety wrapper to catch any errors during check retrieval
    const fetchCheckData = () => {
      try {
        if (!id) {
          console.log("CheckDetail: Missing ID parameter");
          setError("Invalid check ID");
          setLocalLoading(false);
          return;
        }
        
        console.log(`CheckDetail: Fetching check data for ID: ${id}`);
        const checkData = getCheck(id);
        console.log("CheckDetail: Check data retrieved:", checkData);
        
        setCheck(checkData);
        
        if (!checkData && !loading) {
          console.log("CheckDetail: Check not found");
          setError("Check not found");
        } else {
          setError(null);
        }
        
        setLocalLoading(false);
      } catch (e) {
        console.error("Error fetching check:", e);
        setError("Failed to load check details");
        setLocalLoading(false);
      }
    };
    
    // Small delay to ensure CheckContext is ready
    const timer = setTimeout(fetchCheckData, 500);
    
    return () => clearTimeout(timer);
  }, [id, getCheck, loading]);

  // Improved loading state that combines global and local loading
  if (loading || localLoading) {
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

  // Unified error handler component
  if (error || !check) {
    return (
      <Layout>
        <div className="text-center py-10">
          <h2 className="text-2xl font-bold mb-2">Check not found</h2>
          <p className="text-gray-500 mb-6">
            {error || "The check you're looking for doesn't exist or has been removed."}
          </p>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  const getEnvironmentColor = (env: string) => {
    switch(env?.toLowerCase()) {
      case 'prod': return 'bg-amber-500 text-white';
      case 'produkcia': return 'bg-amber-500 text-white';
      case 'sandbox': return 'bg-rose-500 text-white';
      case 'worker': return 'bg-slate-500 text-white';
      case 'db-backups': return 'bg-blue-500 text-white';
      case 'test': return 'bg-green-500 text-white';
      case 'manuál': return 'bg-purple-500 text-white';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  const handlePing = async (status: CheckPing["status"]) => {
    if (!check) return;
    
    try {
      if (check.type === 'http_request') {
        toast.info('Executing HTTP request check...', {
          description: 'This will send an actual HTTP request to the configured endpoint.'
        });
      } else {
        toast.info('Recording standard ping...');
      }
      
      await pingCheck(check.id, status);
      toast.success('Check pinged successfully');
    } catch (error) {
      console.error("Error sending ping:", error);
      toast.error("Failed to process ping");
    }
  };

  const handleDelete = async () => {
    if (!check) return;
    
    try {
      await deleteCheck(check.id);
      toast.success('Check deleted successfully');
      navigate("/");
    } catch (error) {
      console.error("Error deleting check:", error);
      toast.error("Failed to delete check");
    }
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
                {check?.name || 'Loading...'}
                {check && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => navigate(`/checks/${check.id}/edit`)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </h1>
              <div className="flex flex-wrap gap-1 mt-1">
                {check?.type === 'http_request' && (
                  <Badge className="bg-blue-500 text-white">HTTP Request</Badge>
                )}
                {check?.environments?.map((env) => (
                  <Badge key={env} className={`${getEnvironmentColor(env)}`}>
                    {env}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          
          {check && (
            <CheckActions 
              check={check} 
              onPing={handlePing} 
              onDelete={handleDelete} 
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            {check ? <CheckSummary check={check} /> : <Skeleton className="h-64 w-full" />}
          </div>
          
          <div className="md:col-span-2">
            {check ? <PingsList checkId={check.id} /> : <Skeleton className="h-64 w-full" />}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CheckDetail;
