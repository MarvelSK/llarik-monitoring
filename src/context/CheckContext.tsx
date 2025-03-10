
import { Check, CheckPing, CheckStatus } from "@/types/check";
import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { addMinutes, isBefore, isPast, parseISO } from "date-fns";

interface CheckContextType {
  checks: Check[];
  getCheck: (id: string) => Check | undefined;
  createCheck: (check: Partial<Check>) => Check;
  updateCheck: (id: string, check: Partial<Check>) => Check | undefined;
  deleteCheck: (id: string) => void;
  pingCheck: (id: string, status: CheckPing["status"]) => void;
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
    id: "1",
    name: "Database Backup",
    description: "Daily PostgreSQL database backup job",
    status: "up",
    period: 60 * 24, // 24 hours in minutes
    grace: 30, // 30 minutes
    lastPing: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
    nextPingDue: new Date(Date.now() + 1000 * 60 * 60 * 12), // 12 hours from now
    tags: ["database", "production"],
    pings: [
      {
        id: "p1",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
        status: "success",
      },
      {
        id: "p2",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36),
        status: "success",
      },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 30 days ago
  },
  {
    id: "2",
    name: "Log Rotation",
    description: "Weekly log rotation and cleanup",
    status: "down",
    period: 60 * 24 * 7, // 7 days in minutes
    grace: 60, // 60 minutes
    lastPing: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8), // 8 days ago
    nextPingDue: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago (overdue)
    tags: ["logs", "maintenance"],
    pings: [
      {
        id: "p3",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8), 
        status: "success",
      },
      {
        id: "p4",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
        status: "success",
      },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90), // 90 days ago
  },
  {
    id: "3",
    name: "API Health Check",
    description: "Monitors the API status every 5 minutes",
    status: "grace",
    period: 5, // 5 minutes
    grace: 3, // 3 minutes
    lastPing: new Date(Date.now() - 1000 * 60 * 6), // 6 minutes ago
    nextPingDue: new Date(Date.now() - 1000 * 60), // 1 minute ago (in grace period)
    tags: ["api", "monitoring", "critical"],
    pings: [
      {
        id: "p5",
        timestamp: new Date(Date.now() - 1000 * 60 * 6),
        status: "success",
      },
      {
        id: "p6",
        timestamp: new Date(Date.now() - 1000 * 60 * 11),
        status: "success",
      },
    ],
    cronExpression: "*/5 * * * *", // Every 5 minutes
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10), // 10 days ago
  },
];

export const CheckProvider = ({ children }: CheckProviderProps) => {
  const [checks, setChecks] = useState<Check[]>(() => {
    // Try to load from localStorage
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
    // Save to localStorage whenever checks change
    localStorage.setItem("healthbeat-checks", JSON.stringify(checks));
  }, [checks]);

  useEffect(() => {
    // Update check statuses every minute
    const intervalId = setInterval(() => {
      setChecks((currentChecks) =>
        currentChecks.map((check) => ({
          ...check,
          status: calculateCheckStatus(check),
        }))
      );
    }, 60 * 1000); // 1 minute

    return () => clearInterval(intervalId);
  }, []);

  // Calculate the status of a check based on its last ping and due time
  const calculateCheckStatus = (check: Check): CheckStatus => {
    if (!check.lastPing) return "new";
    
    const now = new Date();
    if (!check.nextPingDue) return "up";
    
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

  const getCheck = (id: string) => {
    return checks.find((check) => check.id === id);
  };

  const createCheck = (checkData: Partial<Check>) => {
    const now = new Date();
    
    const newCheck: Check = {
      id: uuidv4(),
      name: checkData.name || "Untitled Check",
      description: checkData.description,
      status: "new",
      period: checkData.period || 60, // Default to 60 minutes
      grace: checkData.grace || 30, // Default to 30 minutes
      tags: checkData.tags || [],
      cronExpression: checkData.cronExpression,
      pings: [],
      createdAt: now,
    };

    setChecks((prev) => [...prev, newCheck]);
    return newCheck;
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

  const pingCheck = (id: string, status: CheckPing["status"]) => {
    const checkIndex = checks.findIndex((c) => c.id === id);
    if (checkIndex === -1) return;

    const now = new Date();
    const check = checks[checkIndex];
    
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
      status: "up", // Reset to up on a new ping
      pings: [newPing, ...check.pings].slice(0, 100), // Keep last 100 pings
    };

    const updatedChecks = [...checks];
    updatedChecks[checkIndex] = updatedCheck;

    setChecks(updatedChecks);
  };

  return (
    <CheckContext.Provider
      value={{
        checks,
        getCheck,
        createCheck,
        updateCheck,
        deleteCheck,
        pingCheck,
      }}
    >
      {children}
    </CheckContext.Provider>
  );
};
