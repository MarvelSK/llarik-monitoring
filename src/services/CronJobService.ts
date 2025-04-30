import { supabase } from "@/integrations/supabase/client";
import { CronJob, CronJobExecution, EdgeFunctionLog } from "@/types/cron";
import { executeHttpRequest } from "@/utils/httpRequestUtils";

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
  // Process the job object to convert any Date objects to ISO strings
  const processedJob: Record<string, any> = {};
  
  // Copy all properties from job object but convert Date objects to ISO strings
  for (const [key, value] of Object.entries(job)) {
    if (value instanceof Date) {
      processedJob[key] = value.toISOString();
    } else {
      processedJob[key] = value;
    }
  }
  
  // Make sure required fields are present
  const submissionData = {
    ...processedJob,
    endpoint: processedJob.endpoint || '',
    method: processedJob.method || 'GET',
    name: processedJob.name || 'New CRON Job',
    schedule: processedJob.schedule || '* * * * *',
    created_by: (await supabase.auth.getSession()).data.session?.user.id
  };
  
  const { data, error } = await supabase
    .from('cron_jobs')
    .insert(submissionData)
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
    // Execute the HTTP request using our httpRequestUtils helper
    // This will handle CORS issues by using a standardized approach
    const startTime = performance.now();
    
    // Prepare the request config
    const config = {
      url: job.endpoint,
      method: job.method,
      headers: job.headers || {},
      params: job.parameters || {},
      body: job.body,
      successCodes: job.success_codes
    };
    
    // Add JWT token if provided
    if (job.jwt_token) {
      config.headers['Authorization'] = `Bearer ${job.jwt_token}`;
    }
    
    // Execute request using our utility function
    const response = await executeHttpRequest(config);
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    // Determine if the request was successful
    const isSuccess = response.status === 'success';
    
    // Update the execution record
    await supabase
      .from('cron_job_executions')
      .update({
        status: isSuccess ? 'success' : 'failed',
        status_code: response.statusCode,
        completed_at: new Date().toISOString(),
        duration,
        response: response.responseBody
      })
      .eq('id', executionId);
    
    // Update the job with the last run info
    await supabase
      .from('cron_jobs')
      .update({
        last_run: new Date().toISOString(),
        last_status: isSuccess ? 'success' : 'failed',
        last_response: response.responseBody,
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
