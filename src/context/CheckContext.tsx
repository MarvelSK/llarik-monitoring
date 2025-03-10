
import { Check, CheckPing, CheckStatus } from "@/types/check";
import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { addMinutes, isBefore, isPast } from "date-fns";
import { toast } from "sonner";
import { Integration } from "@/types/integration";
import { useCompanies } from "./CompanyContext";

interface CheckContextType {
  checks: Check[];
  getCheck: (id: string) => Check | undefined;
  createCheck: (check: Partial<Check>) => Check;
  updateCheck: (id: string, check: Partial<Check>) => Check | undefined;
  deleteCheck: (id: string) => void;
  pingCheck: (id: string, status: CheckPing["status"]) => void;
  getPingUrl: (id: string) => string;
  getChecksByCompany: (companyId: string) => Check[];
}

const CheckContext = createContext<CheckContextType | undefined>(undefined);

export const useChecks = () => {
  const context = useContext(CheckContext);
  if (!context) {
    throw new Error("useChecks must be used within a CheckProvider");
  }
  return context;
};

interface CheckProviderProps {
  children: ReactNode;
}

// Sample data for initial state
const initialChecks: Check[] = [
  {
    id: "ae69168c-2d1a-4d4a-babe-cf0f150320c9",
    name: "/opt backups",
    description: "Daily system backup of /opt directory",
    status: "down",
    period: 60 * 24, // 24 hours in minutes
    grace: 15, // 15 minutes
    lastPing: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60), // 60 days ago
    nextPingDue: new Date(Date.now() - 1000 * 60 * 60 * 24 * 59), // 59 days ago (overdue)
    tags: ["backup", "system"],
    environments: ["sandbox"],
    pings: [
      {
        id: "p1",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60),
        status: "success",
      },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90), // 90 days ago
    companyId: "c1",
  },
  {
    id: "ffc143c9-6aea-44fa-b299-599739d8cb6d",
    name: "Product Sync",
    description: "Syncs product data from API to database",
    status: "grace",
    period: 5, // 5 minutes
    grace: 20, // 20 minutes
    lastPing: new Date(Date.now() - 1000 * 60 * 6), // 6 minutes ago
    nextPingDue: new Date(Date.now() - 1000 * 60), // 1 minute ago (in grace period)
    tags: ["sync", "api", "database"],
    environments: ["prod"],
    lastDuration: 22, // 22 seconds
    pings: [
      {
        id: "p2",
        timestamp: new Date(Date.now() - 1000 * 60 * 6),
        status: "success",
      },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 30 days ago
    companyId: "c1",
  },
  {
    id: "7c934798-b3f5-4fc4-a373-418ae184c899",
    name: "DB Backups",
    description: "Daily database backup jobs",
    status: "up",
    period: 60 * 24, // 24 hours in minutes
    grace: 60, // 60 minutes
    lastPing: new Date(Date.now() - 1000 * 60 * 25), // 25 minutes ago
    nextPingDue: new Date(Date.now() + 1000 * 60 * 60 * 23), // 23 hours from now
    tags: ["database", "backup"],
    environments: ["prod", "db-backups"],
    lastDuration: 134, // 134 seconds
    pings: [
      {
        id: "p3",
        timestamp: new Date(Date.now() - 1000 * 60 * 25),
        status: "success",
      },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60), // 60 days ago
    companyId: "c2",
  },
  {
    id: "fe68e83b-aa2a-43a2-97d5-afbe607fa485",
    name: "Weekly Reports",
    description: "Generate weekly business reports",
    status: "up",
    period: 60 * 24 * 7, // 7 days in minutes
    grace: 30, // 30 minutes
    lastPing: new Date(Date.now() - 1000 * 60 * 25), // 25 minutes ago
    nextPingDue: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6), // 6 days from now
    tags: ["reports", "business"],
    environments: ["prod", "worker"],
    lastDuration: 45, // 45 seconds
    pings: [
      {
        id: "p4",
        timestamp: new Date(Date.now() - 1000 * 60 * 25),
        status: "success",
      },
    ],
    cronExpression: "0 9 * * 1", // Every Monday at 9am
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120), // 120 days ago
    companyId: "c2",
  },
  {
    id: "1bed143e-5d06-4ec1-ab52-55e262131b5",
    name: "Clean Uploads",
    description: "Cleanup temporary uploaded files",
    status: "down",
    period: 60 * 24, // 24 hours in minutes
    grace: 60, // 60 minutes
    lastPing: new Date(Date.now() - 1000 * 60 * 60 * 24 * 200), // 200 days ago
    nextPingDue: new Date(Date.now() - 1000 * 60 * 60 * 24 * 199), // 199 days ago (overdue)
    tags: ["cleanup", "maintenance"],
    environments: ["sandbox"],
    pings: [
      {
        id: "p5",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 200),
        status: "success",
      },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 210), // 210 days ago
    companyId: "c1",
  },
];

