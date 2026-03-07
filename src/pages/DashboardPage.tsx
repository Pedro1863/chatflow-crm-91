import { useContatos } from "@/hooks/use-crm-data";
import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, Send, Clock } from "lucide-react";

const statusLabels: Record<string, string> = {
  novo_lead: "Novo Lead",
  contato_iniciado: "Contato Iniciado",
  proposta_enviada: "Proposta Enviada",
  cliente: "Cliente",
};

const DashboardPage = () => {
  const { data: contatos = [], isLoading } = useContatos();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  const totalContatos = contatos.length;
  const clientes = contatos.filter(c => c.status_funil === "cliente").length;
  const novosLeads = contatos.filter(c => c.status_funil === "novo_lead").length;
  const propostas = contatos.filter(c => c.status_funil === "proposta_enviada").length;

  const statusCounts: Record<string, number> = {};
  contatos.forEach(c => {
    statusCounts[c.status_funil] = (statusCounts[c.status_funil] || 0) + 1;
  });

  return (
    <div className="h-full p-6 overflow-y-auto scrollbar-thin">
      <h1 className="text-xl font-bold text-foreground mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Contatos</span>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">{totalContatos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Clientes</span>
              <UserCheck className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">{clientes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Novos Leads</span>
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">{novosLeads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Propostas Enviadas</span>
              <Send className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">{propostas}</div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        Funil por Status
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(statusLabels).map(([key, label]) => (
          <Card key={key}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">
                {statusCounts[key] || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;
