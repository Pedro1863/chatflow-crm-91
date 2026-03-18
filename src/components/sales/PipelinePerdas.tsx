import { useCustomers, useLeadsPipeline } from "@/hooks/use-sales-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, Cell } from "recharts";
import { Loader2 } from "lucide-react";

const etapaLabels: Record<string, string> = {
  primeiro_contato_sem_resposta: "1º Contato s/ Resp.",
  proposta_sem_resposta: "Proposta s/ Resp.",
  negociacao_sem_resposta: "Negociação s/ Resp.",
  frete_sem_resposta: "Frete s/ Resp.",
};

const pipelineConfig: ChartConfig = {
  quantidade: { label: "Leads", color: "hsl(var(--chart-2))" },
};

const barColors = [
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const PipelinePerdas = () => {
  const { data: leads = [], isLoading } = useLeadsPipeline();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Carregando pipeline...
      </div>
    );
  }

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

  return (
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
  );
};

export default PipelinePerdas;
