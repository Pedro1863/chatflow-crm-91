import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, BarChart3 } from "lucide-react";
import CrmIntegrationTab from "@/components/settings/CrmIntegrationTab";
import MetricsIntegrationTab from "@/components/settings/MetricsIntegrationTab";

const SettingsPage = () => {
  return (
    <div className="h-full p-6 overflow-y-auto scrollbar-thin max-w-3xl">
      <h1 className="text-xl font-bold text-foreground mb-6">Configurações</h1>

      <Tabs defaultValue="crm" className="w-full">
        <TabsList className="mb-6 w-full">
          <TabsTrigger value="crm" className="flex-1 gap-2">
            <MessageSquare className="h-4 w-4" />
            CRM & WhatsApp
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex-1 gap-2">
            <BarChart3 className="h-4 w-4" />
            Métricas de Vendas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="crm">
          <CrmIntegrationTab />
        </TabsContent>

        <TabsContent value="metrics">
          <MetricsIntegrationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
