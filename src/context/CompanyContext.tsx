
import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Company, User } from "@/types/company";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";

interface CompanyContextType {
  companies: Company[];
  currentCompany: Company | null;
  getCompany: (id: string) => Company | undefined;
  createCompany: (company: Partial<Company>) => Promise<Company>;
  updateCompany: (id: string, company: Partial<Company>) => Promise<Company | undefined>;
  deleteCompany: (id: string) => Promise<void>;
  setCurrentCompany: (companyId: string) => void;
  loading: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const useCompanies = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompanies must be used within a CompanyProvider");
  }
  return context;
};

interface CompanyProviderProps {
  children: ReactNode;
}

export const CompanyProvider = ({ children }: CompanyProviderProps) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Helper to convert dates
  const convertDates = (data: any): Company => {
    return {
      ...data,
      created_at: new Date(data.created_at)
    };
  };

  // Fetch companies
  useEffect(() => {
    const fetchCompanies = async () => {
      if (!user) {
        setCompanies([]);
        setCurrentCompany(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let query = supabase.from('companies').select('*');
        
        // If user is not admin, only fetch their company
        if (!user.is_admin) {
          query = query.eq('id', user.company_id);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error("Error fetching companies:", error);
          toast.error("Failed to load companies");
          return;
        }
        
        const companiesWithDates = data.map(convertDates);
        setCompanies(companiesWithDates);
        
        // If not admin and has company_id, set current company
        if (!user.is_admin && user.company_id) {
          const userCompany = companiesWithDates.find(c => c.id === user.company_id);
          if (userCompany) {
            setCurrentCompany(userCompany);
          }
        }
      } catch (error) {
        console.error("Error in fetchCompanies:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, [user]);

  const getCompany = (id: string) => {
    return companies.find((company) => company.id === id);
  };

  const createCompany = async (companyData: Partial<Company>) => {
    if (!user?.is_admin) {
      toast.error("Only admins can create companies");
      throw new Error("Only admins can create companies");
    }
    
    const { data, error } = await supabase
      .from('companies')
      .insert([{
        name: companyData.name || "Untitled Company",
        description: companyData.description
      }])
      .select('*')
      .single();
    
    if (error) {
      console.error("Error creating company:", error);
      toast.error("Failed to create company");
      throw error;
    }
    
    const newCompany = convertDates(data);
    setCompanies((prev) => [...prev, newCompany]);
    
    toast.success("Company created successfully");
    return newCompany;
  };

  const updateCompany = async (id: string, companyData: Partial<Company>) => {
    if (!user?.is_admin) {
      toast.error("Only admins can update companies");
      throw new Error("Only admins can update companies");
    }
    
    const { data, error } = await supabase
      .from('companies')
      .update({
        name: companyData.name,
        description: companyData.description
      })
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) {
      console.error("Error updating company:", error);
      toast.error("Failed to update company");
      throw error;
    }
    
    const updatedCompany = convertDates(data);
    
    setCompanies(prev => 
      prev.map(company => company.id === id ? updatedCompany : company)
    );
    
    if (currentCompany?.id === id) {
      setCurrentCompany(updatedCompany);
    }
    
    toast.success("Company updated successfully");
    return updatedCompany;
  };

  const deleteCompany = async (id: string) => {
    if (!user?.is_admin) {
      toast.error("Only admins can delete companies");
      throw new Error("Only admins can delete companies");
    }
    
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error("Error deleting company:", error);
      toast.error("Failed to delete company");
      throw error;
    }
    
    setCompanies(prev => prev.filter(company => company.id !== id));
    
    if (currentCompany?.id === id) {
      setCurrentCompany(null);
    }
    
    toast.success("Company deleted successfully");
  };

  const handleSetCurrentCompany = (companyId: string) => {
    if (!companyId) {
      setCurrentCompany(null);
      return;
    }
    
    const company = getCompany(companyId);
    if (company) {
      setCurrentCompany(company);
    } else {
      toast.error("Company not found");
    }
  };

  return (
    <CompanyContext.Provider
      value={{
        companies,
        currentCompany,
        getCompany,
        createCompany,
        updateCompany,
        deleteCompany,
        setCurrentCompany: handleSetCurrentCompany,
        loading
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};
