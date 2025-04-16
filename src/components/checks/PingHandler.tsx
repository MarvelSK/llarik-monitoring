import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { CheckCircle, AlertCircle } from "lucide-react";
import { useChecks } from "@/context/CheckContext";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";

const PingHandler = () => {
  const { id } = useParams<{ id: string }>();
  const { pingCheck, getCheck } = useChecks();
  const [processed, setProcessed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isApiRequest, setIsApiRequest] = useState(false);
  const [requestMethod, setRequestMethod] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    // Check if this is an API request or browser visit
    const checkIfApiRequest = () => {
      // API requests can come from:
      // 1. Direct API calls with specific headers
      // 2. Our event messages from the fetch interceptor
      // 3. The Content-Type header might indicate an API request

      // Check for API request headers
      const isApiUserAgent = navigator.userAgent.includes('curl') || 
                            navigator.userAgent.includes('wget') ||
                            navigator.userAgent.includes('PostmanRuntime') ||
                            navigator.userAgent === '-'; // Case from the example
      
      // Get request method from URL params if available
      const urlParams = new URLSearchParams(window.location.search);
      const methodFromUrl = urlParams.get('_method');
      
      // Check if there are any API indicators in headers
      const hasApiHeaders = document.head.querySelector('meta[name="x-api-request"]') !== null;
      
      // Check if there's a message indicating this is an API request
      const handleApiRequest = (event: MessageEvent) => {
        if (event.data && event.data.type === 'api-ping' && event.data.id === id) {
          console.log('Received API ping message:', event.data);
          setIsApiRequest(true);
          setRequestMethod(event.data.method || "GET");
          processPing(true);
        }
      };

      // Listen for messages from our event listener
      window.addEventListener('message', handleApiRequest);
      
      // If we detect API request from headers or user agent
      if (isApiUserAgent || hasApiHeaders) {
        console.log('Detected API request from headers or user agent');
        setIsApiRequest(true);
        setRequestMethod(methodFromUrl || 'GET');
        processPing(true);
      } else {
        // For browser visits, process ping normally
        processPing(false);
      }
      
      // Clean up the listener
      return () => {
        window.removeEventListener('message', handleApiRequest);
      };
    };

    // Process ping based on the request type
    const processPing = async (isApi: boolean) => {
      try {
        // Check if this ping has already been processed in this session
        // Skip this check for API requests - we want them to always register
        const pingKey = `ping-${id}-${new Date().toDateString()}`;
        if (!isApi && sessionStorage.getItem(pingKey)) {
          console.log('This ping was already processed in this session');
          setProcessed(true);
          setLoading(false);
          return;
        }

        setLoading(true);
        // First check if the check exists
        const check = getCheck(id);
        if (!check) {
          console.error("Check not found:", id);
          setError(true);
          setLoading(false);
          return;
        }
        
        console.log(`Processing ping for check ${id}, isApiRequest: ${isApi}`);
        await pingCheck(id, "success");
        
        // For browser visits, mark this ping as processed for this session
        // Don't do this for API requests so they can be called multiple times
        if (!isApi) {
          sessionStorage.setItem(pingKey, "true");
        }
        
        setProcessed(true);
        setError(false); // Make sure error is set to false on success
      } catch (error) {
        console.error("Error processing ping:", error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    // Start the API request check
    checkIfApiRequest();
    
  }, [id, pingCheck, getCheck]);

  // For API requests, return a simple JSON response
  if (isApiRequest) {
    // Add headers to indicate this is an API response
    document.head.innerHTML += '<meta name="x-api-response" content="true">';
    
    return (
      <div id="api-response" data-status={error ? "error" : "success"} data-method={requestMethod}>
        {JSON.stringify({
          success: !error,
          message: error ? "Chyba pri spracovaní pingu" : "Ping úspešne prijatý",
          id: id,
          timestamp: new Date().toISOString()
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
          <h1 className="text-2xl font-bold mb-2">Chyba pri spracovaní pingu</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Nemohli sme spracovať váš ping. Kontrola neexistuje alebo bola odstránená.
          </p>
          <Button asChild>
            <Link to="/">Späť na nástenku</Link>
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
        <h1 className="text-2xl font-bold mb-2">Ping úspešne prijatý</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Vaša kontrola bola aktualizovaná a stav je teraz FUNKČNÝ.
        </p>
        <Button asChild>
          <Link to="/">Späť na nástenku</Link>
        </Button>
      </div>
    </div>
  );
};

export default PingHandler;
