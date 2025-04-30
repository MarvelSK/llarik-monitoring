
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/layout/Layout";
import { AlertCircle, Clock, Plus, PlayCircle, RotateCw, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import { CronJob, EdgeFunctionLog } from "@/types/cron";
import { fetchCronJobs, fetchLatestEdgeFunctionLog, triggerCronJob } from "@/services/CronJobService";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { explainCronExpression } from "@/utils/cronHelpers";

const CronJobs = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastRunTime, setLastRunTime] = useState<string | null>(null);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const data = await fetchCronJobs();
      setJobs(data);
    } catch (error) {
      console.error('Error fetching CRON jobs:', error);
      toast.error('Chyba pri načítaní CRON úloh');
    } finally {
      setLoading(false);
    }
  };

  const loadLastRunTime = async () => {
    try {
      const log = await fetchLatestEdgeFunctionLog();
      if (log) {
        setLastRunTime(log.timestamp.toLocaleString());
      }
    } catch (error) {
      console.error('Error fetching last run time:', error);
    }
  };
  
  useEffect(() => {
    loadJobs();
    loadLastRunTime();
    
    // Poll for updates every minute
    const interval = setInterval(() => {
      loadJobs();
      loadLastRunTime();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadJobs();
    await loadLastRunTime();
    setRefreshing(false);
    toast.success('CRON úlohy obnovené');
  };

  const handleRunJob = async (jobId: string) => {
    try {
      toast.promise(
        triggerCronJob(jobId),
        {
          loading: 'Spúšťam CRON úlohu...',
          success: 'CRON úloha úspešne spustená',
          error: 'Chyba pri spustení CRON úlohy'
        }
      );
      // Refresh job list after a short delay
      setTimeout(loadJobs, 2000);
    } catch (error) {
      console.error('Error triggering CRON job:', error);
    }
  };

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return <Badge variant="outline">Nová</Badge>;
    
    switch (status) {
      case 'success':
        return <Badge className="bg-healthy text-white">Úspech</Badge>;
      case 'failed':
        return <Badge className="bg-destructive text-white">Zlyhanie</Badge>;
      case 'error':
        return <Badge className="bg-destructive text-white">Chyba</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">CRON Úlohy</h1>
            <p className="text-muted-foreground mt-2">
              Spravujte automatizované HTTP úlohy s CRON harmonogramom
            </p>
            {lastRunTime && (
              <p className="text-sm text-muted-foreground mt-1">
                Posledný beh plánovača: {lastRunTime}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RotateCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Obnoviť
            </Button>
            <Button
              onClick={() => navigate("/cron-jobs/new")}
              className="bg-healthy hover:bg-opacity-90 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nová CRON úloha
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          {loading ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              </CardContent>
            </Card>
          ) : jobs.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-6">
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Žiadne CRON úlohy</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Zatiaľ nie sú nakonfigurované žiadne CRON úlohy.
                  </p>
                  <Button
                    onClick={() => navigate("/cron-jobs/new")}
                    className="mt-4 bg-healthy hover:bg-opacity-90 text-white"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Vytvoriť prvú CRON úlohu
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            jobs.map((job) => (
              <Card key={job.id} className="overflow-hidden">
                <CardHeader className="bg-muted/20 pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        {job.name}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Switch 
                                checked={job.enabled} 
                                className="ml-2" 
                                aria-label={job.enabled ? "Zakázať" : "Povoliť"} 
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              {job.enabled ? "Aktívna" : "Neaktívna"}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {job.description || "Bez popisu"}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {job.last_status && getStatusBadge(job.last_status)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRunJob(job.id)}
                        title="Spustiť teraz"
                      >
                        <PlayCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Harmonogram</h4>
                        <p className="text-sm font-medium flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                          {`${job.schedule} (${explainCronExpression(job.schedule)})`}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Posledné spustenie</h4>
                        <p className="text-sm">
                          {job.last_run ? new Date(job.last_run).toLocaleString() : 'Nikdy'}
                          {job.last_duration && ` (${(job.last_duration / 1000).toFixed(2)}s)`}
                        </p>
                      </div>
                    </div>

                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">HTTP Konfigurácia</h4>
                      <div className="bg-muted p-3 rounded-md text-sm font-mono overflow-x-auto">
                        <div className="flex items-center">
                          <Badge className="mr-2 bg-blue-600">{job.method}</Badge>
                          <span className="truncate">{job.endpoint}</span>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Úspešné kódy: {job.success_codes.join(', ')}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/cron-jobs/${job.id}/history`)}
                      >
                        História
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/cron-jobs/${job.id}`)}
                      >
                        Detaily
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/cron-jobs/${job.id}/edit`)}
                      >
                        Upraviť
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CronJobs;
