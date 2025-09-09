import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import Index from "./pages/Index";
import CompactingGC from "./pages/CompactingGC";
import CopyGC from "./pages/CopyGC";
import GenerationalGC from "./pages/GenerationalGC";
import G1GC from "./pages/G1GC";
import NotFound from "./pages/NotFound";
import { Navigation } from "./components/Navigation";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen flex flex-col w-full">
          <Navigation />
          <SidebarProvider>
            <div className="flex flex-1">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/compacting" element={<CompactingGC />} />
                <Route path="/copy" element={<CopyGC />} />
                <Route path="/generational" element={<GenerationalGC />} />
                <Route path="/g1" element={<G1GC />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </SidebarProvider>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
