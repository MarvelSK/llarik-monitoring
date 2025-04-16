
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
      
      // Check for API request indicators
      const isApiUserAgent = 
        navigator.userAgent.includes('curl') || 
        navigator.userAgent.includes('wget') ||
        navigator.userAgent.includes('PostmanRuntime') ||
        navigator.userAgent.includes('Java') ||
        navigator.userAgent === '-';
      
      const urlParams = new URLSearchParams(window.location.search);
      const isApiParam = urlParams.get('api') === 'true';
      
      // Set API request flag based on indicators
      const isApi = isApiUserAgent || isApiParam;
      setIsApiRequest(isApi);
      
      console.log('Request type detection:', {
        userAgent: navigator.userAgent,
        isApiUserAgent,
        isApiParam,
        isApi
      });
      
      // Process ping directly using Supabase
      await processPingDirect(id);
    };

    // Direct database ping using Supabase client
    const processPingDirect = async (checkId: string) => {
      try {
        setLoading(true);
        console.log('Processing direct Supabase ping for check:', checkId);
        
        const now = new Date();
        
        try {
          // Get the check from database
          const { data: checkData, error: checkError } = await supabase
            .from('checks')
            .select('*')
            .eq('id', checkId)
            .single();
            
          if (checkError || !checkData) {
            console.error("Check not found in database:", checkError);
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
          
          // Update check status
          const updateData = {
            last_ping: now.toISOString(),
            next_ping_due: nextPingDue.toISOString(),
            status: "up"
          };
          
          console.log('Updating check with data:', updateData);
          
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
          
          console.log('Ping successfully processed');
          setProcessed(true);
          setError(false);
          
        } catch (error) {
          console.error("Error processing direct database ping:", error);
          setError(true);
        } finally {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error processing ping:", error);
        setError(true);
        setLoading(false);
      }
    };

    // Start detection and processing
    detectRequestType();
    
  }, [id]);

  // For API requests, return a simple JSON response
  if (isApiRequest) {
    // Add headers to indicate this is an API response
    document.head.innerHTML += '<meta name="x-api-response" content="true">';
    
    return (
      <div id="api-response" data-status={error ? "error" : "success"} data-processed={processed.toString()}>
        {JSON.stringify({
          success: !error,
          message: error ? "Error processing ping" : "Ping successfully received and processed",
          id: id,
          timestamp: new Date().toISOString(),
          processed: processed
        })}
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
