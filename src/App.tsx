import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import ConversationsPage from "./pages/ConversationsPage";
import PipelinePage from "./pages/PipelinePage";
import ClientsPage from "./pages/ClientsPage";
import SettingsPage from "./pages/SettingsPage";
import SalesDashboardPage from "./pages/SalesDashboardPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import { useMessageNotifications } from "@/hooks/use-message-notifications";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const queryClient = new QueryClient();

const NotificationsBootstrap = () => {
  useMessageNotifications();
  return null;
};

const ProtectedArea = ({ children }: { children: React.ReactNode }) => {
  const { session, isStaff, loading, signOut } = useAuth();

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>;
  }
  if (!session) return <Navigate to="/auth" replace />;

  if (!isStaff) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-foreground font-medium">Sua conta ainda não tem acesso ao CRM.</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Peça a um administrador para liberar seu usuário como equipe.
        </p>
        <Button variant="outline" onClick={signOut}>Sair</Button>
      </div>
    );
  }

  return (
    <>
      <NotificationsBootstrap />
      <AppLayout>{children}</AppLayout>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="*"
              element={
                <ProtectedArea>
                  <Routes>
                    <Route path="/" element={<ConversationsPage />} />
                    <Route path="/pipeline" element={<PipelinePage />} />
                    <Route path="/clients" element={<ClientsPage />} />
                    <Route path="/metricas" element={<SalesDashboardPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </ProtectedArea>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
