
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

  useEffect(() => {
    if (!id) return;

    // Check if this is an API request or browser visit
    const checkIfApiRequest = async () => {
      // If this was a POST request, we'll receive it as a message from our event listener
      const handleApiRequest = (event: MessageEvent) => {
        if (event.data && event.data.type === 'api-ping' && event.data.id === id) {
          setIsApiRequest(true);
          processPing();
        }
      };

      // Listen for messages from our event listener
      window.addEventListener('message', handleApiRequest);
      
      // Clean up the listener
      return () => {
        window.removeEventListener('message', handleApiRequest);
      };
    };

    // For browser visits, process ping normally
    const processPing = async () => {
      try {
        // Check if this ping has already been processed in this session
        const pingKey = `ping-${id}-${new Date().toDateString()}`;
        if (sessionStorage.getItem(pingKey)) {
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
        
        await pingCheck(id, "success");
        // Mark this ping as processed for this session
        sessionStorage.getItem(pingKey) || sessionStorage.setItem(pingKey, "true");
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
    
    // For browser visits, process ping immediately
    if (!isApiRequest) {
      processPing();
    }
  }, [id, pingCheck, getCheck, isApiRequest]);

  // For API requests, return a simple JSON response
  if (isApiRequest) {
    return (
      <div id="api-response" data-status={error ? "error" : "success"} style={{ display: 'none' }}>
        {JSON.stringify({
          success: !error,
          message: error ? "Chyba pri spracovaní pingu" : "Ping úspešne prijatý",
          id: id
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
