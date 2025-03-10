
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { useChecks } from "@/context/CheckContext";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";

const PingHandler = () => {
  const { id } = useParams<{ id: string }>();
  const { pingCheck } = useChecks();
  const [processed, setProcessed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Store a flag in sessionStorage to track if this ping has been processed
    const pingKey = `ping_processed_${id}`;
    const isPingProcessed = sessionStorage.getItem(pingKey);

    if (!id || isPingProcessed) {
      // Either no ID or ping already processed in this session
      setLoading(false);
      setProcessed(isPingProcessed === "true");
      return;
    }

    const processPing = async () => {
      try {
        setLoading(true);
        await pingCheck(id, "success");
        setProcessed(true);
        // Mark as processed in this session
        sessionStorage.setItem(pingKey, "true");
      } catch (error) {
        console.error("Error processing ping:", error);
      } finally {
        setLoading(false);
      }
    };

    processPing();
  }, [id, pingCheck]);

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center p-8 max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="h-12 w-12 mx-auto mb-4 flex items-center justify-center bg-green-100 dark:bg-green-900 rounded-full">
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Ping Received Successfully</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {processed 
            ? "Your check has been updated and the status is now UP."
            : "We couldn't process your ping. Please try again later."}
        </p>
        <Button asChild>
          <Link to="/">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
};

export default PingHandler;
