
import { Check, CheckPing, CheckStatus } from "@/types/check";
import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { addMinutes, isBefore, isPast, parseISO } from "date-fns";
import { toast } from "sonner";
import { Integration } from "@/types/integration";
import { supabase } from "@/integrations/supabase/client";

interface CheckContextType {
  checks: Check[];
  getCheck: (id: string) => Check | undefined;
  createCheck: (check: Partial<Check>) => Check;
  updateCheck: (id: string, check: Partial<Check>) => Check | undefined;
  deleteCheck: (id: string) => void;
  pingCheck: (id: string, status: CheckPing["status"]) => void;
  getPingUrl: (id: string) => string;
  loading: boolean;
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

// Helper to convert Supabase date strings to Date objects
function convertDatesToObjects(check: any): Check {
  return {
    ...check,
    lastPing: check.last_ping ? new Date(check.last_ping) : undefined,
    nextPingDue: check.next_ping_due ? new Date(check.next_ping_due) : undefined,
    createdAt: new Date(check.created_at),
    pings: [], // We'll load pings separately as needed
  };
}

// Helper to convert Date objects to ISO strings for Supabase
function prepareCheckForSupabase(check: Partial<Check>) {
  const dbCheck: any = {
    name: check.name,
    description: check.description,
    status: check.status,
    period: check.period,
    grace: check.grace,
    tags: check.tags,
    environments: check.environments,
    cron_expression: check.cronExpression,
    last_duration: check.lastDuration,
  };

  if (check.lastPing) {
    dbCheck.last_ping = check.lastPing.toISOString();
  }

  if (check.nextPingDue) {
    dbCheck.next_ping_due = check.nextPingDue.toISOString();
  }

  return dbCheck;
}

export const CheckProvider = ({ children }: CheckProviderProps) => {
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Load checks from Supabase
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
          toast.error('Failed to load checks');
          return;
        }

        const checksWithDates = data.map(convertDatesToObjects);
        setChecks(checksWithDates);
      } catch (err) {
        console.error('Error in fetchChecks:', err);
        toast.error('Failed to load checks');
      } finally {
        setLoading(false);
      }
    }

    fetchChecks();
  }, []);

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

            // Update status in Supabase
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

  const createCheck = async (checkData: Partial<Check>) => {
    try {
      const now = new Date();
      
      const newCheckData = {
        name: checkData.name || "Untitled Check",
        description: checkData.description,
        status: "new" as CheckStatus,
        period: checkData.period || 60,
        grace: checkData.grace || 30,
        tags: checkData.tags || [],
        environments: checkData.environments || [],
        cron_expression: checkData.cronExpression,
        created_at: now.toISOString()
      };

      const { data, error } = await supabase
        .from('checks')
        .insert(newCheckData)
        .select('*')
        .single();

      if (error) {
        console.error('Error creating check:', error);
        toast.error('Failed to create check');
        throw error;
      }

      const newCheck = convertDatesToObjects(data);
      setChecks((prev) => [newCheck, ...prev]);
      toast.success('Check created successfully');
      return newCheck;
    } catch (error) {
      console.error('Error in createCheck:', error);
      toast.error('Failed to create check');
      throw error;
    }
  };

  const pingCheck = async (id: string, status: CheckPing["status"]) => {
    try {
      const check = getCheck(id);
      if (!check) {
        toast.error('Check not found');
        return;
      }

      const now = new Date();
      const prevStatus = check.status;
      const nextPingDue = addMinutes(now, check.period);

      // Add a new ping
      const pingData = {
        check_id: id,
        status,
        timestamp: now.toISOString()
      };

      const { error: pingError } = await supabase
        .from('check_pings')
        .insert(pingData);

      if (pingError) {
        console.error('Error adding ping:', pingError);
        toast.error('Failed to record ping');
        return;
      }

      // Update the check
      const updateData = {
        last_ping: now.toISOString(),
        next_ping_due: nextPingDue.toISOString(),
        status: "up"
      };

      const { error: checkError } = await supabase
        .from('checks')
        .update(updateData)
        .eq('id', id);

      if (checkError) {
        console.error('Error updating check after ping:', checkError);
        toast.error('Failed to update check status');
        return;
      }

      // Update local state
      const newPing: CheckPing = {
        id: uuidv4(), // This will be replaced when we fetch pings next time
        timestamp: now,
        status,
      };

      setChecks(prevChecks => 
        prevChecks.map(c => 
          c.id === id 
            ? {
                ...c,
                lastPing: now,
                nextPingDue,
                status: "up",
                pings: [newPing, ...c.pings].slice(0, 100),
              }
            : c
        )
      );

      toast.success('Ping received successfully');
      
      // If status changed from down to up, trigger integrations
      if (prevStatus === 'down' || prevStatus === 'grace') {
        triggerIntegrations(id, 'up');
      }
    } catch (error) {
      console.error('Error in pingCheck:', error);
      toast.error('Failed to process ping');
    }
  };

  const updateCheck = async (id: string, checkData: Partial<Check>) => {
    try {
      const checkIndex = checks.findIndex((c) => c.id === id);
      if (checkIndex === -1) return undefined;

      const dbCheckData = prepareCheckForSupabase(checkData);
      
      const { error } = await supabase
        .from('checks')
        .update(dbCheckData)
        .eq('id', id);

      if (error) {
        console.error('Error updating check:', error);
        toast.error('Failed to update check');
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

      const updatedChecks = [...checks];
      updatedChecks[checkIndex] = updatedCheck;

      setChecks(updatedChecks);
      toast.success('Check updated successfully');
      return updatedCheck;
    } catch (error) {
      console.error('Error in updateCheck:', error);
      toast.error('Failed to update check');
      return undefined;
    }
  };

  const deleteCheck = async (id: string) => {
    try {
      const { error } = await supabase
        .from('checks')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting check:', error);
        toast.error('Failed to delete check');
        return;
      }

      setChecks((prev) => prev.filter((check) => check.id !== id));
      toast.success('Check deleted successfully');
    } catch (error) {
      console.error('Error in deleteCheck:', error);
      toast.error('Failed to delete check');
    }
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
      }}
    >
      {children}
    </CheckContext.Provider>
  );
};
