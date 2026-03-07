import { useDashboardMetrics } from "@/hooks/use-crm-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Clock,
  RefreshCw,
  AlertTriangle,
  BarChart3,
  Target } from
"lucide-react";

function MetricCard({
  title,
  value,
  icon: Icon,
  description





}: {title: string;value: string | number;icon: React.ElementType;description?: string;}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>);

}

const stageLabels: Record<string, string> = {
  novo_lead: "prim. resp.",
  qualificacao: "Qualificação",
  proposta: "Proposta",
  negociacao: "Negociação",
  fechamento: "Fechamento",
  pos_venda: "Pós-venda",
  perdido: "Perdido"
};

const DashboardPage = () => {
  const { data: metrics, isLoading } = useDashboardMetrics();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Carregando métricas...
      </div>);

  }

  if (!metrics) return null;

  return (
    <div className="h-full p-6 overflow-y-auto scrollbar-thin">
      <h1 className="text-xl font-bold text-foreground mb-6">Dashboard</h1>

      {/* Performance Comercial */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        Performance Comercial
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Leads no Mês"
          value={metrics.monthLeads}
          icon={Users}
          description="Novos contatos este mês" />
        
        <MetricCard
          title="Taxa de Conversão"
          value={`${metrics.conversionRate}%`}
          icon={TrendingUp}
          description="WhatsApp → Venda" />
        
        <MetricCard
          title="Lead não convertido"
          value={metrics.topProduct}
          icon={ShoppingBag}
          description="Mais vendido" />
        
        <MetricCard
          title="Menor Venda"
          value={metrics.bottomProduct}
          icon={ShoppingBag}
          description="Menos vendido" />
        
      </div>

      {/* Pipeline Overview */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        % ETAPAS QUE LEADS NÃO CONVERTIDOS PARARAM
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
        {Object.entries(stageLabels).map(([key, label]) =>
        <Card key={key}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">
                {metrics.stageCounts[key] || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Relacionamento */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">RETENÇÃO CLIENTES

      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Taxa Recompra"
          value={`${metrics.rebuyRate}%`}
          icon={RefreshCw}
          description="Clientes que recompraram" />
        
        <MetricCard
          title="Total Convertidos"
          value={metrics.totalConverted}
          icon={Target}
          description="Clientes convertidos" />
        
        <MetricCard
          title="Mensagens no Mês"
          value={metrics.monthMessages}
          icon={BarChart3}
          description="Total de mensagens" />
        
        <MetricCard
          title="Total Clientes"
          value={metrics.totalContacts}
          icon={Users}
          description="Na base" />
        
      </div>

      {/* Products */}
      {Object.keys(metrics.productCounts).length > 0 &&
      <>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Produtos por Volume
          </h2>
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                {Object.entries(metrics.productCounts).
              sort((a, b) => (b[1] as number) - (a[1] as number)).
              map(([product, count]) => {
                const max = Math.max(...(Object.values(metrics.productCounts) as number[]));
                const pct = (count as number) / max * 100;
                return (
                  <div key={product}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-foreground">{product}</span>
                          <span className="text-muted-foreground">{count as number}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }} />
                      
                        </div>
                      </div>);

              })}
              </div>
            </CardContent>
          </Card>
        </>
      }
    </div>);

};

export default DashboardPage;