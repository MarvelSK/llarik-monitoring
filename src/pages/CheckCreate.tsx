
import CheckForm from "@/components/checks/CheckForm";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useChecks } from "@/context/CheckContext";
import { useCompanies } from "@/context/CompanyContext";
import { Check } from "@/types/check";
import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const CheckCreate = () => {
  const { createCheck } = useChecks();
  const { currentCompany, currentUser } = useCompanies();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get companyId from state if provided (from admin UI)
  const companyId = location.state?.companyId;

  const handleSubmit = (data: Partial<Check>) => {
    const checkData = { ...data };
    
    // Use companyId from state, or current user's company
    if (companyId) {
      checkData.companyId = companyId;
    } else if (currentUser?.companyId) {
      checkData.companyId = currentUser.companyId;
    }
    
    createCheck(checkData);
    
    if (companyId) {
      navigate(`/admin/companies/${companyId}`);
    } else {
      navigate("/");
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

        <CheckForm onSubmit={handleSubmit} />
      </div>
    </Layout>
  );
};

export default CheckCreate;
