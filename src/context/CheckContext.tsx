
import { Check, CheckPing, CheckStatus, HttpMethod } from "@/types/check";
import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { addMinutes, isBefore, isPast } from "date-fns";
import { Integration } from "@/types/integration";
import { supabase } from "@/integrations/supabase/client";
import { parseExpression } from 'cron-parser';

interface CheckContextType {
  checks: Check[];
  getCheck: (id: string) => Check | undefined;
  createCheck: (check: Partial<Check>) => Promise<Check>;
  updateCheck: (id: string, check: Partial<Check>) => Promise<Check | undefined>;
  deleteCheck: (id: string) => Promise<void>;
  pingCheck: (id: string, status: CheckPing["status"]) => void;
  getPingUrl: (id: string) => string;
  loading: boolean;
  getChecksByProject: (projectId: string) => Check[];
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

function convertDatesToObjects(check: any): Check {
  let httpConfig = null;
  
  if (check.http_config) {
    try {
      if (typeof check.http_config === 'string') {
        httpConfig = JSON.parse(check.http_config);
      } else {
        httpConfig = check.http_config;
      }
    } catch (error) {
      console.error('Error parsing HTTP config:', error);
    }
  }
  
  return {
    ...check,
    lastPing: check.last_ping ? new Date(check.last_ping) : undefined,
    nextPingDue: check.next_ping_due ? new Date(check.next_ping_due) : undefined,
    createdAt: new Date(check.created_at),
    projectId: check.project_id,
    cronExpression: check.cron_expression,
    pings: [], // We'll load pings separately as needed
    type: check.type || "standard", // Default to standard if not specified
    httpConfig, // Use the parsed HTTP config
  };
}

function prepareCheckForSupabase(check: Partial<Check>) {
  // Convert HttpRequestConfig to a JSON-serializable format
  let httpConfigForDb = null;
  
  if (check.httpConfig) {
    try {
      // Ensure params and headers are properly formatted
      const config = {
        ...check.httpConfig,
        // Make sure we're properly handling params and headers
        params: check.httpConfig.params || {},
        headers: check.httpConfig.headers || {},
      };
      
      httpConfigForDb = JSON.stringify(config);
      console.log("HTTP config prepared for saving:", httpConfigForDb);
    } catch (error) {
      console.error('Error preparing HTTP config for storage:', error);
    }
  }
  
  return {
    name: check.name,
    description: check.description,
    status: check.status,
    period: check.period,
    grace: check.grace,
    tags: check.tags,
    environments: check.environments,
    cron_expression: check.cronExpression,
    last_duration: check.lastDuration,
    last_ping: check.lastPing?.toISOString(),
    next_ping_due: check.nextPingDue?.toISOString(),
    project_id: check.projectId,
    type: check.type || "standard",
    http_config: httpConfigForDb
  };
}

export const CheckProvider = ({ children }: CheckProviderProps) => {
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);

  function dateReviver(_key: string, value: any) {
    if (typeof value === 'string') {
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
      if (iso8601Regex.test(value)) {
        return new Date(value);
      }
    }
    return value;
  }

  function getNextCronDate(cronExpression: string, fromDate = new Date()): Date {
    try {
      const interval = parseExpression(cronExpression, {
        currentDate: fromDate
      });
      return interval.next().toDate();
    } catch (error) {
      console.error("Error parsing CRON expression:", error);
      return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    }
  }

