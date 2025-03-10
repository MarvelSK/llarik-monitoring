
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
import { CompanyProvider } from "./context/CompanyContext";
import RequireAuth from "./components/auth/RequireAuth";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CompanyList from "./pages/admin/CompanyList";
import CompanyDetail from "./pages/admin/CompanyDetail";
import CompanyCreate from "./pages/admin/CompanyCreate";
import CompanySetup from "./pages/CompanySetup";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CompanyProvider>
        <CheckProvider>
          <BrowserRouter>
            <Routes>
              {/* Public route */}
              <Route path="/login" element={<Login />} />
              
              {/* Company setup route - requires auth but not company */}
              <Route path="/setup" element={
                <RequireAuth requireCompany={false}>
                  <CompanySetup />
                </RequireAuth>
              } />
              
              {/* Protected routes */}
              <Route path="/" element={
                <RequireAuth>
                  <Index />
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
              
              {/* Admin routes */}
              <Route path="/admin" element={
                <RequireAuth requireAdmin>
                  <AdminDashboard />
                </RequireAuth>
              } />
              <Route path="/admin/companies" element={
                <RequireAuth requireAdmin>
                  <CompanyList />
                </RequireAuth>
              } />
              <Route path="/admin/companies/new" element={
                <RequireAuth requireAdmin>
                  <CompanyCreate />
                </RequireAuth>
              } />
              <Route path="/admin/companies/:id" element={
                <RequireAuth requireAdmin>
                  <CompanyDetail />
                </RequireAuth>
              } />
              
              <Route path="/ping/:id" element={<div>Ping received successfully</div>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CheckProvider>
      </CompanyProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
