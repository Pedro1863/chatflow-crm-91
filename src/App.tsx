import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import ConversationsPage from "./pages/ConversationsPage";
import PipelinePage from "./pages/PipelinePage";
import ClientsPage from "./pages/ClientsPage";
import SettingsPage from "./pages/SettingsPage";
import SalesDashboardPage from "./pages/SalesDashboardPage";
import NotFound from "./pages/NotFound";
import { useMessageNotifications } from "@/hooks/use-message-notifications";

const queryClient = new QueryClient();

const NotificationsBootstrap = () => {
  useMessageNotifications();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <NotificationsBootstrap />
        <AppLayout>
          <Routes>
            <Route path="/" element={<ConversationsPage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/metricas" element={<SalesDashboardPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
