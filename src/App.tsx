import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { lazy, Suspense, useState } from "react";
import { CheckProvider } from "./context/CheckContext";
import { ProjectProvider } from "./context/ProjectContext";
import RequireAuth from "./components/auth/RequireAuth";
import PingHandler from "./components/checks/PingHandler";
import { Skeleton } from "@/components/ui/skeleton";
import IPCheckComponent from "./components/IPCheckComponent";
import Notes from "./pages/Notes";

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

function App() {
  const [isIPAuthorized, setIsIPAuthorized] = useState<boolean | null>(null);

  if (isIPAuthorized === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-red-500 text-white p-6 rounded-lg shadow-lg max-w-lg">
          <h1 className="text-2xl font-bold mb-4">Neautorizovaný prístup</h1>
          <p className="mb-2">Vaša IP adresa nie je autorizovaná na prístup k tejto aplikácii.</p>
          <p>Kontaktujte administrátora systému pre získanie prístupu.</p>
        </div>
      </div>
    );
  }

  if (isIPAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Načítavanie...</span>
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Overujem IP adresu...</p>
        </div>
        <IPCheckComponent onAuthorized={setIsIPAuthorized} />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <ProjectProvider>
          <CheckProvider>
            <Router>
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
                  <Route path="/notes" element={<Notes />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </Router>
          </CheckProvider>
        </ProjectProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
