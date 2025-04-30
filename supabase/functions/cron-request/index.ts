
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.40.0'
import { Database } from '../_shared/database.types.ts'
import { cron } from 'https://deno.land/x/deno_cron@v1.0.0/cron.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create Supabase client
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://uxrrxefdpjyzyepnrfme.supabase.co'
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4cnJ4ZWZkcGp5enllcG5yZm1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2MzA2OTMsImV4cCI6MjA1NzIwNjY5M30.FjUzbKTRfBByila6emaaCRB5zN5S6hkT0KzQSCSGLAU'
const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)

async function logToDatabase(functionName: string, level: string, message: string) {
  try {
    await supabase.from('edge_function_logs').insert({
      function_name: functionName,
      log_level: level,
      message: message
    })
  } catch (error) {
    console.error('Error logging to database:', error)
  }
}

async function executeJob(jobId: string) {
  const startTime = Date.now()
  let executionId = crypto.randomUUID()
  
  try {
    // Log job execution start
    await logToDatabase('cron-request', 'info', `Starting execution of job: ${jobId}`)
    
    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('cron_jobs')
      .select('*')
      .eq('id', jobId)
      .single()
      
    if (jobError || !job) {
      await logToDatabase('cron-request', 'error', `Job not found: ${jobId} - ${jobError?.message}`)
      return
    }

    // Create execution record
    const { data: execution, error: executionError } = await supabase
      .from('cron_job_executions')
      .insert({
        id: executionId,
        job_id: jobId,
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (executionError) {
      await logToDatabase('cron-request', 'error', `Failed to create execution record: ${executionError.message}`)
    }
    
    // Prepare request options
    const options: RequestInit = {
      method: job.method,
      headers: job.headers || {},
    }
    
    // Add body for non-GET requests
    if (job.body && job.method !== 'GET' && job.method !== 'HEAD') {
      options.body = job.body
    }
    
    // Add JWT if specified
    if (job.jwt_token) {
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${job.jwt_token}`
      }
    }
    
    // Build URL with parameters
    let url = job.endpoint
    if (job.parameters && Object.keys(job.parameters).length > 0) {
      const urlObj = new URL(url)
      Object.entries(job.parameters).forEach(([key, value]) => {
        urlObj.searchParams.append(key, String(value))
      })
      url = urlObj.toString()
    }
    
    // Execute the request with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000) // 30 second timeout
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })
      
      clearTimeout(timeout)
      
      const responseText = await response.text()
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Check if status code is in success codes
      const isSuccess = job.success_codes.includes(response.status)
      const status = isSuccess ? 'success' : 'failed'
      
      // Update job
      await supabase
        .from('cron_jobs')
        .update({
          last_run: new Date().toISOString(),
          last_status: status,
          last_response: responseText.substring(0, 1000), // Limit response size
          last_duration: duration
        })
        .eq('id', jobId)
      
      // Update execution record
      await supabase
        .from('cron_job_executions')
        .update({
          status: status,
          completed_at: new Date().toISOString(),
          duration: duration,
          response: responseText.substring(0, 1000), // Limit response size
          status_code: response.status
        })
        .eq('id', executionId)
      
      await logToDatabase(
        'cron-request', 
        isSuccess ? 'info' : 'warning', 
        `Job ${jobId} completed with status ${status}, code ${response.status}, duration ${duration}ms`
      )
      
    } catch (error) {
      clearTimeout(timeout)
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Handle request errors
      await supabase
        .from('cron_jobs')
        .update({
          last_run: new Date().toISOString(),
          last_status: 'error',
          last_duration: duration
        })
        .eq('id', jobId)
        
      // Update execution record with error
      await supabase
        .from('cron_job_executions')
        .update({
          status: 'error',
          completed_at: new Date().toISOString(),
          duration: duration,
          error: error instanceof Error ? error.message : String(error)
        })
        .eq('id', executionId)
      
      await logToDatabase('cron-request', 'error', `Job ${jobId} failed: ${error instanceof Error ? error.message : String(error)}`)
    }
    
  } catch (error) {
    await logToDatabase('cron-request', 'error', `Unhandled error for job ${jobId}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Endpoint handler
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    // Manual trigger of a job
    if (req.method === 'POST') {
      const body = await req.json()
      const { jobId } = body
      
      if (!jobId) {
        return new Response(
          JSON.stringify({ error: 'Job ID is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      
      // Execute the job in the background
      executeJob(jobId).catch(console.error)
      
      return new Response(
        JSON.stringify({ message: 'Job triggered successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Scheduled trigger (cron scheduler)
    if (req.method === 'GET') {
      // Log function invocation
      await logToDatabase('cron-request', 'info', 'Scheduled function triggered')
      
      // Find all enabled jobs
      const { data: jobs, error } = await supabase
        .from('cron_jobs')
        .select('*')
        .eq('enabled', true)
      
      if (error) {
        await logToDatabase('cron-request', 'error', `Failed to fetch jobs: ${error.message}`)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch jobs' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
      
      if (!jobs || jobs.length === 0) {
        return new Response(
          JSON.stringify({ message: 'No jobs to process' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      const now = new Date()
      let jobsToRun = 0
      
      // Process each job
      for (const job of jobs) {
        // Skip jobs without next run time or schedule
        if (!job.schedule) continue
        
        // Check if job is due or overdue
        if (!job.next_run || new Date(job.next_run) <= now) {
          jobsToRun++
          // Run the job asynchronously (don't await)
          executeJob(job.id).catch(console.error)
        }
      }
      
      return new Response(
        JSON.stringify({ message: `Processed ${jobs.length} jobs, executed ${jobsToRun} due jobs` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    )
  } catch (error) {
    await logToDatabase('cron-request', 'error', `Unhandled server error: ${error instanceof Error ? error.message : String(error)}`)
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
