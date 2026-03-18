import { useChurnMensal } from "@/hooks/use-sales-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendingDown, Loader2 } from "lucide-react";

const churnConfig: ChartConfig = {
  taxa_churn_percentual: { label: "Taxa de Churn (%)", color: "hsl(var(--chart-5))" },
};

const ChurnMensalChart = () => {
  const { data: churnData = [], isLoading } = useChurnMensal(6);

  const ultimoMes = churnData.length > 0 ? churnData[churnData.length - 1] : null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Carregando churn...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Taxa de Churn Mensal
          </CardTitle>
          {ultimoMes && (
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-2xl font-bold text-foreground">
                {ultimoMes.taxa_churn_percentual}%
              </span>
              <span className="text-xs text-muted-foreground">
                ({ultimoMes.mes})
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {churnData.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">
            Dados insuficientes para calcular churn mensal.
          </p>
        ) : (
          <>
            <ChartContainer config={churnConfig} className="max-h-[300px]">
              <LineChart data={churnData} margin={{ left: 10, right: 10, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => `${v}%`}
                  allowDecimals={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => [`${value}%`, "Taxa de Churn"]}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="taxa_churn_percentual"
                  stroke="hsl(var(--chart-5))"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "hsl(var(--chart-5))" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ChartContainer>

            {/* Monthly breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
              {churnData.map((item) => (
                <div
                  key={item.mes}
                  className="rounded-md border bg-muted/30 p-3 text-center space-y-1"
                >
                  <p className="text-xs text-muted-foreground">{item.mes}</p>
                  <p className="text-lg font-bold text-foreground">
                    {item.taxa_churn_percentual}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.total_clientes_churnados_no_mes} de {item.total_clientes_ativos_inicio}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ChurnMensalChart;
