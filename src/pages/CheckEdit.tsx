
import CheckForm from "@/components/checks/CheckForm";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useChecks } from "@/context/CheckContext";
import { Check } from "@/types/check";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

const CheckEdit = () => {
  const { id } = useParams<{ id: string }>();
  const { getCheck, updateCheck } = useChecks();
  const navigate = useNavigate();

  const check = getCheck(id!);

  if (!check) {
    return (
      <Layout>
        <div className="text-center py-10">
          <h2 className="text-2xl font-bold mb-2">Kontrola nebola nájdená</h2>
          <p className="text-gray-500 mb-6">Kontrola, ktorú hľadáte, neexistuje alebo bola odstránená.</p>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Späť na nástenku
          </Button>
        </div>
      </Layout>
    );
  }

  const handleSubmit = (data: Partial<Check>) => {
    // Make sure that if we're using CRON, we set period to 0
    if (data.cronExpression && data.cronExpression.trim() !== "") {
      data.period = 0;
    }
    
    // If period is not 0, clear the CRON expression
    if (data.period !== 0) {
      data.cronExpression = "";
    }
    
    // Ensure httpConfig is properly prepared for storage
    if (data.type === 'http_request' && data.httpConfig) {
      if (!data.httpConfig.url) {
        toast.error("URL is required for HTTP Request checks");
        return;
      }
      
      // Make sure we have the headers and params properly set
      data.httpConfig.headers = data.httpConfig.headers || {};
      data.httpConfig.params = data.httpConfig.params || {};
      
      // Make sure successCodes is an array
      data.httpConfig.successCodes = data.httpConfig.successCodes || [200, 201, 202, 204];
      
      // Validate the HTTP configuration
      console.log("HTTP Config before update:", data.httpConfig);
      toast.info(`HTTP Request check will actively send requests to ${data.httpConfig.url}`);
    }
    
    updateCheck(check.id, data);
    navigate(`/checks/${check.id}`);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate(`/checks/${check.id}`)}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold">Upraviť kontrolu</h1>
        </div>

        <CheckForm onSubmit={handleSubmit} defaultValues={check} isEdit />
      </div>
    </Layout>
  );
};

export default CheckEdit;
