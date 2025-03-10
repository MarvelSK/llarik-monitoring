
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

  useEffect(() => {
    if (!id) return;

    // Check if this ping has already been processed in this session
    const pingKey = `ping-${id}-${new Date().toDateString()}`;
    if (sessionStorage.getItem(pingKey)) {
      setProcessed(true);
      setLoading(false);
      return;
    }

    const processPing = async () => {
      try {
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
        sessionStorage.setItem(pingKey, "true");
        setProcessed(true);
      } catch (error) {
        console.error("Error processing ping:", error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    processPing();
  }, [id, pingCheck, getCheck]);

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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="h-12 w-12 mx-auto mb-4 flex items-center justify-center bg-red-100 dark:bg-red-900 rounded-full">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Error Processing Ping</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We couldn't process your ping. The check may not exist or has been deleted.
          </p>
          <Button asChild>
            <Link to="/">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center p-8 max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="h-12 w-12 mx-auto mb-4 flex items-center justify-center bg-green-100 dark:bg-green-900 rounded-full">
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Ping Received Successfully</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Your check has been updated and the status is now UP.
        </p>
        <Button asChild>
          <Link to="/">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
};

export default PingHandler;
