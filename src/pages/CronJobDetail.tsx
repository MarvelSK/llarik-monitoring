
import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import { ArrowLeft, Calendar, CheckCircle, Clock, Edit, Loader2, PlayCircle, XCircle } from "lucide-react";
import { CronJob, CronJobExecution } from "@/types/cron";
import { deleteCronJob, fetchCronJob, fetchCronJobExecutions, triggerCronJob } from "@/services/CronJobService";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { explainCronExpression } from "@/utils/cronHelpers";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CronJobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<CronJob | null>(null);
  const [executions, setExecutions] = useState<CronJobExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingExecutions, setLoadingExecutions] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleRunJob = async () => {
    if (!id) return;
    
    try {
      toast.promise(
        triggerCronJob(id),
        {
          loading: 'Spúšťam CRON úlohu...',
          success: 'CRON úloha úspešne spustená',
          error: 'Chyba pri spustení CRON úlohy'
        }
      );
      
      // Refresh data after a delay
      setTimeout(async () => {
        const data = await fetchCronJob(id);
        setJob(data);
        const execData = await fetchCronJobExecutions(id);
        setExecutions(execData);
      }, 2000);
    } catch (error) {
      console.error("Error triggering job:", error);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      setDeleting(true);
      await deleteCronJob(id);
      toast.success("CRON úloha bola úspešne odstránená");
      navigate("/cron-jobs");
    } catch (error) {
      console.error("Error deleting job:", error);
      toast.error("Chyba pri odstraňovaní CRON úlohy");
      setDeleting(false);
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

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <Link 
            to="/cron-jobs" 
            className="flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Späť na zoznam
          </Link>
          <div className="flex justify-between items-center mt-2">
            <h1 className="text-3xl font-bold tracking-tight">{job.name}</h1>
            <div className="flex gap-2">
              <Button onClick={handleRunJob}>
                <PlayCircle className="mr-2 h-4 w-4" />
                Spustiť teraz
              </Button>
              <Button variant="outline" onClick={() => navigate(`/cron-jobs/${id}/edit`)}>
                <Edit className="mr-2 h-4 w-4" />
                Upraviť
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => setDeleteDialogOpen(true)}
              >
                Odstrániť
              </Button>
            </div>
          </div>
          {job.description && (
            <p className="text-muted-foreground mt-1">{job.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Základné informácie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="mt-1">
                    {job.last_status ? getStatusBadge(job.last_status) : <Badge variant="outline">Nová</Badge>}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Aktivovaná</p>
                  <div className="mt-1">
                    {job.enabled ? (
                      <Badge variant="outline" className="bg-healthy/10 text-healthy border-healthy">
                        Áno
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive">
                        Nie
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Harmonogram</p>
                <div className="mt-1 flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <p>{job.schedule} ({explainCronExpression(job.schedule)})</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Posledné spustenie</p>
                  <p className="mt-1">{job.last_run ? new Date(job.last_run).toLocaleString() : 'Nikdy'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Trvanie</p>
                  <p className="mt-1">{job.last_duration ? `${(job.last_duration / 1000).toFixed(2)}s` : '-'}</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vytvorené</p>
                <p className="mt-1">{new Date(job.created_at).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>HTTP Konfigurácia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Endpoint</p>
                <div className="mt-1 bg-muted p-2 rounded-md font-mono text-sm break-all">
                  <div className="flex items-center">
                    <Badge className="mr-2 bg-blue-600">{job.method}</Badge>
                    {job.endpoint}
                  </div>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Úspešné kódy odpovede</p>
                <div className="mt-1 flex gap-1 flex-wrap">
                  {job.success_codes.map((code) => (
                    <Badge key={code} variant="outline">{code}</Badge>
                  ))}
                </div>
              </div>
              
              {job.body && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Telo požiadavky</p>
                    <div className="mt-1 bg-muted p-2 rounded-md font-mono text-sm overflow-auto max-h-36">
                      <pre>{job.body}</pre>
                    </div>
                  </div>
                </>
              )}
              
              {job.headers && Object.keys(job.headers).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Hlavičky</p>
                    <div className="mt-1 bg-muted p-2 rounded-md font-mono text-sm overflow-auto max-h-36">
                      <pre>{JSON.stringify(job.headers, null, 2)}</pre>
                    </div>
                  </div>
                </>
              )}
              
              {job.parameters && Object.keys(job.parameters).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Parametre</p>
                    <div className="mt-1 bg-muted p-2 rounded-md font-mono text-sm overflow-auto max-h-36">
                      <pre>{JSON.stringify(job.parameters, null, 2)}</pre>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>História spustení</CardTitle>
            <CardDescription>Záznam posledných spustení CRON úlohy</CardDescription>
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
              <div className="border rounded-md">
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="h-10 px-4 text-left font-medium">Čas spustenia</th>
                        <th className="h-10 px-4 text-left font-medium">Status</th>
                        <th className="h-10 px-4 text-left font-medium">Kód</th>
                        <th className="h-10 px-4 text-right font-medium">Trvanie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {executions.map((execution) => (
                        <tr key={execution.id} className="border-b">
                          <td className="p-4">{new Date(execution.started_at).toLocaleString()}</td>
                          <td className="p-4">
                            {getStatusBadge(execution.status)}
                          </td>
                          <td className="p-4">{execution.status_code || '-'}</td>
                          <td className="p-4 text-right">
                            {execution.duration ? `${(execution.duration / 1000).toFixed(2)}s` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Naozaj chcete odstrániť túto CRON úlohu?</AlertDialogTitle>
              <AlertDialogDescription>
                Akcia je nevratná. CRON úloha bude natrvalo odstránená zo systému.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Zrušiť</AlertDialogCancel>
              <AlertDialogAction 
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Odstraňujem..." : "Odstrániť"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default CronJobDetail;
