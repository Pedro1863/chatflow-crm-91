import { useCustomers, useLeadsPipeline } from "@/hooks/use-sales-data";
import ChurnMensalChart from "@/components/sales/ChurnMensalChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, Cell, PieChart, Pie } from "recharts";
import {
  TrendingUp,
  UserPlus,
  RefreshCw,
  Percent,
  HeartPulse,
  AlertTriangle,
  UserX,
  Loader2,
} from "lucide-react";
import { differenceInDays } from "date-fns";

const etapaLabels: Record<string, string> = {
  primeiro_contato_sem_resposta: "1º Contato s/ Resp.",
  proposta_sem_resposta: "Proposta s/ Resp.",
  negociacao_sem_resposta: "Negociação s/ Resp.",
  frete_sem_resposta: "Frete s/ Resp.",
};

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

const pipelineConfig: ChartConfig = {
  quantidade: { label: "Leads", color: "hsl(var(--chart-2))" },
};

function classifyHealth(dataUltimoPedido: string | null): "saudavel" | "em_risco" | "inativo" {
  if (!dataUltimoPedido) return "inativo";
  const days = differenceInDays(new Date(), new Date(dataUltimoPedido));
  if (days <= 15) return "saudavel";
  if (days <= 30) return "em_risco";
  return "inativo";
}

const SalesDashboardPage = () => {
  const { data: customers = [], isLoading: loadingC } = useCustomers();
  const { data: leads = [], isLoading: loadingL } = useLeadsPipeline();

  if (loadingC || loadingL) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Carregando métricas...
      </div>
    );
  }

  // ── Métricas principais ──
  const totalLeads = leads.length + customers.length;
  const totalCustomers = customers.length;
  const taxaConversao = totalLeads > 0 ? (totalCustomers / totalLeads) * 100 : 0;
  const novosClientes = customers.filter((c) => c.total_pedidos === 1).length;
  const clientesRecompra = customers.filter((c) => c.total_pedidos > 1).length;
  const pctNovos = totalCustomers > 0 ? (novosClientes / totalCustomers) * 100 : 0;

  // ── Saúde ──
  const healthMap = { saudavel: 0, em_risco: 0, inativo: 0 };
  customers.forEach((c) => {
    healthMap[classifyHealth(c.data_ultimo_pedido)]++;
  });

  const healthData = [
    { name: "Saudáveis", value: healthMap.saudavel, fill: healthColors.saudavel },
    { name: "Em Risco", value: healthMap.em_risco, fill: healthColors.em_risco },
    { name: "Inativos", value: healthMap.inativo, fill: healthColors.inativo },
  ];

  // ── Pipeline de perdas ──
  const perdidosPorEtapa: Record<string, number> = {};
  const leadsPerdidos = leads.filter((l) => l.status === "perdido");
  leadsPerdidos.forEach((l) => {
    const etapa = l.etapa_pipeline || "outro";
    perdidosPorEtapa[etapa] = (perdidosPorEtapa[etapa] || 0) + 1;
  });

  const pipelineData = Object.entries(etapaLabels).map(([key, label]) => ({
    etapa: label,
    quantidade: perdidosPorEtapa[key] || 0,
  }));

  const barColors = [
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  return (
    <div className="h-full p-6 overflow-y-auto scrollbar-thin space-y-8">
      <h1 className="text-xl font-bold text-foreground">Métricas de Vendas</h1>

      {/* ── Seção 1: Métricas principais ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={TrendingUp}
          label="Taxa de Conversão"
          value={`${taxaConversao.toFixed(1)}%`}
          sub={`${totalCustomers} de ${totalLeads} leads`}
        />
        <MetricCard
          icon={UserPlus}
          label="Novos Clientes"
          value={novosClientes}
          sub="1 pedido realizado"
        />
        <MetricCard
          icon={RefreshCw}
          label="Clientes Recompra"
          value={clientesRecompra}
          sub="> 1 pedido"
        />
        <MetricCard
          icon={Percent}
          label="% Novos Clientes"
          value={`${pctNovos.toFixed(1)}%`}
          sub={`${novosClientes} de ${totalCustomers}`}
        />
      </div>

      {/* ── Seção 2: Saúde da base ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Saúde da Base de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Pie chart */}
            <ChartContainer config={healthConfig} className="aspect-square max-h-[260px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={healthData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  strokeWidth={2}
                />
              </PieChart>
            </ChartContainer>

            {/* Legend cards */}
            <div className="space-y-4">
              <HealthRow
                icon={HeartPulse}
                label="Saudáveis"
                count={healthMap.saudavel}
                total={totalCustomers}
                color="text-primary"
                desc="Pedido nos últimos 15 dias"
              />
              <HealthRow
                icon={AlertTriangle}
                label="Em Risco"
                count={healthMap.em_risco}
                total={totalCustomers}
                color="text-chart-3"
                desc="15–30 dias sem pedido"
              />
              <HealthRow
                icon={UserX}
                label="Inativos / Churn"
                count={healthMap.inativo}
                total={totalCustomers}
                color="text-destructive"
                desc="> 30 dias sem pedido"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Seção 3: Taxa de Churn Mensal ── */}
      <ChurnMensalChart />

      {/* ── Seção 4: Pipeline de perdas ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Leads Perdidos por Etapa do Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leadsPerdidos.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              Nenhum lead perdido registrado ainda.
            </p>
          ) : (
            <ChartContainer config={pipelineConfig} className="max-h-[300px]">
              <BarChart data={pipelineData} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="etapa" type="category" width={140} tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="quantidade" radius={[0, 6, 6, 0]}>
                  {pipelineData.map((_, i) => (
                    <Cell key={i} fill={barColors[i % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/* ── Sub-components ── */

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

function HealthRow({
  icon: Icon,
  label,
  count,
  total,
  color,
  desc,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  total: number;
  color: string;
  desc: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <span className="text-sm font-bold text-foreground">
          {count} <span className="text-muted-foreground font-normal">({pct.toFixed(0)}%)</span>
        </span>
      </div>
      <Progress value={pct} className="h-2" />
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}

export default SalesDashboardPage;