  useEffect(() => {
    async function fetchChecks() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('checks')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching checks:', error);
          return;
        }

        const checksWithDates = data.map(convertDatesToObjects);
        
        const updatedChecks = checksWithDates.map(check => {
          if (check.cronExpression && (!check.nextPingDue || check.lastPing)) {
            const baseDate = check.lastPing || new Date();
            const nextDue = getNextCronDate(check.cronExpression, baseDate);
            return { ...check, nextPingDue: nextDue };
          }
          return check;
        });
        
        setChecks(updatedChecks);
      } catch (err) {
        console.error('Error in fetchChecks:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchChecks();

    const channel = supabase
      .channel('public:checks')
      .on('postgres_changes', {
        event: '*', 
        schema: 'public',
        table: 'checks'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newCheck = convertDatesToObjects(payload.new);
          
          if (newCheck.cronExpression && !newCheck.nextPingDue) {
            newCheck.nextPingDue = getNextCronDate(newCheck.cronExpression);
          }
          
          setChecks(prev => [newCheck, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          const updatedCheck = convertDatesToObjects(payload.new);
          setChecks(prev => prev.map(check => 
            check.id === updatedCheck.id ? updatedCheck : check
          ));
        } else if (payload.eventType === 'DELETE') {
          setChecks(prev => prev.filter(check => check.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    // Check for HTTP request checks that need to be executed
    const intervalId = setInterval(async () => {
      const now = new Date();
      
      // Get checks that are due for execution
      const dueChecks = checks.filter(check => 
        check.type === 'http_request' && 
        check.nextPingDue && 
        isPast(check.nextPingDue) &&
        check.status !== 'down' // We don't want to execute checks that are already down
      );
      
      if (dueChecks.length > 0) {
        console.log(`Found ${dueChecks.length} HTTP request checks due for execution`);
        
        for (const check of dueChecks) {
          try {
            console.log(`Executing HTTP request check: ${check.id} - ${check.name}`);
            await executeHttpRequestCheck(check.id);
          } catch (error) {
            console.error(`Failed to execute HTTP request check ${check.id}:`, error);
          }
        }
      }
    }, 30 * 1000); // Check every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [checks]);

  const executeHttpRequestCheck = async (checkId: string) => {
    try {
      console.log(`Executing HTTP request check for ${checkId}`);
      
      const { data, error } = await supabase.functions.invoke('http-request-check', {
        body: { checkId }
      });
      
      if (error) {
        console.error(`Error executing HTTP request check for ${checkId}:`, error);
        return false;
      }
      
      console.log(`Successfully executed HTTP request check for ${checkId}:`, data);
      return true;
    } catch (error) {
      console.error(`Error executing HTTP request check for ${checkId}:`, error);
      return false;
    }
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      setChecks((currentChecks) =>
        currentChecks.map((check) => {
          const prevStatus = check.status;
          let newStatus: CheckStatus;
          
          try {
            newStatus = calculateCheckStatus(check);
          } catch (error) {
            console.error('Error calculating check status for check:', check.id, error);
            newStatus = prevStatus;
          }
          
          if (newStatus !== prevStatus) {
            if (newStatus === 'grace') {
              triggerIntegrations(check.id, 'grace');
            } else if (newStatus === 'down') {
              triggerIntegrations(check.id, 'down');
            } else if (newStatus === 'up' && prevStatus !== 'new') {
              triggerIntegrations(check.id, 'up');
            }

            supabase
              .from('checks')
              .update({ status: newStatus })
              .eq('id', check.id)
              .then(({ error }) => {
                if (error) {
                  console.error('Error updating check status:', error);
                }
              });
          }
          
          return {
            ...check,
            status: newStatus
          };
        })
      );
    }, 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  const triggerIntegrations = (checkId: string, status: 'up' | 'down' | 'grace') => {
    const savedIntegrations = localStorage.getItem(`integrations-${checkId}`);
    if (!savedIntegrations) return;

    function dateReviver(_key: string, value: any) {
      if (typeof value === 'string') {
        const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
        if (iso8601Regex.test(value)) {
          return new Date(value);
        }
      }
      return value;
    }

    const integrations: Integration[] = JSON.parse(savedIntegrations, dateReviver);
    const allowedTypes: Integration["type"][] = ["webhook", "email"];
    const activeIntegrations = integrations.filter(
      integration => integration.enabled && integration.notifyOn.includes(status) && allowedTypes.includes(integration.type)
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
          console.log(`Triggered webhook integration "${integration.name}" for status "${status}"`);
        } catch (error) {
          console.error('Failed to trigger webhook integration:', error);
        }
      }

      if (integration.type === 'email' && integration.config.email) {
        console.log(`Would send email to ${integration.config.email} for status "${status}". In production, trigger this via Edge Function or backend API.`);
      }
    });
  };

  const calculateCheckStatus = (check: Check): CheckStatus => {
    if (!check.lastPing) return "new";
    
    if (!check.nextPingDue) {
      if (check.cronExpression) {
        try {
          const nextDue = getNextCronDate(check.cronExpression, check.lastPing);
          check.nextPingDue = nextDue;
        } catch (error) {
          console.error("Error calculating next ping due:", error);
          return "up";
        }
      } else if (check.period > 0) {
        check.nextPingDue = addMinutes(check.lastPing, check.period);
      } else {
        return "up";
      }
    }
    
    const now = new Date();
    
    try {
      if (isPast(check.nextPingDue)) {
        const graceEndTime = addMinutes(check.nextPingDue, check.grace);
        if (isBefore(now, graceEndTime)) {
          return "grace";
        }
        return "down";
      } else {
        return "up";
      }
    } catch (error) {
      console.error('Error calculating check status:', error, check);
      return "up";
    }
  };

  const getPingUrl = (id: string): string => {
    return `${window.location.origin}/ping/${id}`;
  };

  const getCheck = (id: string) => {
    return checks.find((check) => check.id === id);
  };

  // This function will choose the right function to ping based on check type
  const pingCheck = async (id: string, status: CheckPing["status"]) => {
    try {
      const check = getCheck(id);
      
      if (!check) {
        console.error('Check not found with ID:', id);
        return;
      }
      
      let endpoint;
      
      // Choose the appropriate endpoint based on check type
      if (check.type === 'http_request') {
        endpoint = 'http-request-check';
      } else {
        endpoint = 'update-check'; 
      }
      
      // Call the appropriate edge function
      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: { checkId: id }
      });
      
      if (error) {
        console.error(`Error calling ${endpoint}:`, error);
        return;
      }
      
      console.log(`Successfully called ${endpoint} for check ${id}`, data);
      
      // No need to update the check status here as the edge function will do it
      // and our Supabase listener will receive the changes
      
    } catch (error) {
      console.error('Error processing ping:', error);
    }
  };

  const createCheck = async (checkData: Partial<Check>) => {
    try {
      const now = new Date();
      
      if (checkData.cronExpression && checkData.cronExpression.trim() !== "") {
        checkData.period = 0;
      }
      
      if (checkData.period !== 0) {
        checkData.cronExpression = "";
      }
      
      let nextPingDue = undefined;
      if (checkData.cronExpression && checkData.cronExpression.trim() !== "") {
        try {
          nextPingDue = getNextCronDate(checkData.cronExpression);
        } catch (error) {
          console.error("Invalid CRON expression:", error);
          throw new Error("Invalid CRON expression");
        }
      } else if (checkData.period && checkData.period > 0) {
        // Calculate next ping due based on period
        nextPingDue = addMinutes(now, checkData.period);
      }
      
      // Prepare the HTTP config for database storage
      const httpConfigForDb = checkData.httpConfig ? JSON.stringify(checkData.httpConfig) : null;
      
      const newCheckData = {
        name: checkData.name || "Untitled Check",
        description: checkData.description,
        status: "new" as CheckStatus,
        period: checkData.period || 60,
        grace: checkData.grace || 30,
        tags: checkData.tags || [],
        environments: checkData.environments || [],
        cron_expression: checkData.cronExpression || null,
        project_id: checkData.projectId,
        next_ping_due: nextPingDue?.toISOString(),
        created_at: now.toISOString(),
        type: checkData.type || "standard",
        http_config: httpConfigForDb
      };

      const { data, error } = await supabase
        .from('checks')
        .insert(newCheckData)
        .select('*')
        .single();

      if (error) {
        console.error('Error creating check:', error);
        throw error;
      }

      const newCheck = convertDatesToObjects(data);
      return newCheck;
    } catch (error) {
      console.error('Error in createCheck:', error);
      throw error;
    }
  };

  

  const updateCheck = async (id: string, checkData: Partial<Check>) => {
    try {
      const checkIndex = checks.findIndex((c) => c.id === id);
      if (checkIndex === -1) return undefined;

      if (checkData.cronExpression && checkData.cronExpression.trim() !== "") {
        checkData.period = 0;
        
        try {
          const nextPingDue = getNextCronDate(checkData.cronExpression);
          checkData.nextPingDue = nextPingDue;
        } catch (error) {
          console.error("Invalid CRON expression:", error);
          throw new Error("Invalid CRON expression");
        }
      }
      
      if (checkData.period !== 0) {
        checkData.cronExpression = "";
        
        const now = new Date();
        if (checks[checkIndex].lastPing) {
          checkData.nextPingDue = addMinutes(checks[checkIndex].lastPing!, checkData.period);
        } else {
          checkData.nextPingDue = addMinutes(now, checkData.period);
        }
      }
      
      const dbCheckData = prepareCheckForSupabase(checkData);
      
      const { error } = await supabase
        .from('checks')
        .update(dbCheckData)
        .eq('id', id);

      if (error) {
        console.error('Error updating check:', error);
        return undefined;
      }

      const updatedCheck = {
        ...checks[checkIndex],
        ...checkData,
        status: calculateCheckStatus({
          ...checks[checkIndex],
          ...checkData,
        }),
      };

      return updatedCheck;
    } catch (error) {
      console.error('Error in updateCheck:', error);
      return undefined;
    }
  };

  const deleteCheck = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('checks')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting check:', error);
        throw error;
      }

      setChecks((prev) => prev.filter((check) => check.id !== id));
    } catch (error) {
      console.error('Error in deleteCheck:', error);
      throw error;
    }
  };

  const getChecksByProject = (projectId: string) => {
    return checks.filter(check => check.projectId === projectId);
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
        getPingUrl,
        loading,
        getChecksByProject,
      }}
    >
      {children}
    </CheckContext.Provider>
  );
};
