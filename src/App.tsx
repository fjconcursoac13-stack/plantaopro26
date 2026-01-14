import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useGlobalNavigation } from "@/hooks/useGlobalNavigation";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { GlobalOfflineBanner } from "@/components/OfflineIndicator";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import UnitDashboard from "./pages/UnitDashboard";
import Agents from "./pages/Agents";
import AgentProfile from "./pages/AgentProfile";
import AgentPanel from "./pages/AgentPanel";
import AgentProfileEdit from "./pages/AgentProfileEdit";

import Overtime from "./pages/Overtime";
import Units from "./pages/Units";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import Master from "./pages/Master";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Wrapper component to handle global navigation (ESC key and logout redirect)
function GlobalNavigationHandler({ children }: { children: React.ReactNode }) {
  useGlobalNavigation({ enabled: true });
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <GlobalNavigationHandler>
              {/* Global Offline Banner */}
              <GlobalOfflineBanner />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/agent-panel" element={<AgentPanel />} />
                <Route path="/agent-profile" element={<AgentProfileEdit />} />
                <Route path="/unit/:unitId" element={<UnitDashboard />} />
                <Route path="/agents" element={<Agents />} />
                <Route path="/agents/:id" element={<AgentProfile />} />
                
                <Route path="/overtime" element={<Overtime />} />
                <Route path="/units" element={<Units />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/master" element={<Master />} />
                <Route path="/install" element={<Install />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              {/* PWA Install Prompt - Shows on all pages when installable */}
              <PWAInstallPrompt />
            </GlobalNavigationHandler>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
