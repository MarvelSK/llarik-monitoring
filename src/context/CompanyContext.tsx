import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Company, User } from "@/types/project";

interface CompanyContextType {
  companies: Company[];
  currentCompany: Company | null;
  currentUser: User | null;
  getCompany: (id: string) => Company | undefined;
  createCompany: (company: Partial<Company>) => Company;
  updateCompany: (id: string, company: Partial<Company>) => Company | undefined;
  deleteCompany: (id: string) => void;
  setCurrentCompany: (companyId: string) => void;
  setCurrentUser: (user: User) => void;
  logout: () => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const useCompanies = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompanies must be used within a CompanyProvider");
  }
  return context;
};

// Sample companies for initial state
const initialCompanies: Company[] = [
  {
    id: "c1",
    name: "Acme Corp",
    description: "A fictional company",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90), // 90 days ago
  },
  {
    id: "c2",
    name: "Globex",
    description: "Another fictional company",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60), // 60 days ago
  },
];

// Sample admin user
const adminUser: User = {
  id: "u1",
  name: "Admin User",
  email: "admin@example.com",
  isAdmin: true,
};

// Sample company users
const companyUsers: User[] = [
  {
    id: "u2",
    name: "John Doe",
    email: "john@acme.com",
    companyId: "c1",
    isAdmin: false,
  },
  {
    id: "u3",
    name: "Jane Smith",
    email: "jane@globex.com",
    companyId: "c2",
    isAdmin: false,
  },
];

// All users
const initialUsers = [adminUser, ...companyUsers];

interface CompanyProviderProps {
  children: ReactNode;
}

export const CompanyProvider = ({ children }: CompanyProviderProps) => {
  const [companies, setCompanies] = useState<Company[]>(() => {
    const savedCompanies = localStorage.getItem("healthbeat-companies");
    return savedCompanies ? JSON.parse(savedCompanies, dateReviver) : initialCompanies;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const savedUsers = localStorage.getItem("healthbeat-users");
    return savedUsers ? JSON.parse(savedUsers) : initialUsers;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("healthbeat-current-user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [currentCompany, setCurrentCompany] = useState<Company | null>(() => {
    if (!currentUser) return null;
    if (currentUser.companyId) {
      const company = companies.find(c => c.id === currentUser.companyId);
      return company || null;
    }
    return null;
  });

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

  useEffect(() => {
    localStorage.setItem("healthbeat-companies", JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem("healthbeat-users", JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem("healthbeat-current-user", JSON.stringify(currentUser));
  }, [currentUser]);

  const getCompany = (id: string) => {
    return companies.find((company) => company.id === id);
  };

  const createCompany = (companyData: Partial<Company>) => {
    const now = new Date();
    const id = uuidv4();
    
    const newCompany: Company = {
      id,
      name: companyData.name || "Untitled Company",
      description: companyData.description,
      createdAt: now,
    };

    setCompanies((prev) => [...prev, newCompany]);
    return newCompany;
  };

  const updateCompany = (id: string, companyData: Partial<Company>) => {
    const companyIndex = companies.findIndex((c) => c.id === id);
    if (companyIndex === -1) return undefined;

    const updatedCompany = {
      ...companies[companyIndex],
      ...companyData,
    };

    const updatedCompanies = [...companies];
    updatedCompanies[companyIndex] = updatedCompany;

    setCompanies(updatedCompanies);
    return updatedCompany;
  };

  const deleteCompany = (id: string) => {
    setCompanies((prev) => prev.filter((company) => company.id !== id));
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
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};
