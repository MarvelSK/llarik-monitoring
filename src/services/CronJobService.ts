
import { supabase } from "@/integrations/supabase/client";
import { CronJob, CronJobExecution, EdgeFunctionLog } from "@/types/cron";

export async function fetchCronJobs(): Promise<CronJob[]> {
  const { data, error } = await supabase
    .from('cron_jobs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(job => ({
    ...job,
    created_at: new Date(job.created_at),
    updated_at: new Date(job.updated_at),
    last_run: job.last_run ? new Date(job.last_run) : undefined,
    next_run: job.next_run ? new Date(job.next_run) : undefined
  }));
}

export async function fetchCronJob(id: string): Promise<CronJob> {
  const { data, error } = await supabase
    .from('cron_jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;

  return {
    ...data,
    created_at: new Date(data.created_at),
    updated_at: new Date(data.updated_at),
    last_run: data.last_run ? new Date(data.last_run) : undefined,
    next_run: data.next_run ? new Date(data.next_run) : undefined
  };
}

export async function createCronJob(job: Omit<CronJob, 'id' | 'created_at' | 'updated_at'>): Promise<CronJob> {
  const { data, error } = await supabase
    .from('cron_jobs')
    .insert({
      ...job,
      created_by: (await supabase.auth.getSession()).data.session?.user.id
    })
    .select()
    .single();

  if (error) throw error;

  return {
    ...data,
    created_at: new Date(data.created_at),
    updated_at: new Date(data.updated_at),
    last_run: data.last_run ? new Date(data.last_run) : undefined,
    next_run: data.next_run ? new Date(data.next_run) : undefined
  };
}

export async function updateCronJob(id: string, job: Partial<Omit<CronJob, 'id' | 'created_at' | 'created_by'>>): Promise<void> {
  const { error } = await supabase
    .from('cron_jobs')
    .update({
      ...job,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteCronJob(id: string): Promise<void> {
  const { error } = await supabase
    .from('cron_jobs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function triggerCronJob(id: string): Promise<void> {
  await supabase.functions.invoke('cron-request', {
    body: { jobId: id }
  });
}

export async function toggleCronJobStatus(id: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('cron_jobs')
    .update({ enabled })
    .eq('id', id);

  if (error) throw error;
}

export async function fetchCronJobExecutions(jobId: string): Promise<CronJobExecution[]> {
  const { data, error } = await supabase
    .from('cron_job_executions')
    .select('*')
    .eq('job_id', jobId)
    .order('started_at', { ascending: false });

  if (error) throw error;

  return data.map(execution => ({
    ...execution,
    started_at: new Date(execution.started_at),
    completed_at: execution.completed_at ? new Date(execution.completed_at) : undefined
  }));
}

export async function fetchLatestEdgeFunctionLog(): Promise<EdgeFunctionLog | null> {
  try {
    const { data, error } = await supabase
      .from('edge_function_logs')
      .select('*')
      .eq('function_name', 'cron-request')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) return null;
    
    return {
      ...data,
      timestamp: new Date(data.timestamp)
    };
  } catch (error) {
    console.error('Error fetching edge function logs:', error);
    return null;
  }
}