export const CheckProvider = ({ children }: CheckProviderProps) => {
  const { currentCompany, user } = useCompanies();
  
  const [checks, setChecks] = useState<Check[]>(() => {
    const savedChecks = localStorage.getItem("healthbeat-checks");
    return savedChecks ? JSON.parse(savedChecks, dateReviver) : initialChecks;
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
    localStorage.setItem("healthbeat-checks", JSON.stringify(checks));
  }, [checks]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setChecks((currentChecks) =>
        currentChecks.map((check) => {
          const prevStatus = check.status;
          const newStatus = calculateCheckStatus(check);
          
          if (newStatus !== prevStatus) {
            if (newStatus === 'grace') {
              toast.warning(`Check "${check.name}" is running late`);
              triggerIntegrations(check.id, 'grace');
            } else if (newStatus === 'down') {
              toast.error(`Check "${check.name}" is down`);
              triggerIntegrations(check.id, 'down');
            } else if (newStatus === 'up' && prevStatus !== 'new') {
              toast.success(`Check "${check.name}" is up`);
              triggerIntegrations(check.id, 'up');
            }
          }
          
          return {
            ...check,
            status: newStatus
          };
        })
      );
    }, 60 * 1000); // 1 minute

    return () => clearInterval(intervalId);
  }, []);

  const triggerIntegrations = (checkId: string, status: 'up' | 'down' | 'grace') => {
    const savedIntegrations = localStorage.getItem(`integrations-${checkId}`);
    if (!savedIntegrations) return;
    
    const integrations: Integration[] = JSON.parse(savedIntegrations, dateReviver);
    const activeIntegrations = integrations.filter(
      integration => integration.enabled && integration.notifyOn.includes(status)
    );
    
    if (activeIntegrations.length === 0) return;
    
    const check = getCheck(checkId);
    if (!check) return;
    
    activeIntegrations.forEach(integration => {
      const payload = {
        check: {
          id: check.id,
          name: check.name,
          status,
          url: getPingUrl(check.id)
        },
        integration: {
          id: integration.id,
          name: integration.name,
          type: integration.type
        },
        timestamp: new Date().toISOString()
      };
      
      if (integration.type === 'webhook' && integration.config.url) {
        try {
          fetch(integration.config.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            mode: 'no-cors'
          });
          
          console.log(`Triggered ${integration.type} integration "${integration.name}" for status "${status}"`);
        } catch (error) {
          console.error('Failed to trigger webhook integration:', error);
        }
      }
      
      if (integration.type === 'email' && integration.config.email) {
        console.log(`Would send email to ${integration.config.email} for status "${status}"`);
        // In a real app, you would call an API to send an email
      }
    });
  };

  const calculateCheckStatus = (check: Check): CheckStatus => {
    if (!check.lastPing) return "new";
    if (!check.nextPingDue) return "up";

    const now = new Date();
    
    if (isPast(check.nextPingDue)) {
      // Past due, check if within grace period
      const graceEndTime = addMinutes(check.nextPingDue, check.grace);
      if (isBefore(now, graceEndTime)) {
        return "grace";
      }
      return "down";
    }
    
    return "up";
  };

  const getPingUrl = (id: string): string => {
    return `${window.location.origin}/ping/${id}`;
  };

  const getCheck = (id: string) => {
    return checks.find((check) => check.id === id);
  };

  const getChecksByCompany = (companyId: string) => {
    return checks.filter((check) => check.companyId === companyId);
  };

  const createCheck = (checkData: Partial<Check>) => {
    if (!currentCompany && !checkData.companyId) {
      toast.error('No company selected for this check');
      throw new Error('No company selected for this check');
    }
    
    const now = new Date();
    const id = uuidv4();
    
    const newCheck: Check = {
      id,
      name: checkData.name || "Untitled Check",
      description: checkData.description,
      status: "new",
      period: checkData.period || 60,
      grace: checkData.grace || 30,
      tags: checkData.tags || [],
      environments: checkData.environments || [],
      cronExpression: checkData.cronExpression,
      pings: [],
      createdAt: now,
      companyId: checkData.companyId || (currentCompany ? currentCompany.id : ''),
    };

    setChecks((prev) => [...prev, newCheck]);
    toast.success('Check created successfully');
    return newCheck;
  };

  const pingCheck = (id: string, status: CheckPing["status"]) => {
    const checkIndex = checks.findIndex((c) => c.id === id);
    if (checkIndex === -1) return;

    const now = new Date();
    const check = checks[checkIndex];
    const prevStatus = check.status;
    
    const newPing: CheckPing = {
      id: uuidv4(),
      timestamp: now,
      status,
    };

    const nextPingDue = addMinutes(now, check.period);

    const updatedCheck: Check = {
      ...check,
      lastPing: now,
      nextPingDue,
      status: "up",
      pings: [newPing, ...check.pings].slice(0, 100),
    };

    const updatedChecks = [...checks];
    updatedChecks[checkIndex] = updatedCheck;

    setChecks(updatedChecks);
    toast.success('Ping received successfully');
    
    // If status changed from down to up, trigger integrations
    if (prevStatus === 'down' || prevStatus === 'grace') {
      triggerIntegrations(id, 'up');
    }
  };

  const updateCheck = (id: string, checkData: Partial<Check>) => {
    const checkIndex = checks.findIndex((c) => c.id === id);
    if (checkIndex === -1) return undefined;

    const updatedCheck = {
      ...checks[checkIndex],
      ...checkData,
      status: calculateCheckStatus({
        ...checks[checkIndex],
        ...checkData,
      }),
    };

    const updatedChecks = [...checks];
    updatedChecks[checkIndex] = updatedCheck;

    setChecks(updatedChecks);
    return updatedCheck;
  };

  const deleteCheck = (id: string) => {
    setChecks((prev) => prev.filter((check) => check.id !== id));
  };

  return (
    <CheckContext.Provider
      value={{
        checks: user?.is_admin 
          ? checks 
          : (currentCompany 
              ? checks.filter(check => check.companyId === currentCompany.id) 
              : []),
        getCheck,
        createCheck,
        updateCheck,
        deleteCheck,
        pingCheck,
        getPingUrl,
        getChecksByCompany,
      }}
    >
      {children}
    </CheckContext.Provider>
  );
};
