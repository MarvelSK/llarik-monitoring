
import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import { ArrowLeft, Loader2 } from "lucide-react";
import { CronJob } from "@/types/cron";
import { fetchCronJob } from "@/services/CronJobService";
import { toast } from "sonner";
import CronJobForm from "@/components/cron/CronJobForm";

const CronJobEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<CronJob | null>(null);
  const [loading, setLoading] = useState(true);

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
    
    loadJob();
  }, [id, navigate]);
  
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
            to="/cron-jobs" 
            className="flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Späť na zoznam
          </Link>
          <h1 className="text-3xl font-bold tracking-tight mt-2">Upraviť CRON úlohu</h1>
          <p className="text-muted-foreground">
            {job.name}
          </p>
        </div>
        
        <CronJobForm initialData={job} />
      </div>
    </Layout>
  );
};

export default CronJobEdit;
