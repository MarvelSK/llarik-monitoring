
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
  })) as CronJob[];
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
  } as CronJob;
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
  } as CronJob;
}

export async function updateCronJob(id: string, job: Partial<Omit<CronJob, 'id' | 'created_at' | 'created_by'>>): Promise<void> {
  // Convert any Date objects to ISO strings for Supabase
  const processedJob: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(job)) {
    if (value instanceof Date) {
      processedJob[key] = value.toISOString();
    } else {
      processedJob[key] = value;
    }
  }
  
  const { error } = await supabase
    .from('cron_jobs')
    .update({
      ...processedJob,
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
  // Execute the CRON job directly from client-side
  const job = await fetchCronJob(id);
  
  // Create an execution record
  const { data: executionData } = await supabase
    .from('cron_job_executions')
    .insert({
      job_id: id,
      status: 'running',
      started_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (!executionData) {
    throw new Error("Failed to create execution record");
  }
  
  const executionId = executionData.id;
  
  try {
    // Execute the HTTP request directly
    const startTime = performance.now();
    
    // Prepare the request
    const url = new URL(job.endpoint);
    
    // Add query parameters if any
    if (job.parameters && Object.keys(job.parameters).length > 0) {
      Object.entries(job.parameters).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }
    
    // Prepare headers
    const headers: HeadersInit = new Headers();
    if (job.headers) {
      Object.entries(job.headers).forEach(([key, value]) => {
        headers.append(key, value);
      });
    }
    
    // Add JWT token if provided
    if (job.jwt_token) {
      headers.append('Authorization', `Bearer ${job.jwt_token}`);
    }
    
    // Create request options
    const requestOptions: RequestInit = {
      method: job.method,
      headers,
      credentials: 'omit', // Don't send cookies
    };
    
    // Add body for non-GET requests
    if (job.body && job.method !== 'GET' && job.method !== 'HEAD') {
      requestOptions.body = job.body;
    }
    
    // Execute request
    const response = await fetch(url.toString(), requestOptions);
    const responseText = await response.text();
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    // Determine if the request was successful
    const isSuccess = job.success_codes.includes(response.status);
    
    // Update the execution record
    await supabase
      .from('cron_job_executions')
      .update({
        status: isSuccess ? 'success' : 'failed',
        status_code: response.status,
        completed_at: new Date().toISOString(),
        duration,
        response: responseText
      })
      .eq('id', executionId);
    
    // Update the job with the last run info
    await supabase
      .from('cron_jobs')
      .update({
        last_run: new Date().toISOString(),
        last_status: isSuccess ? 'success' : 'failed',
        last_response: responseText,
        last_duration: duration
      })
      .eq('id', id);
      
  } catch (error) {
    console.error('Error executing CRON job:', error);
    
    // Update execution record with error
    await supabase
      .from('cron_job_executions')
      .update({
        status: 'error',
        completed_at: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      })
      .eq('id', executionId);
      
    // Update job with error status
    await supabase
      .from('cron_jobs')
      .update({
        last_run: new Date().toISOString(),
        last_status: 'error'
      })
      .eq('id', id);
      
    throw error;
  }
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
  })) as CronJobExecution[];
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
    } as EdgeFunctionLog;
  } catch (error) {
    console.error('Error fetching edge function logs:', error);
    return null;
  }
}
