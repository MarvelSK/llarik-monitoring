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
    // Handle empty cron expressions
    if (!cronExpression || cronExpression.trim() === '') {
      throw new Error('Empty CRON expression');
    }
    
    // Validate CRON expression format
    const parts = cronExpression.trim().split(' ');
    if (parts.length < 5) {
      throw new Error(`Invalid CRON expression format: ${cronExpression}`);
    }
    
    // Sanitize cron parts to prevent parsing errors
    for (let i = 0; i < parts.length; i++) {
      // Check for */number format and ensure the number is reasonable
      if (parts[i].startsWith('*/')) {
        const value = parseInt(parts[i].substring(2), 10);
        
        // Apply reasonable limits based on field position
        if (i === 0 && (isNaN(value) || value > 59)) parts[i] = '*/15'; // minute
        if (i === 1 && (isNaN(value) || value > 23)) parts[i] = '*/1';  // hour
        if (i === 2 && (isNaN(value) || value > 28)) parts[i] = '*/1';  // day of month
        if (i === 3 && (isNaN(value) || value > 12)) parts[i] = '*/1';  // month
        if (i === 4 && (isNaN(value) || value > 7))  parts[i] = '*/1';  // day of week
      }
      // Check for numeric values within range
      else if (!/^\*$/.test(parts[i]) && !/^[0-9\-,\/]+$/.test(parts[i])) {
        parts[i] = '*'; // Replace invalid entries with * (any)
      }
    }
    
    const sanitizedCron = parts.join(' ');
    
    // Handle common interval patterns like */15 * * * * (every 15 minutes)
    if (parts[0].startsWith('*/')) {
      const minutes = parseInt(parts[0].substring(2), 10);
      
      if (!isNaN(minutes) && minutes > 0 && minutes <= 59) {
        // For minute-based intervals
        const nextTime = new Date(fromTime);
        nextTime.setSeconds(0);
        nextTime.setMilliseconds(0);
        
        const currentMinute = nextTime.getMinutes();
        const remainder = currentMinute % minutes;
        
        // Set to next interval
        nextTime.setMinutes(currentMinute + (minutes - remainder));
        
        return nextTime;
      }
    }
    
    // For numeric patterns (e.g., "15 * * * *" - at minute 15 of every hour)
    if (!isNaN(parseInt(parts[0], 10)) && parts[1] === '*') {
      const minute = parseInt(parts[0], 10);
      if (minute >= 0 && minute <= 59) {
        const nextTime = new Date(fromTime);
        const currentMinute = nextTime.getMinutes();
        
        nextTime.setSeconds(0);
        nextTime.setMilliseconds(0);
        
        if (currentMinute >= minute) {
          // If we've already passed this minute in the current hour, go to next hour
          nextTime.setHours(nextTime.getHours() + 1);
        }
        
        nextTime.setMinutes(minute);
        return nextTime;
      }
    }
    
    // Default fallback - add one hour if we can't parse the expression
    console.log("Using simple default for CRON calculation");
    return new Date(fromTime.getTime() + 60 * 60 * 1000);
  } catch (error) {
    console.error("Error parsing CRON expression:", error);
    // Default fallback - add one hour
    return new Date(fromTime.getTime() + 60 * 60 * 1000);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    // Extract checkId from URL path or request body
    let checkId;
    
    try {
      const url = new URL(req.url);
      const pathCheckId = url.pathname.split('/').pop();
      
      if (pathCheckId && pathCheckId.length > 10) {
        // If we have a valid-looking ID in the path, use it
        checkId = pathCheckId;
      } else {
        // Otherwise try to get it from the request body
        const body = await req.json();
        checkId = body.checkId;
      }
    } catch (error) {
      // If JSON parsing fails, try one more time with form data
      try {
        const formData = await req.formData();
        checkId = formData.get('checkId');
      } catch (formError) {
        console.error('Failed to extract checkId:', formError);
      }
    }
    
    if (!checkId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing check ID' }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    console.log(`Processing HTTP request check ID: ${checkId}`);
    
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
      try {
        // Calculate next execution from CRON expression
        nextPingDue = calculateNextExecutionFromCron(checkData.cron_expression, now);
        console.log(`Next ping due (CRON): ${nextPingDue.toISOString()}`);
      } catch (error) {
        console.error("Error calculating from CRON, using period-based timing:", error);
        // Fallback to period-based if CRON parsing fails
        const periodMinutes = checkData.period > 0 ? checkData.period : 60;
        nextPingDue = new Date(now.getTime() + periodMinutes * 60 * 1000);
        console.log(`Fallback next ping due (period): ${nextPingDue.toISOString()}`);
      }
    } else if (checkData.period > 0) {
      // Use period-based scheduling
      nextPingDue = new Date(now.getTime() + checkData.period * 60 * 1000);
      console.log(`Next ping due (period): ${nextPingDue.toISOString()}`);
    } else {
      // Default fallback - 1 hour
      nextPingDue = new Date(now.getTime() + 60 * 60 * 1000);
      console.log(`Next ping due (default): ${nextPingDue.toISOString()}`);
    }
    
    // Parse HTTP config
    let httpConfig;
    try {
      httpConfig = typeof checkData.http_config === 'string' 
        ? JSON.parse(checkData.http_config) 
        : checkData.http_config;
    } catch (error) {
      console.error('Error parsing HTTP config:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid HTTP configuration format' }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Execute the HTTP request
    console.log("Processing HTTP request check with config:", JSON.stringify(httpConfig));
    const result = await executeHttpRequest(httpConfig);
    
    // Set values based on results
    const responseCode = result.status;
    const method = result.method || httpConfig.method || 'GET';
    const requestUrl = result.url || httpConfig.url;
    const duration = result.duration || 0;
    
    // Determine success based on the configured success codes
    const successCodes = Array.isArray(httpConfig.successCodes) && httpConfig.successCodes.length > 0
      ? httpConfig.successCodes 
      : [200, 201, 202, 204]; // Default success codes
      
    console.log(`Response code: ${responseCode}, Success codes: ${successCodes}`);
    
    let pingStatus: 'success' | 'failure' = 'success';
    let checkStatus: 'up' | 'down' | 'grace' | 'new' = 'up';
    
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
      JSON.stringify({ success: false, error: 'Internal server error', message: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
