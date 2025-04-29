
// update-check edge function - directly updates check status in database
// This function handles ONLY standard checks (non-HTTP checks)
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
    
    // Verify this is a standard check (not HTTP request check)
    if (checkData.type === 'http_request') {
      // Redirect to the HTTP request check function
      const httpRequestCheckUrl = new URL(req.url);
      httpRequestCheckUrl.pathname = `/functions/v1/http-request-check/${checkId}`;
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'This is an HTTP request check. Use the http-request-check function instead.',
          redirect: httpRequestCheckUrl.toString()
        }),
        { status: 400, headers: corsHeaders }
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
    
    // Add ping record for standard check
    const { error: pingError } = await supabaseAdmin
      .from('check_pings')
      .insert({
        check_id: checkId,
        status: 'success',
        timestamp: now.toISOString(),
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
        status: 'up' 
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
        message: "Ping successfully received and processed, status set to UP",
        id: checkId,
        timestamp: now.toISOString(),
        check: updateData[0],
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
