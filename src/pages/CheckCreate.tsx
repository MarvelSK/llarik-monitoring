
import CheckForm from "@/components/checks/CheckForm";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useChecks } from "@/context/CheckContext";
import { Check } from "@/types/check";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CheckCreate = () => {
  const { createCheck } = useChecks();
  const navigate = useNavigate();

  const handleSubmit = async (data: Partial<Check>) => {
    // Use the projectId from the form data directly
    await createCheck(data);
    navigate("/");
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
