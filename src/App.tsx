
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, useState, useEffect } from "react"; // Added useEffect
import { CheckProvider } from "./context/CheckContext";
import { ProjectProvider } from "./context/ProjectContext";
import RequireAuth from "./components/auth/RequireAuth";
import PingHandler from "./components/checks/PingHandler";
import { Skeleton } from "@/components/ui/skeleton";
import IPCheckComponent from "./components/IPCheckComponent"; // Import the IP check component

// Lazy load pages to improve initial load time
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CheckDetail = lazy(() => import("./pages/CheckDetail"));
const CheckCreate = lazy(() => import("./pages/CheckCreate"));
const CheckEdit = lazy(() => import("./pages/CheckEdit"));
const Login = lazy(() => import("./pages/Login"));
const Projects = lazy(() => import("./pages/Projects"));
const Import = lazy(() => import("./pages/Import"));

// Configure QueryClient for better performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 10, // 10 minutes (replaced cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Loading fallback component
const PageLoader = () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="space-y-4 w-full max-w-md">
        <Skeleton className="h-12 w-3/4 mx-auto" />
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
        </div>
      </div>
    </div>
);

// Global HTTP request handler for ping endpoints
const setupPingRequestListener = () => {
  // Create a fetch interceptor to capture API calls to ping URLs
  const originalFetch = window.fetch;
  
  window.fetch = async function(input, init) {
    const url = input instanceof Request ? input.url : input.toString();
    
    if (url.includes('/ping/')) {
      // Extract the ID from the URL
      const urlObj = new URL(url, window.location.origin);
      const pathSegments = urlObj.pathname.split('/');
      const pingIndex = pathSegments.indexOf('ping');
      
      if (pingIndex !== -1 && pingIndex + 1 < pathSegments.length) {
        const id = pathSegments[pingIndex + 1];
        
        // Get the HTTP method
        const method = init?.method || 'GET';
        
        // Send a message to the PingHandler component
        window.postMessage({ 
          type: 'api-ping', 
          id, 
          method,
          timestamp: new Date().toISOString()
        }, window.location.origin);
        
        // For API requests, create a simple JSON response
        if (method === 'POST' || method === 'PUT' || method === 'GET') {
          return Promise.resolve(new Response(JSON.stringify({
            success: true,
            message: "Ping prijatý a spracovaný",
            id,
            timestamp: new Date().toISOString()
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'X-Ping-Processed': 'true'
            }
          }));
        }
      }
    }
    
    // Default behavior for non-ping URLs
    return originalFetch.apply(this, [input, init]);
  };
  
  // Use a MutationObserver to detect when we navigate to a ping URL
  // This is a workaround for regular page navigation
  const observer = new MutationObserver((mutations) => {
    const path = window.location.pathname;
    if (path.startsWith('/ping/')) {
      const id = path.split('/ping/')[1];
      if (id) {
        // Send a message to the PingHandler component
        window.postMessage({ 
          type: 'api-ping', 
          id, 
          method: 'GET',
          timestamp: new Date().toISOString()
        }, window.location.origin);
      }
    }
  });

  // Start observing the document
  observer.observe(document.documentElement, { childList: true, subtree: true });
  
  return { observer, cleanup: () => {
    window.fetch = originalFetch;
    observer.disconnect();
  }};
};

const App = () => {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  const handleAuthorization = (authorized: boolean) => {
    setIsAuthorized(authorized);
  };

  useEffect(() => {
    // Setup the listener for ping requests
    const { cleanup } = setupPingRequestListener();
    
    return () => {
      // Clean up the observer and fetch override on unmount
      cleanup();
    };
  }, []);

  return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ProjectProvider>
            <CheckProvider>
              <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                  {/* 
                  <IPCheckComponent onAuthorized={handleAuthorization} />

                  {isAuthorized === null ? (
                      <div>Neautorizovaná adresa.</div> // Optionally show a loading state while checking IP
                  ) : isAuthorized ? (
                  */}
                      <Routes>
                        {/* Public route */}
                        <Route path="/login" element={<Login />} />

                        {/* Protected routes */}
                        <Route path="/" element={
                          <RequireAuth>
                            <Index />
                          </RequireAuth>
                        } />
                        <Route path="/projects" element={
                          <RequireAuth>
                            <Projects />
                          </RequireAuth>
                        } />
                        <Route path="/import" element={
                          <RequireAuth>
                            <Import />
                          </RequireAuth>
                        } />
                        <Route path="/checks/new" element={
                          <RequireAuth>
                            <CheckCreate />
                          </RequireAuth>
                        } />
                        <Route path="/checks/:id" element={
                          <RequireAuth>
                            <CheckDetail />
                          </RequireAuth>
                        } />
                        <Route path="/checks/:id/edit" element={
                          <RequireAuth>
                            <CheckEdit />
                          </RequireAuth>
                        } />
                        <Route path="/ping/:id" element={<PingHandler />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                  {/* ) : (
                      <div>Access Denied</div> // Show this if IP is not authorized
                  )} */}
                </Suspense>
              </BrowserRouter>
            </CheckProvider>
          </ProjectProvider>
        </TooltipProvider>
      </QueryClientProvider>
  );
};

export default App;
