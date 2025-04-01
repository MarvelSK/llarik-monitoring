import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
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

const App = () => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ProjectProvider>
          <CheckProvider>
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <IPCheckComponent /> {/* Insert the IP check component here */}
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
              </Suspense>
            </BrowserRouter>
          </CheckProvider>
        </ProjectProvider>
      </TooltipProvider>
    </QueryClientProvider>
);

export default App;
