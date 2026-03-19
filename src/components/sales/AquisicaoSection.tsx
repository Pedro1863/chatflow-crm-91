import { useCustomers, useLeadsPipeline, useAquisicaoMensal } from "@/hooks/use-sales-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { UserPlus, TrendingUp, Percent, Loader2, Target } from "lucide-react";
import MetricCard from "./MetricCard";
import SectionHeader from "./SectionHeader";
import TrendIndicator, { getVariation } from "./TrendIndicator";
import { mesesDesdeMarco2026 } from "@/lib/dashboard-utils";

const aquisicaoConfig: ChartConfig = {
  novos_clientes: { label: "Novos Clientes", color: "hsl(var(--chart-2))" },
};

const AquisicaoSection = () => {
  const { data: customers = [], isLoading: loadingC } = useCustomers();
  const { data: leads = [] } = useLeadsPipeline();
  const { data: monthlyData = [], isLoading: loadingM } = useAquisicaoMensal(mesesDesdeMarco2026());

  const clientesComPedido = customers.filter((c) => (c.total_pedidos || 0) >= 1);
  // Leads únicos (por telefone) para taxa de conversão de clientes
  const leadsUnicos = new Set(leads.map((l) => l.telefone)).size;
  const totalLeads = leadsUnicos + clientesComPedido.length;
  const totalCustomers = clientesComPedido.length;
  const taxaConversao = totalLeads > 0 ? (totalCustomers / totalLeads) * 100 : 0;

  // Taxa de conversão por tentativas de venda
  const totalVendas = customers.reduce((sum, c) => sum + (c.total_pedidos || 0), 0);
  const totalTentativas = leads.length + totalVendas;
  const taxaTentativas = totalTentativas > 0 ? (totalVendas / totalTentativas) * 100 : 0;
  const novosClientes = customers.filter((c) => c.total_pedidos === 1).length;

  // Trend: compare last two months of new clients
  const lastMonth = monthlyData.length >= 1 ? monthlyData[monthlyData.length - 1] : null;
  const prevMonth = monthlyData.length >= 2 ? monthlyData[monthlyData.length - 2] : null;
  const trendNovos = lastMonth && prevMonth
    ? getVariation(lastMonth.novos_clientes, prevMonth.novos_clientes)
    : undefined;

  if (loadingC || loadingM) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Carregando aquisição...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader icon={UserPlus} title="Aquisição" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={UserPlus}
          label="Novos Clientes"
          value={novosClientes}
          sub="1 pedido realizado"
          trend={trendNovos}
        />
        <MetricCard
          icon={TrendingUp}
          label="Taxa de Conversão"
          value={`${taxaConversao.toFixed(1)}%`}
          sub={`${totalCustomers} de ${totalLeads} leads únicos`}
        />
        <MetricCard
          icon={Target}
          label="Conversão (Vendas)"
          value={`${taxaTentativas.toFixed(1)}%`}
          sub={`${totalVendas} vendas de ${totalTentativas} tentativas`}
        />
        <MetricCard
          icon={Percent}
          label="% Novos na Base"
          value={`${(totalCustomers > 0 ? (novosClientes / totalCustomers) * 100 : 0).toFixed(1)}%`}
          sub={`${novosClientes} de ${totalCustomers}`}
        />
      </div>

      {/* Monthly evolution chart */}
      {monthlyData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Evolução Mensal de Novos Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={aquisicaoConfig} className="max-h-[250px]">
              <LineChart data={monthlyData} margin={{ left: 10, right: 10, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="novos_clientes"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "hsl(var(--chart-2))" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ChartContainer>

            {/* Monthly variation */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
              {monthlyData.map((item, i) => {
                const prev = i > 0 ? monthlyData[i - 1] : null;
                const variation = prev ? getVariation(item.novos_clientes, prev.novos_clientes) : undefined;
                return (
                  <div key={item.mes} className="rounded-md border bg-muted/30 p-3 text-center space-y-1">
                    <p className="text-xs text-muted-foreground">{item.mes}</p>
                    <p className="text-lg font-bold text-foreground">{item.novos_clientes}</p>
                    {variation !== undefined && <TrendIndicator value={variation} />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AquisicaoSection;
