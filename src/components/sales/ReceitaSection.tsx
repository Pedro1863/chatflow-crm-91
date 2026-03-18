import { useCustomers, useAquisicaoMensal } from "@/hooks/use-sales-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";
import { DollarSign, Receipt, Loader2 } from "lucide-react";
import MetricCard from "./MetricCard";
import SectionHeader from "./SectionHeader";
import TrendIndicator, { getVariation } from "./TrendIndicator";

const receitaConfig: ChartConfig = {
  receita_novos: { label: "Novos", color: "hsl(var(--chart-2))" },
  receita_recorrentes: { label: "Recorrentes", color: "hsl(var(--chart-1))" },
};

const ReceitaSection = () => {
  const { data: customers = [], isLoading: loadingC } = useCustomers();
  const { data: monthlyData = [], isLoading: loadingM } = useAquisicaoMensal(6);

  if (loadingC || loadingM) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Carregando receita...
      </div>
    );
  }

  const receitaTotal = customers.reduce((sum, c) => sum + (c.valor_total_comprado || 0), 0);
  const totalPedidos = customers.reduce((sum, c) => sum + (c.total_pedidos || 0), 0);
  const ticketMedio = totalPedidos > 0 ? receitaTotal / totalPedidos : 0;

  const receitaNovos = customers.filter(c => c.total_pedidos === 1).reduce((s, c) => s + (c.valor_total_comprado || 0), 0);
  const receitaRecorrentes = customers.filter(c => c.total_pedidos > 1).reduce((s, c) => s + (c.valor_total_comprado || 0), 0);

  // Monthly revenue trend
  const lastM = monthlyData.length >= 1 ? monthlyData[monthlyData.length - 1] : null;
  const prevM = monthlyData.length >= 2 ? monthlyData[monthlyData.length - 2] : null;
  const receitaLastMonth = lastM ? lastM.receita_novos + lastM.receita_recorrentes : 0;
  const receitaPrevMonth = prevM ? prevM.receita_novos + prevM.receita_recorrentes : 0;
  const receitaTrend = prevM ? getVariation(receitaLastMonth, receitaPrevMonth) : undefined;

  const chartData = monthlyData.map((item) => ({
    ...item,
    receita_total: item.receita_novos + item.receita_recorrentes,
  }));

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-4">
      <SectionHeader icon={DollarSign} title="Receita" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          icon={DollarSign}
          label="Receita Total"
          value={formatCurrency(receitaTotal)}
          sub="Acumulado de todos os clientes"
          trend={receitaTrend}
        />
        <MetricCard
          icon={Receipt}
          label="Ticket Médio"
          value={formatCurrency(ticketMedio)}
          sub={`${totalPedidos} pedidos totais`}
        />
        <MetricCard
          icon={DollarSign}
          label="Receita Recorrentes"
          value={formatCurrency(receitaRecorrentes)}
          sub={`Novos: ${formatCurrency(receitaNovos)}`}
        />
      </div>

      {chartData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Revenue evolution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Receita Mensal (Novos vs Recorrentes)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={receitaConfig} className="max-h-[250px]">
                <BarChart data={chartData} margin={{ left: 10, right: 10, top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => [formatCurrency(Number(v))]} />} />
                  <Bar dataKey="receita_novos" stackId="a" fill="hsl(var(--chart-2))" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="receita_recorrentes" stackId="a" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Growth trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Crescimento de Receita
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ receita_total: { label: "Receita Total", color: "hsl(var(--chart-4))" } }} className="max-h-[250px]">
                <LineChart data={chartData} margin={{ left: 10, right: 10, top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(v) => [formatCurrency(Number(v))]} />} />
                  <Line type="monotone" dataKey="receita_total" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--chart-4))" }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ReceitaSection;
