
import CheckForm from "@/components/checks/CheckForm";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useChecks } from "@/context/CheckContext";
import { Check } from "@/types/check";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const CheckCreate = () => {
  const { createCheck } = useChecks();
  const navigate = useNavigate();

  const handleSubmit = async (data: Partial<Check>) => {
    try {
      // Handle CRON vs Period logic
      if (data.cronExpression && data.cronExpression.trim() !== "") {
        data.period = 0; // If CRON is provided, set period to 0
      } else if (data.period === 0) {
        // If period is 0 but no CRON is provided, it's invalid
        data.period = 5; // Set a default period
      }
      
      // Set the check type - either standard or http_request
      data.type = data.type || "standard";
      
      // Use the projectId from the form data directly
      await createCheck(data);
      toast.success("Check created successfully");
      navigate("/");
    } catch (error) {
      console.error("Error creating check:", error);
      toast.error("Failed to create check");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Vytvoriť novú kontrolu</h1>
          </div>
        </div>

        <CheckForm onSubmit={handleSubmit} />
      </div>
    </Layout>
  );
};

export default CheckCreate;
