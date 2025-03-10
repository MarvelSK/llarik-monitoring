
import { Check, CheckPing, CheckStatus } from "@/types/check";
import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { addMinutes, isBefore, isPast } from "date-fns";
import { toast } from "sonner";
import { Integration } from "@/types/integration";
import { useCompanies } from "./CompanyContext";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface CheckContextType {
  checks: Check[];
  getCheck: (id: string) => Check | undefined;
  createCheck: (check: Partial<Check>) => Promise<Check>;
  updateCheck: (id: string, check: Partial<Check>) => Promise<Check | undefined>;
  deleteCheck: (id: string) => Promise<void>;
  pingCheck: (id: string, status: CheckPing["status"]) => Promise<void>;
  getPingUrl: (id: string) => string;
  getChecksByCompany: (companyId: string) => Check[];
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

export const CheckProvider = ({ children }: CheckProviderProps) => {
  const { currentCompany, user } = useCompanies();
  const { user: authUser } = useAuth();
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Load checks from Supabase
  useEffect(() => {
    const fetchChecks = async () => {
      if (!authUser) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        let query = supabase.from('checks').select('*');
        
        // Filter by company if not admin or if company is selected
        if (!authUser.is_admin || (authUser.is_admin && currentCompany)) {
          const companyId = currentCompany?.id || authUser.company_id;
          if (companyId) {
            query = query.eq('company_id', companyId);
          }
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error("Error fetching checks:", error);
          toast.error("Failed to load checks");
          setLoading(false);
          return;
        }
        
        if (data) {
          // Fetch pings for each check
          const checksWithPings = await Promise.all(data.map(async (check) => {
            const { data: pingData, error: pingError } = await supabase
              .from('check_pings')
              .select('*')
              .eq('check_id', check.id)
              .order('timestamp', { ascending: false })
              .limit(100);
              
            if (pingError) {
              console.error("Error fetching pings:", pingError);
            }
            
            const pings: CheckPing[] = (pingData || []).map(ping => ({
              id: ping.id,
              timestamp: new Date(ping.timestamp),
              status: ping.status as CheckPing["status"],
            }));
            
            // Create a properly mapped Check object
            const checkData: Check = {
              id: check.id,
              name: check.name,
              description: check.description,
              status: "up", // Will be recalculated below
              tags: check.tags || [],
              environments: check.environments || [],
              period: check.period,
              grace: check.grace,
              lastPing: check.last_ping ? new Date(check.last_ping) : undefined,
              nextPingDue: check.next_ping_due ? new Date(check.next_ping_due) : undefined,
              pings: pings,
              cronExpression: check.cron_expression,
              createdAt: new Date(check.created_at),
              lastDuration: check.last_duration,
              companyId: check.company_id,
            };
            
            // Calculate the correct status
            checkData.status = calculateCheckStatus(checkData);
            
            return checkData;
          }));
          
          setChecks(checksWithPings);
        }
      } catch (err) {
        console.error("Error loading checks:", err);
        toast.error("An error occurred while loading checks");
      } finally {
        setLoading(false);
      }
    };

    fetchChecks();
    
    // Set up real-time subscription for checks updates
    const checkSubscription = supabase
      .channel('checks-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'checks' }, 
        () => {
          fetchChecks();
        }
      )
      .subscribe();
      
    return () => {
      checkSubscription.unsubscribe();
    };
  }, [authUser, currentCompany]);

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

  const createCheck = async (checkData: Partial<Check>) => {
    if (!currentCompany && !checkData.companyId) {
      toast.error('No company selected for this check');
      throw new Error('No company selected for this check');
    }
    
    try {
      const companyId = checkData.companyId || (currentCompany ? currentCompany.id : '');
      
      // Insert into Supabase
      const { data, error } = await supabase
        .from('checks')
        .insert({
          name: checkData.name || "Untitled Check",
          description: checkData.description,
          status: "new",
          period: checkData.period || 60,
          grace: checkData.grace || 30,
          tags: checkData.tags || [],
          environments: checkData.environments || [],
          cron_expression: checkData.cronExpression,
          company_id: companyId,
        })
        .select()
        .single();
        
      if (error) {
        console.error("Error creating check:", error);
        toast.error("Failed to create check");
        throw error;
      }
      
      if (!data) {
        throw new Error("No data returned from check creation");
      }
      
      // Map DB fields to Check type fields
      const newCheck: Check = {
        id: data.id,
        name: data.name,
        description: data.description,
        status: "new",
        period: data.period,
        grace: data.grace,
        tags: data.tags || [],
        environments: data.environments || [],
        cronExpression: data.cron_expression,
        pings: [],
        createdAt: new Date(data.created_at),
        companyId: data.company_id,
        lastDuration: data.last_duration,
      };

      setChecks((prev) => [...prev, newCheck]);
      toast.success('Check created successfully');
      return newCheck;
    } catch (error) {
      console.error("Error in createCheck:", error);
      throw error;
    }
  };

  const pingCheck = async (id: string, status: CheckPing["status"]) => {
    const check = checks.find((c) => c.id === id);
    if (!check) return;

    try {
      const now = new Date();
      
      // Create a new ping in Supabase
      const { data: pingData, error: pingError } = await supabase
        .from('check_pings')
        .insert({
          check_id: id,
          status,
        })
        .select()
        .single();
        
      if (pingError) {
        console.error("Error creating ping:", pingError);
        toast.error("Failed to record ping");
        return;
      }
      
      const nextPingDue = addMinutes(now, check.period);

      // Update the check in Supabase
      const { error: checkError } = await supabase
        .from('checks')
        .update({
          last_ping: now.toISOString(),
          next_ping_due: nextPingDue.toISOString(),
          status: "up",
        })
        .eq('id', id);
        
      if (checkError) {
        console.error("Error updating check after ping:", checkError);
        toast.error("Failed to update check status");
        return;
      }
      
      const newPing: CheckPing = {
        id: pingData.id,
        timestamp: new Date(pingData.timestamp),
        status,
      };

      const updatedCheck: Check = {
        ...check,
        lastPing: now,
        nextPingDue,
        status: "up",
        pings: [newPing, ...check.pings].slice(0, 100),
      };

      setChecks(prev => prev.map(c => c.id === id ? updatedCheck : c));
      toast.success('Ping received successfully');
      
      // If status changed from down to up, trigger integrations
      if (check.status === 'down' || check.status === 'grace') {
        triggerIntegrations(id, 'up');
      }
    } catch (error) {
      console.error("Error in pingCheck:", error);
    }
  };

  const updateCheck = async (id: string, checkData: Partial<Check>) => {
    const checkIndex = checks.findIndex((c) => c.id === id);
    if (checkIndex === -1) return undefined;

    try {
      const check = checks[checkIndex];
      
      // Prepare data for Supabase update
      const updateData: any = {};
      
      if (checkData.name !== undefined) updateData.name = checkData.name;
      if (checkData.description !== undefined) updateData.description = checkData.description;
      if (checkData.period !== undefined) updateData.period = checkData.period;
      if (checkData.grace !== undefined) updateData.grace = checkData.grace;
      if (checkData.tags !== undefined) updateData.tags = checkData.tags;
      if (checkData.environments !== undefined) updateData.environments = checkData.environments;
      if (checkData.cronExpression !== undefined) updateData.cron_expression = checkData.cronExpression;
      
      // Update in Supabase
      const { error } = await supabase
        .from('checks')
        .update(updateData)
        .eq('id', id);
        
      if (error) {
        console.error("Error updating check:", error);
        toast.error("Failed to update check");
        throw error;
      }

      const updatedCheck = {
        ...check,
        ...checkData,
        status: calculateCheckStatus({
          ...check,
          ...checkData,
        }),
      };

      const updatedChecks = [...checks];
      updatedChecks[checkIndex] = updatedCheck;

      setChecks(updatedChecks);
      toast.success("Check updated successfully");
      return updatedCheck;
    } catch (error) {
      console.error("Error in updateCheck:", error);
      throw error;
    }
  };

  const deleteCheck = async (id: string) => {
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('checks')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error("Error deleting check:", error);
        toast.error("Failed to delete check");
        throw error;
      }
      
      setChecks((prev) => prev.filter((check) => check.id !== id));
      toast.success("Check deleted successfully");
    } catch (error) {
      console.error("Error in deleteCheck:", error);
      throw error;
    }
  };

  return (
    <CheckContext.Provider
      value={{
        checks: user?.is_admin 
          ? (currentCompany 
              ? checks.filter(check => check.companyId === currentCompany.id) 
              : checks)
          : (currentCompany 
              ? checks.filter(check => check.companyId === currentCompany.id) 
              : []),
        loading,
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
