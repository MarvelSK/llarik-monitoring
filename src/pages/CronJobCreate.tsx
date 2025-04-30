
import Layout from "@/components/layout/Layout";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import CronJobForm from "@/components/cron/CronJobForm";

const CronJobCreate = () => {
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
          <h1 className="text-3xl font-bold tracking-tight mt-2">Nová CRON úloha</h1>
          <p className="text-muted-foreground">
            Vytvorte novú automatizovanú CRON úlohu, ktorá bude periodicky vykonávať HTTP požiadavky
          </p>
        </div>
        
        <CronJobForm />
      </div>
    </Layout>
  );
};

export default CronJobCreate;
