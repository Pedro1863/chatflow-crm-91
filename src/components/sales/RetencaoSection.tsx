import { useState } from "react";
import { useCustomers, useOrders, useChurnMensal } from "@/hooks/use-sales-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ShieldCheck,
  HeartPulse,
  AlertTriangle,
  UserX,
  Loader2,
} from "lucide-react";
import { differenceInDays, startOfMonth, endOfMonth } from "date-fns";
import MetricCard from "./MetricCard";
import SectionHeader from "./SectionHeader";
import AlertBadge from "./AlertBadge";
import TrendIndicator, { getVariation } from "./TrendIndicator";
import DateFilter, { type DateRange } from "./DateFilter";
import { mesesDesdeMarco2026 } from "@/lib/dashboard-utils";

const healthColors = {
  saudavel: "hsl(var(--chart-1))",
  em_risco: "hsl(var(--chart-3))",
  inativo: "hsl(var(--chart-5))",
};

const healthConfig: ChartConfig = {
  saudavel: { label: "Saudáveis", color: healthColors.saudavel },
  em_risco: { label: "Em Risco", color: healthColors.em_risco },
  inativo: { label: "Inativos", color: healthColors.inativo },
};

const churnConfig: ChartConfig = {
  taxa_churn_percentual: { label: "Taxa de Churn (%)", color: "hsl(var(--chart-5))" },
};

function classifyHealth(dataUltimoPedido: string | null, referenceDate: Date): "saudavel" | "em_risco" | "inativo" {
  if (!dataUltimoPedido) return "inativo";
  const days = differenceInDays(referenceDate, new Date(dataUltimoPedido));
  if (days <= 15) return "saudavel";
  if (days <= 30) return "em_risco";
  return "inativo";
}

function defaultRange(): DateRange {
  const now = new Date();
  return { from: startOfMonth(now), to: endOfMonth(now) };
}

const RetencaoSection = () => {
  const { data: customers = [], isLoading: loadingC } = useCustomers();
  const { data: orders = [] } = useOrders();
  const { data: churnData = [], isLoading: loadingChurn } = useChurnMensal(mesesDesdeMarco2026());
  const [dateRange, setDateRange] = useState<DateRange>(defaultRange);

  if (loadingC || loadingChurn) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Carregando retenção...
      </div>
    );
  }

  // Customers who existed before or at the start of the period (had data_conversao before end of period)
  const customersNoPeriodo = customers.filter((c) => {
    if (!c.data_conversao) return false;
    return new Date(c.data_conversao) <= dateRange.to;
  });

  // For each customer, find their last order date WITHIN or before the period end
  const ordersAtePeriodo = orders.filter((o) => new Date(o.data_pedido) <= dateRange.to);
  const lastOrderByCustomer = new Map<string, string>();
  ordersAtePeriodo.forEach((o) => {
    const existing = lastOrderByCustomer.get(o.customer_id);
    if (!existing || o.data_pedido > existing) {
      lastOrderByCustomer.set(o.customer_id, o.data_pedido);
    }
  });

  // Health classification relative to the END of the selected period
  const totalCustomers = customersNoPeriodo.length;
  const healthMap = { saudavel: 0, em_risco: 0, inativo: 0 };
  customersNoPeriodo.forEach((c) => {
    const lastOrder = lastOrderByCustomer.get(c.id) || null;
    healthMap[classifyHealth(lastOrder, dateRange.to)]++;
  });

  const healthData = [
    { name: "Saudáveis", value: healthMap.saudavel, fill: healthColors.saudavel },
    { name: "Em Risco", value: healthMap.em_risco, fill: healthColors.em_risco },
    { name: "Inativos", value: healthMap.inativo, fill: healthColors.inativo },
  ];

  const pctEmRisco = totalCustomers > 0 ? (healthMap.em_risco / totalCustomers) * 100 : 0;

  const lastChurn = churnData.length >= 1 ? churnData[churnData.length - 1] : null;
  const prevChurn = churnData.length >= 2 ? churnData[churnData.length - 2] : null;
  const churnTrend = lastChurn && prevChurn
    ? getVariation(lastChurn.taxa_churn_percentual, prevChurn.taxa_churn_percentual)
    : undefined;

  const churnIncreasing = churnTrend !== undefined && churnTrend > 10;
  const riscoAlto = pctEmRisco > 20;

  return (
    <div className="space-y-4">
      <SectionHeader icon={ShieldCheck} title="Retenção">
        <div className="flex items-center gap-2">
          {churnIncreasing && <AlertBadge level="danger" message="Churn em alta" />}
          {riscoAlto && <AlertBadge level="warning" message="Muitos clientes em risco" />}
          <DateFilter value={dateRange} onChange={setDateRange} />
        </div>
      </SectionHeader>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <MetricCard icon={HeartPulse} label="Clientes Ativos" value={healthMap.saudavel} sub="Pedido nos últimos 15 dias" />
        <MetricCard icon={AlertTriangle} label="Em Risco" value={healthMap.em_risco} sub={`${pctEmRisco.toFixed(1)}% da base`} />
        <MetricCard icon={UserX} label="Inativos / Churn" value={healthMap.inativo} sub="> 30 dias sem pedido" />
        <MetricCard icon={ShieldCheck} label="Churn Atual" value={lastChurn ? `${lastChurn.taxa_churn_percentual}%` : "—"} sub={lastChurn ? lastChurn.mes : ""} trend={churnTrend} invertTrend />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Saúde da Base</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <ChartContainer config={healthConfig} className="aspect-square max-h-[200px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie data={healthData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={75} strokeWidth={2} />
                </PieChart>
              </ChartContainer>
              <div className="space-y-3">
                <HealthRow icon={HeartPulse} label="Saudáveis" count={healthMap.saudavel} total={totalCustomers} color="text-primary" />
                <HealthRow icon={AlertTriangle} label="Em Risco" count={healthMap.em_risco} total={totalCustomers} color="text-chart-3" />
                <HealthRow icon={UserX} label="Inativos" count={healthMap.inativo} total={totalCustomers} color="text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Evolução do Churn</CardTitle>
          </CardHeader>
          <CardContent>
            {churnData.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">Dados insuficientes.</p>
            ) : (
              <>
                <ChartContainer config={churnConfig} className="max-h-[200px]">
                  <LineChart data={churnData} margin={{ left: 10, right: 10, top: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => [`${value}%`, "Churn"]} />} />
                    <Line type="monotone" dataKey="taxa_churn_percentual" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--chart-5))" }} />
                  </LineChart>
                </ChartContainer>
                <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mt-3">
                  {churnData.map((item, i) => {
                    const prev = i > 0 ? churnData[i - 1] : null;
                    const variation = prev ? getVariation(item.taxa_churn_percentual, prev.taxa_churn_percentual) : undefined;
                    return (
                      <div key={item.mes} className="rounded-md border bg-muted/30 p-2 text-center space-y-0.5">
                        <p className="text-[10px] text-muted-foreground">{item.mes}</p>
                        <p className="text-sm font-bold text-foreground">{item.taxa_churn_percentual}%</p>
                        {variation !== undefined && <TrendIndicator value={variation} invertColor />}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

function HealthRow({ icon: Icon, label, count, total, color }: {
  icon: React.ElementType; label: string; count: number; total: number; color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={`h-3.5 w-3.5 ${color}`} />
          <span className="text-xs font-medium text-foreground">{label}</span>
        </div>
        <span className="text-xs font-bold text-foreground">
          {count} <span className="text-muted-foreground font-normal">({pct.toFixed(0)}%)</span>
        </span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}

export default RetencaoSection;
