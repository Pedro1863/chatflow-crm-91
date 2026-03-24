import { useState } from "react";
import { useCustomers, useLeadsPipeline, useAquisicaoMensal, useOrders } from "@/hooks/use-sales-data";
import TemplateSendDialog from "./TemplateSendDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { UserPlus, TrendingUp, Percent, Loader2, Target, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import MetricCard from "./MetricCard";
import SectionHeader from "./SectionHeader";
import TrendIndicator, { getVariation } from "./TrendIndicator";
import DateFilter, { type DateRange } from "./DateFilter";
import { mesesDesdeMarco2026 } from "@/lib/dashboard-utils";
import { startOfMonth, endOfMonth } from "date-fns";

const aquisicaoConfig: ChartConfig = {
  novos_clientes: { label: "Novos Clientes", color: "hsl(var(--chart-2))" },
};

function defaultRange(): DateRange {
  const now = new Date();
  return { from: startOfMonth(now), to: endOfMonth(now) };
}

const AquisicaoSection = () => {
  const { data: customers = [], isLoading: loadingC } = useCustomers();
  const { data: leads = [] } = useLeadsPipeline();
  const { data: orders = [] } = useOrders();
  const { data: monthlyData = [], isLoading: loadingM } = useAquisicaoMensal(mesesDesdeMarco2026());
  const [showNovos, setShowNovos] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(defaultRange);

  // Filter customers by date range using data_conversao
  const filteredCustomers = customers.filter((c) => {
    if (!c.data_conversao) return false;
    const d = new Date(c.data_conversao);
    return d >= dateRange.from && d <= dateRange.to;
  });

  // Customers who had orders in the selected period
  const ordersNoPeriodo = orders.filter((o) => {
    const d = new Date(o.data_pedido);
    return d >= dateRange.from && d <= dateRange.to;
  });
  const clientesComPedidoNoPeriodo = new Set(ordersNoPeriodo.map((o) => o.customer_id)).size;
  const leadsUnicos = new Set(leads.map((l) => l.telefone)).size;
  const totalLeads = leadsUnicos + clientesComPedidoNoPeriodo;
  const totalCustomers = clientesComPedidoNoPeriodo;
  const taxaConversao = totalLeads > 0 ? (totalCustomers / totalLeads) * 100 : 0;

  const totalVendas = ordersNoPeriodo.length;
  const totalTentativas = leads.length + totalVendas;
  const taxaTentativas = totalTentativas > 0 ? (totalVendas / totalTentativas) * 100 : 0;

  const novosClientes = filteredCustomers.length;

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

  const rangeLabel = `${format(dateRange.from, "dd/MM")} - ${format(dateRange.to, "dd/MM")}`;

  return (
    <div className="space-y-4">
      <SectionHeader icon={UserPlus} title="Aquisição">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowTemplate(true)}>
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Enviar Template
          </Button>
          <DateFilter value={dateRange} onChange={setDateRange} />
        </div>
      </SectionHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={UserPlus}
          label="Novos Clientes"
          value={novosClientes}
          sub={`Convertidos no período`}
          trend={trendNovos}
          onClick={() => setShowNovos(true)}
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

      {/* Dialog: Novos Clientes */}
      <Dialog open={showNovos} onOpenChange={setShowNovos}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Novos Clientes — {rangeLabel}</DialogTitle>
            <DialogDescription>{novosClientes} cliente(s) convertido(s) no período</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 -mx-6 px-6">
            {filteredCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum novo cliente neste período.
              </p>
            ) : (
              <div className="space-y-2">
                {filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {c.nome || "Sem nome"}
                      </p>
                      <p className="text-xs text-muted-foreground">{c.telefone}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-semibold text-foreground">
                        R$ {(c.valor_total_comprado || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.data_conversao ? format(new Date(c.data_conversao), "dd/MM/yyyy") : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
