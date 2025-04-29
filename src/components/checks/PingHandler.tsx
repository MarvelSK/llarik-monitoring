
import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { HttpRequestConfig } from "@/types/check";
import { Json } from "@/integrations/supabase/types";

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
      
      // Get the check
      const { data: checkData, error: checkError } = await supabase
        .from('checks')
        .select('*, type, http_config')
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
      
      // For HTTP request checks, we need to call the HTTP request edge function
      if (checkData.type === 'http_request') {
        try {
          const { data, error } = await supabase.functions.invoke('http-request-check', {
            body: { checkId: id }
          });
          
          if (error) {
            document.body.innerHTML = JSON.stringify({
              success: false,
              error: `Failed to process HTTP request check: ${error.message}`,
              id
            });
            return;
          }
          
          document.body.innerHTML = JSON.stringify(data);
          return;
        } catch (error) {
          document.body.innerHTML = JSON.stringify({
            success: false,
            error: `Error processing HTTP request check: ${error.message}`,
            id
          });
          return;
        }
      } else {
        // For standard checks, call the update-check edge function
        try {
          const { data, error } = await supabase.functions.invoke('update-check', {
            body: { checkId: id }
          });
          
          if (error) {
            document.body.innerHTML = JSON.stringify({
              success: false,
              error: `Failed to process standard check: ${error.message}`,
              id
            });
            return;
          }
          
          document.body.innerHTML = JSON.stringify(data);
          return;
        } catch (error) {
          document.body.innerHTML = JSON.stringify({
            success: false,
            error: `Error processing standard check: ${error.message}`,
            id
          });
          return;
        }
      }
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
  const [isHttpRequestCheck, setIsHttpRequestCheck] = useState(false);

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
        // First check the check type
        try {
          const { data: check, error } = await supabase
            .from('checks')
            .select('type')
            .eq('id', id)
            .single();
            
          if (error || !check) {
            setError(true);
            setLoading(false);
            return;
          }
          
          const isHttpCheck = check.type === 'http_request';
          setIsHttpRequestCheck(isHttpCheck);
          
          // Process the ping using the appropriate edge function
          if (isHttpCheck) {
            await processHttpRequestCheck(id);
          } else {
            await processStandardCheck(id);
          }
        } catch (error) {
          console.error("Error determining check type:", error);
          setError(true);
          setLoading(false);
        }
      }
    };

    const processStandardCheck = async (checkId: string) => {
      try {
        setLoading(true);
        console.log('Processing browser ping for standard check:', checkId);
        
        const { data, error } = await supabase.functions.invoke('update-check', {
          body: { checkId }
        });
        
        if (error) {
          console.error('Error processing standard check:', error);
          setError(true);
          setLoading(false);
          return;
        }
        
        console.log('Standard ping successfully processed');
        setProcessed(true);
        setError(false);
        setLoading(false);
      } catch (error) {
        console.error("Error processing standard ping:", error);
        setError(true);
        setLoading(false);
      }
    };
    
    const processHttpRequestCheck = async (checkId: string) => {
      try {
        setLoading(true);
        console.log('Processing browser ping for HTTP request check:', checkId);
        
        const { data, error } = await supabase.functions.invoke('http-request-check', {
          body: { checkId }
        });
        
        if (error) {
          console.error('Error processing HTTP request check:', error);
          setError(true);
          setLoading(false);
          return;
        }
        
        console.log('HTTP request check successfully processed');
        setProcessed(true);
        setError(false);
        setLoading(false);
      } catch (error) {
        console.error("Error processing HTTP request ping:", error);
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
          {isHttpRequestCheck 
            ? 'HTTP request has been executed and your check status has been updated.'
            : 'Your check has been updated and the status is now ACTIVE.'
          }
        </p>
        <Button asChild>
          <Link to="/">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
};

export default PingHandler;
