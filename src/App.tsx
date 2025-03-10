
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { CheckProvider } from "./context/CheckContext";
import CheckDetail from "./pages/CheckDetail";
import CheckCreate from "./pages/CheckCreate";
import CheckEdit from "./pages/CheckEdit";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CheckProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/checks/new" element={<CheckCreate />} />
            <Route path="/checks/:id" element={<CheckDetail />} />
            <Route path="/checks/:id/edit" element={<CheckEdit />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </CheckProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
