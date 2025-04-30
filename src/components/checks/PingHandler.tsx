
import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

// Enhanced API detection to handle PowerShell, cURL, wget and other API clients
const isApiRequest = () => {
  // 1. Check URL parameters for API flag (most reliable)
  const urlParams = new URLSearchParams(window.location.search);
  const isApiParam = urlParams.get('api') === 'true';
  
  // 2. User-Agent detection for non-browser clients
  const userAgent = navigator.userAgent.toLowerCase();
  // Console.log to help with debugging
  console.log('User agent detected:', userAgent);
  
  // 3. Enhanced detection for PowerShell and other clients
  const isApiUserAgent = 
    userAgent.includes('curl') || 
    userAgent.includes('wget') ||
    userAgent.includes('postman') ||
    userAgent.includes('insomnia') ||
    userAgent.includes('java') ||
    userAgent === '-' ||
    userAgent.includes('python-requests') ||
    userAgent.includes('apache-httpclient') ||
    userAgent.includes('axios') ||
    userAgent.includes('powershell') ||
    userAgent.length < 20; // Short user agents are often API clients
  
  // 4. Check Accept header via cookies (workaround since we can't access headers directly)
  const acceptHeader = /json/.test(document.cookie);
  
  // Log all detection factors for debugging
  console.log('API detection:', { 
    userAgent, 
    isApiParam, 
    isApiUserAgent,
    acceptHeader
  });
  
  return isApiParam || isApiUserAgent || acceptHeader;
};

// Direct API response function - process and respond with JSON for API requests
// This executes before React even starts rendering for API requests
if (isApiRequest()) {
  // Stop React rendering for API requests and return JSON directly
  document.addEventListener('DOMContentLoaded', async () => {
    const pathParts = window.location.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    
    if (!id) {
      document.body.innerHTML = JSON.stringify({
        success: false,
        error: "Missing check ID"
      });
      return;
    }
    
    try {
      console.log('Processing API ping for check ID:', id);
      const now = new Date();
      
      // Get the check
      const { data: checkData, error: checkError } = await supabase
        .from('checks')
        .select('*')
        .eq('id', id)
        .single();
        
      if (checkError || !checkData) {
        document.body.innerHTML = JSON.stringify({
          success: false,
          error: "Check not found",
          id
        });
        return;
      }
      
      // Calculate next ping due
      let nextPingDue = new Date();
      if (checkData.cron_expression) {
        try {
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
      
      // Add ping record
      await supabase
        .from('check_pings')
        .insert({
          check_id: id,
          status: 'success',
          timestamp: now.toISOString()
        });
      
      // CRITICAL: ALWAYS Force update check status to "up" regardless of previous status
      const { error: updateError, data: updateData } = await supabase
        .from('checks')
        .update({
          last_ping: now.toISOString(),
          next_ping_due: nextPingDue.toISOString(),
          status: "up"  // Always force to "up"
        })
        .eq('id', id)
        .select('status, last_ping');
      
      if (updateError) {
        document.body.innerHTML = JSON.stringify({
          success: false,
          error: "Failed to update check",
          id
        });
        return;
      }
      
      // Overwrite the entire page content with JSON response
      document.body.innerHTML = JSON.stringify({
        success: true,
        message: "Ping successfully received and processed, status set to UP",
        id,
        timestamp: now.toISOString(),
        check: updateData[0]
      }, null, 2);
      
      // Set content type for PowerShell and other clients that look at content type
      // FIX: use meta tag instead of trying to set document.contentType
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Type';
      meta.content = 'application/json';
      document.head.appendChild(meta);
      
    } catch (error) {
      document.body.innerHTML = JSON.stringify({
        success: false,
        error: "Internal server error",
        id
      });
    }
  }, { once: true });
}

const PingHandler = () => {
  const { id } = useParams<{ id: string }>();
  const [processed, setProcessed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isApiRequest, setIsApiRequest] = useState(false);

  useEffect(() => {
    if (!id) return;

    const detectRequestType = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const isApiParam = urlParams.get('api') === 'true';
      
      // Enhanced User-Agent detection
      const userAgent = navigator.userAgent.toLowerCase();
      console.log('User agent detected in React component:', userAgent);
      
      const isApiUserAgent = 
        userAgent.includes('curl') || 
        userAgent.includes('wget') ||
        userAgent.includes('postman') ||
        userAgent.includes('java') ||
        userAgent === '-' ||
        userAgent.includes('python-requests') ||
        userAgent.includes('apache-httpclient') ||
        userAgent.includes('powershell') ||
        userAgent.includes('axios');
      
      const isApi = isApiUserAgent || isApiParam;
      setIsApiRequest(isApi);
      
      // Only process if not an API request (API requests handled above)
      if (!isApi) {
        await processPingInSupabase(id);
      }
    };

    const processPingInSupabase = async (checkId: string) => {
      try {
        setLoading(true);
        console.log('Processing browser ping for check:', checkId);
        
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

  // Only render React UI for browser requests
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
