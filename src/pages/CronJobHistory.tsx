
import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import { ArrowLeft, Calendar, Loader2 } from "lucide-react";
import { CronJob, CronJobExecution } from "@/types/cron";
import { fetchCronJob, fetchCronJobExecutions } from "@/services/CronJobService";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CronJobHistory = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<CronJob | null>(null);
  const [executions, setExecutions] = useState<CronJobExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingExecutions, setLoadingExecutions] = useState(true);

  useEffect(() => {
    if (!id) {
      toast.error("Chýba ID úlohy");
      navigate("/cron-jobs");
      return;
    }
    
    const loadJob = async () => {
      try {
        setLoading(true);
        const data = await fetchCronJob(id);
        setJob(data);
      } catch (error) {
        console.error("Error loading CRON job:", error);
        toast.error("Nepodarilo sa načítať CRON úlohu");
        navigate("/cron-jobs");
      } finally {
        setLoading(false);
      }
    };
    
    const loadExecutions = async () => {
      try {
        setLoadingExecutions(true);
        const data = await fetchCronJobExecutions(id);
        setExecutions(data);
      } catch (error) {
        console.error("Error loading executions:", error);
        toast.error("Nepodarilo sa načítať históriu spustení");
      } finally {
        setLoadingExecutions(false);
      }
    };
    
    loadJob();
    loadExecutions();
  }, [id, navigate]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-healthy text-white">Úspech</Badge>;
      case 'failed':
        return <Badge className="bg-destructive text-white">Zlyhanie</Badge>;
      case 'error':
        return <Badge className="bg-destructive text-white">Chyba</Badge>;
      case 'running':
        return <Badge className="bg-blue-500 text-white">Beží</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto py-6 flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p>Načítavam CRON úlohu...</p>
          </div>
        </div>
      </Layout>
    );
  }
  
  if (!job) return null;

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <Link 
            to={`/cron-jobs/${id}`} 
            className="flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Späť na detail
          </Link>
          <h1 className="text-3xl font-bold tracking-tight mt-2">História spustení</h1>
          <p className="text-muted-foreground">{job.name}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Detailná história spustení</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingExecutions ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : executions.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                <p>Žiadna história spustení</p>
                <p className="text-sm">Táto CRON úloha ešte nebola spustená</p>
              </div>
            ) : (
              <div className="space-y-6">
                {executions.map((execution) => (
                  <Card key={execution.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/20 py-3">
                      <div className="flex justify-between items-center">
                        <div className="font-medium">{new Date(execution.started_at).toLocaleString()}</div>
                        <div className="flex gap-2 items-center">
                          {getStatusBadge(execution.status)}
                          {execution.duration && (
                            <Badge variant="outline">
                              {(execution.duration / 1000).toFixed(2)}s
                            </Badge>
                          )}
                          {execution.status_code && (
                            <Badge variant={execution.status === 'success' ? 'outline' : 'destructive'}>
                              Kód {execution.status_code}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="py-4">
                      {execution.response && (
                        <div className="mb-4">
                          <h3 className="text-sm font-medium mb-2">Odpoveď</h3>
                          <div className="bg-muted p-3 rounded-md overflow-auto max-h-64">
                            <pre className="text-xs">{execution.response}</pre>
                          </div>
                        </div>
                      )}
                      {execution.error && (
                        <div>
                          <h3 className="text-sm font-medium text-destructive mb-2">Chyba</h3>
                          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-md overflow-auto max-h-64">
                            <pre className="text-xs">{execution.error}</pre>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CronJobHistory;
