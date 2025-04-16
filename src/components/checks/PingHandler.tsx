import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

const PingHandler = () => {
  const { id } = useParams<{ id: string }>();
  const [processed, setProcessed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isApiRequest, setIsApiRequest] = useState(false);

  useEffect(() => {
    if (!id) return;

    const detectRequestType = async () => {
      console.log('Processing ping for check ID:', id);
      
      // Enhanced API request detection
      // Check URL parameters for API flag
      const urlParams = new URLSearchParams(window.location.search);
      const isApiParam = urlParams.get('api') === 'true';
      
      // More thorough User-Agent detection
      const userAgent = navigator.userAgent.toLowerCase();
      console.log('User agent detected:', userAgent);
      
      const isApiUserAgent = 
        userAgent.includes('curl') || 
        userAgent.includes('wget') ||
        userAgent.includes('postman') ||
        userAgent.includes('java') ||
        userAgent === '-' ||
        userAgent.includes('python-requests') ||
        userAgent.includes('apache-httpclient') ||
        userAgent.includes('axios');
      
      // Set API request flag based on any indicator
      const isApi = isApiUserAgent || isApiParam;
      setIsApiRequest(isApi);
      
      console.log('Request type detection:', {
        userAgent,
        isApiParam,
        isApiUserAgent,
        finalIsApi: isApi
      });
      
      // Process ping using Supabase
      await processPingInSupabase(id, isApi);
    };

    const processPingInSupabase = async (checkId: string, isApi: boolean) => {
      try {
        setLoading(true);
        console.log('Processing Supabase ping for check:', checkId, 'isApi:', isApi);
        
        const now = new Date();
        
        // Get the check from database to determine next ping calculation
        const { data: checkData, error: checkError } = await supabase
          .from('checks')
          .select('*')
          .eq('id', checkId)
          .single();
          
        if (checkError || !checkData) {
          console.error("Check not found:", checkError);
          setError(true);
          setLoading(false);
          return;
        }
        
        console.log("Found check in database:", checkData);
        
        // Calculate next ping due time
        let nextPingDue: Date;
        if (checkData.cron_expression) {
          try {
            if (checkData.cron_expression.startsWith('*/')) {
              const minutes = parseInt(checkData.cron_expression.split(' ')[0].substring(2), 10);
              nextPingDue = new Date(now.getTime() + minutes * 60 * 1000);
            } else {
              // Default fallback - add 60 minutes
              nextPingDue = new Date(now.getTime() + 60 * 60 * 1000);
            }
          } catch (error) {
            console.error("Error parsing CRON expression:", error);
            nextPingDue = new Date(now.getTime() + 60 * 60 * 1000);
          }
        } else {
          // For period-based checks
          nextPingDue = new Date(now.getTime() + checkData.period * 60 * 1000);
        }
        
        // Record the ping
        const { error: pingError } = await supabase
          .from('check_pings')
          .insert({
            check_id: checkId,
            status: 'success',
            timestamp: now.toISOString()
          });
          
        if (pingError) {
          console.error('Error adding ping:', pingError);
          setError(true);
          setLoading(false);
          return;
        }
        
        // CRITICAL: ALWAYS update check status to "up" regardless of previous status
        const updateData = {
          last_ping: now.toISOString(),
          next_ping_due: nextPingDue.toISOString(),
          status: "up"  // Force status to "up" always
        };
        
        console.log('Updating check with data:', updateData);
        
        // Debug the current check status before update
        console.log('Current check status before update:', checkData.status);
        
        // Make direct update to ensure status is changed to "up"
        const { error: updateError } = await supabase
          .from('checks')
          .update(updateData)
          .eq('id', checkId);
          
        if (updateError) {
          console.error('Error updating check:', updateError);
          setError(true);
          setLoading(false);
          return;
        }
        
        // Verify update worked by fetching check again
        const { data: updatedCheck } = await supabase
          .from('checks')
          .select('status, last_ping')
          .eq('id', checkId)
          .single();
          
        console.log('Check after update:', updatedCheck);
        
        console.log('Ping successfully processed');
        setProcessed(true);
        setError(false);
        setLoading(false);
        
      } catch (error) {
        console.error("Error processing ping:", error);
        setError(true);
        setLoading(false);
      }
    };

    // Start detection and processing
    detectRequestType();
    
  }, [id]);

  // For API requests, provide a JSON response instead of HTML
  if (isApiRequest) {
    // Prevent rendering HTML for API requests
    if (typeof document !== 'undefined') {
      // In browser context, add header for API response
      document.head.innerHTML += '<meta name="x-api-response" content="true">';
    }
    
    const jsonResponse = JSON.stringify({
      success: !error && processed,
      message: error ? "Error processing ping" : "Ping successfully received and processed, status set to UP",
      id: id,
      timestamp: new Date().toISOString(),
      processed: processed,
      status: "up"
    }, null, 2);
    
    return (
      <div id="api-response" data-status={error ? "error" : "success"} data-processed={processed.toString()}>
        <pre style={{ display: 'block', whiteSpace: 'pre', padding: '10px', background: '#f0f0f0' }}>
          {jsonResponse}
        </pre>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <Skeleton className="h-12 w-12 rounded-full mx-auto mb-4" />
          <Skeleton className="h-6 w-3/4 mx-auto mb-2" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  // Only show error state if error is true AND we're not in a processed state
  if (error && !processed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="h-12 w-12 mx-auto mb-4 flex items-center justify-center bg-red-100 dark:bg-red-900 rounded-full">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Error processing ping</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We couldn't process your ping. The check doesn't exist or was deleted.
          </p>
          <Button asChild>
            <Link to="/">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Show success state when processed is true
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center p-8 max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="h-12 w-12 mx-auto mb-4 flex items-center justify-center bg-green-100 dark:bg-green-900 rounded-full">
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Ping successfully received</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Your check has been updated and the status is now ACTIVE.
        </p>
        <Button asChild>
          <Link to="/">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
};

export default PingHandler;
