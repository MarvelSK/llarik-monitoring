
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

interface HttpConfig {
  url: string;
  method: string;
  successCodes: number[];
  params?: Record<string, string>;
  headers?: Record<string, string>;
  body?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting cron-request execution");
    
    // Get all checks with HTTP configuration
    const { data: checks, error: checksError } = await supabaseAdmin
      .from('checks')
      .select('*')
      .not('http_config', 'is', null)
      .order('created_at', { ascending: false });
      
    if (checksError) {
      console.error('Error fetching checks:', checksError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch checks' }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`Found ${checks.length} checks with HTTP configuration`);
    
    const now = new Date();
    const results = [];

    for (const check of checks) {
      try {
        console.log(`Processing check: ${check.name} (${check.id})`);
        
        // Parse HTTP configuration
        const httpConfig: HttpConfig = JSON.parse(check.http_config);
        
        if (!httpConfig || !httpConfig.url) {
          console.warn(`Skip check ${check.id}: Missing or invalid HTTP configuration`);
          continue;
        }
        
        console.log(`Executing HTTP request to ${httpConfig.url}`);
        
        // Execute the HTTP request
        const startTime = Date.now();
        const response = await executeHttpRequest(httpConfig);
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000; // Convert to seconds
        
        console.log(`Request completed with status: ${response.status}, HTTP code: ${response.statusCode}`);
        
        // Add ping record
        const { error: pingError } = await supabaseAdmin
          .from('check_pings')
          .insert({
            check_id: check.id,
            status: response.success ? 'success' : 'failure',
            timestamp: now.toISOString(),
            duration: duration,
            payload: JSON.stringify({
              statusCode: response.statusCode,
              responseTime: response.responseTime,
              responseBody: response.responseBody?.substring(0, 1000) // Limit response size
            })
          });
          
        if (pingError) {
          console.error(`Error adding ping for check ${check.id}:`, pingError);
        }
        
        // Calculate next ping due time
        let nextPingDue = new Date();
        
        if (check.cron_expression) {
          try {
            // Simple cron parsing logic - this is a placeholder
            // In production, you would use a proper cron parser
            nextPingDue = new Date(now.getTime() + 120 * 1000); // Default to 2 minutes for now
          } catch (error) {
            console.error(`Error parsing CRON for check ${check.id}:`, error);
            nextPingDue = new Date(now.getTime() + 120 * 1000); // Default to 2 minutes
          }
        } else {
          // Use period from the check (in minutes)
          nextPingDue = new Date(now.getTime() + (check.period || 2) * 60 * 1000);
        }
        
        // Update check status based on the response
        const status = response.success ? "up" : "down";
        
        // Update the check record
        const { error: updateError } = await supabaseAdmin
          .from('checks')
          .update({
            status: status,
            last_ping: now.toISOString(),
            next_ping_due: nextPingDue.toISOString(),
            last_duration: duration
          })
          .eq('id', check.id);
          
        if (updateError) {
          console.error(`Error updating check ${check.id}:`, updateError);
        }
        
        results.push({
          check_id: check.id,
          name: check.name,
          url: httpConfig.url,
          success: response.success,
          status_code: response.statusCode,
          duration: duration
        });
      } catch (error) {
        console.error(`Error processing check ${check.id}:`, error);
        results.push({
          check_id: check.id,
          name: check.name,
          error: String(error)
        });
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        timestamp: now.toISOString(),
        results: results
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

async function executeHttpRequest(config: HttpConfig): Promise<{
  success: boolean;
  statusCode?: number;
  responseTime: number;
  responseBody?: string;
}> {
  try {
    const startTime = performance.now();
    
    // Prepare URL with params if needed
    let url = config.url;
    if (config.params && Object.keys(config.params).length > 0) {
      const urlObj = new URL(url);
      Object.entries(config.params).forEach(([key, value]) => {
        urlObj.searchParams.append(key, value);
      });
      url = urlObj.toString();
    }
    
    // Prepare request options
    const requestInit: RequestInit = {
      method: config.method,
      headers: config.headers ? config.headers : {},
    };
    
    // Add body for non-GET/HEAD requests
    if (config.body && config.method !== 'GET' && config.method !== 'HEAD') {
      requestInit.body = config.body;
    }
    
    // Execute the request with timeout
    const timeoutPromise = new Promise<Response>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 30000); // 30 seconds timeout
    });
    
    const fetchPromise = fetch(url, requestInit);
    const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
    
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    
    // Get response body
    let responseBody: string | undefined;
    try {
      responseBody = await response.text();
    } catch (e) {
      console.warn('Failed to read response body:', e);
    }
    
    // Check if response code is in the success codes
    const isSuccess = config.successCodes.includes(response.status);
    
    return {
      success: isSuccess,
      statusCode: response.status,
      responseTime,
      responseBody
    };
  } catch (error) {
    console.error('HTTP request failed:', error);
    return {
      success: false,
      responseTime: 0,
      responseBody: error instanceof Error ? error.message : String(error)
    };
  }
}
