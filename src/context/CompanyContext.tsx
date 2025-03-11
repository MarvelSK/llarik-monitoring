import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Company, User } from "@/types/company";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CompanyContextType {
  companies: Company[];
  currentCompany: Company | null;
  currentUser: User | null;
  getCompany: (id: string) => Company | undefined;
  createCompany: (company: Partial<Company>) => Promise<Company>;
  updateCompany: (id: string, company: Partial<Company>) => Promise<Company | undefined>;
  deleteCompany: (id: string) => Promise<void>;
  setCurrentCompany: (companyId: string) => void;
  setCurrentUser: (user: User) => void;
  logout: () => void;
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

// Sample admin user
const adminUser: User = {
  id: "u1",
  name: "Admin User",
  email: "admin@example.com",
  isAdmin: true,
};

// All users
const initialUsers = [adminUser];

interface CompanyProviderProps {
  children: ReactNode;
}

export const CompanyProvider = ({ children }: CompanyProviderProps) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>(() => {
    const savedUsers = localStorage.getItem("healthbeat-users");
    return savedUsers ? JSON.parse(savedUsers) : initialUsers;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("healthbeat-current-user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);

  // Helper to revive dates when parsing JSON
  function dateReviver(_key: string, value: any) {
    if (typeof value === 'string') {
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
      if (iso8601Regex.test(value)) {
        return new Date(value);
      }
    }
    return value;
  }

  // Load companies from Supabase
  useEffect(() => {
    async function fetchCompanies() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching companies:', error);
          toast.error('Failed to load companies');
          return;
        }

        const companiesWithDates = data.map(company => ({
          id: company.id,
          name: company.name,
          ico: company.ico,
          description: company.description || undefined,
          createdAt: new Date(company.created_at),
        }));
        setCompanies(companiesWithDates);
      } catch (err) {
        console.error('Error in fetchCompanies:', err);
        toast.error('Failed to load companies');
      } finally {
        setLoading(false);
      }
    }

    fetchCompanies();

    // Set up real-time subscription to companies table for updates
    const channel = supabase
      .channel('public:companies')
      .on('postgres_changes', {
        event: '*', 
        schema: 'public',
        table: 'companies'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newCompany = {
            id: payload.new.id,
            name: payload.new.name,
            ico: payload.new.ico,
            description: payload.new.description || undefined,
            createdAt: new Date(payload.new.created_at),
          };
          setCompanies(prev => [newCompany, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          const updatedCompany = {
            id: payload.new.id,
            name: payload.new.name,
            ico: payload.new.ico,
            description: payload.new.description || undefined,
            createdAt: new Date(payload.new.created_at),
          };
          setCompanies(prev => prev.map(company => 
            company.id === updatedCompany.id ? updatedCompany : company
          ));
        } else if (payload.eventType === 'DELETE') {
          setCompanies(prev => prev.filter(company => company.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Set current company when user changes
  useEffect(() => {
    if (currentUser?.companyId) {
      const company = companies.find(c => c.id === currentUser.companyId);
      if (company) {
        setCurrentCompany(company);
      }
    }
  }, [currentUser, companies]);

  useEffect(() => {
    localStorage.setItem("healthbeat-users", JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem("healthbeat-current-user", JSON.stringify(currentUser));
  }, [currentUser]);

  const getCompany = (id: string) => {
    return companies.find((company) => company.id === id);
  };

  const createCompany = async (companyData: Partial<Company>) => {
    try {
      const newCompanyData = {
        name: companyData.name || "Untitled Company",
        ico: companyData.ico,
        description: companyData.description,
      };

      const { data, error } = await supabase
        .from('companies')
        .insert(newCompanyData)
        .select('*')
        .single();

      if (error) {
        console.error('Error creating company:', error);
        toast.error('Failed to create company');
        throw error;
      }

      const newCompany: Company = {
        id: data.id,
        name: data.name,
        ico: data.ico,
        description: data.description,
        createdAt: new Date(data.created_at),
      };

      toast.success('Company created successfully');
      return newCompany;
    } catch (error) {
      console.error('Error in createCompany:', error);
      toast.error('Failed to create company');
      throw error;
    }
  };

  const updateCompany = async (id: string, companyData: Partial<Company>) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: companyData.name,
          ico: companyData.ico,
          description: companyData.description,
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating company:', error);
        toast.error('Failed to update company');
        return undefined;
      }

      const updatedCompany = {
        ...companies.find(c => c.id === id)!,
        ...companyData,
      };

      toast.success('Company updated successfully');
      return updatedCompany;
    } catch (error) {
      console.error('Error in updateCompany:', error);
      toast.error('Failed to update company');
      return undefined;
    }
  };

  const deleteCompany = async (id: string) => {
    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting company:', error);
        toast.error('Failed to delete company');
        return;
      }

      if (currentCompany?.id === id) {
        setCurrentCompany(null);
      }

      toast.success('Company deleted successfully');
    } catch (error) {
      console.error('Error in deleteCompany:', error);
      toast.error('Failed to delete company');
    }
  };

  const handleSetCurrentCompany = (companyId: string) => {
    const company = getCompany(companyId);
    if (company) {
      setCurrentCompany(company);
    }
  };

  const handleSetCurrentUser = (user: User) => {
    setCurrentUser(user);
    if (user.companyId) {
      handleSetCurrentCompany(user.companyId);
    } else {
      setCurrentCompany(null);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentCompany(null);
  };

  return (
    <CompanyContext.Provider
      value={{
        companies,
        currentCompany,
        currentUser,
        getCompany,
        createCompany,
        updateCompany,
        deleteCompany,
        setCurrentCompany: handleSetCurrentCompany,
        setCurrentUser: handleSetCurrentUser,
        logout,
        loading,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};
