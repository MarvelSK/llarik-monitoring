
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/layout/Layout";
import { useChecks } from "@/context/CheckContext";
import { CheckStatus } from "@/types/check";
import { Clock, Globe, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { explainCronExpression } from "@/utils/cronHelpers";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const getStatusColor = (status: CheckStatus) => {
  switch (status) {
    case "up":
      return "bg-healthy text-white";
    case "down":
      return "bg-destructive text-white";
    case "grace":
      return "bg-amber-500 text-white";
    case "new":
      return "bg-muted";
    default:
      return "bg-muted";
  }
};

const CronJobs = () => {
  const { checks, loading } = useChecks();
  const navigate = useNavigate();
  const [lastRunTime, setLastRunTime] = useState<string | null>(null);

  // Filter checks that have CRON expressions or HTTP configuration
  const cronJobs = checks.filter(
    (check) => check.cronExpression || check.httpConfig
  );

  useEffect(() => {
    const fetchLastRunTime = async () => {
      try {
        const { data, error } = await supabase
          .from('edge_function_logs')
          .select('timestamp')
          .eq('function_name', 'cron-request')
          .order('timestamp', { ascending: false })
          .limit(1);
          
        if (!error && data && data.length > 0) {
          const timestamp = new Date(data[0].timestamp);
          setLastRunTime(timestamp.toLocaleString());
        }
      } catch (error) {
        console.error('Error fetching last run time:', error);
      }
    };
    
    fetchLastRunTime();
    
    // Set up polling to check for updates
    const interval = setInterval(fetchLastRunTime, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">CRON Kontroly</h1>
            <p className="text-muted-foreground mt-2">
              Spravujte automatizované kontroly s CRON harmonogramami a HTTP dotazmi
            </p>
            {lastRunTime && (
              <p className="text-sm text-muted-foreground mt-1">
                Posledné spustenie: {lastRunTime}
              </p>
            )}
          </div>
          <Button
            onClick={() => navigate("/checks/new")}
            className="bg-healthy hover:bg-opacity-90 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nová CRON kontrola
          </Button>
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
          ) : cronJobs.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-6">
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Žiadne CRON kontroly</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Zatiaľ nie sú nakonfigurované žiadne CRON alebo HTTP kontroly.
                  </p>
                  <Button
                    onClick={() => navigate("/checks/new")}
                    className="mt-4 bg-healthy hover:bg-opacity-90 text-white"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Vytvoriť prvú kontrolu
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            cronJobs.map((job) => (
              <Card key={job.id} className="overflow-hidden">
                <CardHeader className="bg-muted/20 pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{job.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {job.description || "Bez popisu"}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(job.status)}>
                      {job.status === "up"
                        ? "Aktívny"
                        : job.status === "down"
                        ? "Zlyhanie"
                        : job.status === "grace"
                        ? "Odklad"
                        : "Nový"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Harmonogram</h4>
                        <p className="text-sm font-medium flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                          {job.cronExpression
                            ? `${job.cronExpression} (${explainCronExpression(job.cronExpression)})`
                            : `Každých ${job.period} minút`}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Doba odkladu</h4>
                        <p className="text-sm">{job.grace} minút</p>
                      </div>
                    </div>

                    {job.httpConfig && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-2">HTTP Konfigurácia</h4>
                          <div className="bg-muted p-3 rounded-md text-sm font-mono overflow-x-auto">
                            <div className="flex items-center">
                              <Badge className="mr-2 bg-blue-600">{job.httpConfig.method}</Badge>
                              <span className="truncate">{job.httpConfig.url}</span>
                            </div>
                            {job.lastDuration && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                Posledná doba spracovania: {job.lastDuration.toFixed(2)}s
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/checks/${job.id}`)}
                      >
                        Detaily
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/checks/${job.id}/edit`)}
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
