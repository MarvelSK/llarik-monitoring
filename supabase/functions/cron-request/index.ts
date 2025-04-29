
// cron-request edge function - executes HTTP requests and updates check status
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
      headers: { 'X-Client-Info': 'cron-request-edge-function' },
    },
  }
);

// Helper function to append query parameters to a URL
function appendQueryParams(url: string, params: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) return url;
  
  const urlObj = new URL(url);
  Object.entries(params).forEach(([key, value]) => {
    urlObj.searchParams.append(key, value);
  });
  
  return urlObj.toString();
}

// Helper function to build Authorization header based on auth config
function buildAuthHeader(auth: any): Record<string, string> {
  if (!auth || !auth.type || auth.type === 'none') {
    return {};
  }
  
  if (auth.type === 'basic' && auth.username && auth.password) {
    const credentials = btoa(`${auth.username}:${auth.password}`);
    return { 'Authorization': `Basic ${credentials}` };
  }
  
  if (auth.type === 'bearer' && auth.token) {
    return { 'Authorization': `Bearer ${auth.token}` };
  }
  
  return {};
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Parse request body
    let checkId;
    
    try {
      const body = await req.json();
      checkId = body.checkId;
    } catch (error) {
      console.error('Error parsing request body:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid request body - expected JSON with checkId' 
        }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    if (!checkId) {
      return new Response(
        JSON.stringify({ error: 'Check ID is required' }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Fetch the check details
    console.log(`Processing HTTP request check for check ID: ${checkId}`);
    const { data: check, error: checkError } = await supabaseAdmin
      .from('checks')
      .select('*')
      .eq('id', checkId)
      .single();
      
    if (checkError || !check) {
      console.error(`Error fetching check ${checkId}:`, checkError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Check not found: ${checkError?.message || 'Unknown error'}` 
        }),
        { status: 404, headers: corsHeaders }
      );
    }
    
    // Verify this is an HTTP request check
    if (check.type !== 'http_request') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'This is not an HTTP request check'
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Parse HTTP config
    let httpConfig;
    try {
      httpConfig = typeof check.http_config === 'string' 
        ? JSON.parse(check.http_config) 
        : check.http_config;
      
      if (!httpConfig || !httpConfig.url) {
        throw new Error('Invalid HTTP configuration');
      }
    } catch (error) {
      console.error(`Invalid HTTP config for check ${checkId}:`, error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid HTTP configuration: ${error.message}` 
        }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    console.log(`Executing HTTP request to: ${httpConfig.url} with method: ${httpConfig.method}`);
    
    // Prepare request URL with query parameters
    const requestUrl = appendQueryParams(httpConfig.url, httpConfig.params || {});
    
    // Prepare request headers
    const headers = {
      ...httpConfig.headers,
      ...buildAuthHeader(httpConfig.auth)
    };
    
    // Prepare request body for methods that support it
    const bodyMethods = ['POST', 'PUT', 'PATCH'];
    const requestOptions: RequestInit = {
      method: httpConfig.method || 'GET',
      headers,
      redirect: 'follow',
    };
    
    if (bodyMethods.includes(httpConfig.method) && httpConfig.body) {
      try {
        // Try to parse as JSON first
        const contentType = headers['Content-Type'] || headers['content-type'];
        
        if (contentType && contentType.includes('application/json')) {
          requestOptions.body = typeof httpConfig.body === 'string' 
            ? httpConfig.body 
            : JSON.stringify(httpConfig.body);
        } else {
          // Plain text or other format
          requestOptions.body = httpConfig.body.toString();
        }
      } catch (error) {
        console.warn(`Warning: Could not process request body: ${error.message}`);
        requestOptions.body = httpConfig.body.toString();
      }
    }

    // Set a timeout for the request
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    requestOptions.signal = controller.signal;
    
    // Execute the HTTP request
    const startTime = Date.now();
    try {
      console.log(`Making ${httpConfig.method} request to: ${requestUrl}`);
      if (requestOptions.body) {
        console.log(`With body: ${typeof requestOptions.body === 'string' ? requestOptions.body : JSON.stringify(requestOptions.body)}`);
      }
      
      const response = await fetch(requestUrl, requestOptions);
      clearTimeout(timeout);
      
      const duration = Date.now() - startTime;
      const responseStatus = response.status;
      let responseText;
      
      try {
        responseText = await response.text();
        console.log(`Response status: ${responseStatus}, length: ${responseText.length} chars`);
      } catch (error) {
        console.error('Error reading response text:', error);
        responseText = `Error reading response: ${error.message}`;
      }
      
      // Determine if the response is successful based on configured success codes
      const successCodes = httpConfig.successCodes || [200, 201, 202, 204];
      const isSuccess = successCodes.includes(responseStatus);
      
      // Add ping record
      const { error: pingError } = await supabaseAdmin
        .from('check_pings')
        .insert({
          check_id: checkId,
          status: isSuccess ? 'success' : 'failure',
          timestamp: new Date().toISOString(),
          duration,
          response_code: responseStatus,
          request_url: requestUrl,
          method: httpConfig.method
        });
        
      if (pingError) {
        console.error('Error recording ping:', pingError);
      }
      
      // Update the check status
      const now = new Date();
      let nextPingDue;
      
      if (check.cron_expression) {
        // Simple CRON handling (would need a proper library in production)
        try {
          if (check.cron_expression.startsWith('*/')) {
            const minutes = parseInt(check.cron_expression.split(' ')[0].substring(2), 10);
            nextPingDue = new Date(now.getTime() + minutes * 60 * 1000);
          } else {
            // Default to 60 minutes for complex CRON expressions
            nextPingDue = new Date(now.getTime() + 60 * 60 * 1000);
          }
        } catch (error) {
          nextPingDue = new Date(now.getTime() + 60 * 60 * 1000);
        }
      } else {
        // Period-based
        nextPingDue = new Date(now.getTime() + check.period * 60 * 1000);
      }
      
      // Update the check with latest ping info and status
      const { error: updateError } = await supabaseAdmin
        .from('checks')
        .update({
          last_ping: now.toISOString(),
          next_ping_due: nextPingDue.toISOString(),
          status: isSuccess ? 'up' : 'down',
          last_duration: duration / 1000 // Convert to seconds
        })
        .eq('id', checkId);
        
      if (updateError) {
        console.error('Error updating check:', updateError);
      }
      
      // Prepare response
      return new Response(
        JSON.stringify({
          success: true,
          message: `HTTP request successfully executed`,
          status: isSuccess ? 'success' : 'failure',
          responseCode: responseStatus,
          responseTime: duration,
          responseBody: responseText.substring(0, 1000), // Include a snippet of the response
          check: {
            id: checkId,
            status: isSuccess ? 'up' : 'down',
            lastPing: now.toISOString(),
            nextPingDue: nextPingDue.toISOString(),
            lastDuration: duration / 1000 // Convert to seconds
          }
        }),
        { status: 200, headers: corsHeaders }
      );
    } catch (error) {
      clearTimeout(timeout);
      console.error(`HTTP request failed: ${error.message}`);
      
      // Record failed ping
      const duration = Date.now() - startTime;
      const { error: pingError } = await supabaseAdmin
        .from('check_pings')
        .insert({
          check_id: checkId,
          status: 'failure',
          timestamp: new Date().toISOString(),
          duration,
          request_url: requestUrl,
          method: httpConfig.method
        });
        
      // Update check status to down
      const now = new Date();
      const nextPingDue = new Date(now.getTime() + check.period * 60 * 1000);
      
      const { error: updateError } = await supabaseAdmin
        .from('checks')
        .update({
          last_ping: now.toISOString(),
          next_ping_due: nextPingDue.toISOString(),
          status: 'down',
          last_duration: duration / 1000 // Convert to seconds
        })
        .eq('id', checkId);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `HTTP request failed: ${error.message}`,
          check: {
            id: checkId,
            status: 'down',
            lastPing: now.toISOString(),
            nextPingDue: nextPingDue.toISOString()
          }
        }),
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('Error processing HTTP request check:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Error processing HTTP request check: ${error.message}` 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
