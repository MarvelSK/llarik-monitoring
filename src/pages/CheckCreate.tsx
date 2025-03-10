
import CheckForm from "@/components/checks/CheckForm";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useChecks } from "@/context/CheckContext";
import { useCompanies } from "@/context/CompanyContext";
import { Check } from "@/types/check";
import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const CheckCreate = () => {
  const { createCheck } = useChecks();
  const { currentCompany, currentUser } = useCompanies();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  
  // Get companyId from state if provided (from admin UI)
  const companyId = location.state?.companyId;

  useEffect(() => {
    // Ensure user has a company before creating checks
    if (!companyId && !currentUser?.companyId) {
      toast.error("You need to create a company first");
      navigate("/setup");
    }
  }, [companyId, currentUser, navigate]);

  const handleSubmit = async (data: Partial<Check>) => {
    try {
      setIsLoading(true);
      const checkData = { ...data };
      
      // Use companyId from state, or current user's company
      if (companyId) {
        checkData.companyId = companyId;
      } else if (currentUser?.companyId) {
        checkData.companyId = currentUser.companyId;
      } else {
        throw new Error("No company associated with this check");
      }
      
      // Create check in Supabase first
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        // This is where we would add code to save to Supabase checks table
        const { error } = await supabase
          .from('checks')
          .insert({
            name: checkData.name,
            description: checkData.description,
            company_id: checkData.companyId,
            status: checkData.status || 'up',
            period: checkData.period || 3600,
            grace: checkData.grace || 300,
            tags: checkData.tags || []
          });
          
        if (error) throw error;
        
        // Update local state
        createCheck(checkData);
      
        if (companyId) {
          navigate(`/admin/companies/${companyId}`);
        } else {
          navigate("/");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create check");
      console.error("Error creating check:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => companyId ? navigate(`/admin/companies/${companyId}`) : navigate("/")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create New Check</h1>
            {companyId && (
              <p className="text-muted-foreground">Creating check for specific company</p>
            )}
            {!companyId && currentCompany && (
              <p className="text-muted-foreground">Creating check for {currentCompany.name}</p>
            )}
          </div>
        </div>

        <CheckForm onSubmit={handleSubmit} isLoading={isLoading} />
      </div>
    </Layout>
  );
};

export default CheckCreate;
