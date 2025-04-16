import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, useState, useEffect } from "react";
import { CheckProvider } from "./context/CheckContext";
import { ProjectProvider } from "./context/ProjectContext";
import RequireAuth from "./components/auth/RequireAuth";
import PingHandler from "./components/checks/PingHandler";
import { Skeleton } from "@/components/ui/skeleton";
import IPCheckComponent from "./components/IPCheckComponent";

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CheckDetail = lazy(() => import("./pages/CheckDetail"));
const CheckCreate = lazy(() => import("./pages/CheckCreate"));
const CheckEdit = lazy(() => import("./pages/CheckEdit"));
const Login = lazy(() => import("./pages/Login"));
const Projects = lazy(() => import("./pages/Projects"));
const Import = lazy(() => import("./pages/Import"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

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

const setupPingRequestListener = () => {
  console.log('Setting up ping request listener');
  
  const originalFetch = window.fetch;
  
  window.fetch = async function(input, init) {
    const url = input instanceof Request ? input.url : input.toString();
    
    if (url.includes('/ping/')) {
      const urlObj = new URL(url, window.location.origin);
      const pathSegments = urlObj.pathname.split('/');
      const pingIndex = pathSegments.indexOf('ping');
      
      if (pingIndex !== -1 && pingIndex + 1 < pathSegments.length) {
        const id = pathSegments[pingIndex + 1];
        
        const method = init?.method || 'POST';
        
        console.log(`Intercepted ${method} request to ping endpoint:`, id);
        
        window.postMessage({ 
          type: 'api-ping', 
          id, 
          method,
          timestamp: new Date().toISOString()
        }, window.location.origin);
        
        const originalResponse = await originalFetch.apply(this, [input, init]);
        
        const contentType = originalResponse.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          return new Response(JSON.stringify({
            success: true,
            message: "Ping prijatý a spracovaný",
            id,
            timestamp: new Date().toISOString(),
            processed: true
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'X-Ping-Processed': 'true',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
            }
          });
        }
        
        return originalResponse;
      }
    }
    
    return originalFetch.apply(this, [input, init]);
  };
  
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (typeof url === 'string' && url.includes('/ping/')) {
      document.head.innerHTML += '<meta name="x-api-request" content="true">';
      console.log('XHR request to ping endpoint:', url);
      
      if (url.toString().includes('/ping/') && method.toUpperCase() === 'GET') {
        console.log('Changing GET request to POST for ping endpoint');
        arguments[0] = 'POST';
      }
    }
    originalXHROpen.apply(this, arguments);
  };

  const handleDirectRequests = () => {
    const path = window.location.pathname;
    if (path.startsWith('/ping/')) {
      const id = path.split('/ping/')[1];
      if (id) {
        console.log('Detected direct navigation to ping URL:', id);
        document.head.innerHTML += '<meta name="x-api-request" content="true">';
        window.postMessage({ 
          type: 'api-ping', 
          id, 
          method: 'POST',
          timestamp: new Date().toISOString()
        }, window.location.origin);
      }
    }
  };

  const observer = new MutationObserver(() => {
    const path = window.location.pathname;
    if (path.startsWith('/ping/')) {
      const id = path.split('/ping/')[1];
      if (id) {
        console.log('Detected navigation to ping URL via SPA:', id);
        window.postMessage({ 
          type: 'api-ping', 
          id, 
          method: 'POST',
          timestamp: new Date().toISOString()
        }, window.location.origin);
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  
  handleDirectRequests();
  
  return { 
    observer, 
    cleanup: () => {
      console.log('Cleaning up ping request listener');
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXHROpen;
      observer.disconnect();
    }
  };
};

const App = () => {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  const handleAuthorization = (authorized: boolean) => {
    setIsAuthorized(authorized);
  };

  useEffect(() => {
    const { cleanup } = setupPingRequestListener();
    
    return () => {
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
                <Routes>
                  <Route path="/login" element={<Login />} />
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
              </Suspense>
            </CheckProvider>
          </ProjectProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </App>
  );
};

export default App;
