// HTTP Request Check Edge Function
// This function sends HTTP requests and updates check status based on response
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// Define CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Create a Supabase client with the Admin key
const supabaseAdmin = createClient(
  'https://uxrrxefdpjyzyepnrfme.supabase.co',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  {
    global: {
      headers: { 'X-Client-Info': 'http-request-check-edge-function' },
    },
  }
);

/**
 * Executes an HTTP request based on provided configuration
 */
async function executeHttpRequest(httpConfig: any) {
  console.log("Executing HTTP request with config:", JSON.stringify(httpConfig));
  
  try {
    const { url, method, params, headers, body, auth } = httpConfig;
    
    if (!url) {
      return { 
        success: false, 
        status: 0,
        error: 'Missing URL in HTTP configuration' 
      };
    }
    
    // Prepare request options
    const options: RequestInit = {
      method: method || 'GET',
      headers: { ...(headers || {}) },
    };
    
    // Handle authentication
    if (auth) {
      if (auth.type === 'basic' && auth.username && auth.password) {
        const credentials = btoa(`${auth.username}:${auth.password}`);
        options.headers['Authorization'] = `Basic ${credentials}`;
      } else if (auth.type === 'bearer' && auth.token) {
        options.headers['Authorization'] = `Bearer ${auth.token}`;
      }
    }
    
    // Add request body for POST/PUT/PATCH requests
    if ((body || params) && ['POST', 'PUT', 'PATCH'].includes(method?.toUpperCase() || '')) {
      if (body) {
        // Use the raw body if provided
        options.body = body;
        if (!options.headers['Content-Type']) {
          options.headers['Content-Type'] = 'application/json';
        }
      } else if (params) {
        // Otherwise use params as JSON body
        options.body = JSON.stringify(params);
        if (!options.headers['Content-Type']) {
          options.headers['Content-Type'] = 'application/json';
        }
      }
    }
    
    // Add parameters to URL for GET requests
    let targetUrl = url;
    if (params && (method?.toUpperCase() === 'GET' || !method)) {
      const urlObj = new URL(url);
      Object.entries(params).forEach(([key, value]) => {
        urlObj.searchParams.append(key, value.toString());
      });
      targetUrl = urlObj.toString();
    }
    
    console.log(`Making ${options.method} request to ${targetUrl}`);
    const startTime = Date.now();
    
    const response = await fetch(targetUrl, options);
    const duration = Date.now() - startTime;
    
    return {
      success: true,
      status: response.status,
      duration: duration / 1000, // Convert to seconds
      url: targetUrl,
      method: options.method
    };
  } catch (error) {
    console.error("HTTP request execution failed:", error);
    return {
      success: false,
      status: 0,
      error: error.message
    };
  }
}

/**
 * Parse CRON expression to calculate next execution time
 * Simple implementation for common patterns
 */
