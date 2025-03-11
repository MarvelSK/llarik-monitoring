
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { CheckProvider } from "./context/CheckContext";
import CheckDetail from "./pages/CheckDetail";
import CheckCreate from "./pages/CheckCreate";
import CheckEdit from "./pages/CheckEdit";
import Login from "./pages/Login";
import RequireAuth from "./components/auth/RequireAuth";
import PingHandler from "./components/checks/PingHandler";
import { ProjectProvider } from "./context/ProjectContext";
import Projects from "./pages/Projects";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ProjectProvider>
        <CheckProvider>
          <BrowserRouter>
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
          </BrowserRouter>
        </CheckProvider>
      </ProjectProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
