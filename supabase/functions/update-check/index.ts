
// update-check edge function - directly updates check status in database
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
      headers: { 'X-Client-Info': 'update-check-edge-function' },
    },
  }
);

/**
 * Executes an HTTP request based on provided configuration
 */
async function executeHttpRequest(httpConfig: any) {
  console.log("Executing HTTP request with config:", JSON.stringify(httpConfig));
  
  try {
    const { url, method, params, headers } = httpConfig;
    
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
      headers: headers || {},
    };
    
    // Add request body for POST/PUT/PATCH requests
    if (params && ['POST', 'PUT', 'PATCH'].includes(method?.toUpperCase() || '')) {
      options.body = JSON.stringify(params);
      if (!options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const checkId = url.pathname.split('/').pop();
    
    console.log(`Processing check ID: ${checkId}`);
    
    if (!checkId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing check ID' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const now = new Date();
    
    // Get the check to determine next ping calculation
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
    
    // Calculate next ping due time
    let nextPingDue = new Date();
    if (checkData.cron_expression) {
      try {
        // Simple parsing for common minute-based CRON patterns
        if (checkData.cron_expression.startsWith('*/')) {
          const minutes = parseInt(checkData.cron_expression.split(' ')[0].substring(2), 10);
          nextPingDue = new Date(now.getTime() + minutes * 60 * 1000);
        } else {
          // Default to 60 minutes
          nextPingDue = new Date(now.getTime() + 60 * 60 * 1000);
        }
      } catch (error) {
        nextPingDue = new Date(now.getTime() + 60 * 60 * 1000);
      }
    } else {
      // Period-based
      nextPingDue = new Date(now.getTime() + checkData.period * 60 * 1000);
    }
    
    // Different handling based on check type
    let pingStatus = 'success';
    let responseCode = null;
    let method = null;
    let requestUrl = null;
    let duration = 0;
    let checkStatus = 'up';
    
    // If this is an HTTP request check, actively send the HTTP request
    if (checkData.type === 'http_request' && checkData.http_config) {
      // Parse HTTP config
      const httpConfig = typeof checkData.http_config === 'string' 
        ? JSON.parse(checkData.http_config) 
        : checkData.http_config;
      
      console.log("Processing HTTP request check with config:", JSON.stringify(httpConfig));
      
      if (httpConfig) {
        // Execute the HTTP request
        const result = await executeHttpRequest(httpConfig);
        
        // Set values based on results
        responseCode = result.status;
        method = result.method || httpConfig.method;
        requestUrl = result.url || httpConfig.url;
        duration = result.duration || 0;
        
        // Determine success based on the configured success codes
        const successCodes = Array.isArray(httpConfig.successCodes) 
          ? httpConfig.successCodes 
          : [200, 201, 202, 204]; // Default success codes
          
        console.log(`Response code: ${responseCode}, Success codes: ${successCodes}`);
        
        if (!result.success || !successCodes.includes(responseCode)) {
          pingStatus = 'failure';
          checkStatus = 'down';
          console.log(`HTTP request failed or returned non-success code: ${responseCode}`);
        }
      }
    } else {
      // Standard ping check - status will be set to "up"
      checkStatus = "up";
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
        message: checkData.type === 'http_request' 
          ? `HTTP request executed and status set to ${checkStatus.toUpperCase()}`
          : "Ping successfully received and processed, status set to UP",
        id: checkId,
        timestamp: now.toISOString(),
        check: updateData[0],
        pingStatus,
        responseCode,
        duration
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