function calculateNextExecutionFromCron(cronExpression: string, fromTime: Date = new Date()): Date {
  console.log(`Calculating next execution time from CRON: ${cronExpression}`);
  
  try {
    // Simple parsing for common minute-based CRON patterns
    if (cronExpression.startsWith('*/')) {
      const minuteParts = cronExpression.split(' ');
      if (minuteParts.length > 0) {
        const minutes = parseInt(minuteParts[0].substring(2), 10);
        if (!isNaN(minutes) && minutes > 0) {
          return new Date(fromTime.getTime() + minutes * 60 * 1000);
        }
      }
    }
    
    // Default fallback for more complex CRON patterns
    // In a production app, you would use a more robust CRON parser
    return new Date(fromTime.getTime() + 60 * 60 * 1000); // Default to 1 hour
  } catch (error) {
    console.error("Error parsing CRON expression:", error);
    return new Date(fromTime.getTime() + 60 * 60 * 1000); // Default to 1 hour
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const checkId = url.pathname.split('/').pop();
    
    console.log(`Processing HTTP request check ID: ${checkId}`);
    
    if (!checkId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing check ID' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const now = new Date();
    
    // Get the check to determine next ping calculation and HTTP config
    const { data: checkData, error: checkError } = await supabaseAdmin
      .from('checks')
      .select('*')
      .eq('id', checkId)
      .single();
      
    if (checkError || !checkData) {
      console.error('Check not found:', checkError);
      return new Response(
        JSON.stringify({ success: false, error: 'Check not found' }),
        { status: 404, headers: corsHeaders }
      );
    }
    
    // Verify this is an HTTP request type check
    if (checkData.type !== 'http_request' || !checkData.http_config) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not an HTTP request check or missing HTTP config' }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Calculate next ping due time based on CRON or period
    let nextPingDue = new Date();
    if (checkData.cron_expression && checkData.cron_expression.trim() !== '') {
      // Calculate next execution from CRON expression
      nextPingDue = calculateNextExecutionFromCron(checkData.cron_expression, now);
      console.log(`Next ping due (CRON): ${nextPingDue.toISOString()}`);
    } else if (checkData.period > 0) {
      // Use period-based scheduling
      nextPingDue = new Date(now.getTime() + checkData.period * 60 * 1000);
      console.log(`Next ping due (period): ${nextPingDue.toISOString()}`);
    } else {
      // Default fallback
      nextPingDue = new Date(now.getTime() + 60 * 60 * 1000); // Default to 1 hour
      console.log(`Next ping due (default): ${nextPingDue.toISOString()}`);
    }
    
    // Parse HTTP config
    const httpConfig = typeof checkData.http_config === 'string' 
      ? JSON.parse(checkData.http_config) 
      : checkData.http_config;
    
    // Execute the HTTP request
    console.log("Processing HTTP request check with config:", JSON.stringify(httpConfig));
    const result = await executeHttpRequest(httpConfig);
    
    // Set values based on results
    const responseCode = result.status;
    const method = result.method || httpConfig.method;
    const requestUrl = result.url || httpConfig.url;
    const duration = result.duration || 0;
    
    // Determine success based on the configured success codes
    const successCodes = Array.isArray(httpConfig.successCodes) 
      ? httpConfig.successCodes 
      : [200, 201, 202, 204]; // Default success codes
      
    console.log(`Response code: ${responseCode}, Success codes: ${successCodes}`);
    
    let pingStatus = 'success';
    let checkStatus = 'up';
    
    if (!result.success || !successCodes.includes(responseCode)) {
      pingStatus = 'failure';
      checkStatus = 'down';
      console.log(`HTTP request failed or returned non-success code: ${responseCode}`);
    }
    
    // Add ping record with HTTP details
    const { error: pingError } = await supabaseAdmin
      .from('check_pings')
      .insert({
        check_id: checkId,
        status: pingStatus,
        timestamp: now.toISOString(),
        duration: duration,
        response_code: responseCode,
        method: method,
        request_url: requestUrl
      });
      
    if (pingError) {
      console.error('Error adding ping:', pingError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to record ping' }),
        { status: 500, headers: corsHeaders }
      );
    }
    
    // Update the check with latest ping info and status
    const { error: updateError, data: updateData } = await supabaseAdmin
      .from('checks')
      .update({
        last_ping: now.toISOString(),
        next_ping_due: nextPingDue.toISOString(),
        status: checkStatus,
        last_duration: duration
      })
      .eq('id', checkId)
      .select('status, last_ping, last_duration');
      
    if (updateError) {
      console.error('Error updating check:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update check' }),
        { status: 500, headers: corsHeaders }
      );
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `HTTP request executed and status set to ${checkStatus.toUpperCase()}`,
        id: checkId,
        timestamp: now.toISOString(),
        check: updateData[0],
        pingStatus,
        responseCode,
        duration,
        nextPingDue: nextPingDue.toISOString()
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
